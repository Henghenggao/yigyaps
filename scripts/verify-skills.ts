#!/usr/bin/env tsx
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../packages/db/src/schema/index.js";
import 'dotenv/config';

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
    if (!DATABASE_URL) {
        console.error("Error: DATABASE_URL environment variable is required.");
        return;
    }
    const pool = new Pool({ connectionString: DATABASE_URL });
    const db = drizzle(pool, { schema });

    const skills = await db.select().from(schema.skillPackagesTable);
    console.log("Current skills in database:");
    console.log(JSON.stringify(skills.map(s => ({
        id: s.id,
        packageId: s.packageId,
        displayName: s.displayName,
        status: s.status,
        author: s.author
    })), null, 2));

    await pool.end();
}

main().catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
});
