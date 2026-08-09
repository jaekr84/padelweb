"use server";

// Cola de espera: parejas anotadas para entrar cuando se libere una cancha.
// Spec: docs/desafio-specs.md §7 "Cola de espera".
//
// Las posiciones se mantienen consecutivas desde 1. Cada vez que alguien sale
// o entra a la cancha, se renumeran las que quedan esperando.

import { db } from "@/db";
import { challengePairs, challengeQueue, challengeRegistrations, challenges, users } from "@/db/schema";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
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

/**
 * Valida para *anotar*: alcanza con que la pareja exista y no esté disuelta.
 *
 * A propósito no mira si está jugando ni si ya figura en la cola: la cola es
 * también el plan de la jornada, así que una pareja puede tener varios partidos
 * anotados y seguir anotándose mientras juega el anterior. Que los cuatro
 * jugadores estén libres se exige recién al mandarlos a la cancha, en
 * `iniciarPartidoEnTx`, que además lo hace con SELECT ... FOR UPDATE.
 */
async function parejaAnotable(tx: Tx, desafioId: string, parejaId: string) {
    const [p] = await tx
        .select()
        .from(challengePairs)
        .where(and(eq(challengePairs.id, parejaId), eq(challengePairs.challengeId, desafioId)))
        .limit(1);
    if (!p) throw new ErrorDesafio("La pareja no existe en este desafío.");
    if (!p.active) throw new ErrorDesafio("La pareja está disuelta.");
    return p;
}

/**
 * Qué parejas de la cola pueden entrar ahora mismo: las activas cuyos dos
 * jugadores están emparejados y libres. Se usa para saltear las entradas
 * planificadas cuya gente todavía está en la cancha.
 */
async function parejasDisponibles(tx: Tx, desafioId: string, parejaIds: string[]) {
    const libres = new Set<string>();
    if (parejaIds.length === 0) return libres;

    const parejas = await tx
        .select()
        .from(challengePairs)
        .where(and(eq(challengePairs.challengeId, desafioId), inArray(challengePairs.id, parejaIds)));

    const userIds = [...new Set(parejas.flatMap((p) => [p.playerAId, p.playerBId]))];
    if (userIds.length === 0) return libres;

    const estados = await tx
        .select({ userId: challengeRegistrations.userId, status: challengeRegistrations.status })
        .from(challengeRegistrations)
        .where(
            and(
                eq(challengeRegistrations.challengeId, desafioId),
                inArray(challengeRegistrations.userId, userIds)
            )
        );
    const estadoDe = new Map(estados.map((e) => [e.userId, e.status]));

    for (const p of parejas) {
        if (!p.active) continue;
        const ok = [p.playerAId, p.playerBId].every(
            (u) => estadoDe.get(u) === ESTADO_INSCRIPCION.EMPAREJADO
        );
        if (ok) libres.add(p.id);
    }
    return libres;
}

// ── Escritura ───────────────────────────────────────────────────────────────

/**
 * Anota un partido al final de la cola. El rival es opcional: se puede esperar
 * sin rival definido y que el sistema la cruce con la siguiente.
 *
 * Una misma pareja puede figurar varias veces: la cola es también el plan de la
 * jornada. Lo único que no se permite es que se enfrente a sí misma.
 */
export async function anotarEnCola(desafioId: string, parejaId: string, rivalParejaId?: string | null) {
    return ejecutar("anotarEnCola", async () => {
        await requerirAdmin();

        return await db.transaction(async (tx) => {
            const [d] = await tx.select({ estado: challenges.status }).from(challenges).where(eq(challenges.id, desafioId)).limit(1);
            if (!d) throw new ErrorDesafio("El desafío no existe.");
            if (d.estado !== ESTADO_DESAFIO.ABIERTO) throw new ErrorDesafio("El desafío no está abierto.");

            await parejaAnotable(tx, desafioId, parejaId);
            if (rivalParejaId) {
                if (rivalParejaId === parejaId) throw new ErrorDesafio("La pareja no puede ser su propio rival.");
                await parejaAnotable(tx, desafioId, rivalParejaId);
            }

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

/**
 * Anota varios partidos de una, al final de la cola y en el orden recibido.
 *
 * La usa el generador automático: entran todos o no entra ninguno, porque una
 * cola a medio generar es peor que ninguna. Los cruces los decide
 * `generarCruces` en el cliente, que no necesita la base para calcularlos.
 */
export async function anotarPartidosEnCola(
    desafioId: string,
    partidos: { parejaA: string; parejaB: string }[]
) {
    return ejecutar("anotarPartidosEnCola", async () => {
        await requerirAdmin();
        if (partidos.length === 0) throw new ErrorDesafio("No hay partidos para anotar.");

        return await db.transaction(async (tx) => {
            const [d] = await tx.select({ estado: challenges.status }).from(challenges).where(eq(challenges.id, desafioId)).limit(1);
            if (!d) throw new ErrorDesafio("El desafío no existe.");
            if (d.estado !== ESTADO_DESAFIO.ABIERTO) throw new ErrorDesafio("El desafío no está abierto.");

            // Se valida cada pareja una sola vez, aunque figure en varios cruces.
            const involucradas = [...new Set(partidos.flatMap((p) => [p.parejaA, p.parejaB]))];
            for (const id of involucradas) await parejaAnotable(tx, desafioId, id);
            for (const p of partidos) {
                if (p.parejaA === p.parejaB) throw new ErrorDesafio("Una pareja no puede ser su propio rival.");
            }

            const [{ max }] = await tx
                .select({ max: sql<number>`COALESCE(MAX(${challengeQueue.position}), 0)` })
                .from(challengeQueue)
                .where(and(eq(challengeQueue.challengeId, desafioId), eq(challengeQueue.status, ESTADO_COLA.ESPERANDO)));

            await tx.insert(challengeQueue).values(
                partidos.map((p, i) => ({
                    id: nuevoId(),
                    challengeId: desafioId,
                    pairId: p.parejaA,
                    rivalPairId: p.parejaB,
                    position: Number(max) + 1 + i,
                    status: ESTADO_COLA.ESPERANDO,
                }))
            );

            revalidarDesafio(desafioId);
            return { anotados: partidos.length };
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
 * Manda a la cancha el primer partido de la cola que se pueda jugar ahora.
 *
 * Recorre la cola en orden y saltea las entradas cuya gente todavía está en la
 * cancha: con la cola usada como plan de la jornada, la entrada de arriba puede
 * ser de una ronda posterior. La primera jugable entra.
 *
 * Si la entrada trae rival, juegan esas dos. Si no lo trae, se la cruza con la
 * siguiente entrada sin rival que también esté libre.
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

            const libres = await parejasDisponibles(
                tx,
                desafioId,
                [...new Set(esperando.flatMap((e) => [e.pairId, e.rivalPairId]).filter(Boolean) as string[])]
            );

            // Primera entrada jugable: con rival, las dos libres; sin rival, se
            // busca compañera de cruce más abajo en la cola.
            let elegida: typeof esperando[number] | undefined;
            let rivalId: string | null = null;
            let entradaRival: typeof esperando[number] | undefined;

            for (const e of esperando) {
                if (!libres.has(e.pairId)) continue;

                if (e.rivalPairId) {
                    if (!libres.has(e.rivalPairId)) continue;
                    elegida = e;
                    rivalId = e.rivalPairId;
                    break;
                }

                const cruce = esperando.find(
                    (o) => o.id !== e.id && !o.rivalPairId && o.pairId !== e.pairId && libres.has(o.pairId)
                );
                if (!cruce) continue;
                elegida = e;
                rivalId = cruce.pairId;
                entradaRival = cruce;
                break;
            }

            if (!elegida || !rivalId) {
                throw new ErrorDesafio(
                    "Ningún partido de la cola se puede jugar ahora: las parejas están en la cancha o esperan rival."
                );
            }

            const partidoId = await iniciarPartidoEnTx(tx, {
                desafioId,
                canchaId: cancha.id,
                pareja1Id: elegida.pairId,
                pareja2Id: rivalId,
            });

            // Sólo salen de la cola las entradas que efectivamente entraron a la
            // cancha. Las demás entradas de esas parejas son partidos planificados
            // para más tarde y tienen que quedarse esperando.
            await tx
                .update(challengeQueue)
                .set({ status: ESTADO_COLA.ASIGNADA, assignedAt: new Date() })
                .where(inArray(challengeQueue.id, [elegida.id, ...(entradaRival ? [entradaRival.id] : [])]));

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
