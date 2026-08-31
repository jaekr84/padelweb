// Load .env BEFORE importing the db (db/index.ts reads DATABASE_URL at import time).
import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

// La cancha del grupo se editaba solo en memoria y se perdía al refrescar.
// Run once with:  npx tsx scripts/add-group-court.ts
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
    console.log("🚀 Migración: cancha del grupo (tournament_groups.court_number)...");
    await addColumn("tournament_groups", "court_number", "`court_number` VARCHAR(50) NULL");
    console.log("🏁 Listo.");
    process.exit(0);
}

main();
