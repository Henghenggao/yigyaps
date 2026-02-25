/**
 * Concurrent Stress Tests - Race Condition Detection
 *
 * Tests limited edition minting under high concurrency to detect overselling bugs.
 * This is CRITICAL for platform credibility - limited editions must be truly limited.
 *
 * Expected Failures (until race condition is fixed):
 * - Legendary editions may exceed 10 limit
 * - Epic editions may exceed 100 limit
 *
 * License: Apache 2.0
 */

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTestJWT } from '../../unit/helpers/jwt-helpers.js';

import { createTestServer, closeTestServer, type TestServerContext } from '../helpers/test-server.js';
import { SkillPackageDAL, SkillMintDAL } from '@yigyaps/db';
import { SkillPackageFactory, SkillMintFactory } from '../../../../db/__tests__/helpers/factories.js';
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

describe('Concurrent Stress Tests - Race Condition Detection', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle>;
  let serverContext: TestServerContext;
  let packageDAL: SkillPackageDAL;
  let mintDAL: SkillMintDAL;

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

    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-jwt-secret';

    // Create test server
    serverContext = await createTestServer(connectionString);

    // Initialize DALs
    packageDAL = new SkillPackageDAL(testDb);
    mintDAL = new SkillMintDAL(testDb);
  }, 120000); // 2-minute timeout for container setup

  afterAll(async () => {
    await closeTestServer(serverContext);
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await clearDatabase(testDb);
  });

  describe('🚨 Legendary Edition Race Condition (maxEditions: 10)', () => {
    it('should prevent overselling under 20 concurrent requests', async () => {
      // Setup: Create a Legendary edition package (limit: 10)
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          packageId: 'legendary-test',
          priceUsd: '100.00',
          requiredTier: 0,
        }),
      );

      await mintDAL.create(
        SkillMintFactory.create(pkg.id, {
          rarity: 'legendary',
          maxEditions: 10,
          mintedCount: 0,
        }),
      );

      // Attack: 20 concurrent installation requests
      const concurrentRequests = 20;
      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        serverContext.fastify.inject({
          method: 'POST',
          url: '/v1/installations',
          headers: { authorization: `Bearer ${createTestJWT({ userId: `usr_test_${i}`, tier: 'legendary', role: 'user' })}` },
          payload: {
            packageId: pkg.id,
            agentId: `agt_concurrent_${i}`,
            userTier: 'free',
          },
        }),
      );

      // Execute all requests concurrently
      const responses = await Promise.all(requests);

      // Count successes and failures
      const successes = responses.filter((r) => r.statusCode === 201);
      const editionLimitErrors = responses.filter(
        (r) => r.statusCode === 409 && JSON.parse(r.body).error === 'Edition limit reached',
      );
      const duplicateErrors = responses.filter(
        (r) => r.statusCode === 409 && JSON.parse(r.body).error === 'Package already installed',
      );

      // Verify final state
      const finalMint = await mintDAL.getBySkillPackageId(pkg.id);

      console.log('\n🚨 Legendary Edition Race Condition Results:');
      console.log(`   Concurrent requests: ${concurrentRequests}`);
      console.log(`   Successful installations: ${successes.length}`);
      console.log(`   Edition limit errors (409): ${editionLimitErrors.length}`);
      console.log(`   Duplicate install errors: ${duplicateErrors.length}`);
      console.log(`   Final mintedCount: ${finalMint?.mintedCount}`);
      console.log(`   Expected limit: 10`);

      if (successes.length > 10) {
        console.log(`   ❌ OVERSOLD: ${successes.length - 10} extra editions!`);
      } else {
        console.log(`   ✅ No overselling detected`);
      }

      // Critical assertions
      expect(finalMint?.mintedCount).toBeLessThanOrEqual(10); // Should NOT oversell
      expect(successes.length).toBeLessThanOrEqual(10); // Should NOT accept > 10 installs
      expect(successes.length + editionLimitErrors.length + duplicateErrors.length).toBe(
        concurrentRequests,
      ); // All requests accounted for
    });

    it('should handle exact limit boundary (9 → 10 simultaneous requests)', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          packageId: 'legendary-boundary',
          requiredTier: 0,
        }),
      );

      await mintDAL.create(
        SkillMintFactory.create(pkg.id, {
          rarity: 'legendary',
          maxEditions: 10,
          mintedCount: 9, // Start at 9, only 1 spot left
        }),
      );

      // 5 concurrent requests racing for the last spot
      const requests = Array.from({ length: 5 }, (_, i) =>
        serverContext.fastify.inject({
          method: 'POST',
          url: '/v1/installations',
          headers: { authorization: `Bearer ${createTestJWT({ userId: `usr_test_${i}`, tier: 'legendary', role: 'user' })}` },
          payload: {
            packageId: pkg.id,
            agentId: `agt_boundary_${i}`,
          },
        }),
      );

      const responses = await Promise.all(requests);
      const successes = responses.filter((r) => r.statusCode === 201);
      const finalMint = await mintDAL.getBySkillPackageId(pkg.id);

      console.log('\n🎯 Boundary Test (9 → 10):');
      console.log(`   Successful installations: ${successes.length}`);
      console.log(`   Final mintedCount: ${finalMint?.mintedCount}`);

      expect(finalMint?.mintedCount).toBe(10); // Should be exactly 10
      expect(successes.length).toBe(1); // Only 1 request should succeed
    });
  });

  describe('⚡ Epic Edition Race Condition (maxEditions: 100)', () => {
    it('should prevent overselling under 150 concurrent requests', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          packageId: 'epic-test',
          priceUsd: '50.00',
          requiredTier: 0,
        }),
      );

      await mintDAL.create(
        SkillMintFactory.create(pkg.id, {
          rarity: 'epic',
          maxEditions: 100,
          mintedCount: 0,
        }),
      );

      // Attack: 150 concurrent requests for 100 editions
      const concurrentRequests = 150;
      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        serverContext.fastify.inject({
          method: 'POST',
          url: '/v1/installations',
          headers: { authorization: `Bearer ${createTestJWT({ userId: `usr_test_${i}`, tier: 'legendary', role: 'user' })}` },
          payload: {
            packageId: pkg.id,
            agentId: `agt_epic_${i}`,
          },
        }),
      );

      const responses = await Promise.all(requests);
      const successes = responses.filter((r) => r.statusCode === 201);
      const finalMint = await mintDAL.getBySkillPackageId(pkg.id);

      console.log('\n⚡ Epic Edition Race Condition Results:');
      console.log(`   Concurrent requests: ${concurrentRequests}`);
      console.log(`   Successful installations: ${successes.length}`);
      console.log(`   Final mintedCount: ${finalMint?.mintedCount}`);
      console.log(`   Expected limit: 100`);

      if (successes.length > 100) {
        console.log(`   ❌ OVERSOLD: ${successes.length - 100} extra editions!`);
      }

      expect(finalMint?.mintedCount).toBeLessThanOrEqual(100);
      expect(successes.length).toBeLessThanOrEqual(100);
    });
  });

  describe('🔥 Rare Edition Race Condition (maxEditions: 1000)', () => {
    it('should prevent overselling under 1200 concurrent requests', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          packageId: 'rare-test',
          priceUsd: '10.00',
          requiredTier: 0,
        }),
      );

      await mintDAL.create(
        SkillMintFactory.create(pkg.id, {
          rarity: 'rare',
          maxEditions: 1000,
          mintedCount: 0,
        }),
      );

      // Attack: 1200 concurrent requests for 1000 editions
      const concurrentRequests = 1200;
      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        serverContext.fastify.inject({
          method: 'POST',
          url: '/v1/installations',
          headers: { authorization: `Bearer ${createTestJWT({ userId: `usr_test_${i}`, tier: 'legendary', role: 'user' })}` },
          payload: {
            packageId: pkg.id,
            agentId: `agt_rare_${i}`,
          },
        }),
      );

      const responses = await Promise.all(requests);
      const successes = responses.filter((r) => r.statusCode === 201);
      const finalMint = await mintDAL.getBySkillPackageId(pkg.id);

      console.log('\n🔥 Rare Edition Race Condition Results:');
      console.log(`   Concurrent requests: ${concurrentRequests}`);
      console.log(`   Successful installations: ${successes.length}`);
      console.log(`   Final mintedCount: ${finalMint?.mintedCount}`);
      console.log(`   Expected limit: 1000`);

      if (successes.length > 1000) {
        console.log(`   ❌ OVERSOLD: ${successes.length - 1000} extra editions!`);
      }

      expect(finalMint?.mintedCount).toBeLessThanOrEqual(1000);
      expect(successes.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('✅ Common Edition (No Limit)', () => {
    it('should allow unlimited concurrent installations', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          packageId: 'common-test',
          priceUsd: '0.00',
          requiredTier: 0,
        }),
      );

      await mintDAL.create(
        SkillMintFactory.create(pkg.id, {
          rarity: 'common',
          maxEditions: null, // Unlimited
          mintedCount: 0,
        }),
      );

      // Common editions should handle any number of concurrent requests
      const concurrentRequests = 100;
      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        serverContext.fastify.inject({
          method: 'POST',
          url: '/v1/installations',
          headers: { authorization: `Bearer ${createTestJWT({ userId: `usr_test_${i}`, tier: 'legendary', role: 'user' })}` },
          payload: {
            packageId: pkg.id,
            agentId: `agt_common_${i}`,
          },
        }),
      );

      const responses = await Promise.all(requests);
      const successes = responses.filter((r) => r.statusCode === 201);
      const finalMint = await mintDAL.getBySkillPackageId(pkg.id);

      console.log('\n✅ Common Edition (Unlimited):');
      console.log(`   Concurrent requests: ${concurrentRequests}`);
      console.log(`   Successful installations: ${successes.length}`);
      console.log(`   Final mintedCount: ${finalMint?.mintedCount}`);

      expect(successes.length).toBe(concurrentRequests); // All should succeed
      expect(finalMint?.mintedCount).toBe(concurrentRequests);
    });
  });

  describe('📊 Performance Metrics', () => {
    it('should complete 100 concurrent requests within reasonable time', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          packageId: 'perf-test',
          requiredTier: 0,
        }),
      );

      await mintDAL.create(
        SkillMintFactory.create(pkg.id, {
          rarity: 'epic',
          maxEditions: 100,
          mintedCount: 0,
        }),
      );

      const start = Date.now();
      const requests = Array.from({ length: 100 }, (_, i) =>
        serverContext.fastify.inject({
          method: 'POST',
          url: '/v1/installations',
          headers: { authorization: `Bearer ${createTestJWT({ userId: `usr_test_${i}`, tier: 'legendary', role: 'user' })}` },
          payload: {
            packageId: pkg.id,
            agentId: `agt_perf_${i}`,
          },
        }),
      );

      await Promise.all(requests);
      const elapsed = Date.now() - start;

      console.log(`\n📊 Performance: 100 concurrent requests completed in ${elapsed}ms`);
      console.log(`   Average: ${(elapsed / 100).toFixed(2)}ms per request`);

      expect(elapsed).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
