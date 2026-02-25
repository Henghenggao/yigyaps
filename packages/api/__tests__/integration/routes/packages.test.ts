/**
 * Packages Route Integration Tests
 *
 * Tests skill package CRUD operations, search, and access control.
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
import { createAdminJWT } from '../../unit/helpers/jwt-helpers.js';
import { SkillPackageDAL } from '@yigyaps/db';
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

describe('Packages Routes', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let testDb: ReturnType<typeof drizzle>;
  let serverContext: TestServerContext;
  let packageDAL: SkillPackageDAL;

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

    // Set JWT_SECRET and ADMIN_SECRET for tests
    process.env.JWT_SECRET = 'test-jwt-secret';
    // ADMIN_SECRET removed

    // Create test server
    serverContext = await createTestServer(connectionString);

    // Initialize DAL
    packageDAL = new SkillPackageDAL(testDb);
  }, 120000); // 2-minute timeout for container setup

  afterAll(async () => {
    await closeTestServer(serverContext);
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await clearDatabase(testDb);
  });

  describe('POST /v1/packages', () => {
    it('should create a new package with admin auth', async () => {
      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/packages',
        headers: {
          authorization: `Bearer ${createAdminJWT()}`,
        },
        payload: {
          packageId: 'test-package',
          version: '1.0.0',
          displayName: 'Test Package',
          description: 'A test package for integration testing',
          authorName: 'Test Author',
          license: 'open-source',
          category: 'development',
          maturity: 'stable',
          mcpTransport: 'stdio',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        packageId: 'test-package',
        version: '1.0.0',
        displayName: 'Test Package',
        description: 'A test package for integration testing',
        authorName: 'Test Author',
        license: 'open-source',
        category: 'development',
      });
      expect(body.id).toMatch(/^spkg_\d+_[a-z0-9]{6}$/);
    });

    it('should return 409 for duplicate packageId', async () => {
      // Create first package
      await packageDAL.create(
        SkillPackageFactory.create({ packageId: 'duplicate-pkg' }),
      );

      // Attempt to create duplicate
      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/packages',
        headers: {
          authorization: `Bearer ${createAdminJWT()}`,
        },
        payload: {
          packageId: 'duplicate-pkg',
          version: '1.0.0',
          displayName: 'Duplicate Package',
          description: 'This should fail due to duplicate packageId',
          authorName: 'Test Author',
        },
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Package ID already exists',
        packageId: 'duplicate-pkg',
      });
    });

    it('should return 401 without admin auth', async () => {
      const response = await serverContext.fastify.inject({
        method: 'POST',
        url: '/v1/packages',
        payload: {
          packageId: 'test-package',
          version: '1.0.0',
          displayName: 'Test Package',
          description: 'This should fail without auth',
          authorName: 'Test Author',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /v1/packages', () => {
    beforeEach(async () => {
      // Create test packages
      await packageDAL.create(
        SkillPackageFactory.create({
          packageId: 'search-test-1',
          displayName: 'Search Test 1',
          category: 'development',
          license: 'open-source',
          maturity: 'stable',
          priceUsd: '0.00',
        }),
      );
      await packageDAL.create(
        SkillPackageFactory.create({
          packageId: 'search-test-2',
          displayName: 'Search Test 2',
          category: 'productivity',
          license: 'premium',
          maturity: 'beta',
          priceUsd: '9.99',
        }),
      );
      await packageDAL.create(
        SkillPackageFactory.create({
          packageId: 'search-test-3',
          displayName: 'Search Test 3',
          category: 'development',
          license: 'free',
          maturity: 'experimental',
          priceUsd: '0.00',
        }),
      );
    });

    it('should return all packages without filters', async () => {
      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: '/v1/packages',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.packages).toHaveLength(3);
      expect(body.total).toBe(3);
    });

    it('should filter by category', async () => {
      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: '/v1/packages?category=development',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.packages).toHaveLength(2);
      expect(body.packages.every((pkg: any) => pkg.category === 'development')).toBe(true);
    });

    it('should filter by license', async () => {
      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: '/v1/packages?license=premium',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.packages).toHaveLength(1);
      expect(body.packages[0].license).toBe('premium');
    });

    it('should filter by maturity', async () => {
      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: '/v1/packages?maturity=stable',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.packages).toHaveLength(1);
      expect(body.packages[0].maturity).toBe('stable');
    });

    it('should filter by maxPriceUsd', async () => {
      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: '/v1/packages?maxPriceUsd=5',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.packages).toHaveLength(2); // Only free packages (0.00 <= 5)
      expect(body.packages.every((pkg: any) => parseFloat(pkg.priceUsd) <= 5)).toBe(true);
    });

    it('should handle pagination with limit and offset', async () => {
      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: '/v1/packages?limit=2&offset=1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.packages).toHaveLength(2);
      expect(body.total).toBe(3);
      // Note: search() returns { packages, total } without limit/offset fields
    });

    it('should support query search', async () => {
      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: '/v1/packages?query=Search%20Test%202',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.packages.length).toBeGreaterThan(0);
    });

    it('should support different sort orders', async () => {
      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: '/v1/packages?sortBy=name',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.packages).toHaveLength(3);
      // Names should be in alphabetical order
      const names = body.packages.map((pkg: any) => pkg.displayName);
      expect(names).toEqual([...names].sort());
    });
  });

  describe('GET /v1/packages/:id', () => {
    it('should return package by id', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          packageId: 'get-by-id-test',
          displayName: 'Get By ID Test',
        }),
      );

      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: `/v1/packages/${pkg.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        id: pkg.id,
        packageId: 'get-by-id-test',
        displayName: 'Get By ID Test',
      });
    });

    it('should return 404 for non-existent package', async () => {
      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: '/v1/packages/non_existent_id',
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Package not found',
      });
    });
  });

  describe('GET /v1/packages/by-pkg/:packageId', () => {
    it('should return package by packageId', async () => {
      await packageDAL.create(
        SkillPackageFactory.create({
          packageId: 'unique-package-id',
          displayName: 'Unique Package',
        }),
      );

      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: '/v1/packages/by-pkg/unique-package-id',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        packageId: 'unique-package-id',
        displayName: 'Unique Package',
      });
    });

    it('should return 404 for non-existent packageId', async () => {
      const response = await serverContext.fastify.inject({
        method: 'GET',
        url: '/v1/packages/by-pkg/non-existent-package',
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Package not found',
      });
    });
  });

  describe('PATCH /v1/packages/:id', () => {
    it('should update package by author', async () => {
      const authorId = 'usr_admin_001';

      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: authorId,
          displayName: 'Original Name',
          description: 'Original description',
        }),
      );

      const response = await serverContext.fastify.inject({
        method: 'PATCH',
        url: `/v1/packages/${pkg.id}`,
        headers: {
          authorization: `Bearer ${createAdminJWT()}`,
        },
        payload: {
          displayName: 'Updated Name',
          description: 'Updated description',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        id: pkg.id,
        displayName: 'Updated Name',
        description: 'Updated description',
      });
    });

    it('should return 403 when non-author tries to update', async () => {
      // Phase 1 limitation: requireAdminAuth always uses 'anonymous' as userId
      // So we create a package with a different author to test 403
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'different_author',
          displayName: 'Protected Package',
        }),
      );

      const response = await serverContext.fastify.inject({
        method: 'PATCH',
        url: `/v1/packages/${pkg.id}`,
        headers: {
          authorization: `Bearer ${createAdminJWT()}`,
        },
        payload: {
          displayName: 'Unauthorized Update',
        },
      });

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Not authorized to update this package',
      });
    });

    it('should return 404 for non-existent package', async () => {
      const response = await serverContext.fastify.inject({
        method: 'PATCH',
        url: '/v1/packages/non_existent_id',
        headers: {
          authorization: `Bearer ${createAdminJWT()}`,
        },
        payload: {
          displayName: 'Update Non-existent',
        },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Package not found',
      });
    });

    it('should return 401 without admin auth', async () => {
      const pkg = await packageDAL.create(
        SkillPackageFactory.create({
          author: 'usr_author_003',
        }),
      );

      const response = await serverContext.fastify.inject({
        method: 'PATCH',
        url: `/v1/packages/${pkg.id}`,
        payload: {
          displayName: 'Unauthorized Update',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
