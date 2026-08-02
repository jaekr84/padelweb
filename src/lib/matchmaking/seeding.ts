// Knockout bracket seeding.
//
// Pure core of the bracket generation in useTournamentLogic. Two pieces:
//   - getSeedingOrder(size): standard single-elimination seed positions so the
//     top seed meets the bottom seed first (1 vs N, 2 vs N-1, …) and favorites
//     are spread across the bracket.
//   - buildSeedMap(...): "group protection" — assigns each qualifier a seed so
//     that members of the same group are spread as far apart in the bracket as
//     possible (they meet as late as possible), for EVERY group placement, not
//     just 1º vs 2º. Group winners still get the top seeds (and the BYEs), so
//     the strongest keep the easiest path. Produces the first-round pairs.
//     Club-mates are spread too, but only as a tie-break: separating groups
//     always wins, since those pairs have already played each other.

export interface SeedQualifier<P = unknown> {
    groupRank: number;
    groupId?: string;
    clubId?: string | null;
    player?: P;
}

// Standard seeding order for a bracket of `size` (power of two).
export function getSeedingOrder(size: number): number[] {
    if (size <= 1) return [1];
    const rounds = Math.log2(size);
    let order = [1, 2];
    for (let r = 1; r < rounds; r++) {
        const nextOrder: number[] = [];
        const sum = Math.pow(2, r + 1) + 1;
        for (let i = 0; i < order.length; i++) {
            if (i % 2 === 0) {
                nextOrder.push(order[i]);
                nextOrder.push(sum - order[i]);
            } else {
                nextOrder.push(sum - order[i]);
                nextOrder.push(order[i]);
            }
        }
        order = nextOrder;
    }
    return order;
}

// Smallest power of two >= n (the bracket size that holds n qualifiers).
function bracketSizeFor(n: number): number {
    if (n <= 1) return 1;
    return Math.pow(2, Math.ceil(Math.log2(n)));
}

// Round at which two bracket positions meet (1 = first round = earliest,
// larger = later). Two positions meet once they fall into the same block of
// size 2^r for the first time.
function meetRoundByPos(posA: number, posB: number, totalRounds: number): number {
    for (let r = 1; r <= totalRounds; r++) {
        const block = Math.pow(2, r);
        if (Math.floor(posA / block) === Math.floor(posB / block)) return r;
    }
    return totalRounds;
}

// Meet rounds of every pair we want to keep apart, sorted ascending. Used as a
// lexicographic score: bigger is better (the earliest clash happens as late as
// possible, then the next one, …).
function meetProfile(
    seedOfIdx: number[],
    pairs: [number, number][],
    posOfSeed: Map<number, number>,
    totalRounds: number
): number[] {
    return pairs
        .map(([a, b]) =>
            meetRoundByPos(posOfSeed.get(seedOfIdx[a])!, posOfSeed.get(seedOfIdx[b])!, totalRounds)
        )
        .sort((x, y) => x - y);
}

// Lexicographic comparison of two meet profiles: > 0 means `a` is better.
function compareProfiles(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
}

// A draw is scored on two profiles, compared in order: group first, club second.
// Group-mates have already played each other, so keeping THEM apart is never
// traded away to separate club-mates — clubs only decide between draws that
// separate the groups equally well.
type DrawScore = { group: number[]; club: number[] };

function compareScores(a: DrawScore, b: DrawScore): number {
    return compareProfiles(a.group, b.group) || compareProfiles(a.club, b.club);
}

// Map seed number (1-based) → qualifier, applying group-protection for every
// placement. Two passes:
//   1. Greedy, strongest-first (group winners, then runners-up, …): each
//      qualifier takes the seed that meets its already placed group-mates as
//      late as possible, ties broken toward the lowest (strongest) seed.
//   2. Repair. The greedy never reconsiders, so it can paint itself into a
//      corner: with 3 groups and 4 qualifiers it hands seeds 1-2-3 to the group
//      winners, leaving only seed 4 for 2ºA — and seed 4 always faces seed 1,
//      its own group winner. The repair swaps seeds between qualifiers of the
//      SAME group rank whenever that pushes rematches later, which keeps the
//      sporting hierarchy intact (all group winners are peers, all runners-up
//      are peers) while removing avoidable early rematches.
// Both passes rank group separation above club separation: two qualifiers from
// the same group already played each other, two from the same club may never
// have. Clubs only break ties between equally good draws.
// Only the K lowest seeds are used (K = number of qualifiers) so the empty high
// seeds become BYEs against the top seeds.
export function buildSeedMap<Q extends SeedQualifier>(qualifiers: Q[]): Map<number, Q> {
    const seedMap = new Map<number, Q>();
    const K = qualifiers.length;
    if (K === 0) return seedMap;

    const size = bracketSizeFor(K);
    const totalRounds = Math.max(1, Math.round(Math.log2(size)));
    const order = getSeedingOrder(size); // order[position] = seed number
    const posOfSeed = new Map<number, number>();
    order.forEach((seed, pos) => posOfSeed.set(seed, pos));

    // Strength order: rank 1 before rank 2 before rank 3… Stable, so the
    // caller's intra-rank order (best performers first) is preserved.
    const ordered = qualifiers
        .map((q, i) => ({ q, i }))
        .sort((a, b) => a.q.groupRank - b.q.groupRank || a.i - b.i)
        .map((x) => x.q);

    // Qualifiers without a group (or without a club) are their own "group" so
    // they never restrict anyone — a solo id can't collide with another's.
    let soloCounter = 0;
    const groupOfIdx = ordered.map((q) => q.groupId ?? `__solo_${soloCounter++}`);
    const clubOfIdx = ordered.map((q) => q.clubId ?? `__solo_${soloCounter++}`);

    // ── Pass 1: greedy ──
    let seedOfIdx: number[] = [];
    const usedSeeds = new Set<number>();

    ordered.forEach((_, idx) => {
        // Earliest round at which `seed` would meet an already placed group-mate
        // (and club-mate). Infinity when there is none.
        const earliestMeets = (seed: number): [number, number] => {
            const posSeed = posOfSeed.get(seed)!;
            let group = Infinity;
            let club = Infinity;
            for (let p = 0; p < idx; p++) {
                const sameGroup = groupOfIdx[p] === groupOfIdx[idx];
                const sameClub = clubOfIdx[p] === clubOfIdx[idx];
                if (!sameGroup && !sameClub) continue;
                const m = meetRoundByPos(posSeed, posOfSeed.get(seedOfIdx[p])!, totalRounds);
                if (sameGroup && m < group) group = m;
                if (sameClub && m < club) club = m;
            }
            return [group, club];
        };

        let bestSeed = -1;
        let best: [number, number] = [-1, -1];
        for (let seed = 1; seed <= K; seed++) {
            if (usedSeeds.has(seed)) continue;
            const meets = earliestMeets(seed);
            // Prefer meeting group-mates later, then club-mates later; on ties
            // keep the lowest seed. Ascending iteration + strict > gives us that.
            if (meets[0] > best[0] || (meets[0] === best[0] && meets[1] > best[1])) {
                best = meets;
                bestSeed = seed;
            }
        }
        seedOfIdx[idx] = bestSeed;
        usedSeeds.add(bestSeed);
    });

    // ── Pass 2: repair ──
    // Every pair of qualifiers that must not meet early, and every swap allowed
    // to fix them (same group rank, different groups).
    const groupPairs: [number, number][] = [];
    const clubPairs: [number, number][] = [];
    const swaps: [number, number][] = [];
    for (let a = 0; a < K; a++) {
        for (let b = a + 1; b < K; b++) {
            if (clubOfIdx[a] === clubOfIdx[b]) clubPairs.push([a, b]);
            if (groupOfIdx[a] === groupOfIdx[b]) groupPairs.push([a, b]);
            else if (ordered[a].groupRank === ordered[b].groupRank) swaps.push([a, b]);
        }
    }
    // Try the swaps that touch the weakest qualifiers first, and among those the
    // shortest moves: when several swaps fix the same rematch, the one that
    // disturbs the seeding hierarchy least wins.
    swaps.sort((x, y) => y[0] - x[0] || (x[1] - x[0]) - (y[1] - y[0]));

    if ((groupPairs.length > 0 || clubPairs.length > 0) && swaps.length > 0) {
        const score = (): DrawScore => ({
            group: meetProfile(seedOfIdx, groupPairs, posOfSeed, totalRounds),
            club: meetProfile(seedOfIdx, clubPairs, posOfSeed, totalRounds),
        });
        // Hill-climb: keep taking the first swap that pushes clashes later.
        const climb = () => {
            let profile = score();
            for (let sweep = 0; sweep < 4 * K; sweep++) {
                let improved = false;
                for (const [a, b] of swaps) {
                    [seedOfIdx[a], seedOfIdx[b]] = [seedOfIdx[b], seedOfIdx[a]];
                    const candidate = score();
                    if (compareScores(candidate, profile) > 0) {
                        profile = candidate;
                        improved = true;
                        break;
                    }
                    [seedOfIdx[a], seedOfIdx[b]] = [seedOfIdx[b], seedOfIdx[a]]; // revert
                }
                if (!improved) break;
            }
            return profile;
        };

        let bestProfile = climb();
        let bestSeeds = [...seedOfIdx];
        // A single swap can fix one early rematch while creating another, so the
        // climb stalls short of the best draw. Kick it out of that local optimum
        // with small perturbations and climb again, keeping the best result.
        // The PRNG is seeded so the same qualifiers always give the same bracket.
        let rnd = 987654321;
        const nextRnd = (n: number) => ((rnd = (Math.imul(rnd, 1664525) + 1013904223) >>> 0) % n);
        // Fixed work budget: small draws (the common case) get the full search,
        // very large ones stay fast — the bracket is rebuilt on every standings
        // change while the group stage is running. One climb costs roughly
        // `swaps × pairs`, so the budget is spent in those terms.
        const climbCost = swaps.length * (groupPairs.length + clubPairs.length);
        const restarts = Math.max(8, Math.min(60, Math.round(120000 / Math.max(1, climbCost))));
        for (let restart = 0; restart < restarts; restart++) {
            seedOfIdx = [...bestSeeds];
            for (let k = 0; k < 2; k++) {
                const [a, b] = swaps[nextRnd(swaps.length)];
                [seedOfIdx[a], seedOfIdx[b]] = [seedOfIdx[b], seedOfIdx[a]];
            }
            const profile = climb();
            if (compareScores(profile, bestProfile) > 0) {
                bestProfile = profile;
                bestSeeds = [...seedOfIdx];
            }
        }
        seedOfIdx = bestSeeds;
    }

    ordered.forEach((q, idx) => seedMap.set(seedOfIdx[idx], q));
    return seedMap;
}

export interface FirstRoundPair<Q> {
    matchIndex: number;
    seed1: number;
    seed2: number;
    q1: Q | undefined;
    q2: Q | undefined;
}

// Compute first-round pairings (which qualifiers face each other) for a bracket
// of `bracketSize`, combining the seed order with the group-protection seed map.
export function computeFirstRoundPairs<Q extends SeedQualifier>(
    qualifiers: Q[],
    bracketSize: number
): FirstRoundPair<Q>[] {
    const seedPositions = getSeedingOrder(bracketSize);
    const seedMap = buildSeedMap(qualifiers);
    const pairs: FirstRoundPair<Q>[] = [];
    const numFirstRoundMatches = bracketSize / 2;
    for (let idx = 0; idx < numFirstRoundMatches; idx++) {
        const seed1 = seedPositions[idx * 2];
        const seed2 = seedPositions[idx * 2 + 1];
        pairs.push({
            matchIndex: idx,
            seed1,
            seed2,
            q1: seedMap.get(seed1),
            q2: seedMap.get(seed2),
        });
    }
    return pairs;
}
