// Load .env BEFORE importing the db (db/index.ts reads DATABASE_URL at import time).
import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

// Presente y pagado por jugador en el Desafío, como ya tienen los torneos y la
// cancha abierta.
// Run once with:  npx tsx scripts/add-challenge-attendance.ts
//
// `is_present` arranca en 1: el desafío es de duración abierta y la gente entra
// y sale, así que el caso normal es que el inscripto esté; se marca la ausencia,
// no la presencia. `has_paid` arranca en 0 porque es justamente lo que hay que
// ir cobrando.

const COLUMNAS: { nombre: string; definicion: string }[] = [
    { nombre: "has_paid", definicion: "BOOLEAN NOT NULL DEFAULT 0" },
    { nombre: "is_present", definicion: "BOOLEAN NOT NULL DEFAULT 1" },
];

async function main() {
    console.log("🚀 Migración: presente y pagado en el Desafío...");
    try {
        const resultado: unknown = await db.execute(sql`
            SELECT COLUMN_NAME AS nombre
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'challenge_registrations'
        `);
        const columnas = new Set(
            ((Array.isArray(resultado) ? resultado[0] : resultado) as { nombre: string }[]).map((f) => f.nombre)
        );

        if (columnas.size === 0) {
            console.error("❌ No existe `challenge_registrations`. Corré antes `npx tsx scripts/add-desafio.ts`.");
            process.exit(1);
        }

        // Una sentencia por columna para que la migración se pueda repetir sin
        // romperse si quedó a medias.
        for (const { nombre, definicion } of COLUMNAS) {
            if (columnas.has(nombre)) {
                console.log(`ℹ️ ${nombre} ya existe`);
                continue;
            }
            await db.execute(sql.raw(
                `ALTER TABLE \`challenge_registrations\` ADD COLUMN \`${nombre}\` ${definicion}`
            ));
            console.log(`✅ ${nombre} agregada`);
        }

        // El pool filtra por (desafío, presente) y la caja cuenta por
        // (desafío, pagado): las dos entran por este índice.
        const indices: unknown = await db.execute(sql`
            SELECT DISTINCT INDEX_NAME AS nombre
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'challenge_registrations'
        `);
        const nombres = new Set(
            ((Array.isArray(indices) ? indices[0] : indices) as { nombre: string }[]).map((f) => f.nombre)
        );

        if (nombres.has("challenge_registrations_challenge_paid_idx")) {
            console.log("ℹ️ challenge_registrations_challenge_paid_idx ya existe");
        } else {
            await db.execute(sql`
                ALTER TABLE \`challenge_registrations\`
                ADD INDEX \`challenge_registrations_challenge_paid_idx\` (\`challenge_id\`, \`has_paid\`)
            `);
            console.log("✅ challenge_registrations_challenge_paid_idx creado");
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
