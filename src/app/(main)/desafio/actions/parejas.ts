"use server";

// Parejas del desafío: armar, desarmar y rearmar sin límite.
// Spec: docs/desafio-specs.md §5 "Desarmar pareja" y §7 "Parejas armadas".
//
// La pareja es un vínculo temporal. Los puntos ya escritos en el ledger son del
// jugador y NUNCA se tocan al disolverla: esa es la razón de que el ledger sea
// individual y no por pareja.
//
// El estado de la inscripción es la fuente de verdad de "quién está libre":
// `disponible` = sin pareja, `emparejado` = en una pareja activa. No hay
// restricción de base que impida dos parejas activas con el mismo jugador, así
// que el chequeo va con las filas bloqueadas (SELECT ... FOR UPDATE).

import { db } from "@/db";
import {
    challengeMatches, challengePairs, challengeQueue, challengeRegistrations, challenges, users,
} from "@/db/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import {
    ESTADO_COLA, ESTADO_DESAFIO, ESTADO_INSCRIPCION, ESTADO_PARTIDO,
    agruparPorLado, avisoPareja, costoPareja, normalizarLado, sugerirCompaneros,
    type Lado,
} from "@/lib/desafio";
import { ErrorDesafio, ejecutar, nuevoId, requerirAdmin, revalidarDesafio } from "./_helpers";

export type JugadorDePareja = {
    userId: string;
    nombre: string;
    imagen: string | null;
    lado: Lado;
    categoria: string | null;
};

export type ParejaResumen = {
    id: string;
    a: JugadorDePareja;
    b: JugadorDePareja;
    aviso: { nivel: "ok" | "aviso"; mensaje: string };
    jugando: boolean;
    enCola: boolean;
    partidosJugados: number;
    partidosGanados: number;
    creadaEn: string;
};

export type DisponibleResumen = JugadorDePareja & { costoConSeleccionado?: number };

export type PoolDisponibles = {
    reves: DisponibleResumen[];
    drive: DisponibleResumen[];
    ambos: DisponibleResumen[];
    total: number;
};

const nombreDe = (u: { firstName: string | null; lastName: string | null; email: string }) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email.split("@")[0];

const SELECT_JUGADOR = {
    userId: challengeRegistrations.userId,
    side: challengeRegistrations.side,
    categoryName: challengeRegistrations.categoryName,
    status: challengeRegistrations.status,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    imageUrl: users.imageUrl,
};

const aJugador = (f: any): JugadorDePareja => ({
    userId: f.userId,
    nombre: nombreDe(f),
    imagen: f.imageUrl,
    lado: normalizarLado(f.side),
    categoria: f.categoryName,
});

// ── Lectura ─────────────────────────────────────────────────────────────────

/** Parejas activas con sus estadísticas dentro del desafío. */
export async function listarParejas(desafioId: string): Promise<ParejaResumen[]> {
    const parejas = await db
        .select()
        .from(challengePairs)
        .where(and(eq(challengePairs.challengeId, desafioId), eq(challengePairs.active, true)))
        .orderBy(challengePairs.createdAt);

    if (parejas.length === 0) return [];

    const userIds = [...new Set(parejas.flatMap((p) => [p.playerAId, p.playerBId]))];
    const filas = await db
        .select(SELECT_JUGADOR)
        .from(challengeRegistrations)
        .innerJoin(users, eq(challengeRegistrations.userId, users.id))
        .where(and(eq(challengeRegistrations.challengeId, desafioId), inArray(challengeRegistrations.userId, userIds)));
    const porUser = new Map(filas.map((f) => [f.userId, f]));

    // Partidos de cada pareja: jugados (confirmados) y ganados.
    const partidos = await db
        .select({
            pair1Id: challengeMatches.pair1Id,
            pair2Id: challengeMatches.pair2Id,
            winnerTeam: challengeMatches.winnerTeam,
            status: challengeMatches.status,
        })
        .from(challengeMatches)
        .where(and(eq(challengeMatches.challengeId, desafioId), eq(challengeMatches.status, ESTADO_PARTIDO.CONFIRMADO)));

    const stats = new Map<string, { jugados: number; ganados: number }>();
    const sumar = (id: string | null, gano: boolean) => {
        if (!id) return;
        const s = stats.get(id) ?? { jugados: 0, ganados: 0 };
        s.jugados++;
        if (gano) s.ganados++;
        stats.set(id, s);
    };
    for (const m of partidos) {
        sumar(m.pair1Id, m.winnerTeam === 1);
        sumar(m.pair2Id, m.winnerTeam === 2);
    }

    // Una entrada de la cola puede llevar rival: esa pareja también está
    // esperando, aunque no sea la dueña de la fila.
    const enCola = new Set(
        (
            await db
                .select({ pairId: challengeQueue.pairId, rivalPairId: challengeQueue.rivalPairId })
                .from(challengeQueue)
                .where(and(eq(challengeQueue.challengeId, desafioId), eq(challengeQueue.status, ESTADO_COLA.ESPERANDO)))
        ).flatMap((q) => [q.pairId, q.rivalPairId]).filter(Boolean) as string[]
    );

    return parejas.map((p) => {
        const fa = porUser.get(p.playerAId);
        const fb = porUser.get(p.playerBId);
        const a = fa ? aJugador(fa) : { userId: p.playerAId, nombre: "Jugador", imagen: null, lado: "ambos" as Lado, categoria: null };
        const b = fb ? aJugador(fb) : { userId: p.playerBId, nombre: "Jugador", imagen: null, lado: "ambos" as Lado, categoria: null };
        const s = stats.get(p.id) ?? { jugados: 0, ganados: 0 };

        return {
            id: p.id,
            a,
            b,
            aviso: avisoPareja(a.lado, b.lado),
            jugando: fa?.status === ESTADO_INSCRIPCION.JUGANDO || fb?.status === ESTADO_INSCRIPCION.JUGANDO,
            enCola: enCola.has(p.id),
            partidosJugados: s.jugados,
            partidosGanados: s.ganados,
            creadaEn: p.createdAt.toISOString(),
        };
    });
}

/**
 * Los sueltos, repartidos en las tres columnas de la pantalla.
 * Con `respectoA` cada uno trae el costo de emparejarse con ese jugador, para
 * que la UI pueda resaltar las mejores combinaciones.
 */
export async function poolDisponibles(desafioId: string, respectoA?: string): Promise<PoolDisponibles> {
    const filas = await db
        .select(SELECT_JUGADOR)
        .from(challengeRegistrations)
        .innerJoin(users, eq(challengeRegistrations.userId, users.id))
        .where(
            and(
                eq(challengeRegistrations.challengeId, desafioId),
                eq(challengeRegistrations.status, ESTADO_INSCRIPCION.DISPONIBLE)
            )
        )
        .orderBy(challengeRegistrations.registeredAt);

    const jugadores: DisponibleResumen[] = filas.map(aJugador);
    const referencia = respectoA ? jugadores.find((j) => j.userId === respectoA) : undefined;
    if (referencia) {
        for (const j of jugadores) {
            j.costoConSeleccionado = j.userId === referencia.userId ? undefined : costoPareja(referencia.lado, j.lado);
        }
    }

    const pool = agruparPorLado(jugadores.map((j) => ({ ...j, lado: j.lado })));
    return {
        reves: pool.reves as DisponibleResumen[],
        drive: pool.drive as DisponibleResumen[],
        ambos: pool.ambos as DisponibleResumen[],
        total: jugadores.length,
    };
}

/** Compañeros posibles para un jugador, del mejor al peor según el lado. */
export async function sugerenciasPara(desafioId: string, userId: string): Promise<DisponibleResumen[]> {
    const pool = await poolDisponibles(desafioId, userId);
    const todos = [...pool.reves, ...pool.drive, ...pool.ambos];
    const yo = todos.find((j) => j.userId === userId);
    if (!yo) return [];
    return sugerirCompaneros(yo, todos) as DisponibleResumen[];
}

// ── Escritura ───────────────────────────────────────────────────────────────

async function desafioAbierto(desafioId: string) {
    const [d] = await db
        .select({ estado: challenges.status })
        .from(challenges)
        .where(eq(challenges.id, desafioId))
        .limit(1);
    if (!d) throw new ErrorDesafio("El desafío no existe.");
    if (d.estado !== ESTADO_DESAFIO.ABIERTO) throw new ErrorDesafio("El desafío no está abierto.");
}

/**
 * Arma una pareja con dos jugadores disponibles.
 *
 * Las dos inscripciones se leen con `FOR UPDATE`: sin ese bloqueo, dos admins
 * armando parejas a la vez podrían meter al mismo jugador en dos parejas, y no
 * hay restricción de base que lo impida.
 */
export async function armarPareja(desafioId: string, userAId: string, userBId: string) {
    return ejecutar("armarPareja", async () => {
        await requerirAdmin();
        if (userAId === userBId) throw new ErrorDesafio("Elegí dos jugadores distintos.");
        await desafioAbierto(desafioId);

        return await db.transaction(async (tx) => {
            const filas = await tx
                .select({
                    id: challengeRegistrations.id,
                    userId: challengeRegistrations.userId,
                    status: challengeRegistrations.status,
                })
                .from(challengeRegistrations)
                .where(
                    and(
                        eq(challengeRegistrations.challengeId, desafioId),
                        inArray(challengeRegistrations.userId, [userAId, userBId])
                    )
                )
                .for("update");

            if (filas.length !== 2) throw new ErrorDesafio("Los dos jugadores tienen que estar inscriptos en el desafío.");

            for (const f of filas) {
                if (f.status === ESTADO_INSCRIPCION.JUGANDO) {
                    throw new ErrorDesafio("Uno de los jugadores está jugando un partido.");
                }
                if (f.status === ESTADO_INSCRIPCION.BAJA) {
                    throw new ErrorDesafio("Uno de los jugadores está dado de baja del desafío.");
                }
                if (f.status === ESTADO_INSCRIPCION.EMPAREJADO) {
                    throw new ErrorDesafio("Uno de los jugadores ya tiene pareja. Desarmala primero.");
                }
            }

            const id = nuevoId();
            await tx.insert(challengePairs).values({
                id,
                challengeId: desafioId,
                playerAId: userAId,
                playerBId: userBId,
                active: true,
            });

            await tx
                .update(challengeRegistrations)
                .set({ status: ESTADO_INSCRIPCION.EMPAREJADO })
                .where(
                    and(
                        eq(challengeRegistrations.challengeId, desafioId),
                        inArray(challengeRegistrations.userId, [userAId, userBId])
                    )
                );

            revalidarDesafio(desafioId);
            return { id };
        });
    });
}

/**
 * Desarma una pareja. Los dos vuelven al pool y, si estaba esperando cancha, la
 * entrada de la cola se cancela.
 *
 * Se rechaza si alguno está jugando: primero hay que resolver el partido.
 */
export async function desarmarPareja(parejaId: string) {
    return ejecutar("desarmarPareja", async () => {
        await requerirAdmin();

        return await db.transaction(async (tx) => {
            const [pareja] = await tx
                .select()
                .from(challengePairs)
                .where(eq(challengePairs.id, parejaId))
                .limit(1);
            if (!pareja) throw new ErrorDesafio("La pareja no existe.");
            if (!pareja.active) return { id: parejaId, yaEstaba: true };

            const filas = await tx
                .select({ userId: challengeRegistrations.userId, status: challengeRegistrations.status })
                .from(challengeRegistrations)
                .where(
                    and(
                        eq(challengeRegistrations.challengeId, pareja.challengeId),
                        inArray(challengeRegistrations.userId, [pareja.playerAId, pareja.playerBId])
                    )
                )
                .for("update");

            if (filas.some((f) => f.status === ESTADO_INSCRIPCION.JUGANDO)) {
                throw new ErrorDesafio("La pareja está jugando: cargá el resultado antes de desarmarla.");
            }

            await tx
                .update(challengePairs)
                .set({ active: false, dissolvedAt: new Date() })
                .where(eq(challengePairs.id, parejaId));

            // Sólo se devuelven al pool los que no estén de baja.
            await tx
                .update(challengeRegistrations)
                .set({ status: ESTADO_INSCRIPCION.DISPONIBLE })
                .where(
                    and(
                        eq(challengeRegistrations.challengeId, pareja.challengeId),
                        inArray(challengeRegistrations.userId, [pareja.playerAId, pareja.playerBId]),
                        eq(challengeRegistrations.status, ESTADO_INSCRIPCION.EMPAREJADO)
                    )
                );

            // Si esperaba cancha, deja de esperar.
            await tx
                .update(challengeQueue)
                .set({ status: ESTADO_COLA.CANCELADA })
                .where(
                    and(
                        or(eq(challengeQueue.pairId, parejaId), eq(challengeQueue.rivalPairId, parejaId)),
                        eq(challengeQueue.status, ESTADO_COLA.ESPERANDO)
                    )
                );

            revalidarDesafio(pareja.challengeId);
            return { id: parejaId, yaEstaba: false };
        });
    });
}

/**
 * Desarma dos parejas y arma una nueva combinación, en una sola operación.
 * Es lo que se usa al arrastrar un jugador de una pareja a otra.
 */
export async function rearmarParejas(
    desafioId: string,
    parejas: readonly { a: string; b: string }[],
    disolver: readonly string[]
) {
    return ejecutar("rearmarParejas", async () => {
        await requerirAdmin();
        await desafioAbierto(desafioId);

        for (const id of disolver) {
            const r = await desarmarPareja(id);
            if (!r.ok) throw new ErrorDesafio(r.error);
        }
        const creadas: string[] = [];
        for (const p of parejas) {
            const r = await armarPareja(desafioId, p.a, p.b);
            if (!r.ok) throw new ErrorDesafio(r.error);
            creadas.push(r.data.id);
        }

        revalidarDesafio(desafioId);
        return { creadas };
    });
}

/** Cuántos quedan sin pareja. Con impar siempre sobra al menos uno. */
export async function contarSueltos(desafioId: string) {
    const [{ n }] = await db
        .select({ n: sql<number>`count(*)` })
        .from(challengeRegistrations)
        .where(
            and(
                eq(challengeRegistrations.challengeId, desafioId),
                eq(challengeRegistrations.status, ESTADO_INSCRIPCION.DISPONIBLE)
            )
        );
    return Number(n) || 0;
}
