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

export interface SeedQualifier<P = unknown> {
    groupRank: number;
    groupId?: string;
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

// Map seed number (1-based) → qualifier, applying group-protection for every
// placement. Qualifiers are processed strongest-first (group winners, then
// runners-up, …); each is greedily assigned the seed that meets its already
// placed group-mates as late as possible, breaking ties toward the lowest
// (strongest) available seed. Only the K lowest seeds are used (K = number of
// qualifiers) so the empty high seeds become BYEs against the top seeds.
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

    const usedSeeds = new Set<number>();
    const placed: { seed: number; groupId: string }[] = [];
    let soloCounter = 0;

    for (const q of ordered) {
        const gid = q.groupId ?? `__solo_${soloCounter++}`;
        const sameGroup = placed.filter((p) => p.groupId === gid);

        let bestSeed = -1;
        let bestMeet = -1;
        for (let seed = 1; seed <= K; seed++) {
            if (usedSeeds.has(seed)) continue;
            const posSeed = posOfSeed.get(seed)!;
            let minMeet = Infinity;
            for (const p of sameGroup) {
                const m = meetRoundByPos(posSeed, posOfSeed.get(p.seed)!, totalRounds);
                if (m < minMeet) minMeet = m;
            }
            // Prefer meeting group-mates later (higher minMeet); on ties keep the
            // lowest seed. Iterating seeds ascending + strict > gives us that.
            if (minMeet > bestMeet) {
                bestMeet = minMeet;
                bestSeed = seed;
            }
        }

        seedMap.set(bestSeed, q);
        usedSeeds.add(bestSeed);
        placed.push({ seed: bestSeed, groupId: gid });
    }

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
