// Load .env BEFORE importing the db (db/index.ts reads DATABASE_URL at import time).
import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

// Tabla del módulo de contaduría (ingresos y gastos).
// Run once with:  npx tsx scripts/add-accounting.ts

/**
 * La colación se declara explícitamente y no se deja en el default del servidor:
 * el MariaDB de Hostinger crea las tablas nuevas en `utf8mb4_uca1400_ai_ci`,
 * mientras que el resto del esquema está en `utf8mb4_unicode_ci`. Mezcladas, el
 * `left join` contra `users.id` muere con "Illegal mix of collations".
 */
const COLACION = "utf8mb4_unicode_ci";

async function crearTabla() {
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS \`accounting_entries\` (
            \`id\` VARCHAR(36) NOT NULL,
            \`type\` VARCHAR(10) NOT NULL,
            \`date\` VARCHAR(10) NOT NULL,
            \`description\` VARCHAR(255) NOT NULL,
            \`amount_cents\` BIGINT NOT NULL,
            \`created_by_user_id\` VARCHAR(256) NOT NULL,
            \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            INDEX \`accounting_entries_date_idx\` (\`date\`),
            INDEX \`accounting_entries_created_by_idx\` (\`created_by_user_id\`)
        ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

/** Repara una tabla ya creada con la colación default del servidor. */
async function alinearColacion() {
    const resultado: unknown = await db.execute(sql`
        SELECT TABLE_COLLATION AS colacion
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounting_entries'
    `);
    const filas = (Array.isArray(resultado) ? resultado[0] : resultado) as { colacion?: string }[];
    const actual = filas?.[0]?.colacion;

    if (!actual || actual === COLACION) {
        console.log(`ℹ️ Colación ya alineada (${actual ?? "desconocida"})`);
        return;
    }

    await db.execute(sql.raw(
        `ALTER TABLE \`accounting_entries\` CONVERT TO CHARACTER SET utf8mb4 COLLATE ${COLACION}`
    ));
    console.log(`✅ Colación migrada de ${actual} a ${COLACION}`);
}

async function main() {
    console.log("🚀 Migración: contaduría (accounting_entries)...");
    try {
        await crearTabla();
        console.log("✅ accounting_entries lista");
        await alinearColacion();
    } catch (error: unknown) {
        // Drizzle wraps the real driver error in `.cause`.
        const cause = ((error as { cause?: unknown })?.cause ?? error) as
            { code?: string; errno?: number; sqlMessage?: string; message?: string };
        console.error(`❌ [${cause?.code || cause?.errno}] ${cause?.sqlMessage || cause?.message || String(cause)}`);
        process.exit(1);
    }
    console.log("🏁 Listo.");
    process.exit(0);
}

main();
