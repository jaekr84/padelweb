// Fixture de la fase de grupos de un torneo Robin.
//
// Pure core of `generateMatches` / `handleConfirmGroups` (FixtureSetup y la
// página de fixture, que tenían tres copias del mismo doble bucle).
//
// El criterio es el todos-contra-todos clásico: dentro de cada grupo, cada
// pareja enfrenta exactamente una vez a cada una de las demás — n(n-1)/2
// partidos por grupo, sin repetir ni saltear ningún cruce.
//
// A propósito NO reparte los partidos en rondas ni asigna canchas: en el Robin
// el orden de juego lo decide el admin a mano desde la pantalla del grupo (a
// diferencia del Americano, que sí programa rondas para que nadie juegue dos
// veces seguidas). Lo que devuelve esta función es la lista de cruces, no un
// cronograma.

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
}

export function generateGroupMatches<P extends RrPlayer>(groups: RrGroup<P>[]): RrMatch<P>[] {
    const matches: RrMatch<P>[] = [];

    for (const group of groups) {
        const players = Array.isArray(group.players) ? group.players : [];
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                matches.push({
                    // El id se deriva de las posiciones dentro del grupo, así que
                    // regenerar el fixture del mismo grupo da los mismos ids.
                    id: `m_${group.id}_${i}_${j}`,
                    groupId: group.id,
                    team1: players[i],
                    team2: players[j],
                    played: false,
                    confirmed: false,
                });
            }
        }
    }

    return matches;
}
