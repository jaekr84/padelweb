// Load .env BEFORE importing the db (db/index.ts reads DATABASE_URL at import time).
import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

// Adds timing columns so we can measure match/group/tournament durations.
// Run once with:  npx tsx scripts/add-match-timing.ts
async function addColumn(table: string, column: string, ddl: string) {
    try {
        await db.execute(sql.raw(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`));
        console.log(`✅ ${table}.${column} agregada`);
    } catch (error: any) {
        // Drizzle wraps the real driver error in `.cause`.
        const cause = error?.cause ?? error;
        const code = cause?.code || cause?.errno;
        const msg = cause?.sqlMessage || cause?.message || String(cause);
        if (code === "ER_DUP_FIELDNAME" || /duplicate column/i.test(msg)) {
            console.log(`ℹ️ ${table}.${column} ya existe`);
        } else {
            console.error(`❌ ${table}.${column} → [${code}] ${msg}`);
        }
    }
}

async function main() {
    console.log("🚀 Migración: columnas de tiempo (started_at / finished_at / finalized_at)...");
    await addColumn("group_matches", "started_at", "`started_at` TIMESTAMP NULL");
    await addColumn("group_matches", "finished_at", "`finished_at` TIMESTAMP NULL");
    await addColumn("bracket_matches", "started_at", "`started_at` TIMESTAMP NULL");
    await addColumn("bracket_matches", "finished_at", "`finished_at` TIMESTAMP NULL");
    await addColumn("tournaments", "finalized_at", "`finalized_at` TIMESTAMP NULL");
    console.log("🏁 Listo.");
    process.exit(0);
}

main();
