/**
 * Authentication Middleware Tests (Phase 2)
 *
 * Comprehensive tests for JWT, API Key, and ADMIN_SECRET authentication.
 * Tests both optionalAuth and requireAuth middleware.
 *
 * License: Apache 2.0
 */

import { optionalAuth, requireAuth, type UserContext } from '../../../src/middleware/auth-v2.js';
import { createTestJWT, createAdminJWT, createExpiredJWT } from '../helpers/jwt-helpers.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

// ─── Mock Helpers ─────────────────────────────────────────────────────────────

interface MockRequest extends Partial<FastifyRequest> {
  headers: Record<string, string | undefined>;
  user?: UserContext;
  log?: {
    warn: (msg: string) => void;
  };
  server: {
    db: any;
  };
}

interface MockReply extends Partial<FastifyReply> {
  statusCode?: number;
  sentPayload?: any;
}

function createMockRequest(authHeader?: string): MockRequest {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    log: {
      warn: () => {},
    },
    server: {
      db: {}, // Mock database connection
    },
  };
}

function createMockReply(): MockReply {
  const reply: MockReply = {
    statusCode: 200,
    sentPayload: null,
  };

  reply.status = function (code: number) {
    this.statusCode = code;
    return this;
  } as any;

  reply.send = function (payload: any) {
    this.sentPayload = payload;
    return this;
  } as any;

  return reply;
}

// ─── optionalAuth Tests ───────────────────────────────────────────────────────

describe('optionalAuth', () => {
  beforeEach(() => {
    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';
  });

  it('should continue without user context when no Authorization header', async () => {
    const mockRequest = createMockRequest();
    const mockReply = createMockReply();

    await optionalAuth(mockRequest as any, mockReply as any);

    expect(mockRequest.user).toBeUndefined();
  });

  it('should attach user context from valid JWT', async () => {
    const token = createTestJWT({
      userId: 'usr_123',
      userName: 'John Doe',
      githubUsername: 'johndoe',
      tier: 'pro',
      role: 'user',
    });

    const mockRequest = createMockRequest(`Bearer ${token}`);
    const mockReply = createMockReply();

    await optionalAuth(mockRequest as any, mockReply as any);

    expect(mockRequest.user).toMatchObject({
      userId: 'usr_123',
      userName: 'John Doe',
      tier: 'pro',
      role: 'user',
      authMethod: 'jwt',
    });
  });

  it('should attach admin user context from valid JWT', async () => {
    const token = createAdminJWT();

    const mockRequest = createMockRequest(`Bearer ${token}`);
    const mockReply = createMockReply();

    await optionalAuth(mockRequest as any, mockReply as any);

    expect(mockRequest.user).toMatchObject({
      userId: 'usr_admin_001',
      role: 'admin',
      tier: 'legendary',
      authMethod: 'jwt',
    });
  });

  it('should continue without user context for expired JWT', async () => {
    const token = createExpiredJWT();

    // Wait a bit to ensure token is expired
    await new Promise((resolve) => setTimeout(resolve, 100));

    const mockRequest = createMockRequest(`Bearer ${token}`);
    const mockReply = createMockReply();

    await optionalAuth(mockRequest as any, mockReply as any);

    expect(mockRequest.user).toBeUndefined();
  });

  it('should continue without user context for invalid JWT', async () => {
    const mockRequest = createMockRequest('Bearer invalid.token.here');
    const mockReply = createMockReply();

    await optionalAuth(mockRequest as any, mockReply as any);

    expect(mockRequest.user).toBeUndefined();
  });

  it('should continue without user context for invalid Authorization format', async () => {
    const mockRequest = createMockRequest('InvalidFormat token123');
    const mockReply = createMockReply();

    await optionalAuth(mockRequest as any, mockReply as any);

    expect(mockRequest.user).toBeUndefined();
  });

  it('should continue without user context when Bearer token is missing', async () => {
    const mockRequest = createMockRequest('Bearer ');
    const mockReply = createMockReply();

    await optionalAuth(mockRequest as any, mockReply as any);

    expect(mockRequest.user).toBeUndefined();
  });

  it('should attach admin context from valid ADMIN_SECRET', async () => {
    process.env.ADMIN_SECRET = 'super-secret-admin-key';

    const mockRequest = createMockRequest('Bearer super-secret-admin-key');
    const mockReply = createMockReply();

    await optionalAuth(mockRequest as any, mockReply as any);

    expect(mockRequest.user).toMatchObject({
      userId: 'usr_admin_legacy',
      userName: 'Admin',
      tier: 'legendary',
      role: 'admin',
      authMethod: 'admin_secret',
    });

    delete process.env.ADMIN_SECRET;
  });

  it('should continue without user context when ADMIN_SECRET does not match', async () => {
    process.env.ADMIN_SECRET = 'correct-secret';

    const mockRequest = createMockRequest('Bearer wrong-secret');
    const mockReply = createMockReply();

    await optionalAuth(mockRequest as any, mockReply as any);

    expect(mockRequest.user).toBeUndefined();

    delete process.env.ADMIN_SECRET;
  });
});

// ─── requireAuth Tests ────────────────────────────────────────────────────────

describe('requireAuth', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';
  });

  it('should return 401 when no Authorization header', async () => {
    const mockRequest = createMockRequest();
    const mockReply = createMockReply();

    const middleware = requireAuth();
    await middleware(mockRequest as any, mockReply as any);

    expect(mockReply.statusCode).toBe(401);
    expect(mockReply.sentPayload).toMatchObject({
      error: 'Unauthorized',
      message: 'Missing Authorization header',
    });
  });

  it('should return 401 for invalid Authorization format', async () => {
    const mockRequest = createMockRequest('InvalidFormat token123');
    const mockReply = createMockReply();

    const middleware = requireAuth();
    await middleware(mockRequest as any, mockReply as any);

    expect(mockReply.statusCode).toBe(401);
    expect(mockReply.sentPayload).toMatchObject({
      error: 'Unauthorized',
      message: 'Invalid Authorization header format. Expected: Bearer <token>',
    });
  });

  it('should return 401 when Bearer token is missing', async () => {
    const mockRequest = createMockRequest('Bearer ');
    const mockReply = createMockReply();

    const middleware = requireAuth();
    await middleware(mockRequest as any, mockReply as any);

    expect(mockReply.statusCode).toBe(401);
  });

  it('should attach user context from valid JWT', async () => {
    const token = createTestJWT({
      userId: 'usr_456',
      userName: 'Jane Smith',
      tier: 'epic',
      role: 'user',
    });

    const mockRequest = createMockRequest(`Bearer ${token}`);
    const mockReply = createMockReply();

    const middleware = requireAuth();
    await middleware(mockRequest as any, mockReply as any);

    expect(mockRequest.user).toMatchObject({
      userId: 'usr_456',
      userName: 'Jane Smith',
      tier: 'epic',
      role: 'user',
      authMethod: 'jwt',
    });
    expect(mockReply.statusCode).toBe(200); // No error
  });

  it('should return 403 for expired JWT', async () => {
    const token = createExpiredJWT();

    // Wait a bit to ensure token is expired
    await new Promise((resolve) => setTimeout(resolve, 100));

    const mockRequest = createMockRequest(`Bearer ${token}`);
    const mockReply = createMockReply();

    const middleware = requireAuth();
    await middleware(mockRequest as any, mockReply as any);

    expect(mockReply.statusCode).toBe(403);
    expect(mockReply.sentPayload).toMatchObject({
      error: 'Forbidden',
      message: 'Invalid credentials',
    });
  });

  it('should return 403 for invalid JWT', async () => {
    const mockRequest = createMockRequest('Bearer invalid.token.here');
    const mockReply = createMockReply();

    const middleware = requireAuth();
    await middleware(mockRequest as any, mockReply as any);

    expect(mockReply.statusCode).toBe(403);
    expect(mockReply.sentPayload).toMatchObject({
      error: 'Forbidden',
      message: 'Invalid credentials',
    });
  });

  it('should attach admin context from valid ADMIN_SECRET', async () => {
    process.env.ADMIN_SECRET = 'admin-secret-key';

    const mockRequest = createMockRequest('Bearer admin-secret-key');
    const mockReply = createMockReply();

    let warnCalled = false;
    mockRequest.log = {
      warn: (msg: string) => {
        warnCalled = true;
        expect(msg).toContain('deprecated');
      },
    };

    const middleware = requireAuth();
    await middleware(mockRequest as any, mockReply as any);

    expect(mockRequest.user).toMatchObject({
      userId: 'usr_admin_legacy',
      role: 'admin',
      authMethod: 'admin_secret',
    });
    expect(warnCalled).toBe(true); // Deprecation warning logged
    expect(mockReply.statusCode).toBe(200);

    delete process.env.ADMIN_SECRET;
  });

  it('should return 403 when ADMIN_SECRET does not match', async () => {
    process.env.ADMIN_SECRET = 'correct-admin-secret';

    const mockRequest = createMockRequest('Bearer wrong-admin-secret');
    const mockReply = createMockReply();

    const middleware = requireAuth();
    await middleware(mockRequest as any, mockReply as any);

    expect(mockReply.statusCode).toBe(403);

    delete process.env.ADMIN_SECRET;
  });

  it('should handle different user tiers correctly', async () => {
    const tiers: Array<'free' | 'pro' | 'epic' | 'legendary'> = [
      'free',
      'pro',
      'epic',
      'legendary',
    ];

    for (const tier of tiers) {
      const token = createTestJWT({
        userId: `usr_${tier}`,
        tier,
        role: 'user',
      });

      const mockRequest = createMockRequest(`Bearer ${token}`);
      const mockReply = createMockReply();

      const middleware = requireAuth();
      await middleware(mockRequest as any, mockReply as any);

      expect(mockRequest.user?.tier).toBe(tier);
    }
  });
});
