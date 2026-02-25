import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// 从globalSetup设置的环境变量获取数据库连接
const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  throw new Error('TEST_DATABASE_URL is not set. Make sure globalSetup is configured.');
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

export { db, pool };
