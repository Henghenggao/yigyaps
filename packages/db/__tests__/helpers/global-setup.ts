import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function setup() {
  console.log("🚀 Starting PostgreSQL test container...");

  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("yigyaps_test")
    .withUsername("test_user")
    .withPassword("test_password")
    .start();

  const connectionString = container.getConnectionUri();
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  // 运行迁移
  const migrationsPath = path.resolve(__dirname, "../../migrations");
  console.log(`📂 Migrations folder: ${migrationsPath}`);

  try {
    await migrate(db, { migrationsFolder: migrationsPath });
    console.log("✅ Migrations completed successfully");

    // 验证表是否真的存在
    const result = await pool.query(`
      SELECT tablename FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    console.log(
      "📋 Created tables:",
      result.rows.map((r) => r.tablename).join(", "),
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }

  console.log("✅ Test database ready");

  // 保存连接信息到环境变量及文件
  process.env.TEST_DATABASE_URL = connectionString;
  const envPath = path.resolve(__dirname, "../../.test-db-env.json");
  fs.writeFileSync(
    envPath,
    JSON.stringify({ TEST_DATABASE_URL: connectionString }),
  );

  return async () => {
    await pool.end();
    await container.stop();
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
    }
    console.log("🛑 Test container stopped");
  };
}

export async function teardown() {
  // Cleanup已经在setup的返回函数中处理
}
