/**
 * YigYaps API Key Management Routes
 *
 * POST   /v1/auth/api-keys       — Generate a new API key
 * GET    /v1/auth/api-keys       — List user's API keys
 * DELETE /v1/auth/api-keys/:id   — Revoke an API key
 *
 * License: Apache 2.0
 */

import type { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { z } from 'zod';
import { ApiKeyDAL } from '@yigyaps/db';
import { requireAuth } from '../middleware/auth-v2.js';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).optional().default([]),
  expiresInDays: z.number().int().min(1).max(365).optional(),
  /**
   * Must be true to confirm acceptance of the Anti-Training EULA (Terms Section 4).
   * Callers that omit or set this to false receive a 400 with a link to the terms.
   */
  accepted_anti_training_terms: z.literal(true, {
    errorMap: () => ({
      message:
        "You must accept the Anti-Training Terms of Service (accepted_anti_training_terms: true). See /terms for details.",
    }),
  }),
});

// ─── API Key Routes ───────────────────────────────────────────────────────────

export const apiKeysRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/auth/api-keys — Generate a new API key
  fastify.post(
    '/api-keys',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Not authenticated',
        });
      }

      const parsed = createApiKeySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.issues,
        });
      }

      const { name, scopes, expiresInDays } = parsed.data;
      const termsAcceptedAt = Date.now();

      // Generate a random 32-byte key with yg_ prefix
      const rawKey = 'yg_' + crypto.randomBytes(32).toString('hex');
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      // 'yg_' + first 7 hex chars = 10 chars total as prefix
      const keyPrefix = rawKey.substring(0, 10);

      const now = Date.now();
      const expiresAt = expiresInDays
        ? now + expiresInDays * 24 * 60 * 60 * 1000
        : undefined;

      const apiKeyDAL = new ApiKeyDAL(fastify.db);
      const apiKey = await apiKeyDAL.create({
        id: 'ak_' + now + '_' + crypto.randomBytes(4).toString('hex'),
        userId,
        name,
        keyHash,
        keyPrefix,
        scopes: scopes ?? [],
        expiresAt,
        termsAcceptedAt,
        createdAt: now,
      });

      // Return the plaintext key ONCE — it is never stored again
      return reply.status(201).send({
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt ?? null,
        createdAt: apiKey.createdAt,
      });
    },
  );

  // GET /v1/auth/api-keys — List user's API keys (no plaintext key returned)
  fastify.get(
    '/api-keys',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Not authenticated',
        });
      }

      const apiKeyDAL = new ApiKeyDAL(fastify.db);
      const keys = await apiKeyDAL.listByUser(userId);

      // Return only safe metadata — no plaintext key, no hash
      const safeKeys = keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        keyHint: k.keyPrefix + '...',
        scopes: k.scopes,
        expiresAt: k.expiresAt ?? null,
        lastUsedAt: k.lastUsedAt ?? null,
        revokedAt: k.revokedAt ?? null,
        createdAt: k.createdAt,
      }));

      return reply.send({ apiKeys: safeKeys });
    },
  );

  // DELETE /v1/auth/api-keys/:id — Revoke an API key
  fastify.delete(
    '/api-keys/:id',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Not authenticated',
        });
      }

      const { id } = (request.params as { id: string });
      const apiKeyDAL = new ApiKeyDAL(fastify.db);
      const apiKey = await apiKeyDAL.getById(id);

      if (!apiKey) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'API key not found',
        });
      }

      // Ownership check: key must belong to the authenticated user
      if (apiKey.userId !== userId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to revoke this API key',
        });
      }

      // Check if already revoked
      if (apiKey.revokedAt) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'API key has already been revoked',
        });
      }

      const revoked = await apiKeyDAL.revoke(id);

      return reply.send({
        id: revoked.id,
        name: revoked.name,
        revokedAt: revoked.revokedAt,
        message: 'API key revoked successfully',
      });
    },
  );
};
