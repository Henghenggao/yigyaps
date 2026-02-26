/**
 * Installations Route Integration Tests
 *
 * Tests skill package installation, uninstallation, and royalty calculation.
 * Uses Testcontainers for real PostgreSQL integration.
 *
 * License: Apache 2.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";
import {
  createTestServer,
  closeTestServer,
  type TestServerContext,
} from "../helpers/test-server.js";
import { SkillPackageDAL, SkillMintDAL, RoyaltyLedgerDAL } from "@yigyaps/db";
import {
  SkillPackageFactory,
  SkillMintFactory,
} from "../../../../db/__tests__/helpers/factories.js";
import { createTestJWT } from "../../unit/helpers/jwt-helpers.js";
import { sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local database cleanup function for integration tests
async function clearDatabase(db: any) {
  const tables = [
    "yy_royalty_ledger",
    "yy_skill_package_reviews",
    "yy_skill_package_installations",
    "yy_skill_mints",
    "yy_skill_packages",
  ];

  for (const table of tables) {
    await db.execute(
      sql.raw(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`),
    );
  }
}

describe("POST /v1/installations", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle>;
  let serverContext: TestServerContext;
  let packageDAL: SkillPackageDAL;
  let mintDAL: SkillMintDAL;
  let royaltyLedgerDAL: RoyaltyLedgerDAL;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("yigyaps_test")
      .withUsername("test_user")
      .withPassword("test_password")
      .start();

    const connectionString = container.getConnectionUri();
    pool = new Pool({ connectionString });
    testDb = drizzle(pool);

    // Run migrations
    const migrationsPath = path.resolve(__dirname, "../../../../db/migrations");
    await migrate(testDb, { migrationsFolder: migrationsPath });

    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = "test-jwt-secret";

    // Create test server
    serverContext = await createTestServer(connectionString);

    // Initialize DALs
    packageDAL = new SkillPackageDAL(testDb);
    mintDAL = new SkillMintDAL(testDb);
    royaltyLedgerDAL = new RoyaltyLedgerDAL(testDb);
  }, 120000); // 2-minute timeout for container setup

  afterAll(async () => {
    await closeTestServer(serverContext);
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await clearDatabase(testDb);
  });

  describe("Basic Installation", () => {
    it("should install a free package successfully", async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          packageId: "test-free-pkg",
          priceUsd: "0.00",
          requiredTier: 0,
        }),
      );

      const response = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/installations",
        headers: {
          authorization: `Bearer ${createTestJWT({ userId: "usr_test_123", tier: "legendary", role: "user" })}`,
        },
        payload: {
          packageId: pkg.id,
          agentId: "agt_test_001",
          userTier: "free",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        packageId: pkg.id,
        agentId: "agt_test_001",
        status: "active",
        enabled: true,
      });

      // Verify install count incremented
      const updatedPkg = await packageDAL.getById(pkg.id);
      expect(updatedPkg?.installCount).toBe(1);
    });

    it("should return 404 for non-existent package", async () => {
      const response = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/installations",
        headers: {
          authorization: `Bearer ${createTestJWT({ userId: "usr_test_123", tier: "legendary", role: "user" })}`,
        },
        payload: {
          packageId: "non_existent_pkg",
          agentId: "agt_test_001",
        },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toMatchObject({
        error: "Package not found",
      });
    });
  });

  describe("Tier Checking", () => {
    it("should block free tier user from installing pro package", async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          requiredTier: 1, // Pro tier required
        }),
      );

      const response = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/installations",
        headers: {
          authorization: `Bearer ${createTestJWT({ userId: "usr_test_123", tier: "legendary", role: "user" })}`,
        },
        payload: {
          packageId: pkg.id,
          agentId: "agt_test_001",
          userTier: "free",
        },
      });

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body)).toMatchObject({
        error: "Subscription tier required",
        requiredTier: 1,
        currentTier: "free",
      });
    });

    it("should allow pro tier user to install pro package", async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          requiredTier: 1, // Pro tier required
        }),
      );

      const response = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/installations",
        headers: {
          authorization: `Bearer ${createTestJWT({ userId: "usr_test_123", tier: "legendary", role: "user" })}`,
        },
        payload: {
          packageId: pkg.id,
          agentId: "agt_test_001",
          userTier: "pro",
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe("Royalty Calculation", () => {
    it("should calculate royalty correctly for paid package", async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: "usr_creator_123",
          priceUsd: "100.00",
          requiredTier: 0, // No tier requirement
        }),
      );

      await mintDAL.create(
        SkillMintFactory.create(pkg.id, {
          creatorId: "usr_creator_123",
          creatorRoyaltyPercent: "80.00", // 80% royalty
        }),
      );

      const response = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/installations",
        headers: {
          authorization: `Bearer ${createTestJWT({ userId: "usr_test_123", tier: "legendary", role: "user" })}`,
        },
        payload: {
          packageId: pkg.id,
          agentId: "agt_test_001",
        },
      });

      if (response.statusCode !== 201) {
        console.log("Response status:", response.statusCode);
        console.log("Response body:", response.body);
      }
      expect(response.statusCode).toBe(201);

      // Verify royalty ledger entry
      const ledgers = await royaltyLedgerDAL.getByCreator("usr_creator_123");
      expect(ledgers).toHaveLength(1);
      expect(ledgers[0]).toMatchObject({
        skillPackageId: pkg.id,
        creatorId: "usr_creator_123",
        grossAmountUsd: "100.0000",
        royaltyAmountUsd: "80.0000", // 80% of 100
        royaltyPercent: "80.00",
      });
    });

    it("should use default 70% royalty when not specified", async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: "usr_creator_456",
          priceUsd: "50.00",
          requiredTier: 0,
        }),
      );

      await mintDAL.create(
        SkillMintFactory.create(pkg.id, {
          creatorId: "usr_creator_456",
          // creatorRoyaltyPercent not specified, should default to 70%
        }),
      );

      await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/installations",
        headers: {
          authorization: `Bearer ${createTestJWT({ userId: "usr_test_123", tier: "legendary", role: "user" })}`,
        },
        payload: {
          packageId: pkg.id,
          agentId: "agt_test_002",
        },
      });

      const ledgers = await royaltyLedgerDAL.getByCreator("usr_creator_456");
      expect(ledgers).toHaveLength(1);
      expect(Number(ledgers[0].royaltyAmountUsd)).toBeCloseTo(35.0, 2); // 70% of 50
    });

    it("should not create royalty entry for free package", async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: "usr_creator_789",
          priceUsd: "0.00", // Free package
          requiredTier: 0,
        }),
      );

      await mintDAL.create(
        SkillMintFactory.create(pkg.id, {
          creatorId: "usr_creator_789",
        }),
      );

      await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/installations",
        headers: {
          authorization: `Bearer ${createTestJWT({ userId: "usr_test_123", tier: "legendary", role: "user" })}`,
        },
        payload: {
          packageId: pkg.id,
          agentId: "agt_test_003",
        },
      });

      // No royalty entry for free package
      const ledgers = await royaltyLedgerDAL.getByCreator("usr_creator_789");
      expect(ledgers).toHaveLength(0);
    });
  });

  describe("Limited Edition Minting", () => {
    it("should increment minted count when installing limited edition", async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ requiredTier: 0 }),
      );

      const mint = await mintDAL.create(
        SkillMintFactory.create(pkg.id, {
          rarity: "rare",
          maxEditions: 1000,
          mintedCount: 0,
        }),
      );

      await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/installations",
        headers: {
          authorization: `Bearer ${createTestJWT({ userId: "usr_test_123", tier: "legendary", role: "user" })}`,
        },
        payload: {
          packageId: pkg.id,
          agentId: "agt_test_004",
        },
      });

      const updatedMint = await mintDAL.getBySkillPackageId(pkg.id);
      expect(updatedMint?.mintedCount).toBe(1);
    });

    it("should block installation when edition limit reached", async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ requiredTier: 0 }),
      );

      await mintDAL.create(
        SkillMintFactory.create(pkg.id, {
          rarity: "epic",
          maxEditions: 2,
          mintedCount: 2, // Limit already reached
        }),
      );

      const response = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/installations",
        headers: {
          authorization: `Bearer ${createTestJWT({ userId: "usr_test_123", tier: "legendary", role: "user" })}`,
        },
        payload: {
          packageId: pkg.id,
          agentId: "agt_test_005",
        },
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body)).toMatchObject({
        error: "Edition limit reached",
        rarity: "epic",
        maxEditions: 2,
      });
    });
  });

  describe("Duplicate Installation Check", () => {
    it("should block duplicate installation by same user", async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ requiredTier: 0 }),
      );

      // First installation
      await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/installations",
        headers: {
          authorization: `Bearer ${createTestJWT({ userId: "usr_test_123", tier: "legendary", role: "user" })}`,
        },
        payload: {
          packageId: pkg.id,
          agentId: "agt_test_006",
        },
      });

      // Attempt duplicate installation
      const response = await serverContext.fastify.inject({
        method: "POST",
        url: "/v1/installations",
        headers: {
          authorization: `Bearer ${createTestJWT({ userId: "usr_test_123", tier: "legendary", role: "user" })}`,
        },
        payload: {
          packageId: pkg.id,
          agentId: "agt_test_006",
        },
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body)).toMatchObject({
        error: "Package already installed",
      });
    });
  });
});

describe("DELETE /v1/installations/:id", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle>;
  let serverContext: TestServerContext;
  let packageDAL: SkillPackageDAL;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("yigyaps_test")
      .withUsername("test_user")
      .withPassword("test_password")
      .start();

    const connectionString = container.getConnectionUri();
    pool = new Pool({ connectionString });
    testDb = drizzle(pool);

    const migrationsPath = path.resolve(__dirname, "../../../../db/migrations");
    await migrate(testDb, { migrationsFolder: migrationsPath });

    process.env.JWT_SECRET = "test-jwt-secret";

    serverContext = await createTestServer(connectionString);
    packageDAL = new SkillPackageDAL(testDb);
  }, 120000);

  afterAll(async () => {
    await closeTestServer(serverContext);
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await clearDatabase(testDb);
  });

  it("should uninstall package successfully", async () => {
    const pkg = await packageDAL.create(
      SkillPackageFactory.create({ requiredTier: 0 }),
    );

    // Install first
    const installResponse = await serverContext.fastify.inject({
      method: "POST",
      url: "/v1/installations",
      headers: {
        authorization: `Bearer ${createTestJWT({ userId: "usr_test_123", tier: "legendary", role: "user" })}`,
      },
      payload: {
        packageId: pkg.id,
        agentId: "agt_test_007",
      },
    });

    const installation = JSON.parse(installResponse.body);

    // Then uninstall
    const response = await serverContext.fastify.inject({
      method: "DELETE",
      url: `/v1/installations/${installation.id}`,
      headers: {
        authorization: `Bearer ${createTestJWT({ userId: "usr_test_123", tier: "legendary", role: "user" })}`,
      },
    });

    expect(response.statusCode).toBe(204);
  });

  it("should return 404 for non-existent installation", async () => {
    const response = await serverContext.fastify.inject({
      method: "DELETE",
      url: "/v1/installations/non_existent_id",
      headers: {
        authorization: `Bearer ${createTestJWT({ userId: "usr_test_123", tier: "legendary", role: "user" })}`,
      },
    });

    expect(response.statusCode).toBe(404);
  });
});
