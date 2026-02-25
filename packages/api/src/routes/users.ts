/**
 * YigYaps User Profile Routes (Phase 2)
 *
 * User profile management endpoints.
 *
 * License: Apache 2.0
 */

import type { FastifyPluginAsync } from "fastify";
import { UserDAL } from "@yigyaps/db";
import { requireAuth, optionalAuth } from "../middleware/auth-v2.js";

// ─── User Profile Routes ──────────────────────────────────────────────────────

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /v1/users/me - Get current user profile
  fastify.get("/me", { preHandler: requireAuth() }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Not authenticated",
      });
    }

    // If using ADMIN_SECRET, return basic info
    if (request.user.authMethod === "admin_secret") {
      return reply.send({
        id: request.user.userId,
        displayName: request.user.userName,
        tier: request.user.tier,
        role: request.user.role,
        authMethod: "admin_secret",
      });
    }

    // Get full user profile from database
    const userDAL = new UserDAL(fastify.db);
    const user = await userDAL.getById(request.user.userId);

    if (!user) {
      return reply.status(404).send({
        error: "Not found",
        message: "User not found",
      });
    }

    return reply.send({
      id: user.id,
      githubUsername: user.githubUsername,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      tier: user.tier,
      role: user.role,
      bio: user.bio,
      websiteUrl: user.websiteUrl,
      isVerifiedCreator: user.isVerifiedCreator,
      totalPackages: user.totalPackages,
      totalEarningsUsd: user.totalEarningsUsd,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    });
  });

  // PATCH /v1/users/me - Update user profile
  fastify.patch<{
    Body: {
      displayName?: string;
      bio?: string;
      websiteUrl?: string;
    };
  }>("/me", { preHandler: requireAuth() }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Not authenticated",
      });
    }

    // ADMIN_SECRET cannot update profile
    if (request.user.authMethod === "admin_secret") {
      return reply.status(403).send({
        error: "Forbidden",
        message: "ADMIN_SECRET authentication cannot update user profiles",
      });
    }

    const { displayName, bio, websiteUrl } = request.body;

    // Validate inputs
    if (displayName !== undefined && displayName.trim().length === 0) {
      return reply.status(400).send({
        error: "Bad request",
        message: "Display name cannot be empty",
      });
    }

    if (websiteUrl !== undefined && websiteUrl.trim().length > 0) {
      try {
        new URL(websiteUrl);
      } catch {
        return reply.status(400).send({
          error: "Bad request",
          message: "Invalid website URL",
        });
      }
    }

    // Update user profile
    const userDAL = new UserDAL(fastify.db);
    const updatedUser = await userDAL.updateProfile(request.user.userId, {
      displayName: displayName?.trim(),
      bio: bio?.trim(),
      websiteUrl: websiteUrl?.trim(),
    });

    return reply.send({
      id: updatedUser.id,
      githubUsername: updatedUser.githubUsername,
      displayName: updatedUser.displayName,
      email: updatedUser.email,
      avatarUrl: updatedUser.avatarUrl,
      tier: updatedUser.tier,
      role: updatedUser.role,
      bio: updatedUser.bio,
      websiteUrl: updatedUser.websiteUrl,
      isVerifiedCreator: updatedUser.isVerifiedCreator,
      totalPackages: updatedUser.totalPackages,
      totalEarningsUsd: updatedUser.totalEarningsUsd,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      lastLoginAt: updatedUser.lastLoginAt,
    });
  });

  // GET /v1/users/:id - Get user by ID (public info only)
  fastify.get<{
    Params: { id: string };
  }>("/id/:id", { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params;

    const userDAL = new UserDAL(fastify.db);
    const user = await userDAL.getById(id);

    if (!user) {
      return reply.status(404).send({
        error: "Not found",
        message: "User not found",
      });
    }

    // Return public info only
    return reply.send({
      id: user.id,
      githubUsername: user.githubUsername,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      websiteUrl: user.websiteUrl,
      isVerifiedCreator: user.isVerifiedCreator,
      totalPackages: user.totalPackages,
      // Don't expose email, tier, role, earnings for privacy
    });
  });
};
