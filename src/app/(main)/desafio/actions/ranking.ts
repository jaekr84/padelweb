"use server";

// Ranking del desafío. Sale del ledger (`challenge_points`) y de ningún otro
// lado; los partidos entran sólo para el tercer criterio de desempate
// (diferencia de games). Spec: docs/desafio-specs.md §6.

import { db } from "@/db";
import { challengeMatches, challengePoints, challenges, users } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { ESTADO_PARTIDO, calcularRanking, efectividad, type EntradaRanking, type TipoPuntaje } from "@/lib/desafio";

export type FilaRankingUI = {
    posicion: number;
    userId: string;
    nombre: string;
    imagen: string | null;
    categoria: string | null;
    puntos: number;
    jugados: number;
    ganados: number;
    perdidos: number;
    gamesFavor: number;
    gamesContra: number;
    difGames: number;
    efectividad: number;
};

const nombreDe = (u: { firstName: string | null; lastName: string | null; email: string }) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email.split("@")[0];

export async function rankingDelDesafio(desafioId: string): Promise<FilaRankingUI[]> {
    const entradas = await db
        .select({
            userId: challengePoints.userId,
            tipo: challengePoints.type,
            puntos: challengePoints.points,
        })
        .from(challengePoints)
        .where(eq(challengePoints.challengeId, desafioId));

    if (entradas.length === 0) return [];

    // Sólo los confirmados aportan games: los demás todavía no son resultado.
    const partidos = await db
        .select({
            t1p1: challengeMatches.team1Player1Id,
            t1p2: challengeMatches.team1Player2Id,
            t2p1: challengeMatches.team2Player1Id,
            t2p2: challengeMatches.team2Player2Id,
            gamesTeam1: challengeMatches.gamesTeam1,
            gamesTeam2: challengeMatches.gamesTeam2,
        })
        .from(challengeMatches)
        .where(and(eq(challengeMatches.challengeId, desafioId), eq(challengeMatches.status, ESTADO_PARTIDO.CONFIRMADO)));

    const tabla = calcularRanking(
        entradas.map((e) => ({ userId: e.userId, tipo: e.tipo as TipoPuntaje, puntos: e.puntos })) as EntradaRanking[],
        partidos.map((m) => ({
            equipo1: [m.t1p1, m.t1p2] as [string, string],
            equipo2: [m.t2p1, m.t2p2] as [string, string],
            gamesEquipo1: m.gamesTeam1 ?? 0,
            gamesEquipo2: m.gamesTeam2 ?? 0,
        }))
    );

    const personas = await db
        .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            category: users.category,
            imageUrl: users.imageUrl,
        })
        .from(users)
        .where(inArray(users.id, tabla.map((f) => f.userId)));
    const porId = new Map(personas.map((p) => [p.id, p]));

    return tabla.map((f) => {
        const u = porId.get(f.userId);
        return {
            ...f,
            nombre: u ? nombreDe(u) : "Jugador",
            imagen: u?.imageUrl ?? null,
            categoria: u?.category ?? null,
            efectividad: efectividad(f),
        };
    });
}

/** Datos de cabecera del panel: cuánto se jugó y cuánto falta. */
export async function resumenDelDesafio(desafioId: string) {
    const partidos = await db
        .select({ status: challengeMatches.status })
        .from(challengeMatches)
        .where(eq(challengeMatches.challengeId, desafioId));

    const contar = (estado: string) => partidos.filter((p) => p.status === estado).length;

    return {
        enCurso: contar(ESTADO_PARTIDO.EN_CURSO),
        aConfirmar: contar(ESTADO_PARTIDO.RESULTADO_CARGADO),
        confirmados: contar(ESTADO_PARTIDO.CONFIRMADO),
        rechazados: contar(ESTADO_PARTIDO.RECHAZADO),
        total: partidos.length,
    };
}
