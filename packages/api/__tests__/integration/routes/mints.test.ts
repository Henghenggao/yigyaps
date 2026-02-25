/**
 * Mints Route Integration Tests
 *
 * Tests limited edition minting, quality gates, and royalty earnings.
 * Uses Testcontainers for real PostgreSQL integration.
 *
 * License: Apache 2.0
 */

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTestServer, closeTestServer, type TestServerContext } from '../helpers/test-server.js';
import { SkillPackageDAL, SkillMintDAL, RoyaltyLedgerDAL } from '@yigyaps/db';
import { SkillPackageFactory } from '../../../../db/__tests__/helpers/factories.js';
import { sql } from 'drizzle-orm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local database cleanup function for integration tests
async function clearDatabase(db: any) {
  const tables = [
    'yy_royalty_ledger',
    'yy_skill_package_reviews',
    'yy_skill_package_installations',
    'yy_skill_mints',
    'yy_skill_packages',
  ];

  for (const table of tables) {
    await db.execute(sql.raw(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`));
  }
}

describe('Mints Routes', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle>;
  let serverContext: TestServerContext;
  let packageDAL: SkillPackageDAL;
  let mintDAL: SkillMintDAL;
  let royaltyLedgerDAL: RoyaltyLedgerDAL;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('yigyaps_test')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    const connectionString = container.getConnectionUri();
    pool = new Pool({ connectionString });
    testDb = drizzle(pool);

    // Run migrations
    const migrationsPath = path.resolve(__dirname, '../../../../db/migrations');
    await migrate(testDb, { migrationsFolder: migrationsPath });

    // Set JWT_SECRET for tests (no ADMIN_SECRET needed - mints routes don't use it)
    process.env.JWT_SECRET = 'test-jwt-secret';

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

  describe('POST /v1/mints', () => {
    it('should create a common mint successfully', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'anonymous', // Default userId from routes
          packageId: 'test-common-mint',
        }),
      );

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/mints',
        payload: {
          skillPackageId: pkg.id,
          rarity: 'common',
          creatorRoyaltyPercent: 70,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        skillPackageId: pkg.id,
        rarity: 'common',
        maxEditions: null, // Common has unlimited editions
        creatorId: 'anonymous',
        creatorRoyaltyPercent: '70.00',
        origin: 'manual',
      });
      expect(body.id).toMatch(/^smint_\d+_[a-z0-9]{6}$/);
    });

    it('should create a rare mint with graduation certificate', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'anonymous',
          packageId: 'test-rare-mint',
        }),
      );

      const graduationCert = {
        lab: 'yigstudio-lab',
        version: '1.0',
        skillId: 'test-rare-mint',
        qualityScore: 95,
        issuedAt: Date.now(),
        signature: 'test-signature',
      };

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/mints',
        payload: {
          skillPackageId: pkg.id,
          rarity: 'rare',
          creatorRoyaltyPercent: 80,
          graduationCertificate: graduationCert,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        skillPackageId: pkg.id,
        rarity: 'rare',
        maxEditions: 1000,
        creatorId: 'anonymous',
        creatorRoyaltyPercent: '80.00',
        origin: 'beta-lab',
      });
      expect(body.graduationCertificate).toEqual(graduationCert);
    });

    it('should create an epic mint with correct max editions', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'anonymous',
          packageId: 'test-epic-mint',
        }),
      );

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/mints',
        payload: {
          skillPackageId: pkg.id,
          rarity: 'epic',
          graduationCertificate: { verified: true },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        rarity: 'epic',
        maxEditions: 100,
        origin: 'beta-lab',
      });
    });

    it('should create a legendary mint with correct max editions', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'anonymous',
          packageId: 'test-legendary-mint',
        }),
      );

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/mints',
        payload: {
          skillPackageId: pkg.id,
          rarity: 'legendary',
          graduationCertificate: { verified: true },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        rarity: 'legendary',
        maxEditions: 10,
        origin: 'beta-lab',
      });
    });

    it('should allow custom maxEditions', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'anonymous',
          packageId: 'test-custom-max',
        }),
      );

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/mints',
        payload: {
          skillPackageId: pkg.id,
          rarity: 'rare',
          maxEditions: 500, // Custom instead of default 1000
          graduationCertificate: { verified: true },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.maxEditions).toBe(500);
    });

    it('should return 404 for non-existent package', async () => {
      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/mints',
        payload: {
          skillPackageId: 'non_existent_pkg',
          rarity: 'common',
        },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Package not found',
      });
    });

    it('should return 403 when non-author tries to mint', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'different_author',
          packageId: 'protected-package',
        }),
      );

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/mints',
        payload: {
          skillPackageId: pkg.id,
          rarity: 'common',
        },
      });

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Not authorized to mint this package',
      });
    });

    it('should return 409 for duplicate mint', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'anonymous',
          packageId: 'duplicate-mint-test',
        }),
      );

      // Create first mint
      await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/mints',
        payload: {
          skillPackageId: pkg.id,
          rarity: 'common',
        },
      });

      // Attempt duplicate mint
      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/mints',
        payload: {
          skillPackageId: pkg.id,
          rarity: 'rare',
          graduationCertificate: { verified: true },
        },
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Package already minted',
      });
      expect(JSON.parse(response.body).mint).toBeDefined();
    });

    it('should return 422 when rare mint lacks graduation certificate', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'anonymous',
          packageId: 'rare-no-cert',
        }),
      );

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/mints',
        payload: {
          skillPackageId: pkg.id,
          rarity: 'rare',
          // Missing graduationCertificate
        },
      });

      expect(response.statusCode).toBe(422);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'graduationCertificate is required for Rare+ minting',
      });
    });

    it('should return 422 when epic mint lacks graduation certificate', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'anonymous',
          packageId: 'epic-no-cert',
        }),
      );

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/mints',
        payload: {
          skillPackageId: pkg.id,
          rarity: 'epic',
        },
      });

      expect(response.statusCode).toBe(422);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'graduationCertificate is required for Rare+ minting',
      });
    });

    it('should return 422 when legendary mint lacks graduation certificate', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'anonymous',
          packageId: 'legendary-no-cert',
        }),
      );

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/mints',
        payload: {
          skillPackageId: pkg.id,
          rarity: 'legendary',
        },
      });

      expect(response.statusCode).toBe(422);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'graduationCertificate is required for Rare+ minting',
      });
    });

    it('should accept common mint without graduation certificate', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'anonymous',
          packageId: 'common-no-cert',
        }),
      );

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/mints',
        payload: {
          skillPackageId: pkg.id,
          rarity: 'common',
          // No graduationCertificate - should be OK for common
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.rarity).toBe('common');
      expect(body.graduationCertificate).toBeNull();
    });
  });

  describe('GET /v1/mints/my-earnings', () => {
    it('should return zero earnings for new creator', async () => {
      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: '/v1/mints/my-earnings',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        totalUsd: '0', // getTotalEarnings returns '0' for zero, not '0.0000'
        count: 0,
        recent: [],
      });
    });

    it('should return earnings summary after installations', async () => {
      // Create package and mint
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'anonymous',
          priceUsd: '50.00',
          packageId: 'earnings-test',
        }),
      );

      const mint = await mintDAL.create({
        id: `smint_${Date.now()}_test`,
        skillPackageId: pkg.id,
        rarity: 'common',
        maxEditions: null,
        creatorId: 'anonymous',
        creatorRoyaltyPercent: '70.00',
        graduationCertificate: null,
        origin: 'manual',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create royalty ledger entries (simulating installations)
      await royaltyLedgerDAL.create({
        id: `rled_${Date.now()}_001`,
        skillPackageId: pkg.id,
        creatorId: 'anonymous',
        buyerId: 'buyer_001',
        installationId: 'inst_001',
        grossAmountUsd: '50.00',
        royaltyAmountUsd: '35.00',
        royaltyPercent: '70.00',
        createdAt: Date.now(),
      });

      await royaltyLedgerDAL.create({
        id: `rled_${Date.now()}_002`,
        skillPackageId: pkg.id,
        creatorId: 'anonymous',
        buyerId: 'buyer_002',
        installationId: 'inst_002',
        grossAmountUsd: '50.00',
        royaltyAmountUsd: '35.00',
        royaltyPercent: '70.00',
        createdAt: Date.now() + 1000,
      });

      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: '/v1/mints/my-earnings',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.count).toBe(2);
      expect(Number(body.totalUsd)).toBeCloseTo(70.0, 2); // 35 + 35
      expect(body.recent).toHaveLength(2);
      expect(body.recent[0]).toMatchObject({
        creatorId: 'anonymous',
        grossAmountUsd: '50.0000',
        royaltyAmountUsd: '35.0000',
      });
    });

    it('should limit recent earnings to 20 entries', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'anonymous',
          priceUsd: '10.00',
        }),
      );

      const mint = await mintDAL.create({
        id: `smint_${Date.now()}_test`,
        skillPackageId: pkg.id,
        rarity: 'common',
        maxEditions: null,
        creatorId: 'anonymous',
        creatorRoyaltyPercent: '70.00',
        graduationCertificate: null,
        origin: 'manual',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create 25 royalty entries
      for (let i = 0; i < 25; i++) {
        await royaltyLedgerDAL.create({
          id: `rled_${Date.now()}_${i}`,
          skillPackageId: pkg.id,
          creatorId: 'anonymous',
          buyerId: `buyer_${i}`,
          installationId: `inst_${i}`,
          grossAmountUsd: '10.00',
          royaltyAmountUsd: '7.00',
          royaltyPercent: '70.00',
          createdAt: Date.now() + i,
        });
      }

      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: '/v1/mints/my-earnings',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.count).toBe(25);
      expect(body.recent).toHaveLength(20); // Limited to 20
      expect(Number(body.totalUsd)).toBeCloseTo(175.0, 2); // 25 * 7
    });
  });
});
