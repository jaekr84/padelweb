// Armado de parejas por lado de cancha (§7 "Disponibles" de docs/desafio-specs.md).
//
// En el Desafío las parejas se arman a mano, así que esto no decide nada: sirve
// para ordenar las sugerencias y para el aviso blando cuando se juntan dos del
// mismo lado. Avisa, pero deja pasar.
//
// La escala de costos viene de src/lib/matchmaking/openCourt.ts, que ya la usa
// en Cancha Abierta; se mantiene igual para que las dos pantallas ordenen las
// parejas con el mismo criterio.

import { LADO, normalizarLado, type Lado } from "./estados";

export const COSTO_LADOS = {
    /** drive + revés: la pareja natural */
    COMPLEMENTARIO: -100,
    /** al menos uno juega de los dos lados: se acomoda */
    COMODIN: 0,
    /** revés + revés: incómodo, pero uno se pasa al drive */
    DOBLE_REVES: 80,
    /** drive + drive: el peor caso, nadie cubre el revés */
    DOBLE_DRIVE: 150,
} as const;

/** Menor costo = mejor pareja. */
export function costoPareja(a: Lado | string | null, b: Lado | string | null): number {
    const la = normalizarLado(a as string);
    const lb = normalizarLado(b as string);

    if ((la === LADO.DRIVE && lb === LADO.REVES) || (la === LADO.REVES && lb === LADO.DRIVE)) {
        return COSTO_LADOS.COMPLEMENTARIO;
    }
    if (la === LADO.DRIVE && lb === LADO.DRIVE) return COSTO_LADOS.DOBLE_DRIVE;
    if (la === LADO.REVES && lb === LADO.REVES) return COSTO_LADOS.DOBLE_REVES;
    return COSTO_LADOS.COMODIN; // alguno juega de ambos
}

export type AvisoPareja = { nivel: "ok" | "aviso"; mensaje: string };

/**
 * El aviso blando de la spec. Nunca bloquea: devuelve nivel "aviso" y la UI
 * decide si lo muestra como advertencia.
 */
export function avisoPareja(a: Lado | string | null, b: Lado | string | null): AvisoPareja {
    const la = normalizarLado(a as string);
    const lb = normalizarLado(b as string);

    if (la === LADO.DRIVE && lb === LADO.DRIVE) {
        return { nivel: "aviso", mensaje: "Los dos juegan de drive: nadie cubre el revés." };
    }
    if (la === LADO.REVES && lb === LADO.REVES) {
        return { nivel: "aviso", mensaje: "Los dos juegan de revés: uno va a tener que pasarse al drive." };
    }
    if ((la === LADO.DRIVE && lb === LADO.REVES) || (la === LADO.REVES && lb === LADO.DRIVE)) {
        return { nivel: "ok", mensaje: "Drive y revés: se complementan." };
    }
    return { nivel: "ok", mensaje: "Al menos uno juega de los dos lados." };
}

export type JugadorConLado = { userId: string; lado: Lado };

/** Los tres grupos que pide la pantalla de disponibles. */
export type PoolPorLado = {
    reves: JugadorConLado[];
    drive: JugadorConLado[];
    ambos: JugadorConLado[];
};

export function agruparPorLado<T extends { userId: string; lado?: string | null }>(
    jugadores: readonly T[]
): { reves: T[]; drive: T[]; ambos: T[] } {
    const out = { reves: [] as T[], drive: [] as T[], ambos: [] as T[] };
    for (const j of jugadores) {
        const lado = normalizarLado(j.lado);
        if (lado === LADO.REVES) out.reves.push(j);
        else if (lado === LADO.DRIVE) out.drive.push(j);
        else out.ambos.push(j);
    }
    return out;
}

/**
 * Ordena los compañeros posibles de `jugador` de mejor a peor. La UI la usa
 * para sugerir con quién armar pareja, sin imponer nada.
 */
export function sugerirCompaneros<T extends { userId: string; lado?: string | null }>(
    jugador: { userId: string; lado?: string | null },
    disponibles: readonly T[]
): T[] {
    return disponibles
        .filter((c) => c.userId !== jugador.userId)
        .map((c) => ({ c, costo: costoPareja(jugador.lado ?? null, c.lado ?? null) }))
        .sort((x, y) => x.costo - y.costo)
        .map(({ c }) => c);
}
