// Load .env BEFORE importing the db (db/index.ts reads DATABASE_URL at import time).
import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

// Contaduría por evento: vincula los movimientos de la caja con el torneo, el
// desafío o la cancha abierta que los generó, y los clasifica por rubro.
// Run once with:  npx tsx scripts/add-event-accounting.ts
//
// No hay tabla nueva a propósito: el módulo de eventos es una vista filtrada de
// `accounting_entries`. Con dos tablas de plata los totales divergen y deja de
// haber una respuesta única a "cuánto hay en la caja".

/** Columnas nuevas, en orden. `null` en `event_id` = movimiento general. */
const COLUMNAS: { nombre: string; definicion: string }[] = [
    // torneo | desafio | cancha_abierta
    { nombre: "event_type", definicion: "VARCHAR(20) NULL" },
    { nombre: "event_id", definicion: "VARCHAR(36) NULL" },
    // Snapshot del nombre: si el evento se borra, el movimiento tiene que
    // seguir diciendo de qué era. Mismo criterio que el left join contra
    // `users` — la caja no puede perder el sentido de una fila.
    { nombre: "event_name", definicion: "VARCHAR(256) NULL" },
    // Rubro. Las filas viejas quedan en 'otros', que es un rubro válido.
    { nombre: "category", definicion: "VARCHAR(30) NOT NULL DEFAULT 'otros'" },
];

const INDICES: { nombre: string; columnas: string }[] = [
    { nombre: "accounting_entries_event_idx", columnas: "`event_type`, `event_id`" },
    { nombre: "accounting_entries_category_idx", columnas: "`category`" },
];

/** Las filas devueltas por mysql2 llegan como `[filas, campos]` o ya desenvueltas. */
function filasDe<T>(resultado: unknown): T[] {
    return (Array.isArray(resultado) ? resultado[0] : resultado) as T[];
}

async function columnasExistentes(): Promise<Set<string>> {
    const resultado: unknown = await db.execute(sql`
        SELECT COLUMN_NAME AS nombre
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounting_entries'
    `);
    return new Set(filasDe<{ nombre: string }>(resultado).map((f) => f.nombre));
}

async function indicesExistentes(): Promise<Set<string>> {
    const resultado: unknown = await db.execute(sql`
        SELECT DISTINCT INDEX_NAME AS nombre
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounting_entries'
    `);
    return new Set(filasDe<{ nombre: string }>(resultado).map((f) => f.nombre));
}

async function main() {
    console.log("🚀 Migración: contaduría por evento (accounting_entries)...");
    try {
        const columnas = await columnasExistentes();
        if (columnas.size === 0) {
            console.error("❌ No existe `accounting_entries`. Corré primero `npx tsx scripts/add-accounting.ts`.");
            process.exit(1);
        }

        // Una sentencia por columna en vez de un ALTER con todo junto: así la
        // migración se puede correr de nuevo sin romperse si quedó a medias.
        for (const { nombre, definicion } of COLUMNAS) {
            if (columnas.has(nombre)) {
                console.log(`ℹ️ ${nombre} ya existe`);
                continue;
            }
            await db.execute(sql.raw(`ALTER TABLE \`accounting_entries\` ADD COLUMN \`${nombre}\` ${definicion}`));
            console.log(`✅ ${nombre} agregada`);
        }

        const indices = await indicesExistentes();
        for (const { nombre, columnas: cols } of INDICES) {
            if (indices.has(nombre)) {
                console.log(`ℹ️ ${nombre} ya existe`);
                continue;
            }
            await db.execute(sql.raw(`ALTER TABLE \`accounting_entries\` ADD INDEX \`${nombre}\` (${cols})`));
            console.log(`✅ ${nombre} creado`);
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
