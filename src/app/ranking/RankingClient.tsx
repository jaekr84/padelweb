"use client";

import { useMemo } from "react";
import { Trophy, Medal, Crown, Shield } from "lucide-react";

interface RankingUser {
    id: string;
    name: string | null;
    email: string;
    category: string | null;
    points: number | null;
}

interface TournamentCounts {
    [userId: string]: number;
}

interface RankingClientProps {
    users: RankingUser[];
    tournamentCounts: TournamentCounts;
}

function getAvatarPlaceholder(name: string | null) {
    if (!name) return "👤";
    return name.charAt(0).toUpperCase();
}

function getUserHandle(email: string) {
    if (!email) return "user";
    return email.split("@")[0].toLowerCase();
}

export default function RankingClient({ users, tournamentCounts }: RankingClientProps) {
    const players = useMemo(() => {
        return [...users]
            .sort((a, b) => (b.points || 0) - (a.points || 0));
    }, [users]);

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 font-sans selection:bg-blue-500/30">
            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6">

                {/* ── Header ── */}
                <div className="mb-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-1">
                        Clasificación Oficial
                    </p>
                    <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground flex items-center gap-3">
                        Ranking General
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium mt-1">
                        Las mejores posiciones en la red
                    </p>
                </div>

                {/* ── Ranking List ── */}
                <div className="flex flex-col gap-3">
                    {players.length > 0 ? (
                        players.map((player, index) => {
                            const isFirst = index === 0;
                            const isSecond = index === 1;
                            const isThird = index === 2;
                            const isTop3 = isFirst || isSecond || isThird;

                            const tournamentsPlayed = tournamentCounts[player.id] || 0;
                            const points = player.points || 0;

                            return (
                                <div
                                    key={player.id}
                                    className="group block bg-card border border-border rounded-3xl overflow-hidden transition-all duration-300 hover:border-indigo-500/30 shadow-sm"
                                >
                                    <div className="p-4 flex items-center gap-4">

                                        {/* Posición */}
                                        <div className="w-8 flex items-center justify-center shrink-0">
                                            {isFirst ? (
                                                <Crown className="w-6 h-6 text-yellow-500 dark:text-yellow-400/90 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]" />
                                            ) : isSecond ? (
                                                <Medal className="w-6 h-6 text-slate-400 dark:text-slate-300/90 drop-shadow-[0_0_10px_rgba(148,163,184,0.2)]" />
                                            ) : isThird ? (
                                                <Medal className="w-6 h-6 text-orange-600 dark:text-orange-400/80 drop-shadow-[0_0_10px_rgba(194,120,57,0.2)]" />
                                            ) : (
                                                <span className="text-xl font-black text-muted-foreground italic opacity-40">{index + 1}</span>
                                            )}
                                        </div>

                                        {/* Avatar */}
                                        <div className="w-12 h-12 shrink-0 bg-muted border border-border rounded-2xl flex items-center justify-center text-xl font-bold shadow-inner text-muted-foreground uppercase">
                                            {getAvatarPlaceholder(player.name)}
                                        </div>

                                        {/* Jugador Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="text-base font-black uppercase italic tracking-tight truncate text-foreground group-hover:text-indigo-500 transition-colors">
                                                    {player.name || "Jugador"}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground truncate opacity-80">
                                                <span className="truncate">@{getUserHandle(player.email)}</span>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex flex-col items-end justify-center shrink-0 pl-3 border-l border-border">
                                            <div className={`text-lg font-black tracking-tighter ${isTop3 ? "text-foreground" : "text-muted-foreground"}`}>
                                                {points.toLocaleString()}
                                            </div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                                                Pts
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer meta info */}
                                    <div className="px-4 py-2 border-t border-border/50 bg-muted/30 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                            {player.category && (
                                                <span className="flex items-center gap-1 bg-muted border border-border px-2 py-0.5 rounded-full text-muted-foreground">
                                                    <Shield className="w-3 h-3 text-indigo-500 dark:text-blue-400" />
                                                    {player.category}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground tracking-wide opacity-80">
                                            {tournamentsPlayed} Torneo{tournamentsPlayed !== 1 ? 's' : ''} jugado{tournamentsPlayed !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-14 h-14 bg-card border border-border rounded-3xl flex items-center justify-center mb-4">
                                <Trophy className="w-6 h-6 text-muted-foreground opacity-30" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-1">Sin jugadores</h3>
                            <p className="text-muted-foreground opacity-60 text-xs font-bold max-w-xs">Aún no hay puntos registrados en esta plataforma.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
