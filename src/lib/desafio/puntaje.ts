// Puntaje del Desafío (§2 y §5 de docs/desafio-specs.md).
//
// Los puntos se acreditan SIEMPRE al jugador individual. La pareja es un
// vínculo temporal y desarmable; el punto, una vez confirmado, es de la persona.
// Por eso el ledger no guarda parejas: guarda `userId`.

import { TIPO_PUNTAJE, type TipoPuntaje } from "./estados";

export type ConfigPuntaje = {
    participacion: number;
    victoria: number;
    derrota: number;
};

export const PUNTAJE_DEFAULT: ConfigPuntaje = {
    participacion: 1,
    victoria: 3,
    derrota: 0,
};

/**
 * Una fila del ledger lista para insertar.
 *
 * `matchId` usa centinela "" cuando el punto no viene de un partido (la
 * participación). Es NOT NULL a propósito: si fuera nullable, el índice único
 * no protegería nada, porque MySQL considera que dos NULL son distintos y se
 * podrían insertar dos participaciones para el mismo jugador.
 */
export type EntradaLedger = {
    userId: string;
    tipo: TipoPuntaje;
    puntos: number;
    matchId: string;
};

export const SIN_PARTIDO = "";

/** El punto que se acredita al inscribirse. Uno solo por jugador por desafío. */
export function entradaParticipacion(userId: string, config: ConfigPuntaje = PUNTAJE_DEFAULT): EntradaLedger {
    return {
        userId,
        tipo: TIPO_PUNTAJE.PARTICIPACION,
        puntos: config.participacion,
        matchId: SIN_PARTIDO,
    };
}

export type EquiposDelPartido = {
    equipo1: readonly [string, string];
    equipo2: readonly [string, string];
};

/**
 * Las 4 filas que se escriben al confirmar un partido: 2 victorias y 2 derrotas.
 *
 * La derrota se registra aunque valga 0 puntos, porque el ranking cuenta
 * partidos jugados a partir del ledger y no de la tabla de partidos.
 */
export function entradasDePartido(args: {
    matchId: string;
    equipos: EquiposDelPartido;
    ganador: 1 | 2;
    config?: ConfigPuntaje;
}): EntradaLedger[] {
    const { matchId, equipos, ganador, config = PUNTAJE_DEFAULT } = args;
    const ganadores = ganador === 1 ? equipos.equipo1 : equipos.equipo2;
    const perdedores = ganador === 1 ? equipos.equipo2 : equipos.equipo1;

    return [
        ...ganadores.map((userId) => ({
            userId,
            tipo: TIPO_PUNTAJE.VICTORIA,
            puntos: config.victoria,
            matchId,
        })),
        ...perdedores.map((userId) => ({
            userId,
            tipo: TIPO_PUNTAJE.DERROTA,
            puntos: config.derrota,
            matchId,
        })),
    ];
}

// ── Resultado por sets ──────────────────────────────────────────────────────

/** Un set del partido. Se llama `SetPartido` para no tapar el `Set` global. */
export type SetPartido = { t1: number; t2: number };

export type ResultadoCalculado = {
    gamesEquipo1: number;
    gamesEquipo2: number;
    setsEquipo1: number;
    setsEquipo2: number;
    ganador: 1 | 2;
};

export type ChequeoResultado = { ok: true; resultado: ResultadoCalculado } | { ok: false; error: string };

/**
 * Valida y resume un resultado cargado.
 *
 * A propósito NO valida reglas de pádel (6-4, tie-break, etc.): los formatos
 * varían mucho entre eventos y el admin confirma igual. Sólo se rechaza lo que
 * haría imposible calcular el ranking: sin sets, games negativos o empate.
 */
export function calcularResultado(sets: readonly SetPartido[]): ChequeoResultado {
    if (!sets || sets.length === 0) {
        return { ok: false, error: "Cargá al menos un set." };
    }

    let gamesEquipo1 = 0;
    let gamesEquipo2 = 0;
    let setsEquipo1 = 0;
    let setsEquipo2 = 0;

    for (const [i, s] of sets.entries()) {
        const t1 = Number(s?.t1);
        const t2 = Number(s?.t2);
        if (!Number.isInteger(t1) || !Number.isInteger(t2) || t1 < 0 || t2 < 0) {
            return { ok: false, error: `El set ${i + 1} tiene games inválidos.` };
        }
        if (t1 === t2) {
            return { ok: false, error: `El set ${i + 1} está empatado (${t1}-${t2}).` };
        }
        gamesEquipo1 += t1;
        gamesEquipo2 += t2;
        if (t1 > t2) setsEquipo1++;
        else setsEquipo2++;
    }

    if (setsEquipo1 === setsEquipo2) {
        return { ok: false, error: "El partido quedó empatado en sets: tiene que haber un ganador." };
    }

    return {
        ok: true,
        resultado: {
            gamesEquipo1,
            gamesEquipo2,
            setsEquipo1,
            setsEquipo2,
            ganador: setsEquipo1 > setsEquipo2 ? 1 : 2,
        },
    };
}

/** "6-4 3-6 7-5" para mostrar en listados e historial. */
export const formatearSets = (sets: readonly SetPartido[]) =>
    sets.map((s) => `${s.t1}-${s.t2}`).join(" ");
