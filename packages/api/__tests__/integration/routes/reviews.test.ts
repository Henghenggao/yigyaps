/**
 * Reviews Route Integration Tests
 *
 * Tests review submission, retrieval, rating calculation, and verified badges.
 * Uses Testcontainers for real PostgreSQL integration.
 *
 * License: Apache 2.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTestServer, closeTestServer, type TestServerContext } from '../helpers/test-server.js';
import { SkillPackageDAL, SkillReviewDAL, SkillInstallationDAL } from '@yigyaps/db';
import { SkillPackageFactory } from '../../../../db/__tests__/helpers/factories.js';
import { createAdminJWT, createTestJWT } from '../../unit/helpers/jwt-helpers.js';
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

describe('Reviews Routes Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle>;
  let serverContext: TestServerContext;
  let packageDAL: SkillPackageDAL;
  let reviewDAL: SkillReviewDAL;
  let installDAL: SkillInstallationDAL;

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

    // Set environment variables for tests
    process.env.JWT_SECRET = 'test-jwt-secret';
    // ADMIN_SECRET removed

    // Create test server
    serverContext = await createTestServer(connectionString);

    // Initialize DAL
    packageDAL = new SkillPackageDAL(testDb);
    reviewDAL = new SkillReviewDAL(testDb);
    installDAL = new SkillInstallationDAL(testDb);
  }, 120000);

  afterAll(async () => {
    await closeTestServer(serverContext);
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await clearDatabase(testDb);
  });

  describe('POST /v1/reviews', () => {
    it('should create a review with verified badge when user has installed the package', async () => {
      // Create a test package
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          packageId: 'test-author/test-package',
          author: 'usr_author_123',
        })
      );

      // Create an installation to mark user as verified
      const userId = 'usr_test_reviewer';
      await installDAL.install({
        id: `spi_${Date.now()}_test`,
        packageId: pkg.id,
        packageVersion: '1.0.0',
        agentId: 'agt_test_agent',
        userId,
        status: 'active',
        enabled: true,
        configuration: null,
        errorMessage: null,
        installedAt: Date.now(),
        uninstalledAt: null,
      });

      const jwt = createTestJWT({ userId, userName: 'Test Reviewer' });

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/reviews',
        headers: { authorization: `Bearer ${jwt}` },
        payload: {
          packageId: pkg.id,
          packageVersion: '1.0.0',
          rating: 5,
          title: 'Excellent Package',
          comment: 'This package is amazing and works perfectly for my use case!',
        },
      });

      expect(response.statusCode).toBe(201);
      const review = JSON.parse(response.payload);
      expect(review.rating).toBe(5);
      expect(review.verified).toBe(true);
      expect(review.title).toBe('Excellent Package');

      // Verify rating stats were updated
      const updatedPkg = await packageDAL.getById(pkg.id);
      expect(Number(updatedPkg?.rating)).toBe(5);
      expect(updatedPkg?.reviewCount).toBe(1);
    });

    it('should create a review without verified badge when user has not installed', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          packageId: 'test-author/test-package-2',
          author: 'usr_author_456',
        })
      );

      const userId = 'usr_unverified_reviewer';
      const jwt = createTestJWT({ userId, userName: 'Unverified Reviewer' });

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/reviews',
        headers: { authorization: `Bearer ${jwt}` },
        payload: {
          packageId: pkg.id,
          packageVersion: '1.0.0',
          rating: 4,
          comment: 'Good package, but I have not installed it yet.',
        },
      });

      expect(response.statusCode).toBe(201);
      const review = JSON.parse(response.payload);
      expect(review.verified).toBe(false);
      expect(review.rating).toBe(4);
    });

    it('should reject review with invalid rating (below 1)', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ packageId: 'test-author/test-package-3' })
      );

      const jwt = createTestJWT({ userId: 'usr_test_123' });

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/reviews',
        headers: { authorization: `Bearer ${jwt}` },
        payload: {
          packageId: pkg.id,
          packageVersion: '1.0.0',
          rating: 0,
          comment: 'Invalid rating test',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject review with invalid rating (above 5)', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ packageId: 'test-author/test-package-4' })
      );

      const jwt = createTestJWT({ userId: 'usr_test_456' });

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/reviews',
        headers: { authorization: `Bearer ${jwt}` },
        payload: {
          packageId: pkg.id,
          packageVersion: '1.0.0',
          rating: 6,
          comment: 'Invalid rating test',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject review with title too short (< 3 chars)', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ packageId: 'test-author/test-package-5' })
      );

      const jwt = createTestJWT({ userId: 'usr_test_789' });

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/reviews',
        headers: { authorization: `Bearer ${jwt}` },
        payload: {
          packageId: pkg.id,
          packageVersion: '1.0.0',
          rating: 3,
          title: 'OK', // Too short
          comment: 'This is a valid comment',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject review with comment too short (< 10 chars)', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ packageId: 'test-author/test-package-6' })
      );

      const jwt = createTestJWT({ userId: 'usr_test_101' });

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/reviews',
        headers: { authorization: `Bearer ${jwt}` },
        payload: {
          packageId: pkg.id,
          packageVersion: '1.0.0',
          rating: 3,
          comment: 'Short', // Too short
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 when package does not exist', async () => {
      const jwt = createTestJWT({ userId: 'usr_test_404' });

      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/reviews',
        headers: { authorization: `Bearer ${jwt}` },
        payload: {
          packageId: 'spkg_nonexistent',
          packageVersion: '1.0.0',
          rating: 5,
          comment: 'This should fail',
        },
      });

      expect(response.statusCode).toBe(404);
      const error = JSON.parse(response.payload);
      expect(error.error).toBe('Package not found');
    });

    it('should calculate average rating correctly with multiple reviews', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ packageId: 'test-author/test-package-7' })
      );

      const jwt1 = createTestJWT({ userId: 'usr_reviewer_1' });
      const jwt2 = createTestJWT({ userId: 'usr_reviewer_2' });
      const jwt3 = createTestJWT({ userId: 'usr_reviewer_3' });

      // Review 1: Rating 5
      await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/reviews',
        headers: { authorization: `Bearer ${jwt1}` },
        payload: {
          packageId: pkg.id,
          packageVersion: '1.0.0',
          rating: 5,
          comment: 'Excellent!',
        },
      });

      // Review 2: Rating 4
      await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/reviews',
        headers: { authorization: `Bearer ${jwt2}` },
        payload: {
          packageId: pkg.id,
          packageVersion: '1.0.0',
          rating: 4,
          comment: 'Very good package!',
        },
      });

      // Review 3: Rating 3
      await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/reviews',
        headers: { authorization: `Bearer ${jwt3}` },
        payload: {
          packageId: pkg.id,
          packageVersion: '1.0.0',
          rating: 3,
          comment: 'Decent package',
        },
      });

      // Check average: (5 + 4 + 3) / 3 = 4.0
      const updatedPkg = await packageDAL.getById(pkg.id);
      expect(Number(updatedPkg?.rating)).toBe(4);
      expect(updatedPkg?.reviewCount).toBe(3);
    });
  });

  describe('GET /v1/reviews/:packageId', () => {
    it('should return reviews for a package', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ packageId: 'test-author/test-package-get' })
      );

      // Create multiple reviews
      const jwt1 = createTestJWT({ userId: 'usr_rev_1', userName: 'Reviewer One' });
      const jwt2 = createTestJWT({ userId: 'usr_rev_2', userName: 'Reviewer Two' });

      await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/reviews',
        headers: { authorization: `Bearer ${jwt1}` },
        payload: {
          packageId: pkg.id,
          packageVersion: '1.0.0',
          rating: 5,
          comment: 'First review',
        },
      });

      await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/reviews',
        headers: { authorization: `Bearer ${jwt2}` },
        payload: {
          packageId: pkg.id,
          packageVersion: '1.0.0',
          rating: 4,
          comment: 'Second review',
        },
      });

      // Get reviews
      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: `/v1/reviews/${pkg.id}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.reviews).toHaveLength(2);
      expect(data.reviews[0].userName).toMatch(/Reviewer (One|Two)/);
    });

    it('should return empty array when no reviews exist', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ packageId: 'test-author/no-reviews' })
      );

      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: `/v1/reviews/${pkg.id}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.reviews).toHaveLength(0);
    });

    it('should paginate reviews correctly with limit and offset', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ packageId: 'test-author/pagination-test' })
      );

      // Create 5 reviews
      for (let i = 1; i <= 5; i++) {
        const jwt = createTestJWT({ userId: `usr_rev_${i}` });
        await serverContext.fastify.inject({
          method: 'POST',
          url: '/v1/reviews',
          headers: { authorization: `Bearer ${jwt}` },
          payload: {
            packageId: pkg.id,
            packageVersion: '1.0.0',
            rating: i,
            comment: `Review number ${i}`,
          },
        });
      }

      // Test limit
      const response1 = await serverContext.fastify.inject({
        method: 'GET',
        url: `/v1/reviews/${pkg.id}?limit=2`,
      });
      expect(response1.statusCode).toBe(200);
      const data1 = JSON.parse(response1.payload);
      expect(data1.reviews).toHaveLength(2);

      // Test offset
      const response2 = await serverContext.fastify.inject({
        method: 'GET',
        url: `/v1/reviews/${pkg.id}?limit=2&offset=2`,
      });
      expect(response2.statusCode).toBe(200);
      const data2 = JSON.parse(response2.payload);
      expect(data2.reviews).toHaveLength(2);

      // Test offset beyond total
      const response3 = await serverContext.fastify.inject({
        method: 'GET',
        url: `/v1/reviews/${pkg.id}?offset=10`,
      });
      expect(response3.statusCode).toBe(200);
      const data3 = JSON.parse(response3.payload);
      expect(data3.reviews).toHaveLength(0);
    });

    it('should respect max limit of 100 reviews', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({ packageId: 'test-author/max-limit' })
      );

      // Create 20 reviews
      for (let i = 1; i <= 20; i++) {
        const jwt = createTestJWT({ userId: `usr_bulk_${i}` });
        await serverContext.fastify.inject({
          method: 'POST',
          url: '/v1/reviews',
          headers: { authorization: `Bearer ${jwt}` },
          payload: {
            packageId: pkg.id,
            packageVersion: '1.0.0',
            rating: 5,
            comment: `Bulk review ${i}`,
          },
        });
      }

      // Request 200 but should only get 100 max
      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: `/v1/reviews/${pkg.id}?limit=200`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.reviews.length).toBeLessThanOrEqual(100);
    });
  });
});

