// Knockout bracket seeding.
//
// Pure core of the bracket generation in useTournamentLogic. Two pieces:
//   - getSeedingOrder(size): standard single-elimination seed positions so the
//     top seed meets the bottom seed first (1 vs N, 2 vs N-1, …) and favorites
//     are spread across the bracket.
//   - buildSeedMap(...): "group protection" — group winners (rank 1) get the top
//     seeds, runners-up (rank 2) are rotated so they land on the opposite side
//     of their group winner, then everyone else. Produces the first-round pairs.

export interface SeedQualifier<P = unknown> {
    groupRank: number;
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

// Map seed number (1-based) → qualifier, applying group-protection.
export function buildSeedMap<Q extends SeedQualifier>(qualifiers: Q[]): Map<number, Q> {
    const firsts = qualifiers.filter((q) => q.groupRank === 1);
    const seconds = qualifiers.filter((q) => q.groupRank === 2);
    const others = qualifiers.filter((q) => q.groupRank > 2);

    const shift = Math.max(1, Math.floor(firsts.length / 2));
    const shiftedSeconds = [...seconds];
    for (let i = 0; i < shift; i++) {
        const item = shiftedSeconds.shift();
        if (item) shiftedSeconds.push(item);
    }

    const seedMap = new Map<number, Q>();
    let currentSeed = 1;
    firsts.forEach((q) => seedMap.set(currentSeed++, q));
    shiftedSeconds.forEach((q) => seedMap.set(currentSeed++, q));
    others.forEach((q) => seedMap.set(currentSeed++, q));
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
