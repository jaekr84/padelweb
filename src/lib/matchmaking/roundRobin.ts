// Fixture de la fase de grupos de un torneo Robin.
//
// Pure core of `generateMatches` / `handleConfirmGroups` (FixtureSetup y la
// página de fixture, que tenían tres copias del mismo doble bucle).
//
// El criterio es el todos-contra-todos clásico: dentro de cada grupo, cada
// pareja enfrenta exactamente una vez a cada una de las demás — n(n-1)/2
// partidos por grupo, sin repetir ni saltear ningún cruce.
//
// Además los ordena para que una pareja no juegue dos veces seguidas. El grupo
// juega en una sola cancha, así que el fixture es una fila: lo que importa no es
// armar rondas simultáneas sino que entre dos partidos de la misma pareja haya
// al menos uno de las otras. `roundIndex` guarda esa posición para que el orden
// sobreviva al guardado (los ids se reescriben como UUID al persistir).
//
// Con 4 parejas el cero absoluto es imposible: sólo hay tres cruces disjuntos
// (AB|CD, AC|BD, AD|BC), así que alguna repetición seguida es inevitable. El
// orden que devolvemos llega al mínimo alcanzable en vez de dejarlo al azar.

export interface RrPlayer {
    id: string;
}

export interface RrGroup<P extends RrPlayer> {
    id: string;
    players: P[];
}

export interface RrMatch<P extends RrPlayer> {
    id: string;
    groupId: string;
    team1: P;
    team2: P;
    played: boolean;
    confirmed: boolean;
    /** Posición dentro del fixture del grupo (0-based). */
    roundIndex: number;
}

/**
 * Ordena los cruces de un grupo maximizando el descanso entre partidos de una
 * misma pareja. Greedy determinista: en cada paso elige el cruce que no repita
 * ninguna pareja del partido anterior y, entre esos, el de las parejas que hace
 * más tiempo no juegan. Determinista a propósito — regenerar el fixture del
 * mismo grupo tiene que dar exactamente el mismo orden.
 */
function orderByRest(pairs: Array<[number, number]>, playerCount: number): Array<[number, number]> {
    const remaining = pairs.slice();
    const ordered: Array<[number, number]> = [];
    // -1 => todavía no jugó; se prioriza a quien nunca jugó.
    const lastPlayedAt = new Array<number>(playerCount).fill(-1);
    let prev: [number, number] | null = null;

    while (remaining.length > 0) {
        const slot = ordered.length;
        let bestIdx = 0;
        let bestScore = -Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const [a, b] = remaining[i];
            const repeatsPrev = prev !== null &&
                (a === prev[0] || a === prev[1] || b === prev[0] || b === prev[1]);
            // Descanso = turnos desde que jugó el que jugó más recientemente.
            // Nunca jugó (-1) pesa más que cualquier descanso real.
            const restA = lastPlayedAt[a] === -1 ? Number.MAX_SAFE_INTEGER : slot - lastPlayedAt[a];
            const restB = lastPlayedAt[b] === -1 ? Number.MAX_SAFE_INTEGER : slot - lastPlayedAt[b];
            const rest = Math.min(restA, restB);
            // Jugar seguido pesa más que cualquier diferencia de descanso.
            const score = (repeatsPrev ? -Number.MAX_SAFE_INTEGER : 0) + rest;

            if (score > bestScore) {
                bestScore = score;
                bestIdx = i;
            }
        }

        const chosen = remaining.splice(bestIdx, 1)[0];
        ordered.push(chosen);
        lastPlayedAt[chosen[0]] = slot;
        lastPlayedAt[chosen[1]] = slot;
        prev = chosen;
    }

    return ordered;
}

export function generateGroupMatches<P extends RrPlayer>(groups: RrGroup<P>[]): RrMatch<P>[] {
    const matches: RrMatch<P>[] = [];

    for (const group of groups) {
        const players = Array.isArray(group.players) ? group.players : [];

        const pairs: Array<[number, number]> = [];
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                pairs.push([i, j]);
            }
        }

        orderByRest(pairs, players.length).forEach(([i, j], position) => {
            matches.push({
                // El id se deriva de las posiciones dentro del grupo, así que
                // regenerar el fixture del mismo grupo da los mismos ids.
                id: `m_${group.id}_${i}_${j}`,
                groupId: group.id,
                team1: players[i],
                team2: players[j],
                played: false,
                confirmed: false,
                roundIndex: position,
            });
        });
    }

    return matches;
}
