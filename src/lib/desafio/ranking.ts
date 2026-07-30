// Ranking del Desafío (§6 de docs/desafio-specs.md).
//
// Sale del ledger y de ningún otro lado. Los partidos entran sólo para el
// tercer criterio de desempate (diferencia de games), que no se puede derivar
// de los puntos.
//
// Desempate: 1º puntos · 2º partidos ganados · 3º diferencia de games.

import { TIPO_PUNTAJE, type TipoPuntaje } from "./estados";

export type EntradaRanking = {
    userId: string;
    tipo: TipoPuntaje;
    puntos: number;
};

/** Sólo los partidos CONFIRMADOS entran acá. */
export type PartidoResumen = {
    equipo1: readonly [string, string];
    equipo2: readonly [string, string];
    gamesEquipo1: number;
    gamesEquipo2: number;
};

export type FilaRanking = {
    posicion: number;
    userId: string;
    puntos: number;
    ganados: number;
    perdidos: number;
    jugados: number;
    gamesFavor: number;
    gamesContra: number;
    difGames: number;
};

/**
 * Arma la tabla de posiciones.
 *
 * Todo el que tenga al menos una entrada en el ledger aparece, aunque no haya
 * jugado: el punto de participación ya lo mete en la tabla.
 */
export function calcularRanking(
    entradas: readonly EntradaRanking[],
    partidos: readonly PartidoResumen[] = []
): FilaRanking[] {
    const acc = new Map<string, Omit<FilaRanking, "posicion" | "difGames">>();

    const fila = (userId: string) => {
        let f = acc.get(userId);
        if (!f) {
            f = { userId, puntos: 0, ganados: 0, perdidos: 0, jugados: 0, gamesFavor: 0, gamesContra: 0 };
            acc.set(userId, f);
        }
        return f;
    };

    for (const e of entradas) {
        const f = fila(e.userId);
        f.puntos += e.puntos;
        if (e.tipo === TIPO_PUNTAJE.VICTORIA) {
            f.ganados++;
            f.jugados++;
        } else if (e.tipo === TIPO_PUNTAJE.DERROTA) {
            f.perdidos++;
            f.jugados++;
        }
    }

    // Games a favor y en contra según de qué lado estuvo cada jugador.
    for (const p of partidos) {
        for (const userId of p.equipo1) {
            const f = fila(userId);
            f.gamesFavor += p.gamesEquipo1;
            f.gamesContra += p.gamesEquipo2;
        }
        for (const userId of p.equipo2) {
            const f = fila(userId);
            f.gamesFavor += p.gamesEquipo2;
            f.gamesContra += p.gamesEquipo1;
        }
    }

    return [...acc.values()]
        .map((f) => ({ ...f, difGames: f.gamesFavor - f.gamesContra }))
        .sort(compararFilas)
        .map((f, i) => ({ posicion: i + 1, ...f }));
}

/** El orden de la spec: puntos, después ganados, después diferencia de games. */
export function compararFilas(
    a: Omit<FilaRanking, "posicion">,
    b: Omit<FilaRanking, "posicion">
): number {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.ganados !== a.ganados) return b.ganados - a.ganados;
    return b.difGames - a.difGames;
}

/** Porcentaje de victorias, para mostrar en la tabla. Sin partidos, 0. */
export const efectividad = (f: Pick<FilaRanking, "ganados" | "jugados">) =>
    f.jugados === 0 ? 0 : Math.round((f.ganados / f.jugados) * 100);
