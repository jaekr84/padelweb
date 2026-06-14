// Group standings (round-robin table).
//
// Pure core of `computeStandings` from useTournamentLogic. Builds each player's
// record from confirmed group matches and ranks them with the FIP tie-break
// chain: head-to-head (when exactly two are tied) → wins → points (game diff) →
// games won. Recurses so ties are broken within each tied sub-group.

export interface StPlayer {
    id: string;
}

export interface StMatch<P extends StPlayer> {
    team1?: P | null;
    team2?: P | null;
    score1?: number | null;
    score2?: number | null;
    confirmed?: boolean;
}

export interface Standing<P extends StPlayer> {
    playerId: string;
    player: P;
    points: number;
    matchesPlayed: number;
    won: number;
    lost: number;
    gamesWon: number;
    gamesLost: number;
}

export function computeGroupStandings<P extends StPlayer>(
    players: P[],
    matches: StMatch<P>[]
): Standing<P>[] {
    const confirmed = matches.filter((m) => m.confirmed);

    const standings: Standing<P>[] = players.map((p) => ({
        playerId: p.id,
        player: p,
        points: 0,
        matchesPlayed: 0,
        won: 0,
        lost: 0,
        gamesWon: 0,
        gamesLost: 0,
    }));

    confirmed.forEach((m) => {
        if (m.score1 === undefined || m.score2 === undefined || m.score1 === null || m.score2 === null) return;
        if (!m.team1 || !m.team2) return;
        const p1 = standings.find((s) => s.playerId === m.team1!.id);
        const p2 = standings.find((s) => s.playerId === m.team2!.id);
        if (p1 && p2) {
            p1.matchesPlayed++;
            p2.matchesPlayed++;
            const s1 = Number(m.score1);
            const s2 = Number(m.score2);
            p1.gamesWon += s1;
            p1.gamesLost += s2;
            p2.gamesWon += s2;
            p2.gamesLost += s1;
            p1.points += s1 - s2;
            p2.points += s2 - s1;
            if (s1 > s2) {
                p1.won++;
                p2.lost++;
            } else if (s2 > s1) {
                p2.won++;
                p1.lost++;
            }
        }
    });

    const rankFIPGroup = (group: Standing<P>[], metricIndex = 0): Standing<P>[] => {
        if (group.length <= 1) return group;
        if (group.length === 2) {
            const [a, b] = group;
            const match = confirmed.find(
                (m) =>
                    m.team1 &&
                    m.team2 &&
                    ((m.team1.id === a.playerId && m.team2.id === b.playerId) ||
                        (m.team1.id === b.playerId && m.team2.id === a.playerId))
            );
            if (match) {
                const aIsTeam1 = match.team1!.id === a.playerId;
                const aScore = (aIsTeam1 ? match.score1 : match.score2) as number;
                const bScore = (aIsTeam1 ? match.score2 : match.score1) as number;
                if (aScore !== bScore) return aScore > bScore ? [a, b] : [b, a];
            }
        }

        const metrics = [(p: Standing<P>) => p.won, (p: Standing<P>) => p.points, (p: Standing<P>) => p.gamesWon];
        if (metricIndex >= metrics.length) return group;
        const metricFn = metrics[metricIndex];
        const byMetric = new Map<number, Standing<P>[]>();
        for (const p of group) {
            const val = metricFn(p);
            if (!byMetric.has(val)) byMetric.set(val, []);
            byMetric.get(val)!.push(p);
        }
        const sortedVals = Array.from(byMetric.keys()).sort((a, b) => b - a);
        let result: Standing<P>[] = [];
        for (const val of sortedVals) {
            result = result.concat(rankFIPGroup(byMetric.get(val)!, metricIndex + 1));
        }
        return result;
    };

    return rankFIPGroup(standings);
}
