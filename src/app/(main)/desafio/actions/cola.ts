"use server";

// Cola de espera: parejas anotadas para entrar cuando se libere una cancha.
// Spec: docs/desafio-specs.md §7 "Cola de espera".
//
// Las posiciones se mantienen consecutivas desde 1. Cada vez que alguien sale
// o entra a la cancha, se renumeran las que quedan esperando.

import { db } from "@/db";
import { challengePairs, challengeQueue, challengeRegistrations, challenges, users } from "@/db/schema";
import { and, asc, eq, inArray, ne, or, sql } from "drizzle-orm";
import {
    ESTADO_COLA, ESTADO_DESAFIO, ESTADO_INSCRIPCION,
    chequearTransicionCola, recomputarPosiciones,
} from "@/lib/desafio";
import { ErrorDesafio, ejecutar, nuevoId, requerirAdmin, revalidarDesafio } from "./_helpers";
import { iniciarPartidoEnTx, primeraCanchaLibre, type Tx } from "./_partidos-core";

export type EntradaCola = {
    id: string;
    posicion: number;
    parejaId: string;
    pareja: string;
    rivalParejaId: string | null;
    rival: string | null;
    esperandoDesde: string;
};

const nombreDe = (u: { firstName: string | null; lastName: string | null; email: string }) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email.split("@")[0];

// ── Lectura ─────────────────────────────────────────────────────────────────

export async function listarCola(desafioId: string): Promise<EntradaCola[]> {
    const entradas = await db
        .select()
        .from(challengeQueue)
        .where(and(eq(challengeQueue.challengeId, desafioId), eq(challengeQueue.status, ESTADO_COLA.ESPERANDO)))
        .orderBy(asc(challengeQueue.position));

    if (entradas.length === 0) return [];

    const parejaIds = [
        ...new Set(entradas.flatMap((e) => [e.pairId, e.rivalPairId]).filter(Boolean) as string[]),
    ];
    const parejas = await db.select().from(challengePairs).where(inArray(challengePairs.id, parejaIds));
    const userIds = [...new Set(parejas.flatMap((p) => [p.playerAId, p.playerBId]))];
    const personas = userIds.length
        ? await db
            .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
            .from(users)
            .where(inArray(users.id, userIds))
        : [];
    const nombre = new Map(personas.map((p) => [p.id, nombreDe(p)]));
    const etiqueta = (id: string | null) => {
        if (!id) return null;
        const p = parejas.find((x) => x.id === id);
        if (!p) return null;
        return `${nombre.get(p.playerAId) ?? "?"} / ${nombre.get(p.playerBId) ?? "?"}`;
    };

    return entradas.map((e) => ({
        id: e.id,
        posicion: e.position,
        parejaId: e.pairId,
        pareja: etiqueta(e.pairId) ?? "Pareja",
        rivalParejaId: e.rivalPairId,
        rival: etiqueta(e.rivalPairId),
        esperandoDesde: e.enteredAt.toISOString(),
    }));
}

// ── Helpers internos ────────────────────────────────────────────────────────

/** Renumera 1..n las entradas que siguen esperando, respetando su orden actual. */
async function renumerar(tx: Tx, desafioId: string) {
    const esperando = await tx
        .select({ id: challengeQueue.id })
        .from(challengeQueue)
        .where(and(eq(challengeQueue.challengeId, desafioId), eq(challengeQueue.status, ESTADO_COLA.ESPERANDO)))
        .orderBy(asc(challengeQueue.position), asc(challengeQueue.enteredAt));

    for (const { id, position } of recomputarPosiciones(esperando)) {
        await tx.update(challengeQueue).set({ position }).where(eq(challengeQueue.id, id));
    }
}

async function parejaActivaLibre(tx: Tx, desafioId: string, parejaId: string) {
    const [p] = await tx
        .select()
        .from(challengePairs)
        .where(and(eq(challengePairs.id, parejaId), eq(challengePairs.challengeId, desafioId)))
        .limit(1);
    if (!p) throw new ErrorDesafio("La pareja no existe en este desafío.");
    if (!p.active) throw new ErrorDesafio("La pareja está disuelta.");

    const estados = await tx
        .select({ status: challengeRegistrations.status })
        .from(challengeRegistrations)
        .where(
            and(
                eq(challengeRegistrations.challengeId, desafioId),
                inArray(challengeRegistrations.userId, [p.playerAId, p.playerBId])
            )
        );
    if (estados.some((e) => e.status === ESTADO_INSCRIPCION.JUGANDO)) {
        throw new ErrorDesafio("La pareja ya está jugando.");
    }
    return p;
}

// ── Escritura ───────────────────────────────────────────────────────────────

/**
 * Anota una pareja al final de la cola. El rival es opcional: se puede esperar
 * sin rival definido y que el sistema la cruce con la siguiente.
 */
export async function anotarEnCola(desafioId: string, parejaId: string, rivalParejaId?: string | null) {
    return ejecutar("anotarEnCola", async () => {
        await requerirAdmin();

        return await db.transaction(async (tx) => {
            const [d] = await tx.select({ estado: challenges.status }).from(challenges).where(eq(challenges.id, desafioId)).limit(1);
            if (!d) throw new ErrorDesafio("El desafío no existe.");
            if (d.estado !== ESTADO_DESAFIO.ABIERTO) throw new ErrorDesafio("El desafío no está abierto.");

            await parejaActivaLibre(tx, desafioId, parejaId);
            if (rivalParejaId) {
                if (rivalParejaId === parejaId) throw new ErrorDesafio("La pareja no puede ser su propio rival.");
                await parejaActivaLibre(tx, desafioId, rivalParejaId);
            }

            const [yaEsta] = await tx
                .select({ id: challengeQueue.id })
                .from(challengeQueue)
                .where(
                    and(
                        eq(challengeQueue.challengeId, desafioId),
                        eq(challengeQueue.status, ESTADO_COLA.ESPERANDO),
                        or(eq(challengeQueue.pairId, parejaId), eq(challengeQueue.rivalPairId, parejaId))
                    )
                )
                .limit(1);
            if (yaEsta) throw new ErrorDesafio("Esa pareja ya está en la cola.");

            const [{ max }] = await tx
                .select({ max: sql<number>`COALESCE(MAX(${challengeQueue.position}), 0)` })
                .from(challengeQueue)
                .where(and(eq(challengeQueue.challengeId, desafioId), eq(challengeQueue.status, ESTADO_COLA.ESPERANDO)));

            const id = nuevoId();
            await tx.insert(challengeQueue).values({
                id,
                challengeId: desafioId,
                pairId: parejaId,
                rivalPairId: rivalParejaId ?? null,
                position: Number(max) + 1,
                status: ESTADO_COLA.ESPERANDO,
            });

            revalidarDesafio(desafioId);
            return { id, posicion: Number(max) + 1 };
        });
    });
}

/** Saca una pareja de la cola y renumera las que quedan. */
export async function sacarDeCola(entradaId: string) {
    return ejecutar("sacarDeCola", async () => {
        await requerirAdmin();

        return await db.transaction(async (tx) => {
            const [e] = await tx.select().from(challengeQueue).where(eq(challengeQueue.id, entradaId)).limit(1);
            if (!e) throw new ErrorDesafio("La entrada de la cola no existe.");

            const chequeo = chequearTransicionCola(e.status as any, ESTADO_COLA.CANCELADA);
            if (!chequeo.ok) throw new ErrorDesafio(chequeo.error);

            await tx.update(challengeQueue).set({ status: ESTADO_COLA.CANCELADA }).where(eq(challengeQueue.id, entradaId));
            await renumerar(tx, e.challengeId);

            revalidarDesafio(e.challengeId);
            return { id: entradaId };
        });
    });
}

/** Reordena la cola a mano: recibe los ids en el orden deseado. */
export async function reordenarCola(desafioId: string, entradasEnOrden: string[]) {
    return ejecutar("reordenarCola", async () => {
        await requerirAdmin();

        return await db.transaction(async (tx) => {
            const actuales = await tx
                .select({ id: challengeQueue.id })
                .from(challengeQueue)
                .where(and(eq(challengeQueue.challengeId, desafioId), eq(challengeQueue.status, ESTADO_COLA.ESPERANDO)));

            const enCola = new Set(actuales.map((a) => a.id));
            if (entradasEnOrden.length !== enCola.size || entradasEnOrden.some((id) => !enCola.has(id))) {
                throw new ErrorDesafio("La cola cambió mientras la reordenabas. Actualizá y probá de nuevo.");
            }

            for (const { id, position } of recomputarPosiciones(entradasEnOrden.map((id) => ({ id })))) {
                await tx.update(challengeQueue).set({ position }).where(eq(challengeQueue.id, id));
            }

            revalidarDesafio(desafioId);
            return { total: entradasEnOrden.length };
        });
    });
}

/**
 * Mete a la cancha a la primera pareja de la cola.
 *
 * Si la entrada trae rival, juegan esas dos. Si no lo trae, se la cruza con la
 * siguiente entrada que tampoco tenga rival.
 *
 * ⚠️ Ese cruce automático es una decisión que la spec dejó abierta (§8 "Cola sin
 * rival definido"). La alternativa es que la pareja espere a que alguien la
 * elija; si prefieren eso, se borra el bloque del rival automático y listo.
 */
export async function asignarSiguienteDeCola(desafioId: string, canchaId?: string) {
    return ejecutar("asignarSiguienteDeCola", async () => {
        await requerirAdmin();

        return await db.transaction(async (tx) => {
            const cancha = canchaId
                ? { id: canchaId }
                : await primeraCanchaLibre(tx, desafioId);
            if (!cancha) throw new ErrorDesafio("No hay canchas libres.");

            const esperando = await tx
                .select()
                .from(challengeQueue)
                .where(and(eq(challengeQueue.challengeId, desafioId), eq(challengeQueue.status, ESTADO_COLA.ESPERANDO)))
                .orderBy(asc(challengeQueue.position), asc(challengeQueue.enteredAt));

            if (esperando.length === 0) throw new ErrorDesafio("La cola está vacía.");

            const primera = esperando[0];
            let rivalId = primera.rivalPairId;
            let entradaRival: typeof primera | undefined;

            if (!rivalId) {
                entradaRival = esperando.slice(1).find((e) => !e.rivalPairId && e.pairId !== primera.pairId);
                if (!entradaRival) {
                    throw new ErrorDesafio(
                        "La primera pareja de la cola no tiene rival y no hay otra esperando para cruzarla."
                    );
                }
                rivalId = entradaRival.pairId;
            }

            const partidoId = await iniciarPartidoEnTx(tx, {
                desafioId,
                canchaId: cancha.id,
                pareja1Id: primera.pairId,
                pareja2Id: rivalId!,
            });

            const ahora = new Date();
            const aMarcar = [primera.id, ...(entradaRival ? [entradaRival.id] : [])];
            await tx
                .update(challengeQueue)
                .set({ status: ESTADO_COLA.ASIGNADA, assignedAt: ahora })
                .where(inArray(challengeQueue.id, aMarcar));

            // Si el rival estaba anotado en su propia entrada, esa también sale.
            await tx
                .update(challengeQueue)
                .set({ status: ESTADO_COLA.ASIGNADA, assignedAt: ahora })
                .where(
                    and(
                        eq(challengeQueue.challengeId, desafioId),
                        eq(challengeQueue.status, ESTADO_COLA.ESPERANDO),
                        or(eq(challengeQueue.pairId, rivalId!), eq(challengeQueue.rivalPairId, rivalId!))
                    )
                );

            await renumerar(tx, desafioId);

            revalidarDesafio(desafioId);
            return { partidoId, canchaId: cancha.id };
        });
    });
}

/**
 * Intento silencioso de asignar la cancha recién liberada. Se llama después de
 * cargar un resultado: si la cola está vacía o la primera no tiene con quién
 * jugar, no pasa nada y no se le muestra ningún error al jugador.
 */
export async function intentarAsignarCancha(desafioId: string) {
    const r = await asignarSiguienteDeCola(desafioId);
    return r.ok ? r : { ok: true as const, data: null };
}

/** Cuántas parejas están esperando. */
export async function contarEnCola(desafioId: string) {
    const [{ n }] = await db
        .select({ n: sql<number>`count(*)` })
        .from(challengeQueue)
        .where(and(eq(challengeQueue.challengeId, desafioId), eq(challengeQueue.status, ESTADO_COLA.ESPERANDO)));
    return Number(n) || 0;
}
