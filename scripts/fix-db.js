
import pg from 'pg';
const { Client } = pg;

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log("Connected to database.");

        // 1. Add status column to yy_skill_packages
        await client.query("ALTER TABLE yy_skill_packages ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';");
        console.log("Ensured 'status' column in yy_skill_packages.");

        // 2. Add status column to yy_skill_package_installations (if missing)
        await client.query("ALTER TABLE yy_skill_package_installations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'installing';");
        console.log("Ensured 'status' column in yy_skill_package_installations.");

        // 3. Mark all current packages as active
        await client.query("UPDATE yy_skill_packages SET status = 'active' WHERE status IS NULL;");

    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        await client.end();
    }
}

run();
