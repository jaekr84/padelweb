// Pure helpers to turn per-match timing into tournament statistics.
// A match "counts" for timing only when it has both started_at and finished_at.

export interface TimedMatch {
    id: string;
    label: string;          // "TEAM A vs TEAM B"
    groupId: string | null; // null for bracket matches
    groupName: string;      // group name or the bracket round label
    courtNumber: number | null;
    startedAt: Date | null;
    finishedAt: Date | null;
}

export interface GroupStat {
    groupId: string;
    name: string;
    startedAt: Date | null;
    finishedAt: Date | null;
    durationMs: number | null;
    matchesPlayed: number;
    avgMatchMs: number | null;
}

export interface CourtStat {
    court: number;
    matchesCount: number;
    busyMs: number;        // sum of match durations on this court
    spanMs: number | null; // wall-clock from first start to last finish
    idleMs: number | null; // spanMs - busyMs (rough downtime)
}

export interface MatchStat {
    id: string;
    label: string;
    groupName: string;
    court: number | null;
    durationMs: number;
}

export interface TournamentStats {
    firstStart: Date | null;
    lastFinish: Date | null;
    finalizedAt: Date | null;
    totalMs: number | null;      // firstStart -> finalizedAt (fallback lastFinish)
    totalMatches: number;
    playedMatches: number;       // matches with both timestamps
    avgMatchMs: number | null;
    fastest: MatchStat | null;
    longest: MatchStat | null;
    groups: GroupStat[];
    courts: CourtStat[];
    matches: MatchStat[];        // played matches, longest first
}

const asDate = (d: Date | string | null | undefined): Date | null => {
    if (!d) return null;
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
};

const durationOf = (m: TimedMatch): number | null => {
    const s = asDate(m.startedAt);
    const f = asDate(m.finishedAt);
    if (!s || !f) return null;
    const ms = f.getTime() - s.getTime();
    return ms >= 0 ? ms : null;
};

export function computeTournamentStats(
    matches: TimedMatch[],
    finalizedAt: Date | string | null,
): TournamentStats {
    const finalized = asDate(finalizedAt);
    const played = matches
        .map(m => ({ m, dur: durationOf(m) }))
        .filter((x): x is { m: TimedMatch; dur: number } => x.dur !== null);

    const starts = played.map(x => asDate(x.m.startedAt)!.getTime());
    const finishes = played.map(x => asDate(x.m.finishedAt)!.getTime());
    const firstStart = starts.length ? new Date(Math.min(...starts)) : null;
    const lastFinish = finishes.length ? new Date(Math.max(...finishes)) : null;

    const totalEnd = finalized ?? lastFinish;
    const totalMs = firstStart && totalEnd ? Math.max(0, totalEnd.getTime() - firstStart.getTime()) : null;

    const matchStats: MatchStat[] = played.map(x => ({
        id: x.m.id,
        label: x.m.label,
        groupName: x.m.groupName,
        court: x.m.courtNumber,
        durationMs: x.dur,
    }));
    const byDurationAsc = [...matchStats].sort((a, b) => a.durationMs - b.durationMs);
    const avgMatchMs = matchStats.length
        ? Math.round(matchStats.reduce((s, x) => s + x.durationMs, 0) / matchStats.length)
        : null;

    // Per group
    const groupMap = new Map<string, { name: string; items: { m: TimedMatch; dur: number }[] }>();
    for (const x of played) {
        if (!x.m.groupId) continue;
        const g = groupMap.get(x.m.groupId) ?? { name: x.m.groupName, items: [] };
        g.items.push(x);
        groupMap.set(x.m.groupId, g);
    }
    const groups: GroupStat[] = Array.from(groupMap.entries()).map(([groupId, g]) => {
        const s = Math.min(...g.items.map(i => asDate(i.m.startedAt)!.getTime()));
        const f = Math.max(...g.items.map(i => asDate(i.m.finishedAt)!.getTime()));
        const avg = Math.round(g.items.reduce((sum, i) => sum + i.dur, 0) / g.items.length);
        return {
            groupId,
            name: g.name,
            startedAt: new Date(s),
            finishedAt: new Date(f),
            durationMs: Math.max(0, f - s),
            matchesPlayed: g.items.length,
            avgMatchMs: avg,
        };
    }).sort((a, b) => a.name.localeCompare(b.name));

    // Per court
    const courtMap = new Map<number, { m: TimedMatch; dur: number }[]>();
    for (const x of played) {
        if (x.m.courtNumber == null) continue;
        const arr = courtMap.get(x.m.courtNumber) ?? [];
        arr.push(x);
        courtMap.set(x.m.courtNumber, arr);
    }
    const courts: CourtStat[] = Array.from(courtMap.entries()).map(([court, items]) => {
        const busyMs = items.reduce((s, i) => s + i.dur, 0);
        const s = Math.min(...items.map(i => asDate(i.m.startedAt)!.getTime()));
        const f = Math.max(...items.map(i => asDate(i.m.finishedAt)!.getTime()));
        const spanMs = Math.max(0, f - s);
        return { court, matchesCount: items.length, busyMs, spanMs, idleMs: Math.max(0, spanMs - busyMs) };
    }).sort((a, b) => a.court - b.court);

    return {
        firstStart,
        lastFinish,
        finalizedAt: finalized,
        totalMs,
        totalMatches: matches.length,
        playedMatches: played.length,
        avgMatchMs,
        fastest: byDurationAsc[0] ?? null,
        longest: byDurationAsc[byDurationAsc.length - 1] ?? null,
        groups,
        courts,
        matches: [...matchStats].sort((a, b) => b.durationMs - a.durationMs),
    };
}

// "1h 23m", "23m 4s", "45s"
export function formatDuration(ms: number | null | undefined): string {
    if (ms == null || ms < 0) return "—";
    const totalSec = Math.round(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}
