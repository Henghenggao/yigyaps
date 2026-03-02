
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./packages/db/src/schema/index.js";
import { eq, inArray } from "drizzle-orm";
import 'dotenv/config';

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
    if (!DATABASE_URL) {
        console.error("DATABASE_URL is required");
        return;
    }
    const pool = new Pool({ connectionString: DATABASE_URL });
    const db = drizzle(pool, { schema });

    // Get all skill IDs first
    const allSkills = await db.select({ id: schema.skillPackagesTable.id, packageId: schema.skillPackagesTable.packageId }).from(schema.skillPackagesTable);

    if (allSkills.length === 0) {
        console.log("No skills found to delete.");
        await pool.end();
        return;
    }

    const idsToDelete = allSkills.map(s => s.id);

    console.log(`Found ${allSkills.length} skills. Deleting associated rules and packages...`);

    await db.transaction(async (tx) => {
        // 1. Delete rules first due to FK constraints
        await tx.delete(schema.skillRulesTable).where(inArray(schema.skillRulesTable.packageId, idsToDelete));

        // 2. Delete packages
        await tx.delete(schema.skillPackagesTable).where(inArray(schema.skillPackagesTable.id, idsToDelete));
    });

    console.log("Successfully deleted all mock skills and their rules.");

    await pool.end();
}

main().catch(console.error);
