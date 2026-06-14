// Cancha Abierta (open court) match-making.
//
// Pure, framework-free core of the algorithm that runs in
// AdminLiveManagementClient (`generateNextMatch`). Extracted here so the live
// admin screen and the /dev/test-matchmaking page exercise the *same* code.
//
// Criteria, faithful to the original:
//   - Candidate selection by waiting order + mode (libre / mixto / mismo_genero)
//   - Position: drive+revés ideal (-100), drive+drive bad (+150),
//     revés+revés sub-optimal (+80), "ambos" neutral (0)
//   - Avoid repeating the same pair (+50 per past pairing)
//   - Avoid repeating the same opponents (+100 per past meeting)
//   - Gender constraints for mixto / mismo_genero (+10000 if violated)

export type OcMode = "libre" | "mixto" | "mismo_genero";

export interface OcPlayer {
    id: string;
    userId?: string | null;
    sidePreference?: string | null;
    gender?: string | null;
    user?: { side?: string | null; gender?: string | null } | null;
    // anything else (extra fields on the caller's type) is ignored by the algorithm
}

export interface OcCompletedMatch {
    team1Player1Id: string;
    team1Player2Id: string;
    team2Player1Id: string;
    team2Player2Id: string;
    status?: string | null;
}

export interface OcPickResult<P> {
    ok: boolean;
    error?: string;
    team1?: [P, P];
    team2?: [P, P];
    penalty?: number;
}

// ── Resolution helpers (same fallbacks as the original component) ──
export function ocSide(p: OcPlayer): string {
    return p.sidePreference || p.user?.side || "ambos";
}
export function ocGender(p: OcPlayer): string | undefined {
    return (p.gender || p.user?.gender) ?? undefined;
}
export function ocId(p: OcPlayer): string {
    return (p.userId || p.id) as string;
}

// ── Step 1: choose the 4 candidates honoring the court mode ──
export function selectOcCandidates<P extends OcPlayer>(
    availablePlayers: P[],
    mode: OcMode
): { ok: boolean; candidates: P[]; error?: string } {
    if (availablePlayers.length < 4) {
        return { ok: false, candidates: [], error: "No hay suficientes jugadores disponibles (mínimo 4)" };
    }

    if (mode === "mixto") {
        const topMales = availablePlayers.filter((p) => ocGender(p) === "masculino").slice(0, 2);
        const topFemales = availablePlayers.filter((p) => ocGender(p) === "femenino").slice(0, 2);
        if (topMales.length < 2 || topFemales.length < 2) {
            return { ok: false, candidates: [], error: "No hay suficientes hombres y mujeres (2+2) para un mixto." };
        }
        return { ok: true, candidates: [...topMales, ...topFemales] };
    }

    if (mode === "mismo_genero") {
        const picked: P[] = [];
        let hombresPicked = 0;
        for (const p of availablePlayers) {
            if (picked.length === 4) break;
            const isH = ocGender(p) === "masculino";
            if (picked.length === 3) {
                const willBeHombres = hombresPicked + (isH ? 1 : 0);
                if (willBeHombres % 2 !== 0) continue; // skip if it breaks parity
            }
            picked.push(p);
            if (isH) hombresPicked++;
        }
        if (picked.length < 4) {
            return { ok: false, candidates: [], error: "No hay jugadores suficientes para formar dos parejas de mismo género." };
        }
        return { ok: true, candidates: picked };
    }

    // libre: first 4 in waiting order
    return { ok: true, candidates: availablePlayers.slice(0, 4) };
}

// ── Positional penalty for a prospective pair ──
export function positionalPenalty(a: OcPlayer, b: OcPlayer): number {
    const sideA = ocSide(a);
    const sideB = ocSide(b);
    if ((sideA === "drive" && sideB === "reves") || (sideA === "reves" && sideB === "drive")) return -100;
    if (sideA === "drive" && sideB === "drive") return 150;
    if (sideA === "reves" && sideB === "reves") return 80;
    return 0; // at least one "ambos" → neutral
}

// ── Build pair/opponent history from completed matches ──
export function buildOcHistories(matches: OcCompletedMatch[]) {
    const pairHistory = new Map<string, number>();
    const opponentHistory = new Map<string, number>();
    const key = (a: string, b: string) => [a, b].sort().join("-");

    matches
        .filter((m) => m.status === "completed")
        .forEach((m) => {
            pairHistory.set(key(m.team1Player1Id, m.team1Player2Id), (pairHistory.get(key(m.team1Player1Id, m.team1Player2Id)) || 0) + 1);
            pairHistory.set(key(m.team2Player1Id, m.team2Player2Id), (pairHistory.get(key(m.team2Player1Id, m.team2Player2Id)) || 0) + 1);
            [m.team1Player1Id, m.team1Player2Id].forEach((p1) => {
                [m.team2Player1Id, m.team2Player2Id].forEach((p2) => {
                    opponentHistory.set(key(p1, p2), (opponentHistory.get(key(p1, p2)) || 0) + 1);
                });
            });
        });

    return { pairHistory, opponentHistory };
}

// ── Step 2+3: from 4 candidates pick the lowest-penalty 2v2 split ──
export function pickBestOcCombo<P extends OcPlayer>(
    candidates: P[],
    completedMatches: OcCompletedMatch[],
    mode: OcMode
): OcPickResult<P> {
    if (candidates.length < 4) {
        return { ok: false, error: "Se necesitan 4 candidatos" };
    }

    const { pairHistory, opponentHistory } = buildOcHistories(completedMatches);
    const histKey = (a: string, b: string) => [a, b].sort().join("-");

    const possibleCombos = [
        { t1: [0, 1], t2: [2, 3] },
        { t1: [0, 2], t2: [1, 3] },
        { t1: [0, 3], t2: [1, 2] },
    ];

    let bestCombo = possibleCombos[0];
    let minPenalty = Infinity;

    for (const combo of possibleCombos) {
        let penalty = 0;
        const t1p1 = candidates[combo.t1[0]];
        const t1p2 = candidates[combo.t1[1]];
        const t2p1 = candidates[combo.t2[0]];
        const t2p2 = candidates[combo.t2[1]];

        const id1 = ocId(t1p1);
        const id2 = ocId(t1p2);
        const id3 = ocId(t2p1);
        const id4 = ocId(t2p2);

        // Pair repetition (+50)
        penalty += (pairHistory.get(histKey(id1, id2)) || 0) * 50;
        penalty += (pairHistory.get(histKey(id3, id4)) || 0) * 50;

        // Opponent repetition (+100)
        [[id1, id3], [id1, id4], [id2, id3], [id2, id4]].forEach(([a, b]) => {
            penalty += (opponentHistory.get(histKey(a, b)) || 0) * 100;
        });

        // Positional
        penalty += positionalPenalty(t1p1, t1p2);
        penalty += positionalPenalty(t2p1, t2p2);

        // Gender constraints
        if (mode === "mixto") {
            const isT1Mixed = ocGender(t1p1) !== ocGender(t1p2);
            const isT2Mixed = ocGender(t2p1) !== ocGender(t2p2);
            if (!isT1Mixed || !isT2Mixed) penalty += 10000;
        } else if (mode === "mismo_genero") {
            const isT1Same = ocGender(t1p1) === ocGender(t1p2);
            const isT2Same = ocGender(t2p1) === ocGender(t2p2);
            if (!isT1Same || !isT2Same) penalty += 10000;
        }

        if (penalty < minPenalty) {
            minPenalty = penalty;
            bestCombo = combo;
        }
    }

    return {
        ok: true,
        team1: [candidates[bestCombo.t1[0]], candidates[bestCombo.t1[1]]],
        team2: [candidates[bestCombo.t2[0]], candidates[bestCombo.t2[1]]],
        penalty: minPenalty,
    };
}

// ── Convenience: full pipeline (select candidates → pick best split) ──
export function pickOcMatch<P extends OcPlayer>(
    availablePlayers: P[],
    completedMatches: OcCompletedMatch[],
    mode: OcMode
): OcPickResult<P> {
    const sel = selectOcCandidates(availablePlayers, mode);
    if (!sel.ok) return { ok: false, error: sel.error };
    return pickBestOcCombo(sel.candidates, completedMatches, mode);
}
