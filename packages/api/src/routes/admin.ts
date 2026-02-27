/**
 * YigYaps Admin Routes
 *
 * All routes require admin role. First admin must be set via SQL:
 *   UPDATE yy_users SET role = 'admin' WHERE github_username = 'your-username';
 *
 * GET  /v1/admin/stats                — Platform statistics
 * GET  /v1/admin/packages             — List all packages (including archived/banned)
 * PATCH /v1/admin/packages/:id/status — Change package status
 * GET  /v1/admin/users               — List all users
 * PATCH /v1/admin/users/:id/role     — Change user role
 * PATCH /v1/admin/users/:id/status   — Suspend/activate user
 * GET  /v1/admin/reports             — List content reports
 * PATCH /v1/admin/reports/:id        — Resolve or dismiss a report
 *
 * License: Apache 2.0
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SkillPackageDAL, UserDAL } from "@yigyaps/db";
import { requireAuth } from "../middleware/auth-v2.js";
import { eq, desc, sql } from "drizzle-orm";
import {
  skillPackagesTable,
  skillPackageInstallationsTable,
  skillPackageReviewsTable,
  usersTable,
  reportsTable,
} from "@yigyaps/db";

const packageStatusSchema = z.object({
  status: z.enum(["active", "archived", "banned"]),
  reason: z.string().max(500).optional(),
});

const userRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

const userStatusSchema = z.object({
  suspended: z.boolean(),
  reason: z.string().max(500).optional(),
});

const reportActionSchema = z.object({
  action: z.enum(["resolve", "dismiss"]),
  note: z.string().max(500).optional(),
});

export async function adminRoutes(fastify: FastifyInstance) {
  const adminAuth = requireAuth(["admin"]);

  // ── Platform Statistics ───────────────────────────────────────────────────
  fastify.get(
    "/stats",
    { preHandler: adminAuth },
    async (_request, reply) => {
      const [
        totalUsers,
        totalPackages,
        totalInstalls,
        todayUsers,
        todayPackages,
        pendingReports,
      ] = await Promise.all([
        fastify.db
          .select({ count: sql<number>`count(*)::int` })
          .from(usersTable),
        fastify.db
          .select({ count: sql<number>`count(*)::int` })
          .from(skillPackagesTable),
        fastify.db
          .select({
            total: sql<number>`COALESCE(SUM(install_count), 0)::int`,
          })
          .from(skillPackagesTable),
        fastify.db
          .select({ count: sql<number>`count(*)::int` })
          .from(usersTable)
          .where(
            sql`created_at > ${Date.now() - 86_400_000}`,
          ),
        fastify.db
          .select({ count: sql<number>`count(*)::int` })
          .from(skillPackagesTable)
          .where(
            sql`created_at > ${Date.now() - 86_400_000}`,
          ),
        fastify.db
          .select({ count: sql<number>`count(*)::int` })
          .from(reportsTable)
          .where(eq(reportsTable.status, "pending")),
      ]);

      return reply.send({
        users: {
          total: totalUsers[0]?.count ?? 0,
          today: todayUsers[0]?.count ?? 0,
        },
        packages: {
          total: totalPackages[0]?.count ?? 0,
          today: todayPackages[0]?.count ?? 0,
        },
        installs: {
          total: totalInstalls[0]?.total ?? 0,
        },
        reports: {
          pending: pendingReports[0]?.count ?? 0,
        },
      });
    },
  );

  // ── Package Management ────────────────────────────────────────────────────
  fastify.get(
    "/packages",
    { preHandler: adminAuth },
    async (request, reply) => {
      const { limit = 50, offset = 0, status } = request.query as {
        limit?: number;
        offset?: number;
        status?: string;
      };

      const conditions = status
        ? [eq(skillPackagesTable.status, status as "active" | "archived" | "banned")]
        : [];

      const packages = await fastify.db
        .select()
        .from(skillPackagesTable)
        .where(conditions.length > 0 ? conditions[0] : undefined)
        .orderBy(desc(skillPackagesTable.createdAt))
        .limit(Math.min(Number(limit), 200))
        .offset(Number(offset));

      return reply.send({ packages });
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    "/packages/:id/status",
    { preHandler: adminAuth },
    async (request, reply) => {
      const parsed = packageStatusSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Bad Request",
          details: parsed.error.issues,
        });
      }

      const packageDAL = new SkillPackageDAL(fastify.db);
      const pkg = await packageDAL.getById(request.params.id);
      if (!pkg) {
        return reply.code(404).send({ error: "Package not found" });
      }

      const updated = await packageDAL.update(request.params.id, {
        status: parsed.data.status,
      });

      request.log.info(
        {
          adminId: request.user?.userId,
          packageId: request.params.id,
          newStatus: parsed.data.status,
          reason: parsed.data.reason,
        },
        "Admin changed package status",
      );

      return reply.send(updated);
    },
  );

  // ── User Management ───────────────────────────────────────────────────────
  fastify.get(
    "/users",
    { preHandler: adminAuth },
    async (request, reply) => {
      const { limit = 50, offset = 0, query } = request.query as {
        limit?: number;
        offset?: number;
        query?: string;
      };

      const users = await fastify.db
        .select()
        .from(usersTable)
        .where(
          query
            ? sql`github_username ILIKE ${"%" + query + "%"} OR display_name ILIKE ${"%" + query + "%"}`
            : undefined,
        )
        .orderBy(desc(usersTable.createdAt))
        .limit(Math.min(Number(limit), 200))
        .offset(Number(offset));

      return reply.send({ users });
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    "/users/:id/role",
    { preHandler: adminAuth },
    async (request, reply) => {
      const parsed = userRoleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Bad Request", details: parsed.error.issues });
      }

      const userDAL = new UserDAL(fastify.db);
      const user = await userDAL.getById(request.params.id);
      if (!user) return reply.code(404).send({ error: "User not found" });

      const updated = await userDAL.updateProfile(request.params.id, {
        role: parsed.data.role,
      });

      request.log.info(
        { adminId: request.user?.userId, targetUserId: request.params.id, newRole: parsed.data.role },
        "Admin changed user role",
      );

      return reply.send(updated);
    },
  );

  // ── Reports Management ────────────────────────────────────────────────────
  fastify.get(
    "/reports",
    { preHandler: adminAuth },
    async (request, reply) => {
      const { status = "pending" } = request.query as { status?: string };

      const reports = await fastify.db
        .select()
        .from(reportsTable)
        .where(
          status !== "all"
            ? eq(reportsTable.status, status as "pending" | "resolved" | "dismissed")
            : undefined,
        )
        .orderBy(desc(reportsTable.createdAt))
        .limit(100);

      return reply.send({ reports });
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    "/reports/:id",
    { preHandler: adminAuth },
    async (request, reply) => {
      const parsed = reportActionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Bad Request", details: parsed.error.issues });
      }

      const newStatus =
        parsed.data.action === "resolve" ? "resolved" : "dismissed";

      await fastify.db
        .update(reportsTable)
        .set({
          status: newStatus,
          resolvedAt: Date.now(),
          resolvedBy: request.user?.userId ?? null,
          adminNote: parsed.data.note ?? null,
        })
        .where(eq(reportsTable.id, request.params.id));

      return reply.send({ success: true, status: newStatus });
    },
  );
}
