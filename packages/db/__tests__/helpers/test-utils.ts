import { sql } from 'drizzle-orm';
import { db } from './test-db.js';

export async function clearDatabase() {
  // 只清理当前迁移中实际存在的表
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
