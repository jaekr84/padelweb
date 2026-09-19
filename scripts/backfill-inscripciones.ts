// Load .env BEFORE importing the db (db/index.ts reads DATABASE_URL at import time).
import "dotenv/config";
import { db } from "../src/db";
import { openCourtEvents, tournaments } from "../src/db/schema";
import { desc } from "drizzle-orm";
import { leerEvento, sincronizarInscripciones } from "../src/lib/contaduria-server";
import { formatearMonto, TIPO_EVENTO, type TipoEvento } from "../src/lib/contaduria";
import { sql } from "drizzle-orm";

// Genera el asiento automático de inscripciones de los eventos que ya existen.
//
// La sincronización normal corre cuando se marca o desmarca un pago, así que
// los torneos y las canchas abiertas anteriores a esta función no tienen
// asiento hasta que alguien los toque. Esto los pone al día de una vez.
//
//   npx tsx scripts/backfill-inscripciones.ts           → sólo muestra qué haría
//   npx tsx scripts/backfill-inscripciones.ts --aplicar → escribe en la caja
//
// Es idempotente: correrlo dos veces deja el mismo resultado, porque cada
// evento tiene un único asiento automático que se reescribe.

const APLICAR = process.argv.includes("--aplicar");

/** Un usuario admin al que atribuirle los asientos creados. */
async function autor(): Promise<string> {
    const r: unknown = await db.execute(sql`
        SELECT id FROM users WHERE role IN ('admin','superadmin') ORDER BY role DESC LIMIT 1
    `);
    const filas = (Array.isArray(r) ? r[0] : r) as { id: string }[];
    if (!filas?.[0]?.id) throw new Error("No hay ningún usuario admin al que atribuirle los asientos.");
    return filas[0].id;
}

async function main() {
    console.log(APLICAR
        ? "🚀 Backfill de inscripciones (ESCRIBIENDO)...\n"
        : "🔍 Backfill de inscripciones (simulación, no escribe nada)...\n");

    try {
        const userId = await autor();

        const [torneos, canchas] = await Promise.all([
            db.select({ id: tournaments.id }).from(tournaments).orderBy(desc(tournaments.startDate)),
            db.select({ id: openCourtEvents.id }).from(openCourtEvents).orderBy(desc(openCourtEvents.date)),
        ]);

        const todos: { tipo: TipoEvento; id: string }[] = [
            ...torneos.map((t) => ({ tipo: TIPO_EVENTO.TORNEO as TipoEvento, id: t.id })),
            ...canchas.map((c) => ({ tipo: TIPO_EVENTO.CANCHA_ABIERTA as TipoEvento, id: c.id })),
        ];

        let conPlata = 0;
        let total = 0;

        for (const { tipo, id } of todos) {
            const evento = await leerEvento(tipo, id);
            if (!evento) continue;

            const monto = evento.feeCentavos * evento.unidades;
            if (monto <= 0) continue;

            conPlata++;
            total += monto;
            console.log(`  ${evento.nombre.padEnd(38).slice(0, 38)}  ${evento.base.padStart(18)}  ${formatearMonto(monto).padStart(16)}`);

            if (APLICAR) await sincronizarInscripciones(tipo, id, userId);
        }

        console.log(`\n${conPlata} evento(s) con recaudación · total ${formatearMonto(total)}`);
        console.log(APLICAR
            ? "✅ Asientos generados."
            : "ℹ️ No se escribió nada. Volvé a correrlo con --aplicar para generarlos.");
    } catch (error: unknown) {
        const cause = ((error as { cause?: unknown })?.cause ?? error) as
            { code?: string; sqlMessage?: string; message?: string };
        console.error(`❌ ${cause?.sqlMessage || cause?.message || String(cause)}`);
        process.exit(1);
    }
    process.exit(0);
}

main();
