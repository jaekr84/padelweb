// Group distribution for round-robin tournaments.
//
// Pure core of `handleRandomize` from FixtureSetup: shuffles players then drops
// each into the group that currently has the fewest players from their club
// (tie-break: smallest group). Avoids stacking a club into one group while
// keeping group sizes even.

export interface GrPlayer {
    id: string;
    clubId?: string | null;
}

export interface GrGroup<P> {
    id: string;
    name: string;
    players: P[];
}

export function buildEmptyGroups<P>(count: number): GrGroup<P>[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `g${i}`,
        name: `Grupo ${String.fromCharCode(65 + i)}`,
        players: [] as P[],
    }));
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function distributeIntoGroups<P extends GrPlayer>(
    players: P[],
    numGroups: number,
    playersPerGroup: number,
    opts: { rng?: () => number; preshuffled?: boolean } = {}
): GrGroup<P>[] {
    const rng = opts.rng ?? Math.random;
    const groups = buildEmptyGroups<P>(numGroups);
    const ordered = opts.preshuffled ? players : shuffle(players, rng);

    for (const player of ordered) {
        const candidates = groups.filter((g) => g.players.length < playersPerGroup);
        if (candidates.length === 0) break;

        candidates.sort((a, b) => {
            const sameClubA = player.clubId ? a.players.filter((p) => p.clubId === player.clubId).length : 0;
            const sameClubB = player.clubId ? b.players.filter((p) => p.clubId === player.clubId).length : 0;
            if (sameClubA !== sameClubB) return sameClubA - sameClubB;
            return a.players.length - b.players.length;
        });

        candidates[0].players.push(player);
    }

    return groups;
}
