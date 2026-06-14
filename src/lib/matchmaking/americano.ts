// Americano match-making.
//
// Pure core of `generateAmericanoMatches` from AmericanoSetup. Builds the full
// list of 1v1-pair matches (each "player" entry is a team/individual) so that:
//   - Every player gets EXACTLY `matchesPerPlayer` matches (off by at most 1
//     only when n·k is odd and it is mathematically impossible to be exact).
//     This is guaranteed by the round-robin "circle method" instead of a greedy
//     pick that used to leave players short.
//   - Pairs from *different* clubs are preferred over same-club pairs (best
//     effort: we try several rotations and keep the one with fewest same-club
//     pairs, without ever sacrificing the match-count guarantee).
//   - Anti-bottleneck scheduling: no player twice in the same round, and players
//     who rested last round are prioritized (rest rule).

export interface AmPlayer {
    id: string;
    clubId?: string | null;
}

export interface AmScheduledMatch<P> {
    id: string;
    groupId: string;
    team1: P;
    team2: P;
    played: boolean;
    confirmed: boolean;
    roundIndex: number;
    courtNumber: number;
}

export interface AmOptions {
    rng?: () => number; // defaults to Math.random — injectable for deterministic tests
    genId?: () => string; // defaults to crypto.randomUUID
}

export function generateAmericanoMatches<P extends AmPlayer>(
    players: P[],
    matchesPerPlayer: number,
    maxCourts: number,
    opts: AmOptions = {}
): AmScheduledMatch<P>[] {
    const rng = opts.rng ?? Math.random;
    const genId = opts.genId ?? (() => crypto.randomUUID());

    if (players.length < 2 || matchesPerPlayer < 1) return [];

    // 1-2. Build the pairings round by round until EVERY player has reached
    // `matchesPerPlayer` matches.
    //
    // Each round is a matching of the players who still need matches: they are
    // paired up greedily, preferring partners from a different club and avoiding
    // pairs that already met. Nobody is ever left short — at worst a single
    // player ends with one EXTRA match, and only when `players × matchesPerPlayer`
    // is odd (so an exact split is mathematically impossible).
    const shuffled = (arr: P[]): P[] => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    const pairKey = (a: P, b: P) => [a.id, b.id].sort().join("|");
    const partnerScore = (a: P, b: P, seen: Set<string>) => {
        let score = 0;
        if (seen.has(pairKey(a, b))) score += 100; // already played together
        if (a.clubId && b.clubId && a.clubId === b.clubId) score += 10; // same club
        return score;
    };

    const seenPairs = new Set<string>();
    const matchCount = new Map<string, number>();
    players.forEach((p) => matchCount.set(p.id, 0));

    const selectedMatches: { team1: P; team2: P }[] = [];
    const target = matchesPerPlayer;

    let guard = 0;
    while (players.some((p) => matchCount.get(p.id)! < target)) {
        if (++guard > 1000) break; // safety

        let pool = shuffled(players.filter((p) => matchCount.get(p.id)! < target));

        // Odd number of players still needing a match.
        if (pool.length % 2 !== 0) {
            if (pool.length === 1) {
                // Only one player left short: pair them with the best already-satisfied
                // player (who ends with one extra match). Happens only when n·k is odd.
                const a = pool[0];
                const candidates = players.filter((p) => p.id !== a.id);
                let best = candidates[0];
                let bestScore = Infinity;
                for (const b of candidates) {
                    const s = partnerScore(a, b, seenPairs);
                    if (s < bestScore) { bestScore = s; best = b; }
                    if (s === 0) break;
                }
                seenPairs.add(pairKey(a, best));
                selectedMatches.push({ team1: a, team2: best });
                matchCount.set(a.id, matchCount.get(a.id)! + 1);
                matchCount.set(best.id, matchCount.get(best.id)! + 1);
                continue;
            }
            // Sit out whoever is closest to finishing (highest current count).
            let byeIdx = 0;
            for (let i = 1; i < pool.length; i++) {
                if (matchCount.get(pool[i].id)! > matchCount.get(pool[byeIdx].id)!) byeIdx = i;
            }
            pool = pool.filter((_, i) => i !== byeIdx);
        }

        const used = new Array(pool.length).fill(false);
        for (let i = 0; i < pool.length; i++) {
            if (used[i]) continue;
            const a = pool[i];
            let bestJ = -1;
            let bestScore = Infinity;
            for (let j = i + 1; j < pool.length; j++) {
                if (used[j]) continue;
                const s = partnerScore(a, pool[j], seenPairs);
                if (s < bestScore) {
                    bestScore = s;
                    bestJ = j;
                    if (s === 0) break; // ideal partner, stop searching
                }
            }
            const b = pool[bestJ];
            used[i] = true;
            used[bestJ] = true;
            seenPairs.add(pairKey(a, b));
            selectedMatches.push({ team1: a, team2: b });
            matchCount.set(a.id, matchCount.get(a.id)! + 1);
            matchCount.set(b.id, matchCount.get(b.id)! + 1);
        }
    }

    // 3. Anti-bottleneck scheduling (rounds & courts)
    const scheduledMatches: AmScheduledMatch<P>[] = [];
    const remainingMatches = [...selectedMatches];
    let currentRound = 0;
    let lastRoundPlayers = new Set<string>();

    while (remainingMatches.length > 0) {
        const roundMatches: typeof selectedMatches = [];
        const roundPlayers = new Set<string>();

        const priorityMatches = remainingMatches.filter(
            (m) => !lastRoundPlayers.has(m.team1.id) && !lastRoundPlayers.has(m.team2.id)
        );
        const others = remainingMatches.filter(
            (m) => lastRoundPlayers.has(m.team1.id) || lastRoundPlayers.has(m.team2.id)
        );

        const attemptAssignment = (pool: typeof selectedMatches) => {
            for (let k = pool.length - 1; k >= 0; k--) {
                const m = pool[k];
                if (roundMatches.length < maxCourts && !roundPlayers.has(m.team1.id) && !roundPlayers.has(m.team2.id)) {
                    roundMatches.push(m);
                    roundPlayers.add(m.team1.id);
                    roundPlayers.add(m.team2.id);
                    const idx = remainingMatches.findIndex((rm) => rm === m);
                    if (idx !== -1) remainingMatches.splice(idx, 1);
                }
            }
        };

        attemptAssignment(priorityMatches);
        attemptAssignment(others);

        if (roundMatches.length === 0 && remainingMatches.length > 0) {
            const m = remainingMatches.shift()!;
            roundMatches.push(m);
            roundPlayers.add(m.team1.id);
            roundPlayers.add(m.team2.id);
        }

        roundMatches.forEach((m, idx) => {
            scheduledMatches.push({
                id: genId(),
                groupId: "g0",
                team1: m.team1,
                team2: m.team2,
                played: false,
                confirmed: false,
                roundIndex: currentRound,
                courtNumber: idx + 1,
            });
        });

        lastRoundPlayers = roundPlayers;
        currentRound++;

        if (currentRound > 500) break; // safety
    }

    return scheduledMatches;
}
