/**
 * YigYaps Authentication Routes (Phase 2)
 *
 * GitHub OAuth login flow and session management.
 *
 * License: Apache 2.0
 */

import type { FastifyPluginAsync } from "fastify";
import { UserDAL, SessionDAL } from "@yigyaps/db";
import { type UserRow } from "@yigyaps/db";
import { signJWT, verifyJWT } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth-v2.js";
import { customAlphabet } from "nanoid";
import { env } from "../lib/env.js";
import { AUTH_COOKIE_NAME } from "../lib/constants.js";
import crypto from "node:crypto";
import { Resend } from "resend";

const resend = new Resend(env.RESEND_API_KEY || "dummy_key");

// Password hashing utility using scrypt
export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

// ─── GitHub OAuth Configuration ───────────────────────────────────────────────

const GITHUB_CLIENT_ID = env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = env.GITHUB_CLIENT_SECRET;
const isGithubConfigured =
  GITHUB_CLIENT_ID !== "UNCONFIGURED_GITHUB_CLIENT_ID" &&
  GITHUB_CLIENT_SECRET !== "UNCONFIGURED_GITHUB_CLIENT_SECRET";

const GITHUB_CALLBACK_URL =
  env.GITHUB_CALLBACK_URL ?? "http://localhost:3100/v1/auth/github/callback";
const FRONTEND_URL = env.FRONTEND_URL;

// ─── GitHub API Types ─────────────────────────────────────────────────────────

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  bio: string | null;
  blog: string | null;
}

// ─── Authentication Routes ────────────────────────────────────────────────────

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /v1/auth/github - Redirect to GitHub OAuth
  fastify.get("/github", async (request, reply) => {
    if (!isGithubConfigured) {
      return reply.status(500).send({
        error: "Server misconfiguration",
        message: "GitHub OAuth is not configured",
      });
    }

    // Generate state for CSRF protection
    const state = customAlphabet(
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      32,
    )();

    // Store state in cookie (or session)
    reply.setCookie("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", GITHUB_CALLBACK_URL);
    authUrl.searchParams.set("scope", "read:user user:email");
    authUrl.searchParams.set("state", state);

    return reply.redirect(authUrl.toString());
  });

  // GET /v1/auth/github/callback - Handle GitHub OAuth callback
  fastify.get<{
    Querystring: { code?: string; state?: string; error?: string };
  }>("/github/callback", async (request, reply) => {
    const { code, state, error } = request.query;

    if (error) {
      return reply.redirect(`${FRONTEND_URL}/auth/error?error=${error}`);
    }

    if (!code || !state) {
      return reply.status(400).send({
        error: "Bad request",
        message: "Missing code or state parameter",
      });
    }

    // Verify state to prevent CSRF
    const storedState = request.cookies.oauth_state;
    if (!storedState || storedState !== state) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Invalid state parameter",
      });
    }

    // Clear state cookie
    reply.clearCookie("oauth_state");

    if (!isGithubConfigured) {
      return reply.status(500).send({
        error: "Server misconfiguration",
        message: "GitHub OAuth is not configured",
      });
    }

    try {
      // Exchange code for access token
      const tokenResponse = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: GITHUB_CALLBACK_URL,
          }),
        },
      );

      const tokenData = (await tokenResponse.json()) as {
        access_token?: string;
        error?: string;
      };

      if (!tokenData.access_token) {
        throw new Error(tokenData.error ?? "Failed to get access token");
      }

      // Get user info from GitHub
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      const githubUser = (await userResponse.json()) as GitHubUser;

      // Create or update user in database
      const userDAL = new UserDAL(fastify.db);
      let user = await userDAL.getByGithubId(String(githubUser.id));

      const now = Date.now();
      if (!user) {
        // Create new user
        user = await userDAL.create({
          id: `usr_${now}_${nanoid()}`,
          githubId: String(githubUser.id),
          githubUsername: githubUser.login,
          email: githubUser.email ?? undefined,
          displayName: githubUser.name ?? githubUser.login,
          avatarUrl: githubUser.avatar_url,
          bio: githubUser.bio ?? undefined,
          websiteUrl: githubUser.blog ?? undefined,
          tier: "free",
          role: "user",
          isVerifiedCreator: false,
          totalPackages: 0,
          totalEarningsUsd: "0",
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        });
      } else {
        // Update last login
        await userDAL.updateLastLogin(user.id);
      }

      // Create session
      const sessionDAL = new SessionDAL(fastify.db);
      const session = await sessionDAL.create({
        id: `sess_${now}_${nanoid()}`,
        userId: user.id,
        sessionToken: customAlphabet(
          "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
          64,
        )(),
        expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
        createdAt: now,
        lastActiveAt: now,
        ipAddress: request.headers["x-forwarded-for"]?.toString() ?? request.ip,
        userAgent: request.headers["user-agent"],
      });

      // Generate JWT
      const jwt = signJWT({
        userId: user.id,
        userName: user.displayName,
        githubUsername: user.githubUsername,
        tier: user.tier as "free" | "pro" | "epic" | "legendary",
        role: user.role as "user" | "admin",
      });

      // Set session cookie
      reply.setCookie("session_token", session.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });

      // Set JWT cookie
      reply.setCookie(AUTH_COOKIE_NAME, jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });

      // Redirect to frontend with JWT (no token in URL)
      return reply.redirect(`${FRONTEND_URL}/auth/success`);
    } catch (error) {
      request.log.error({ error }, "GitHub OAuth callback failed");
      return reply.redirect(`${FRONTEND_URL}/auth/error?error=oauth_failed`);
    }
  });

  // POST /v1/auth/logout - Logout user
  fastify.post(
    "/logout",
    { preHandler: requireAuth() },
    async (request, reply) => {
      const sessionToken = request.cookies.session_token;
      if (sessionToken) {
        const sessionDAL = new SessionDAL(fastify.db);
        await sessionDAL.deleteByToken(sessionToken);
        reply.clearCookie("session_token");
      }

      reply.clearCookie(AUTH_COOKIE_NAME);

      return reply.send({ success: true });
    },
  );

  // GET /v1/auth/me - Get current user info
  fastify.get("/me", { preHandler: requireAuth() }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Not authenticated",
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

  // GET /v1/auth/refresh - Refresh JWT if expiring within 48h
  fastify.get("/refresh", { preHandler: requireAuth() }, async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized", message: "Not authenticated" });
    const jwt = request.cookies?.[AUTH_COOKIE_NAME];
    const THRESHOLD = 48 * 60 * 60 * 1000;
    let refresh = true;
    if (jwt) { try { const d = verifyJWT(jwt); if (((d.exp ?? 0) * 1000 - Date.now()) > THRESHOLD) refresh = false; } catch { refresh = true; } }
    if (!refresh) return reply.send({ refreshed: false });
    const userDAL = new UserDAL(fastify.db);
    const user = await userDAL.getById(request.user.userId);
    if (!user) return reply.status(404).send({ error: "Not found", message: "User not found" });
    const newJwt = signJWT({ userId: user.id, userName: user.displayName, githubUsername: user.githubUsername, tier: user.tier as "free" | "pro" | "epic" | "legendary", role: user.role as "user" | "admin" });
    reply.setCookie(AUTH_COOKIE_NAME, newJwt, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60, path: "/" });
    return reply.send({ refreshed: true, user: { id: user.id, githubUsername: user.githubUsername, displayName: user.displayName, email: user.email, avatarUrl: user.avatarUrl, tier: user.tier, role: user.role } });
  });

  // ─── Google OAuth ─────────────────────────────────────────────────────────────

  const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
  const GOOGLE_CALLBACK_URL = env.GOOGLE_CALLBACK_URL ?? "http://localhost:3100/v1/auth/google/callback";
  const isGoogleConfigured = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET;

  fastify.get("/google", async (request, reply) => {
    if (!isGoogleConfigured) {
      return reply.status(500).send({ error: "Server misconfiguration", message: "Google OAuth is not configured" });
    }
    const state = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 32)();
    reply.setCookie("oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", GOOGLE_CALLBACK_URL);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    return reply.redirect(authUrl.toString());
  });

  fastify.get<{ Querystring: { code?: string; state?: string; error?: string } }>("/google/callback", async (request, reply) => {
    const { code, state, error } = request.query;
    if (error) return reply.redirect(`${FRONTEND_URL}/auth/error?error=${error}`);
    if (!code || !state) return reply.status(400).send({ error: "Bad request", message: "Missing code or state" });
    const storedState = request.cookies.oauth_state;
    if (!storedState || storedState !== state) return reply.status(403).send({ error: "Forbidden", message: "Invalid state" });
    reply.clearCookie("oauth_state");
    if (!isGoogleConfigured) return reply.status(500).send({ error: "Server misconfiguration", message: "Google OAuth is not configured" });

    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, redirect_uri: GOOGLE_CALLBACK_URL, grant_type: "authorization_code"
        }),
      });
      const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
      if (!tokenData.access_token) throw new Error(tokenData.error ?? "Failed to get access token");

      const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const googleUser = (await userResponse.json()) as { id: string; email?: string; verified_email?: boolean; name?: string; given_name?: string; picture?: string };

      const userDAL = new UserDAL(fastify.db);
      let user = await userDAL.getByGoogleId(String(googleUser.id));
      if (!user && googleUser.email) {
        // Try linking by email if Google user didn't exist
        const existingEmailUser = await userDAL.getByEmail(googleUser.email);
        if (existingEmailUser) {
          user = await userDAL.updateProfile(existingEmailUser.id, { googleId: String(googleUser.id) } as Partial<Omit<UserRow, "id" | "createdAt">>); // cast to Partial UserRow
        }
      }

      const now = Date.now();
      if (!user) {
        user = await userDAL.create({
          id: `usr_${now}_${nanoid()}`,
          googleId: String(googleUser.id),
          email: googleUser.email,
          emailVerified: !!googleUser.verified_email,
          displayName: googleUser.name ?? googleUser.given_name ?? "User",
          avatarUrl: googleUser.picture,
          tier: "free",
          role: "user",
          isVerifiedCreator: false,
          totalPackages: 0,
          totalEarningsUsd: "0",
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        });
      } else {
        await userDAL.updateLastLogin(user.id);
      }

      const sessionDAL = new SessionDAL(fastify.db);
      const session = await sessionDAL.create({
        id: `sess_${now}_${nanoid()}`,
        userId: user.id,
        sessionToken: customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 64)(),
        expiresAt: now + 7 * 24 * 60 * 60 * 1000,
        createdAt: now,
        lastActiveAt: now,
      });

      const jwt = signJWT({ userId: user.id, userName: user.displayName, email: user.email, googleUsername: googleUser.email, tier: user.tier as "free" | "pro" | "epic" | "legendary", role: user.role as "user" | "admin" });
      reply.setCookie("session_token", session.sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60, path: "/" });
      reply.setCookie(AUTH_COOKIE_NAME, jwt, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60, path: "/" });
      return reply.redirect(`${FRONTEND_URL}/auth/success`);
    } catch (error) {
      request.log.error({ error }, "Google OAuth callback failed");
      return reply.redirect(`${FRONTEND_URL}/auth/error?error=oauth_failed`);
    }
  });

  // ─── Email & Password Auth ──────────────────────────────────────────────────

  fastify.post<{ Body: { email?: string; password?: string; displayName?: string } }>("/email/register", async (request, reply) => {
    const { email, password, displayName } = request.body;
    if (!email || !password || !displayName) return reply.status(400).send({ error: "Missing fields" });

    const userDAL = new UserDAL(fastify.db);
    const existing = await userDAL.getByEmail(email);
    if (existing) return reply.status(409).send({ error: "Email already registered" });

    const salt = crypto.randomBytes(16).toString("hex");
    const hashed = hashPassword(password, salt);
    const passwordHash = `${salt}:${hashed}`;

    const verificationToken = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 32)();
    const now = Date.now();

    await userDAL.create({
      id: `usr_${now}_${nanoid()}`,
      email,
      passwordHash,
      displayName,
      emailVerified: false,
      verificationToken,
      verificationTokenExpiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
      tier: "free",
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    if (env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: "YigYaps <noreply@yigyaps.com>",
          to: email,
          subject: "Verify your YigYaps Account",
          text: `Click the link to verify: ${env.YIGYAPS_API_URL || "http://localhost:3100"}/v1/auth/email/verify?token=${verificationToken}`,
        });
      } catch (err) {
        request.log.error({ err }, "Failed to send verification email");
      }
    }

    return reply.send({ success: true, message: "Registration successful. Please check your email to verify." });
  });

  fastify.post<{ Body: { email?: string; password?: string } }>("/email/login", async (request, reply) => {
    const { email, password } = request.body;
    if (!email || !password) return reply.status(400).send({ error: "Missing fields" });

    const userDAL = new UserDAL(fastify.db);
    const user = await userDAL.getByEmail(email);
    if (!user || !user.passwordHash) return reply.status(401).send({ error: "Invalid credentials" });

    const [salt, hash] = user.passwordHash.split(":");
    if (!salt || !hash) return reply.status(401).send({ error: "Invalid credentials" });

    const attemptHash = hashPassword(password, salt);
    if (attemptHash !== hash) return reply.status(401).send({ error: "Invalid credentials" });
    if (!user.emailVerified) return reply.status(403).send({ error: "Email not verified" });

    await userDAL.updateLastLogin(user.id);

    const now = Date.now();
    const sessionDAL = new SessionDAL(fastify.db);
    const sessionToken = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 64)();
    await sessionDAL.create({
      id: `sess_${now}_${nanoid()}`,
      userId: user.id,
      sessionToken,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      createdAt: now,
      lastActiveAt: now,
    });

    const jwt = signJWT({ userId: user.id, userName: user.displayName, email: user.email, tier: user.tier as "free" | "pro" | "epic" | "legendary", role: user.role as "user" | "admin" });
    reply.setCookie("session_token", sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60, path: "/" });
    reply.setCookie(AUTH_COOKIE_NAME, jwt, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60, path: "/" });

    return reply.send({ success: true, user: { id: user.id, displayName: user.displayName, email: user.email } });
  });

  fastify.get<{ Querystring: { token?: string } }>("/email/verify", async (request, reply) => {
    const { token } = request.query;
    if (!token) return reply.status(400).send({ error: "Missing token" });

    // Find user with this token
    const db = fastify.db;
    const { usersTable } = await import("@yigyaps/db");
    const { eq } = await import("drizzle-orm");
    const users = await db.select().from(usersTable).where(eq(usersTable.verificationToken, token)).limit(1);
    const user = users[0];

    if (!user) return reply.status(404).send({ error: "Invalid or expired token" });
    if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < Date.now()) {
      return reply.status(400).send({ error: "Token expired" });
    }

    // Mark as verified
    await db.update(usersTable).set({ emailVerified: true, verificationToken: null, verificationTokenExpiresAt: null }).where(eq(usersTable.id, user.id));

    return reply.redirect(`${FRONTEND_URL}/auth/login?verified=true`);
  });

};
