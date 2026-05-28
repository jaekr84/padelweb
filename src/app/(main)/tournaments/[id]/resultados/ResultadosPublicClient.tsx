"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, RefreshCw, Users2, Swords, Crown, Clock, CheckCircle2, Circle } from "lucide-react";
import { TournamentBracketView } from "../../fixture/components/tournament/TournamentBracketView";
import type { BracketMatch, Group, Match, Player } from "../../fixture/components/tournament/types";

interface Standing {
    playerId: string;
    player: Player;
    won: number;
    lost: number;
    matchesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    points: number;
}

interface Props {
    tournamentId: string;
    tournamentStatus: string;
    initialGroups: Group[];
    initialMatches: Match[];
    initialBracket: BracketMatch[];
    isIndividual: boolean;
    isElimPhase: boolean;
}

const REFRESH_INTERVAL = 30_000;

function computeStandings(group: Group, matches: Match[]): Standing[] {
    const groupMatches = matches.filter(m => m.groupId === group.id && m.confirmed);
    const standings: Standing[] = group.players.map(p => ({
        playerId: p.id,
        player: p,
        points: 0,
        matchesPlayed: 0,
        won: 0,
        lost: 0,
        gamesWon: 0,
        gamesLost: 0,
    }));

    groupMatches.forEach(m => {
        const p1 = standings.find(s => s.playerId === m.team1.id);
        const p2 = standings.find(s => s.playerId === m.team2.id);
        if (!p1 || !p2) return;
        const s1 = Number(m.score1 ?? 0);
        const s2 = Number(m.score2 ?? 0);
        p1.matchesPlayed++;
        p2.matchesPlayed++;
        p1.gamesWon += s1; p1.gamesLost += s2;
        p2.gamesWon += s2; p2.gamesLost += s1;
        p1.points += (s1 - s2);
        p2.points += (s2 - s1);
        if (s1 > s2) { p1.won++; p2.lost++; }
        else if (s2 > s1) { p2.won++; p1.lost++; }
    });

    return standings.sort((a, b) => b.won - a.won || b.points - a.points || b.gamesWon - a.gamesWon);
}

function PlayerName({ name }: { name: string }) {
    const parts = name.split(/[\/\+]/).map(n => n.trim());
    if (parts.length === 1) return <span className="font-black uppercase italic tracking-tight">{parts[0]}</span>;
    return (
        <span className="font-black uppercase italic tracking-tight">
            {parts[0]} <span className="text-slate-400 font-bold not-italic">/</span> {parts[1]}
        </span>
    );
}

function MatchStatusIcon({ status, confirmed }: { status?: string; confirmed: boolean }) {
    if (confirmed) return <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />;
    if (status === "in_progress") return <div className="w-2.5 h-2.5 rounded-full bg-rojo animate-pulse shrink-0" />;
    return <Circle className="w-3 h-3 text-slate-300 shrink-0" />;
}

function GroupCard({ group, matches }: { group: Group; matches: Match[] }) {
    const standings = computeStandings(group, matches);
    const groupMatches = matches.filter(m => m.groupId === group.id);
    const confirmedCount = groupMatches.filter(m => m.confirmed).length;
    const isFinished = groupMatches.length > 0 && confirmedCount === groupMatches.length;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Group Header */}
            <div className={`px-4 py-2.5 border-b border-slate-200 flex items-center justify-between ${isFinished ? "bg-emerald-50" : "bg-slate-50"}`}>
                <div className="flex items-center gap-2">
                    <Users2 className={`w-4 h-4 ${isFinished ? "text-emerald-500" : "text-slate-400"}`} />
                    <h3 className="font-black uppercase italic tracking-tight text-slate-800">{group.name}</h3>
                    {(group as any).courtNumber && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-azul-primary bg-azul-primary/10 px-1.5 py-0.5 rounded-md border border-azul-primary/20">
                            {(group as any).courtNumber}
                        </span>
                    )}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isFinished ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-slate-200 text-slate-500"}`}>
                    {confirmedCount}/{groupMatches.length} partidos
                </span>
            </div>

            {/* Standings Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="w-6 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">#</th>
                            <th className="px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Jugador</th>
                            <th className="w-8 px-1 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">J</th>
                            <th className="w-8 px-1 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-azul-primary">PG</th>
                            <th className="w-8 px-1 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">PP</th>
                            <th className="w-10 px-1 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">+/-</th>
                        </tr>
                    </thead>
                    <tbody>
                        {standings.map((s, idx) => (
                            <tr key={s.playerId} className={`border-b border-slate-50 transition-colors ${idx === 0 && isFinished ? "bg-emerald-50/50" : idx === 0 ? "bg-azul-primary/[0.02]" : ""}`}>
                                <td className="px-2 py-1.5 text-center">
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-black ${
                                        idx === 0 ? "bg-rojo text-white shadow-sm" :
                                        idx === 1 ? "bg-slate-700 text-white" :
                                        "bg-slate-100 text-slate-400"
                                    }`}>
                                        {idx + 1}
                                    </span>
                                </td>
                                <td className="px-2 py-1.5">
                                    <div className="flex items-center gap-1.5">
                                        {idx === 0 && isFinished && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                                        <span className="text-[11px] font-black uppercase italic tracking-tight text-slate-800 truncate max-w-[180px]">
                                            <PlayerName name={s.player.name} />
                                        </span>
                                    </div>
                                </td>
                                <td className="px-1 py-1.5 text-center text-[11px] font-bold text-slate-500">{s.matchesPlayed}</td>
                                <td className="px-1 py-1.5 text-center text-[11px] font-black text-azul-primary">{s.won}</td>
                                <td className="px-1 py-1.5 text-center text-[11px] font-bold text-slate-400">{s.lost}</td>
                                <td className="px-1 py-1.5 text-center text-[11px] font-bold text-slate-500">
                                    <span className={s.points > 0 ? "text-emerald-600" : s.points < 0 ? "text-rojo" : "text-slate-400"}>
                                        {s.points > 0 ? `+${s.points}` : s.points}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Match Results */}
            {groupMatches.length > 0 && (
                <div className="p-3 space-y-1.5 border-t border-slate-100">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 px-0.5 mb-2">Resultados</p>
                    {groupMatches.sort((a, b) => a.id.localeCompare(b.id)).map(m => {
                        const isDone = m.confirmed || m.status === "finished" || m.status === "completed";
                        const isLive = m.status === "in_progress";
                        const w1 = isDone && Number(m.score1 ?? 0) > Number(m.score2 ?? 0);
                        const w2 = isDone && Number(m.score2 ?? 0) > Number(m.score1 ?? 0);
                        return (
                            <div
                                key={m.id}
                                className={`rounded-xl border px-3 py-2 flex items-center gap-2 transition-all ${
                                    isDone ? "bg-slate-50 border-slate-200" :
                                    isLive ? "bg-rojo/[0.03] border-rojo/30 shadow-sm shadow-rojo/10" :
                                    "bg-white border-slate-100"
                                }`}
                            >
                                <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5">
                                    <span className={`text-[11px] font-black uppercase italic truncate ${w1 ? "text-slate-800" : isDone ? "text-slate-400" : "text-slate-700"}`}>
                                        <PlayerName name={m.team1.name} />
                                    </span>
                                    <span className={`text-base font-black w-6 text-center shrink-0 ${w1 ? "text-rojo" : "text-slate-400"}`}>
                                        {isDone || isLive ? (m.score1 ?? 0) : "—"}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center shrink-0 gap-0.5">
                                    <MatchStatusIcon status={m.status} confirmed={m.confirmed} />
                                    {isLive && <span className="text-[8px] font-black text-rojo uppercase tracking-widest">LIVE</span>}
                                </div>
                                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                                    <span className={`text-base font-black w-6 text-center shrink-0 ${w2 ? "text-rojo" : "text-slate-400"}`}>
                                        {isDone || isLive ? (m.score2 ?? 0) : "—"}
                                    </span>
                                    <span className={`text-[11px] font-black uppercase italic truncate ${w2 ? "text-slate-800" : isDone ? "text-slate-400" : "text-slate-700"}`}>
                                        <PlayerName name={m.team2.name} />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// No-op handlers — TournamentBracketView con readOnly=true no los invoca,
// pero los requiere por tipado.
const noop = () => {};
const noopAsync = async () => {};

export default function ResultadosPublicClient({
    tournamentId,
    tournamentStatus,
    initialGroups,
    initialMatches,
    initialBracket,
    isIndividual,
    isElimPhase,
}: Props) {
    const router = useRouter();
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<"grupos" | "playoffs">(
        isElimPhase ? "playoffs" : "grupos"
    );

    const doRefresh = useCallback(() => {
        setIsRefreshing(true);
        router.refresh();
        setLastRefresh(new Date());
        setCountdown(REFRESH_INTERVAL / 1000);
        setTimeout(() => setIsRefreshing(false), 600);
    }, [router]);

    useEffect(() => {
        const interval = setInterval(doRefresh, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [doRefresh]);

    useEffect(() => {
        const tick = setInterval(() => {
            setCountdown(prev => (prev <= 1 ? REFRESH_INTERVAL / 1000 : prev - 1));
        }, 1000);
        return () => clearInterval(tick);
    }, [lastRefresh]);

    const roundsArr = useMemo(() => {
        const rounds = initialBracket.map(m => m.round);
        return Array.from(new Set(rounds)).sort((a, b) => b - a);
    }, [initialBracket]);

    const roundLabel = (r: number) => {
        if (r === 0) return "Final 🏆";
        if (r === 1) return "Semifinal";
        if (r === 2) return "Cuartos";
        if (r === 3) return "Octavos";
        return `Ronda ${roundsArr.length - r}`;
    };

    const confirmedMatches = initialMatches.filter(m => m.confirmed).length;
    const totalMatches = initialMatches.length;
    const progress = totalMatches > 0 ? Math.round((confirmedMatches / totalMatches) * 100) : 0;

    const hasBracket = initialBracket.length > 0;
    const champion = initialBracket.find(m => m.round === 0 && m.confirmed && m.winnerName);
    const liveCount = [...initialMatches, ...initialBracket].filter(m => m.status === "in_progress").length;

    return (
        <div className="space-y-6">
            {/* Live indicator + Refresh */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                    {liveCount > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rojo/10 border border-rojo/20 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-rojo animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-rojo">
                                {liveCount} en juego
                            </span>
                        </div>
                    )}
                    {champion && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                            <Trophy className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                                {champion.winnerName}
                            </span>
                        </div>
                    )}
                </div>
                <button
                    onClick={doRefresh}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-azul-primary/40 hover:text-azul-primary transition-colors shadow-sm shrink-0"
                >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span>{isRefreshing ? "..." : `${countdown}s`}</span>
                </button>
            </div>

            {/* Progress bar (grupos phase) */}
            {totalMatches > 0 && !isElimPhase && (
                <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <span>Progreso Fase de Grupos</span>
                        <span>{confirmedMatches}/{totalMatches} partidos</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                            className="h-full bg-gradient-to-r from-azul-primary to-celeste rounded-full transition-all duration-700"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="text-right text-[9px] font-black text-azul-primary">{progress}%</div>
                </div>
            )}

            {/* Tabs */}
            {hasBracket && (
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                    <button
                        onClick={() => setActiveTab("grupos")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                            activeTab === "grupos"
                                ? "bg-white text-slate-800 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <Users2 className="w-3.5 h-3.5" />
                        Grupos
                    </button>
                    <button
                        onClick={() => setActiveTab("playoffs")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                            activeTab === "playoffs"
                                ? "bg-white text-slate-800 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <Swords className="w-3.5 h-3.5" />
                        Playoffs
                    </button>
                </div>
            )}

            {/* Groups View */}
            {(!hasBracket || activeTab === "grupos") && (
                <div>
                    <div className="flex flex-col items-center gap-0.5 mb-5">
                        <h2 className="text-sm font-black uppercase italic tracking-tighter text-foreground">Fase de Grupos</h2>
                        <p className="text-azul-primary text-[10px] font-black uppercase tracking-[0.3em]">Clasificación en Vivo</p>
                    </div>
                    {initialGroups.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <Users2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-bold">Los grupos aún no están disponibles</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {initialGroups.map(g => (
                                <GroupCard key={g.id} group={g} matches={initialMatches} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Playoffs — mismo UI que el admin, readOnly=true */}
            {hasBracket && activeTab === "playoffs" && (
                <TournamentBracketView
                    bracket={initialBracket}
                    roundsArr={roundsArr}
                    readOnly={true}
                    handleBracketScore={noop}
                    handleBracketConfirm={noop}
                    handleReopenMatch={noop}
                    handleGenerateBracket={noop}
                    handleSwapPlayers={noop}
                    swappingPlayer={null}
                    setBracket={noop}
                    roundLabel={roundLabel}
                    isIndividual={isIndividual}
                />
            )}

            {/* Footer timestamp */}
            <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-300 uppercase tracking-widest pt-2">
                <Clock className="w-3 h-3" />
                <span>Actualizado: {lastRefresh.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>
        </div>
    );
}
