// Load .env BEFORE importing the db (db/index.ts reads DATABASE_URL at import time).
import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

// Jugadores invitados: filas de `users` cargadas a mano por un admin para que
// puedan jugar un desafío sin tener cuenta.
// Correr una vez con:  npx tsx scripts/add-guest-players.ts
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
    console.log("🚀 Migración: jugadores invitados (users.is_guest)...");
    await addColumn("users", "is_guest", "`is_guest` BOOLEAN DEFAULT FALSE");
    // Link de activación: la invitación apunta a una cuenta que ya existe.
    await addColumn("invitations", "target_user_id", "`target_user_id` VARCHAR(256) NULL");
    console.log("🏁 Listo.");
    process.exit(0);
}

main();
