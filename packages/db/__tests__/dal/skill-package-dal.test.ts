import { describe, it, expect, beforeEach } from 'vitest';
import { SkillPackageDAL } from '../../src/dal/skill-package-dal.js';
import { SkillPackageFactory } from '../helpers/factories.js';
import { clearDatabase } from '../helpers/test-utils.js';
import { db } from '../helpers/test-db.js';

describe('SkillPackageDAL', () => {
  const dal = new SkillPackageDAL(db);

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('create', () => {
    it('should create a new skill package', async () => {
      const packageData = SkillPackageFactory.create();
      const result = await dal.create(packageData);

      expect(result).toMatchObject({
        id: packageData.id,
        packageId: packageData.packageId,
        displayName: packageData.displayName,
      });
    });

    it('should fail with duplicate packageId', async () => {
      const packageData = SkillPackageFactory.create();
      await dal.create(packageData);

      const duplicate = SkillPackageFactory.create({
        packageId: packageData.packageId
      });

      await expect(dal.create(duplicate)).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should retrieve package by id', async () => {
      const packageData = SkillPackageFactory.create();
      await dal.create(packageData);

      const result = await dal.getById(packageData.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(packageData.id);
      expect(result?.displayName).toBe(packageData.displayName);
    });

    it('should return null for non-existent id', async () => {
      const result = await dal.getById('non_existent_id');
      expect(result).toBeNull();
    });
  });

  describe('getByPackageId', () => {
    it('should retrieve package by packageId', async () => {
      const packageData = SkillPackageFactory.create();
      await dal.create(packageData);

      const result = await dal.getByPackageId(packageData.packageId);

      expect(result).not.toBeNull();
      expect(result?.packageId).toBe(packageData.packageId);
    });

    it('should return null for non-existent packageId', async () => {
      const result = await dal.getByPackageId('non_existent_pkg');
      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await dal.create(SkillPackageFactory.create({
        category: 'development',
        displayName: 'Test Dev Tool',
        tags: ['typescript', 'testing'],
        priceUsd: '10.00',
        maturity: 'stable',
      }));

      await dal.create(SkillPackageFactory.create({
        category: 'productivity',
        displayName: 'Productivity Helper',
        tags: ['workflow'],
        priceUsd: '0.00',
        maturity: 'beta',
      }));

      await dal.create(SkillPackageFactory.create({
        category: 'development',
        displayName: 'Another Dev Package',
        tags: ['javascript'],
        priceUsd: '25.00',
        maturity: 'stable',
      }));
    });

    it('should search by query string', async () => {
      const result = await dal.search({ query: 'Test' });
      expect(result.total).toBe(1);
      expect(result.packages[0].displayName).toContain('Test');
    });

    it('should filter by category', async () => {
      const result = await dal.search({ category: 'development' });
      expect(result.total).toBe(2);
      expect(result.packages.every(p => p.category === 'development')).toBe(true);
    });

    it('should filter by maxPriceUsd', async () => {
      const result = await dal.search({ maxPriceUsd: 5 });
      expect(result.total).toBe(1);
      expect(Number(result.packages[0].priceUsd)).toBeLessThanOrEqual(5);
    });

    it('should filter by maturity', async () => {
      const result = await dal.search({ maturity: 'stable' });
      expect(result.total).toBe(2);
      expect(result.packages.every(p => p.maturity === 'stable')).toBe(true);
    });

    it('should handle pagination', async () => {
      const page1 = await dal.search({ limit: 2, offset: 0 });
      const page2 = await dal.search({ limit: 2, offset: 2 });

      expect(page1.packages).toHaveLength(2);
      expect(page2.packages).toHaveLength(1);
      expect(page1.packages[0].id).not.toBe(page2.packages[0].id);
    });

    it('should return empty result for no matches', async () => {
      const result = await dal.search({ query: 'NonExistentPackage' });
      expect(result.total).toBe(0);
      expect(result.packages).toHaveLength(0);
    });

    it('should combine multiple filters', async () => {
      const result = await dal.search({
        category: 'development',
        maxPriceUsd: 15,
      });
      expect(result.total).toBe(1);
      expect(result.packages[0].displayName).toBe('Test Dev Tool');
    });
  });

  describe('incrementInstallCount', () => {
    it('should increment install count atomically', async () => {
      const pkg = await dal.create(SkillPackageFactory.create());

      await Promise.all([
        dal.incrementInstallCount(pkg.id),
        dal.incrementInstallCount(pkg.id),
        dal.incrementInstallCount(pkg.id),
      ]);

      const updated = await dal.getById(pkg.id);
      expect(updated?.installCount).toBe(3);
    });
  });

  describe('updateRatingStats', () => {
    it('should update rating statistics', async () => {
      const pkg = await dal.create(SkillPackageFactory.create());

      await dal.updateRatingStats(pkg.id, 4.5, 10, 8);

      const updated = await dal.getById(pkg.id);
      expect(Number(updated?.rating)).toBe(4.5);
      expect(updated?.ratingCount).toBe(10);
      expect(updated?.reviewCount).toBe(8);
    });
  });

  describe('update', () => {
    it('should update package fields', async () => {
      const pkg = await dal.create(SkillPackageFactory.create());

      const result = await dal.update(pkg.id, {
        displayName: 'Updated Name',
        description: 'Updated description',
        priceUsd: '50.00',
      });

      expect(result.displayName).toBe('Updated Name');
      expect(result.description).toBe('Updated description');
      expect(result.priceUsd).toBe('50.00');
    });

    it('should return null for non-existent package', async () => {
      const result = await dal.update('non_existent_id', { displayName: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('getByAuthor', () => {
    it('should retrieve packages by author', async () => {
      const authorId = `usr_${Date.now()}`;

      await dal.create(SkillPackageFactory.create({ author: authorId }));
      await dal.create(SkillPackageFactory.create({ author: authorId }));
      await dal.create(SkillPackageFactory.create()); // Different author

      const result = await dal.getByAuthor(authorId);

      expect(result).toHaveLength(2);
      expect(result.every(p => p.author === authorId)).toBe(true);
    });

    it('should return empty array for author with no packages', async () => {
      const result = await dal.getByAuthor('non_existent_author');
      expect(result).toHaveLength(0);
    });
  });
});
