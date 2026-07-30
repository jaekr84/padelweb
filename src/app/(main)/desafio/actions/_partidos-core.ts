// Núcleo de "poner dos parejas a jugar", compartido por la acción manual
// (partidos.ts) y por la asignación automática desde la cola (cola.ts).
//
// Vive fuera de los archivos "use server" para poder recibir la transacción por
// parámetro: si la cola llamara a la action directamente, abriría una
// transacción anidada o habría que compensar a mano si falla.

import { db } from "@/db";
import {
    challengeCourts, challengeMatches, challengePairs, challengeRegistrations, challenges,
} from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { ESTADO_CANCHA, ESTADO_DESAFIO, ESTADO_INSCRIPCION, ESTADO_PARTIDO } from "@/lib/desafio";
import { ErrorDesafio, nuevoId } from "./_helpers";

/** La transacción de Drizzle, sin tener que importar sus genéricos. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ArgsIniciar = {
    desafioId: string;
    canchaId: string;
    pareja1Id: string;
    pareja2Id: string;
};

/**
 * Crea el partido y toma la cancha. Devuelve el id del partido.
 *
 * El candado es el UPDATE condicional sobre `current_match_id IS NULL`: si no
 * afecta ninguna fila, otro se adelantó y se aborta la transacción entera. El
 * UNIQUE del schema queda como segunda barrera (impide que un mismo partido
 * quede referenciado por dos canchas).
 */
export async function iniciarPartidoEnTx(tx: Tx, args: ArgsIniciar): Promise<string> {
    const { desafioId, canchaId, pareja1Id, pareja2Id } = args;
    if (pareja1Id === pareja2Id) throw new ErrorDesafio("Una pareja no puede jugar contra sí misma.");

    const [desafio] = await tx
        .select({ estado: challenges.status })
        .from(challenges)
        .where(eq(challenges.id, desafioId))
        .limit(1);
    if (!desafio) throw new ErrorDesafio("El desafío no existe.");
    if (desafio.estado !== ESTADO_DESAFIO.ABIERTO) throw new ErrorDesafio("El desafío no está abierto.");

    const [cancha] = await tx
        .select()
        .from(challengeCourts)
        .where(and(eq(challengeCourts.id, canchaId), eq(challengeCourts.challengeId, desafioId)))
        .limit(1);
    if (!cancha) throw new ErrorDesafio("La cancha no existe en este desafío.");
    if (cancha.status === ESTADO_CANCHA.INHABILITADA) throw new ErrorDesafio("La cancha está inhabilitada.");
    if (cancha.currentMatchId) throw new ErrorDesafio("La cancha ya está ocupada.");

    const parejas = await tx
        .select()
        .from(challengePairs)
        .where(and(eq(challengePairs.challengeId, desafioId), inArray(challengePairs.id, [pareja1Id, pareja2Id])));
    if (parejas.length !== 2) throw new ErrorDesafio("Alguna de las parejas no existe en este desafío.");
    if (parejas.some((p) => !p.active)) throw new ErrorDesafio("Alguna de las parejas está disuelta.");

    const p1 = parejas.find((p) => p.id === pareja1Id)!;
    const p2 = parejas.find((p) => p.id === pareja2Id)!;
    const jugadores = [p1.playerAId, p1.playerBId, p2.playerAId, p2.playerBId];
    if (new Set(jugadores).size !== 4) throw new ErrorDesafio("Hay un jugador repetido entre las dos parejas.");

    const inscripciones = await tx
        .select({ userId: challengeRegistrations.userId, status: challengeRegistrations.status })
        .from(challengeRegistrations)
        .where(and(eq(challengeRegistrations.challengeId, desafioId), inArray(challengeRegistrations.userId, jugadores)))
        .for("update");
    if (inscripciones.length !== 4) throw new ErrorDesafio("Alguno de los jugadores no está inscripto.");

    const fuera = inscripciones.find((i) => i.status !== ESTADO_INSCRIPCION.EMPAREJADO);
    if (fuera) {
        throw new ErrorDesafio(
            fuera.status === ESTADO_INSCRIPCION.JUGANDO
                ? "Alguno de los jugadores ya está jugando otro partido."
                : "Los cuatro jugadores tienen que estar emparejados y libres."
        );
    }

    const partidoId = nuevoId();
    await tx.insert(challengeMatches).values({
        id: partidoId,
        challengeId: desafioId,
        courtId: canchaId,
        team1Player1Id: p1.playerAId,
        team1Player2Id: p1.playerBId,
        team2Player1Id: p2.playerAId,
        team2Player2Id: p2.playerBId,
        pair1Id: pareja1Id,
        pair2Id: pareja2Id,
        status: ESTADO_PARTIDO.EN_CURSO,
    });

    const tomada: any = await tx
        .update(challengeCourts)
        .set({ currentMatchId: partidoId, status: ESTADO_CANCHA.OCUPADA })
        .where(and(eq(challengeCourts.id, canchaId), isNull(challengeCourts.currentMatchId)));

    if (Number(tomada?.[0]?.affectedRows ?? 0) !== 1) {
        throw new ErrorDesafio("Justo se ocupó esa cancha. Probá con otra.");
    }

    await tx
        .update(challengeRegistrations)
        .set({ status: ESTADO_INSCRIPCION.JUGANDO })
        .where(and(eq(challengeRegistrations.challengeId, desafioId), inArray(challengeRegistrations.userId, jugadores)));

    return partidoId;
}

/** Primera cancha libre y habilitada del desafío, si hay alguna. */
export async function primeraCanchaLibre(tx: Tx, desafioId: string) {
    const [cancha] = await tx
        .select({ id: challengeCourts.id, numero: challengeCourts.number })
        .from(challengeCourts)
        .where(
            and(
                eq(challengeCourts.challengeId, desafioId),
                eq(challengeCourts.status, ESTADO_CANCHA.LIBRE),
                isNull(challengeCourts.currentMatchId)
            )
        )
        .orderBy(challengeCourts.number)
        .limit(1);
    return cancha ?? null;
}
