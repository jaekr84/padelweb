"use server";

// Partidos del desafío. Spec: docs/desafio-specs.md §4 y §5.
//
// EN_CURSO ──(jugador carga)──► RESULTADO_CARGADO ──(admin confirma)──► CONFIRMADO
//                                      │
//                                      └──(admin rechaza)──► RECHAZADO ──► EN_CURSO
// EN_CURSO ──(admin cancela)──► CANCELADO
//
// Dos cosas se juegan acá y por eso todo va en transacción:
//
//  1. Que dos parejas no tomen la misma cancha. La spec confía en el UNIQUE de
//     `current_match_id`, pero ese índice sólo impide que UN partido esté en dos
//     canchas — no impide que dos partidos pisen la misma cancha, porque son
//     updates a la misma fila con valores distintos y el segundo simplemente
//     sobrescribe. El candado real es el UPDATE condicional
//     (`WHERE current_match_id IS NULL`) mirando `affectedRows`. El UNIQUE queda
//     igual como segunda barrera.
//
//  2. Que confirmar dos veces no duplique puntos. Eso sí lo garantiza el único
//     del ledger, `challenge_points_ledger_uniq`.

import { db } from "@/db";
import {
    challengeCourts, challengeMatches, challengePairs, challengePoints,
    challengeRegistrations, challenges, users,
} from "@/db/schema";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
    ESTADO_CANCHA, ESTADO_DESAFIO, ESTADO_INSCRIPCION, ESTADO_PARTIDO,
    calcularResultado, chequearTransicionPartido, entradasDePartido, formatearSets,
    puedeCargarResultado,
    type EstadoPartido, type SetPartido,
} from "@/lib/desafio";
import {
    ErrorDesafio, ejecutar, esAdmin, nuevoId, requerirAdmin, requerirSesion, revalidarDesafio,
} from "./_helpers";
import { iniciarPartidoEnTx } from "./_partidos-core";
import { intentarAsignarCancha } from "./cola";

export type PartidoResumen = {
    id: string;
    desafioId: string;
    canchaId: string;
    canchaNumero: number | null;
    estado: EstadoPartido;
    equipo1: { userId: string; nombre: string }[];
    equipo2: { userId: string; nombre: string }[];
    pareja1Id: string | null;
    pareja2Id: string | null;
    sets: SetPartido[] | null;
    resultado: string | null;
    gamesEquipo1: number | null;
    gamesEquipo2: number | null;
    ganador: number | null;
    cargadoPor: string | null;
    motivoRechazo: string | null;
    iniciadoEn: string;
    cargadoEn: string | null;
    confirmadoEn: string | null;
};

const nombreDe = (u: { firstName: string | null; lastName: string | null; email: string }) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email.split("@")[0];

const parseSets = (v: unknown): SetPartido[] | null => {
    if (!v) return null;
    const raw = typeof v === "string" ? JSON.parse(v) : v;
    return Array.isArray(raw) ? (raw as SetPartido[]) : null;
};

// ── Lectura ─────────────────────────────────────────────────────────────────

async function armarResumenes(filas: any[]): Promise<PartidoResumen[]> {
    if (filas.length === 0) return [];

    const userIds = [
        ...new Set(
            filas.flatMap((m) => [
                m.t1p1, m.t1p2, m.t2p1, m.t2p2, m.reportedBy,
            ]).filter(Boolean) as string[]
        ),
    ];
    const personas = userIds.length
        ? await db
            .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
            .from(users)
            .where(inArray(users.id, userIds))
        : [];
    const nombre = new Map(personas.map((p) => [p.id, nombreDe(p)]));
    const par = (id: string) => ({ userId: id, nombre: nombre.get(id) ?? "Jugador" });

    return filas.map((m) => {
        const sets = parseSets(m.sets);
        return {
            id: m.id,
            desafioId: m.challengeId,
            canchaId: m.courtId,
            canchaNumero: m.canchaNumero ?? null,
            estado: m.status as EstadoPartido,
            equipo1: [par(m.t1p1), par(m.t1p2)],
            equipo2: [par(m.t2p1), par(m.t2p2)],
            pareja1Id: m.pair1Id,
            pareja2Id: m.pair2Id,
            sets,
            resultado: sets ? formatearSets(sets) : null,
            gamesEquipo1: m.gamesTeam1,
            gamesEquipo2: m.gamesTeam2,
            ganador: m.winnerTeam,
            cargadoPor: m.reportedBy ? nombre.get(m.reportedBy) ?? null : null,
            motivoRechazo: m.rejectionReason,
            iniciadoEn: m.startedAt?.toISOString?.() ?? String(m.startedAt),
            cargadoEn: m.reportedAt?.toISOString?.() ?? null,
            confirmadoEn: m.confirmedAt?.toISOString?.() ?? null,
        };
    });
}

const SELECT_PARTIDO = {
    id: challengeMatches.id,
    challengeId: challengeMatches.challengeId,
    courtId: challengeMatches.courtId,
    canchaNumero: challengeCourts.number,
    status: challengeMatches.status,
    t1p1: challengeMatches.team1Player1Id,
    t1p2: challengeMatches.team1Player2Id,
    t2p1: challengeMatches.team2Player1Id,
    t2p2: challengeMatches.team2Player2Id,
    pair1Id: challengeMatches.pair1Id,
    pair2Id: challengeMatches.pair2Id,
    sets: challengeMatches.sets,
    gamesTeam1: challengeMatches.gamesTeam1,
    gamesTeam2: challengeMatches.gamesTeam2,
    winnerTeam: challengeMatches.winnerTeam,
    reportedBy: challengeMatches.reportedByUserId,
    rejectionReason: challengeMatches.rejectionReason,
    startedAt: challengeMatches.startedAt,
    reportedAt: challengeMatches.reportedAt,
    confirmedAt: challengeMatches.confirmedAt,
};

export async function listarPartidos(desafioId: string, estados?: EstadoPartido[]) {
    const filas = await db
        .select(SELECT_PARTIDO)
        .from(challengeMatches)
        .leftJoin(challengeCourts, eq(challengeMatches.courtId, challengeCourts.id))
        .where(
            estados?.length
                ? and(eq(challengeMatches.challengeId, desafioId), inArray(challengeMatches.status, estados))
                : eq(challengeMatches.challengeId, desafioId)
        )
        .orderBy(desc(challengeMatches.startedAt));
    return armarResumenes(filas);
}

// Ojo: en un archivo "use server" TODO export tiene que ser una función async.
// Un `export const x = (id) => ...` compila con tsc pero Next lo rechaza al
// levantar ("Server Actions must be async functions").

/** Los que están en la cancha ahora mismo. */
export async function partidosEnCurso(desafioId: string) {
    return listarPartidos(desafioId, [ESTADO_PARTIDO.EN_CURSO]);
}

/** La bandeja de confirmación del admin. */
export async function partidosAConfirmar(desafioId: string) {
    return listarPartidos(desafioId, [ESTADO_PARTIDO.RESULTADO_CARGADO]);
}

// ── Iniciar ─────────────────────────────────────────────────────────────────

/**
 * Pone dos parejas a jugar en una cancha.
 *
 * El orden importa: la cancha se toma con un UPDATE condicional y, si no
 * afectó ninguna fila, alguien se adelantó y la transacción se aborta.
 */
export async function iniciarPartido(args: {
    desafioId: string;
    canchaId: string;
    pareja1Id: string;
    pareja2Id: string;
}) {
    return ejecutar("iniciarPartido", async () => {
        await requerirAdmin();

        const id = await db.transaction((tx) => iniciarPartidoEnTx(tx, args));

        revalidarDesafio(args.desafioId);
        return { id };
    });
}

// ── Cargar resultado ────────────────────────────────────────────────────────

/**
 * Carga el resultado. Lo hace cualquiera de los 4 (o el admin).
 *
 * La cancha se libera acá, no al confirmar: la spec quiere que otros puedan
 * entrar a jugar sin esperar al admin.
 */
export async function cargarResultado(partidoId: string, sets: SetPartido[]) {
    return ejecutar("cargarResultado", async () => {
        const session = await requerirSesion();

        const calculo = calcularResultado(sets);
        if (!calculo.ok) throw new ErrorDesafio(calculo.error);
        const r = calculo.resultado;

        const salida = await db.transaction(async (tx) => {
            const [m] = await tx.select().from(challengeMatches).where(eq(challengeMatches.id, partidoId)).limit(1);
            if (!m) throw new ErrorDesafio("El partido no existe.");

            const jugadores = [m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id];
            const permiso = puedeCargarResultado({
                estado: m.status as EstadoPartido,
                userId: session.userId,
                jugadores,
                esAdmin: esAdmin(session.role),
            });
            if (!permiso.ok) throw new ErrorDesafio(permiso.error);

            await tx
                .update(challengeMatches)
                .set({
                    sets,
                    gamesTeam1: r.gamesEquipo1,
                    gamesTeam2: r.gamesEquipo2,
                    winnerTeam: r.ganador,
                    status: ESTADO_PARTIDO.RESULTADO_CARGADO,
                    reportedByUserId: session.userId,
                    reportedAt: new Date(),
                    rejectionReason: null,
                })
                .where(eq(challengeMatches.id, partidoId));

            // Libera la cancha.
            await tx
                .update(challengeCourts)
                .set({ currentMatchId: null, status: ESTADO_CANCHA.LIBRE })
                .where(eq(challengeCourts.currentMatchId, partidoId));

            // Los 4 vuelven a estar disponibles para jugar de nuevo.
            await tx
                .update(challengeRegistrations)
                .set({ status: ESTADO_INSCRIPCION.EMPAREJADO })
                .where(
                    and(
                        eq(challengeRegistrations.challengeId, m.challengeId),
                        inArray(challengeRegistrations.userId, jugadores),
                        eq(challengeRegistrations.status, ESTADO_INSCRIPCION.JUGANDO)
                    )
                );

            revalidarDesafio(m.challengeId);
            return { id: partidoId, desafioId: m.challengeId, ganador: r.ganador, resultado: formatearSets(sets) };
        });

        // Ya con la cancha liberada y el commit hecho, se intenta meter el
        // primer partido jugable de la cola (el commit importa: la cola lee los
        // estados de inscripción para saber quién quedó libre). Es best-effort:
        // si la cola está vacía o nadie puede entrar, el jugador no ve error.
        await intentarAsignarCancha(salida.desafioId);

        return salida;
    });
}

// ── Confirmar / rechazar ────────────────────────────────────────────────────

/**
 * Confirma el resultado y escribe el ledger. Es el ÚNICO lugar donde se
 * otorgan puntos de partido.
 *
 * El único `challenge_points_ledger_uniq` lo hace idempotente: doble clic en
 * confirmar no duplica nada.
 */
export async function confirmarResultado(partidoId: string) {
    return ejecutar("confirmarResultado", async () => {
        const session = await requerirAdmin();

        return await db.transaction(async (tx) => {
            const [m] = await tx.select().from(challengeMatches).where(eq(challengeMatches.id, partidoId)).limit(1);
            if (!m) throw new ErrorDesafio("El partido no existe.");

            const chequeo = chequearTransicionPartido(m.status as EstadoPartido, ESTADO_PARTIDO.CONFIRMADO);
            if (!chequeo.ok) throw new ErrorDesafio(chequeo.error);
            if (!m.winnerTeam) throw new ErrorDesafio("El partido no tiene un ganador cargado.");

            const [d] = await tx
                .select({
                    participacion: challenges.participationPoints,
                    victoria: challenges.winPoints,
                    derrota: challenges.lossPoints,
                })
                .from(challenges)
                .where(eq(challenges.id, m.challengeId))
                .limit(1);
            if (!d) throw new ErrorDesafio("El desafío no existe.");

            await tx
                .update(challengeMatches)
                .set({
                    status: ESTADO_PARTIDO.CONFIRMADO,
                    confirmedByUserId: session.userId,
                    confirmedAt: new Date(),
                })
                .where(eq(challengeMatches.id, partidoId));

            const entradas = entradasDePartido({
                matchId: partidoId,
                equipos: {
                    equipo1: [m.team1Player1Id, m.team1Player2Id],
                    equipo2: [m.team2Player1Id, m.team2Player2Id],
                },
                ganador: m.winnerTeam as 1 | 2,
                config: d,
            });

            await tx
                .insert(challengePoints)
                .values(
                    entradas.map((e) => ({
                        id: nuevoId(),
                        challengeId: m.challengeId,
                        userId: e.userId,
                        type: e.tipo,
                        points: e.puntos,
                        matchId: e.matchId,
                    }))
                )
                // Idempotente: si ya estaban, se reescribe el mismo valor.
                .onDuplicateKeyUpdate({ set: { points: sql`VALUES(points)` } });

            revalidarDesafio(m.challengeId);
            return { id: partidoId, entradas: entradas.length };
        });
    });
}

/**
 * Corrección de un resultado por parte del admin. Sirve para cargarlo en lugar
 * de los jugadores, para arreglar un error antes de confirmarlo, o para
 * corregir uno YA CONFIRMADO.
 *
 * En ese último caso el ledger se reescribe dentro de la misma transacción:
 * se borran las filas de ese partido y se vuelven a insertar con el ganador
 * nuevo. Los puntos de participación no se tocan (van con `matchId = ""`).
 */
export async function corregirResultado(partidoId: string, sets: SetPartido[]) {
    return ejecutar("corregirResultado", async () => {
        const session = await requerirAdmin();

        const calculo = calcularResultado(sets);
        if (!calculo.ok) throw new ErrorDesafio(calculo.error);
        const r = calculo.resultado;

        return await db.transaction(async (tx) => {
            const [m] = await tx.select().from(challengeMatches).where(eq(challengeMatches.id, partidoId)).limit(1);
            if (!m) throw new ErrorDesafio("El partido no existe.");
            if (m.status === ESTADO_PARTIDO.CANCELADO) {
                throw new ErrorDesafio("El partido está cancelado: no se le puede cargar un resultado.");
            }

            const [d] = await tx
                .select({
                    estado: challenges.status,
                    participacion: challenges.participationPoints,
                    victoria: challenges.winPoints,
                    derrota: challenges.lossPoints,
                })
                .from(challenges)
                .where(eq(challenges.id, m.challengeId))
                .limit(1);
            if (!d) throw new ErrorDesafio("El desafío no existe.");
            if (d.estado === ESTADO_DESAFIO.CERRADO) {
                throw new ErrorDesafio("El desafío está cerrado. Reabrilo para corregir resultados.");
            }

            const yaConfirmado = m.status === ESTADO_PARTIDO.CONFIRMADO;

            await tx
                .update(challengeMatches)
                .set({
                    sets,
                    gamesTeam1: r.gamesEquipo1,
                    gamesTeam2: r.gamesEquipo2,
                    winnerTeam: r.ganador,
                    // Si ya estaba confirmado sigue estándolo: se corrige en el lugar.
                    status: yaConfirmado ? ESTADO_PARTIDO.CONFIRMADO : ESTADO_PARTIDO.RESULTADO_CARGADO,
                    reportedByUserId: session.userId,
                    reportedAt: new Date(),
                    rejectionReason: null,
                    ...(yaConfirmado ? { confirmedByUserId: session.userId, confirmedAt: new Date() } : {}),
                })
                .where(eq(challengeMatches.id, partidoId));

            // La cancha se libera igual que al cargar un resultado normal.
            await tx
                .update(challengeCourts)
                .set({ currentMatchId: null, status: ESTADO_CANCHA.LIBRE })
                .where(eq(challengeCourts.currentMatchId, partidoId));

            const jugadores = [m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id];
            await tx
                .update(challengeRegistrations)
                .set({ status: ESTADO_INSCRIPCION.EMPAREJADO })
                .where(
                    and(
                        eq(challengeRegistrations.challengeId, m.challengeId),
                        inArray(challengeRegistrations.userId, jugadores),
                        eq(challengeRegistrations.status, ESTADO_INSCRIPCION.JUGANDO)
                    )
                );

            if (yaConfirmado) {
                // Reescribir el ledger de ESTE partido. La participación queda
                // intacta porque viaja con matchId = "".
                await tx
                    .delete(challengePoints)
                    .where(and(eq(challengePoints.challengeId, m.challengeId), eq(challengePoints.matchId, partidoId)));

                const entradas = entradasDePartido({
                    matchId: partidoId,
                    equipos: {
                        equipo1: [m.team1Player1Id, m.team1Player2Id],
                        equipo2: [m.team2Player1Id, m.team2Player2Id],
                    },
                    ganador: r.ganador,
                    config: d,
                });

                await tx.insert(challengePoints).values(
                    entradas.map((e) => ({
                        id: nuevoId(),
                        challengeId: m.challengeId,
                        userId: e.userId,
                        type: e.tipo,
                        points: e.puntos,
                        matchId: e.matchId,
                    }))
                );
            }

            revalidarDesafio(m.challengeId);
            return {
                id: partidoId,
                ganador: r.ganador,
                resultado: formatearSets(sets),
                reescribioPuntos: yaConfirmado,
            };
        });
    });
}

/** Rechaza el resultado para que lo vuelvan a cargar. No toca la cancha (ya está libre). */
export async function rechazarResultado(partidoId: string, motivo: string) {
    return ejecutar("rechazarResultado", async () => {
        await requerirAdmin();
        const texto = (motivo ?? "").trim();
        if (!texto) throw new ErrorDesafio("Escribí el motivo del rechazo, para que sepan qué corregir.");

        const [m] = await db.select().from(challengeMatches).where(eq(challengeMatches.id, partidoId)).limit(1);
        if (!m) throw new ErrorDesafio("El partido no existe.");

        const chequeo = chequearTransicionPartido(m.status as EstadoPartido, ESTADO_PARTIDO.RECHAZADO);
        if (!chequeo.ok) throw new ErrorDesafio(chequeo.error);

        await db
            .update(challengeMatches)
            .set({ status: ESTADO_PARTIDO.RECHAZADO, rejectionReason: texto })
            .where(eq(challengeMatches.id, partidoId));

        revalidarDesafio(m.challengeId);
        return { id: partidoId };
    });
}

/** Cancela un partido en curso: libera la cancha y devuelve a los 4 a emparejado. */
export async function cancelarPartido(partidoId: string, motivo?: string) {
    return ejecutar("cancelarPartido", async () => {
        await requerirAdmin();

        return await db.transaction(async (tx) => {
            const [m] = await tx.select().from(challengeMatches).where(eq(challengeMatches.id, partidoId)).limit(1);
            if (!m) throw new ErrorDesafio("El partido no existe.");

            const chequeo = chequearTransicionPartido(m.status as EstadoPartido, ESTADO_PARTIDO.CANCELADO);
            if (!chequeo.ok) throw new ErrorDesafio(chequeo.error);

            await tx
                .update(challengeMatches)
                .set({ status: ESTADO_PARTIDO.CANCELADO, rejectionReason: (motivo ?? "").trim() || null })
                .where(eq(challengeMatches.id, partidoId));

            await tx
                .update(challengeCourts)
                .set({ currentMatchId: null, status: ESTADO_CANCHA.LIBRE })
                .where(eq(challengeCourts.currentMatchId, partidoId));

            await tx
                .update(challengeRegistrations)
                .set({ status: ESTADO_INSCRIPCION.EMPAREJADO })
                .where(
                    and(
                        eq(challengeRegistrations.challengeId, m.challengeId),
                        inArray(challengeRegistrations.userId, [
                            m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id,
                        ]),
                        eq(challengeRegistrations.status, ESTADO_INSCRIPCION.JUGANDO)
                    )
                );

            revalidarDesafio(m.challengeId);
            return { id: partidoId };
        });
    });
}
