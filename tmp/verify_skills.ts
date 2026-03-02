
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./packages/db/src/schema/index.js";
import { sql } from "drizzle-orm";

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
    if (!DATABASE_URL) {
        console.error("DATABASE_URL is required");
        return;
    }
    const pool = new Pool({ connectionString: DATABASE_URL });
    const db = drizzle(pool, { schema });

    const skills = await db.select().from(schema.skillPackagesTable);
    console.log(JSON.stringify(skills, null, 2));

    await pool.end();
}

main().catch(console.error);
