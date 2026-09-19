// Load .env BEFORE importing the db (db/index.ts reads DATABASE_URL at import time).
import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

// Marca de origen de cada movimiento: cargado a mano o generado por el sistema.
// Run once with:  npx tsx scripts/add-accounting-origin.ts
//
// Lo necesita el asiento automático de inscripciones: es el que el sistema
// reescribe cada vez que se marca o se desmarca un pago, y por eso tiene que
// poder distinguirse de uno cargado a mano (que nadie debe pisar).

async function main() {
    console.log("🚀 Migración: origen de los movimientos (accounting_entries)...");
    try {
        const resultado: unknown = await db.execute(sql`
            SELECT COLUMN_NAME AS nombre
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounting_entries'
        `);
        const columnas = new Set(
            ((Array.isArray(resultado) ? resultado[0] : resultado) as { nombre: string }[]).map((f) => f.nombre)
        );

        if (columnas.size === 0) {
            console.error("❌ No existe `accounting_entries`. Corré antes las migraciones anteriores.");
            process.exit(1);
        }

        // Default 'manual': todo lo que ya estaba lo cargó una persona.
        if (columnas.has("origin")) {
            console.log("ℹ️ origin ya existe");
        } else {
            await db.execute(sql`
                ALTER TABLE \`accounting_entries\`
                ADD COLUMN \`origin\` VARCHAR(20) NOT NULL DEFAULT 'manual'
            `);
            console.log("✅ origin agregada");
        }

        // Índice sobre (evento, origen): la sincronización busca por ahí el
        // asiento automático del evento en cada clic de pagado.
        const indices: unknown = await db.execute(sql`
            SELECT DISTINCT INDEX_NAME AS nombre
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounting_entries'
        `);
        const nombres = new Set(
            ((Array.isArray(indices) ? indices[0] : indices) as { nombre: string }[]).map((f) => f.nombre)
        );

        if (nombres.has("accounting_entries_event_origin_idx")) {
            console.log("ℹ️ accounting_entries_event_origin_idx ya existe");
        } else {
            await db.execute(sql`
                ALTER TABLE \`accounting_entries\`
                ADD INDEX \`accounting_entries_event_origin_idx\` (\`event_type\`, \`event_id\`, \`origin\`)
            `);
            console.log("✅ accounting_entries_event_origin_idx creado");
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
