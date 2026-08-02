// Clasificados de un torneo Robin: orden y saneo antes de sembrar el cuadro.
//
// Pure core of `finalQualifiers` from useTournamentLogic. Cada grupo aporta un
// clasificado por puesto; cuando un grupo tiene menos parejas que el más grande,
// el puesto que sobra queda como "fantasma" (un BYE que ocupa lugar en el cuadro
// pero no juega).

export interface QlQualifier<P = unknown> {
    groupRank: number;
    groupId?: string;
    player?: P;
    // Todavía no se sabe quién es: el grupo no terminó ("1º GRUPO A").
    isPlaceholder?: boolean;
    // Hueco de un grupo con menos parejas que el más grande.
    isBye?: boolean;
    matchesPlayed?: number;
    won?: number;
    points?: number;
    gamesWon?: number;
}

// Un clasificado "fantasma": ocupa un lugar del cuadro pero no juega.
export function isByeQualifier(q: QlQualifier | null | undefined): boolean {
    return !q || !!q.isBye || !q.player;
}

// Cuántos clasificados son parejas de verdad. Es el tope real del cupo: subirlo
// por encima de este número sólo agrega BYEs al cuadro.
export function countRealQualifiers(quals: QlQualifier[]): number {
    return quals.filter((q) => !isByeQualifier(q)).length;
}

const perMatch = (value: number | undefined, played: number | undefined) =>
    played && played > 0 ? (value ?? 0) / played : 0;

// Orden de siembra de los clasificados.
//
// El puesto en el grupo manda siempre: un 1º de un grupo que todavía está
// jugando vale más que el 4º de un grupo que ya terminó. Ordenar por "definido
// primero" haría que un solo grupo terminado se llevara todos los cupos mientras
// el resto sigue en cancha.
//
// Dentro del mismo puesto se compara el rendimiento POR PARTIDO: los grupos
// pueden tener distinta cantidad de parejas, y comparar totales le daría el
// mejor seed al del grupo más grande sólo por haber jugado más partidos.
export function orderQualifiers<Q extends QlQualifier>(quals: Q[]): Q[] {
    return [...quals].sort((a, b) => {
        if (a.groupRank !== b.groupRank) return a.groupRank - b.groupRank;
        // A igual puesto, los ya definidos antes que los que faltan resolver.
        if (!!a.isPlaceholder !== !!b.isPlaceholder) return a.isPlaceholder ? 1 : -1;
        return (
            perMatch(b.won, b.matchesPlayed) - perMatch(a.won, a.matchesPlayed) ||
            perMatch(b.points, b.matchesPlayed) - perMatch(a.points, a.matchesPlayed) ||
            perMatch(b.gamesWon, b.matchesPlayed) - perMatch(a.gamesWon, a.matchesPlayed)
        );
    });
}

// Prepara los clasificados para `buildSeedMap`: sube el club de la pareja al
// nivel que lee la siembra, y deja a los fantasmas sin grupo ni club. Separar a
// un fantasma de "sus" parejas no evita ningún cruce y le come lugares
// protegidos a las parejas reales, que terminan enfrentándose antes de lo
// necesario.
export function toSeedInput<Q extends QlQualifier<{ clubId?: string | null }>>(quals: Q[]) {
    return quals.map((q) =>
        isByeQualifier(q)
            ? { ...q, groupId: undefined, clubId: undefined }
            : { ...q, clubId: q.player?.clubId ?? undefined }
    );
}
