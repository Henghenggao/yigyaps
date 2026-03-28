/**
 * YigYaps Authentication Routes (Phase 2)
 *
 * GitHub OAuth login flow and session management.
 *
 * License: Apache 2.0
 */

import type { FastifyPluginAsync } from "fastify";
import { UserDAL, SessionDAL } from "@yigyaps/db";
import { signJWT, verifyJWT } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth-v2.js";
import { customAlphabet } from "nanoid";
import { env } from "../lib/env.js";
import { AUTH_COOKIE_NAME } from "../lib/constants.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/email.js";
import crypto from "node:crypto";
import { z } from "zod";

// Password hashing utility using scrypt
export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

// ─── GitHub OAuth Configuration ───────────────────────────────────────────────
// Read lazily from process.env so tests can override via beforeAll()

const getGithubClientId = () => process.env.GITHUB_CLIENT_ID ?? env.GITHUB_CLIENT_ID;
const getGithubClientSecret = () => process.env.GITHUB_CLIENT_SECRET ?? env.GITHUB_CLIENT_SECRET;
const isGithubConfigured = () => {
  const id = getGithubClientId();
  const secret = getGithubClientSecret();
  return id !== "UNCONFIGURED_GITHUB_CLIENT_ID" && secret !== "UNCONFIGURED_GITHUB_CLIENT_SECRET";
};
const getGithubCallbackUrl = () =>
  process.env.GITHUB_CALLBACK_URL ?? env.GITHUB_CALLBACK_URL ?? "http://localhost:3100/v1/auth/github/callback";
const getFrontendUrl = () => process.env.FRONTEND_URL ?? env.FRONTEND_URL;

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

// ─── Google OAuth Configuration ───────────────────────────────────────────────

const getGoogleClientId = () => process.env.GOOGLE_CLIENT_ID ?? env.GOOGLE_CLIENT_ID;
const getGoogleClientSecret = () => process.env.GOOGLE_CLIENT_SECRET ?? env.GOOGLE_CLIENT_SECRET;
const isGoogleConfigured = () => {
  const id = getGoogleClientId();
  const secret = getGoogleClientSecret();
  return id !== "UNCONFIGURED_GOOGLE_CLIENT_ID" && secret !== "UNCONFIGURED_GOOGLE_CLIENT_SECRET";
};
const getGoogleCallbackUrl = () =>
  process.env.GOOGLE_CALLBACK_URL ?? env.GOOGLE_CALLBACK_URL ?? "http://localhost:3100/v1/auth/google/callback";

// ─── Google API Types ─────────────────────────────────────────────────────────

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

// ─── Authentication Routes ────────────────────────────────────────────────────

// Rate limit configs for auth endpoints (brute-force protection)
const authRateLimit = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };
const callbackRateLimit = { config: { rateLimit: { max: 15, timeWindow: "1 minute" } } };

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /v1/auth/github - Redirect to GitHub OAuth
  fastify.get("/github", authRateLimit, async (request, reply) => {
    if (!isGithubConfigured()) {
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
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", getGithubClientId());
    authUrl.searchParams.set("redirect_uri", getGithubCallbackUrl());
    authUrl.searchParams.set("scope", "read:user user:email");
    authUrl.searchParams.set("state", state);

    return reply.redirect(authUrl.toString());
  });

  // GET /v1/auth/google - Redirect to Google OAuth
  fastify.get("/google", authRateLimit, async (request, reply) => {
    if (!isGoogleConfigured()) {
      return reply.status(500).send({
        error: "Server misconfiguration",
        message: "Google OAuth is not configured",
      });
    }

    const state = customAlphabet(
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      32,
    )();

    reply.setCookie("oauth_state", state, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", getGoogleClientId());
    authUrl.searchParams.set("redirect_uri", getGoogleCallbackUrl());
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "email profile");
    authUrl.searchParams.set("state", state);

    return reply.redirect(authUrl.toString());
  });

  // GET /v1/auth/github/callback - Handle GitHub OAuth callback
  fastify.get<{
    Querystring: { code?: string; state?: string; error?: string };
  }>("/github/callback", callbackRateLimit, async (request, reply) => {
    const { code, state, error } = request.query;

    if (error) {
      return reply.redirect(`${getFrontendUrl()}/auth/error?error=${error}`);
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

    if (!isGithubConfigured()) {
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
            client_id: getGithubClientId(),
            client_secret: getGithubClientSecret(),
            code,
            redirect_uri: getGithubCallbackUrl(),
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
        githubUsername: user.githubUsername ?? "",
        tier: user.tier as "free" | "pro" | "epic" | "legendary",
        role: user.role as "user" | "admin",
      });

      // Set session cookie
      reply.setCookie("session_token", session.sessionToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });

      // Set JWT cookie
      reply.setCookie(AUTH_COOKIE_NAME, jwt, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });

      // Redirect to frontend with JWT (no token in URL)
      return reply.redirect(`${getFrontendUrl()}/auth/success`);
    } catch (error) {
      request.log.error({ error }, "GitHub OAuth callback failed");
      return reply.redirect(`${getFrontendUrl()}/auth/error?error=oauth_failed`);
    }
  });

  // GET /v1/auth/google/callback - Handle Google OAuth callback
  fastify.get<{
    Querystring: { code?: string; state?: string; error?: string };
  }>("/google/callback", callbackRateLimit, async (request, reply) => {
    const { code, state, error } = request.query;

    if (error) {
      return reply.redirect(`${getFrontendUrl()}/auth/error?error=${error}`);
    }

    if (!code || !state) {
      return reply.status(400).send({
        error: "Bad request",
        message: "Missing code or state parameter",
      });
    }

    const storedState = request.cookies.oauth_state;
    if (!storedState || storedState !== state) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Invalid state parameter",
      });
    }

    reply.clearCookie("oauth_state");

    if (!isGoogleConfigured()) {
      return reply.status(500).send({
        error: "Server misconfiguration",
        message: "Google OAuth is not configured",
      });
    }

    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: getGoogleClientId(),
          client_secret: getGoogleClientSecret(),
          code,
          redirect_uri: getGoogleCallbackUrl(),
          grant_type: "authorization_code",
        }),
      });

      const tokenData = (await tokenResponse.json()) as {
        access_token?: string;
        error?: string;
      };

      if (!tokenData.access_token) {
        throw new Error(tokenData.error ?? "Failed to get access token");
      }

      const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const googleUser = (await userResponse.json()) as GoogleUser;

      const userDAL = new UserDAL(fastify.db);
      let user = await userDAL.getByGoogleId(googleUser.id);

      const now = Date.now();
      if (!user) {
        user = await userDAL.create({
          id: `usr_${now}_${nanoid()}`,
          googleId: googleUser.id,
          githubUsername: null,
          email: googleUser.email,
          displayName: googleUser.name || googleUser.email.split("@")[0],
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
        sessionToken: customAlphabet(
          "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
          64,
        )(),
        expiresAt: now + 7 * 24 * 60 * 60 * 1000,
        createdAt: now,
        lastActiveAt: now,
        ipAddress: request.headers["x-forwarded-for"]?.toString() ?? request.ip,
        userAgent: request.headers["user-agent"],
      });

      const jwt = signJWT({
        userId: user.id,
        userName: user.displayName,
        githubUsername: user.githubUsername ?? "",
        tier: user.tier as "free" | "pro" | "epic" | "legendary",
        role: user.role as "user" | "admin",
      });

      reply.setCookie("session_token", session.sessionToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      reply.setCookie(AUTH_COOKIE_NAME, jwt, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return reply.redirect(`${getFrontendUrl()}/auth/success`);
    } catch (error) {
      request.log.error({ error }, "Google OAuth callback failed");
      return reply.redirect(`${getFrontendUrl()}/auth/error?error=oauth_failed`);
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

  // POST /v1/auth/accept-terms - Record user acceptance of Terms of Service
  fastify.post(
    "/accept-terms",
    { preHandler: requireAuth() },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Not authenticated",
        });
      }

      const acceptedAt = Date.now();

      // Persist acceptance timestamp to yy_users
      const userDAL = new UserDAL(fastify.db);
      await userDAL.updateProfile(request.user.userId, {
        termsAcceptedAt: acceptedAt,
      });

      return reply.send({
        success: true,
        userId: request.user.userId,
        acceptedAt,
      });
    },
  );

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
    const newJwt = signJWT({ userId: user.id, userName: user.displayName, githubUsername: user.githubUsername ?? "", tier: user.tier as "free" | "pro" | "epic" | "legendary", role: user.role as "user" | "admin" });
    reply.setCookie(AUTH_COOKIE_NAME, newJwt, { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60, path: "/" });
    return reply.send({ refreshed: true, user: { id: user.id, githubUsername: user.githubUsername, displayName: user.displayName, email: user.email, avatarUrl: user.avatarUrl, tier: user.tier, role: user.role } });
  });

  // ─── Email/Password Authentication ───────────────────────────────────────────

  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    displayName: z.string().min(1).max(100),
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  // Helper: issue session + JWT cookies for a user
  const issueAuthCookies = async (
    user: { id: string; displayName: string; githubUsername: string | null; tier: string; role: string },
    request: import("fastify").FastifyRequest,
    reply: import("fastify").FastifyReply,
  ) => {
    const now = Date.now();
    const sessionDAL = new SessionDAL(fastify.db);
    const session = await sessionDAL.create({
      id: `sess_${now}_${nanoid()}`,
      userId: user.id,
      sessionToken: customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 64)(),
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      createdAt: now,
      lastActiveAt: now,
      ipAddress: request.headers["x-forwarded-for"]?.toString() ?? request.ip,
      userAgent: request.headers["user-agent"],
    });

    const jwt = signJWT({
      userId: user.id,
      userName: user.displayName,
      githubUsername: user.githubUsername ?? "",
      tier: user.tier as "free" | "pro" | "epic" | "legendary",
      role: user.role as "user" | "admin",
    });

    reply.setCookie("session_token", session.sessionToken, {
      httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, path: "/",
    });
    reply.setCookie(AUTH_COOKIE_NAME, jwt, {
      httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, path: "/",
    });
  };

  // POST /v1/auth/register - Email/password registration
  const registerRateLimit = { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } };
  fastify.post("/register", registerRateLimit, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Validation failed",
        details: parsed.error.issues,
      });
    }

    const { email, password, displayName } = parsed.data;
    const userDAL = new UserDAL(fastify.db);

    // Check if email already registered
    const existing = await userDAL.getByEmail(email);
    if (existing) {
      return reply.status(409).send({
        error: "Conflict",
        message: "An account with this email already exists",
      });
    }

    // Hash password with scrypt
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = hashPassword(password, salt);
    const passwordHashStr = `${salt}:${hash}`;

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24h

    const now = Date.now();
    const user = await userDAL.create({
      id: `usr_${now}_${nanoid()}`,
      email,
      displayName,
      passwordHash: passwordHashStr,
      emailVerified: false,
      verificationToken,
      verificationTokenExpiresAt: verificationExpiry,
      tier: "free",
      role: "user",
      isVerifiedCreator: false,
      totalPackages: 0,
      totalEarningsUsd: "0",
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    // Send verification email (non-blocking)
    sendVerificationEmail(email, verificationToken).catch((err) => {
      request.log.error({ err }, "Failed to send verification email");
    });

    // Issue auth cookies immediately (user can use account, but some actions may require verified email)
    await issueAuthCookies(user, request, reply);

    return reply.status(201).send({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      emailVerified: false,
      message: "Account created. Please check your email to verify your address.",
    });
  });

  // POST /v1/auth/login - Email/password login
  const loginRateLimit = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };
  fastify.post("/login", loginRateLimit, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Validation failed",
        details: parsed.error.issues,
      });
    }

    const { email, password } = parsed.data;
    const userDAL = new UserDAL(fastify.db);
    const user = await userDAL.getByEmail(email);

    // Generic error to avoid user enumeration
    const invalidMsg = "Invalid email or password";

    if (!user || !user.passwordHash) {
      return reply.status(401).send({ error: "Unauthorized", message: invalidMsg });
    }

    // Verify password
    const [salt, storedHash] = user.passwordHash.split(":");
    const attemptHash = hashPassword(password, salt);
    if (!crypto.timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(attemptHash, "hex"))) {
      return reply.status(401).send({ error: "Unauthorized", message: invalidMsg });
    }

    // Update last login
    await userDAL.updateLastLogin(user.id);

    // Issue auth cookies
    await issueAuthCookies(user, request, reply);

    return reply.send({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      tier: user.tier,
      role: user.role,
    });
  });

  // POST /v1/auth/verify-email - Verify email with token
  fastify.post<{ Body: { token: string } }>("/verify-email", async (request, reply) => {
    const { token } = request.body ?? {};
    if (!token || typeof token !== "string") {
      return reply.status(400).send({ error: "Bad Request", message: "Missing verification token" });
    }

    const userDAL = new UserDAL(fastify.db);
    // Find user by verification token (scan is fine — small table, rare operation)
    const { eq } = await import("drizzle-orm");
    const { usersTable } = await import("@yigyaps/db");
    const rows = await fastify.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.verificationToken, token))
      .limit(1);

    const user = rows[0];
    if (!user) {
      return reply.status(400).send({ error: "Bad Request", message: "Invalid or expired verification token" });
    }

    if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < Date.now()) {
      return reply.status(400).send({ error: "Bad Request", message: "Verification token has expired" });
    }

    // Mark email as verified, clear token
    await userDAL.updateProfile(user.id, {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    });

    return reply.send({ success: true, message: "Email verified successfully" });
  });

  // POST /v1/auth/resend-verification - Resend verification email
  fastify.post("/resend-verification", { preHandler: requireAuth(), ...registerRateLimit }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: "Unauthorized", message: "Not authenticated" });
    }

    const userDAL = new UserDAL(fastify.db);
    const user = await userDAL.getById(request.user.userId);
    if (!user) {
      return reply.status(404).send({ error: "Not found", message: "User not found" });
    }

    if (user.emailVerified) {
      return reply.send({ success: true, message: "Email already verified" });
    }

    if (!user.email) {
      return reply.status(400).send({ error: "Bad Request", message: "No email address on file" });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    await userDAL.updateProfile(user.id, {
      verificationToken,
      verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    await sendVerificationEmail(user.email, verificationToken);

    return reply.send({ success: true, message: "Verification email sent" });
  });

  // POST /v1/auth/forgot-password - Send password reset email
  const forgotRateLimit = { config: { rateLimit: { max: 3, timeWindow: "1 minute" } } };
  fastify.post("/forgot-password", forgotRateLimit, async (request, reply) => {
    const body = request.body as { email?: string };
    const email = body?.email;
    if (!email || typeof email !== "string") {
      return reply.status(400).send({ error: "Bad Request", message: "Email is required" });
    }

    const userDAL = new UserDAL(fastify.db);
    const user = await userDAL.getByEmail(email);

    // Always return success to prevent user enumeration
    if (!user || !user.passwordHash) {
      return reply.send({ success: true, message: "If an account exists, a reset email has been sent" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    await userDAL.updateProfile(user.id, {
      verificationToken: resetToken,
      verificationTokenExpiresAt: Date.now() + 60 * 60 * 1000, // 1h
    });

    await sendPasswordResetEmail(email, resetToken);

    return reply.send({ success: true, message: "If an account exists, a reset email has been sent" });
  });

  // POST /v1/auth/reset-password - Reset password with token
  fastify.post("/reset-password", forgotRateLimit, async (request, reply) => {
    const body = request.body as { token?: string; password?: string };
    const { token, password } = body ?? {};

    if (!token || !password || typeof token !== "string" || typeof password !== "string") {
      return reply.status(400).send({ error: "Bad Request", message: "Token and password are required" });
    }

    if (password.length < 8 || password.length > 128) {
      return reply.status(400).send({ error: "Bad Request", message: "Password must be 8-128 characters" });
    }

    const { eq } = await import("drizzle-orm");
    const { usersTable } = await import("@yigyaps/db");
    const rows = await fastify.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.verificationToken, token))
      .limit(1);

    const user = rows[0];
    if (!user) {
      return reply.status(400).send({ error: "Bad Request", message: "Invalid or expired reset token" });
    }

    if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < Date.now()) {
      return reply.status(400).send({ error: "Bad Request", message: "Reset token has expired" });
    }

    // Hash new password
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = hashPassword(password, salt);

    const userDAL = new UserDAL(fastify.db);
    await userDAL.updateProfile(user.id, {
      passwordHash: `${salt}:${hash}`,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    });

    // Invalidate all existing sessions (force re-login after password change)
    const sessionDAL = new SessionDAL(fastify.db);
    const sessions = await sessionDAL.getByUser(user.id);
    for (const s of sessions) {
      await sessionDAL.deleteById(s.id);
    }

    return reply.send({ success: true, message: "Password reset successfully. Please log in." });
  });
};
