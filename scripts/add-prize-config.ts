// Load .env BEFORE importing the db (db/index.ts reads DATABASE_URL at import time).
import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

// Reparto de premios por evento: qué porcentaje de lo recaudado va a premios y
// cómo se divide entre los puestos.
// Run once with:  npx tsx scripts/add-prize-config.ts

/**
 * La colación se declara explícitamente y no se deja en el default del servidor:
 * el MariaDB de Hostinger crea las tablas nuevas en `utf8mb4_uca1400_ai_ci`,
 * mientras que el resto del esquema está en `utf8mb4_unicode_ci`. Mezcladas, un
 * join contra otra tabla muere con "Illegal mix of collations".
 */
const COLACION = "utf8mb4_unicode_ci";

async function main() {
    console.log("🚀 Migración: reparto de premios (accounting_prize_configs)...");
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS \`accounting_prize_configs\` (
                \`event_type\` VARCHAR(20) NOT NULL,
                \`event_id\` VARCHAR(36) NOT NULL,
                -- Porcentaje de lo recaudado que va a premios, con dos decimales
                -- (5050 = 50,50 %). Entero para que no haya errores de float.
                \`pool_basis_points\` INT NOT NULL DEFAULT 0,
                -- [{ "rotulo": "1er puesto", "puntosBasicos": 4000 }, ...]
                \`positions\` JSON NOT NULL,
                -- Los ingresos del evento en el momento de generar. Sirve para
                -- avisar que el pool cambió desde la última vez.
                \`base_cents\` BIGINT NOT NULL DEFAULT 0,
                \`updated_by_user_id\` VARCHAR(256) NOT NULL,
                \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`event_type\`, \`event_id\`)
            ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("✅ accounting_prize_configs lista");

        const resultado: unknown = await db.execute(sql`
            SELECT TABLE_COLLATION AS colacion
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounting_prize_configs'
        `);
        const filas = (Array.isArray(resultado) ? resultado[0] : resultado) as { colacion?: string }[];
        const actual = filas?.[0]?.colacion;

        if (actual && actual !== COLACION) {
            await db.execute(sql.raw(
                `ALTER TABLE \`accounting_prize_configs\` CONVERT TO CHARACTER SET utf8mb4 COLLATE ${COLACION}`
            ));
            console.log(`✅ Colación migrada de ${actual} a ${COLACION}`);
        } else {
            console.log(`ℹ️ Colación ya alineada (${actual ?? "desconocida"})`);
        }
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
