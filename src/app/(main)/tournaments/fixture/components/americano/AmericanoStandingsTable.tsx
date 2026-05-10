"use client";

import { 
    Users2, RotateCcw, CheckCircle2, Clock, UserCheck, CreditCard 
} from "lucide-react";
import { Player, Standing } from "./types";

interface AmericanoStandingsTableProps {
    standings: Standing[];
    playersTab: "all" | "pending" | "done";
    setPlayersTab: (tab: "all" | "pending" | "done") => void;
    matchesPerTeam: number;
    playingIds: Set<string>;
    readOnly?: boolean;
    present: Set<string>;
    togglePresent: (id: string) => void;
    paid: Set<string>;
    togglePaid: (id: string) => void;
    setReplacingPlayer: (p: Player) => void;
}

export function AmericanoStandingsTable({
    standings,
    playersTab,
    setPlayersTab,
    matchesPerTeam,
    playingIds,
    readOnly,
    present,
    togglePresent,
    paid,
    togglePaid,
    setReplacingPlayer
}: AmericanoStandingsTableProps) {
    const filteredStandings = (() => {
        if (playersTab === "pending") return standings.filter(s => s.matchesPlayed < matchesPerTeam);
        if (playersTab === "done") return standings.filter(s => s.matchesPlayed >= matchesPerTeam);
        return standings;
    })();

    return (
        <div className="lg:col-span-12 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-azul-primary/10 flex items-center justify-center">
                        <Users2 className="w-4 h-4 text-azul-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase italic tracking-tight">Estado de Jugadores</h3>
                        <p className="text-[8px] font-black uppercase tracking-widest text-foreground/70 mt-0.5">Control de partidos y ranking</p>
                    </div>
                </div>

                <div className="flex items-center p-1 bg-muted/50 border border-border/50 rounded-xl gap-1">
                    <button onClick={() => setPlayersTab("all")} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${playersTab === "all" ? "bg-foreground text-background shadow-md" : "hover:bg-muted text-foreground/70"}`}>
                        Todos ({standings.length})
                    </button>
                    <button onClick={() => setPlayersTab("pending")} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${playersTab === "pending" ? "bg-celeste text-azul-primary shadow-md" : "hover:bg-muted text-foreground/70"}`}>
                        Pendientes ({standings.filter(s => s.matchesPlayed < matchesPerTeam).length})
                    </button>
                    <button onClick={() => setPlayersTab("done")} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${playersTab === "done" ? "bg-azul-primary text-white shadow-md" : "hover:bg-muted text-foreground/70"}`}>
                        Completos ({standings.filter(s => s.matchesPlayed >= matchesPerTeam).length})
                    </button>
                </div>
            </div>

            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-xl transition-all">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-muted/50 text-[8px] font-black uppercase tracking-widest text-foreground/40 border-b border-border/50">
                            <tr>
                                <th className="px-4 py-2">#</th>
                                <th className="px-4 py-2 text-center">Ok</th>
                                <th className="px-4 py-2 text-center">$$</th>
                                <th className="px-4 py-2">Jugador</th>
                                <th className="px-4 py-2 text-center">Estado</th>
                                <th className="px-4 py-2 text-center">PJ</th>
                                <th className="px-4 py-2 text-center">G-P</th>
                                <th className="px-4 py-2 text-center text-azul-primary">Dif</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredStandings.map((s, idx) => {
                                const isPlaying = playingIds.has(s.playerId);
                                const isDone = s.matchesPlayed >= matchesPerTeam;
                                const rank = standings.findIndex(st => st.playerId === s.playerId) + 1;
                                return (
                                    <tr key={s.playerId} className={`group hover:bg-muted/30 transition-all ${isPlaying ? "bg-azul-primary/[0.05]" : isDone ? "bg-azul-primary/[0.01]" : ""}`}>
                                        <td className="px-4 py-1.5">
                                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black italic shadow-sm ${rank === 1 ? "bg-celeste text-azul-primary" : "bg-muted text-foreground/70"}`}>
                                                {rank}
                                            </span>
                                        </td>
                                        <td className="px-4 py-1.5 text-center">
                                            <button
                                                onClick={() => togglePresent(s.playerId)}
                                                disabled={readOnly}
                                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${present.has(s.playerId) ? "bg-celeste text-azul-primary shadow-sm" : "bg-muted/50 text-foreground/10 hover:text-azul-primary/40"}`}
                                            >
                                                <UserCheck className="w-3 h-3" />
                                            </button>
                                        </td>
                                        <td className="px-4 py-1.5 text-center">
                                            <button
                                                onClick={() => togglePaid(s.playerId)}
                                                disabled={readOnly}
                                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${paid.has(s.playerId) ? "bg-azul-primary text-white shadow-sm" : "bg-muted/50 text-foreground/10 hover:text-azul-primary/40"}`}
                                            >
                                                <CreditCard className="w-3 h-3" />
                                            </button>
                                        </td>
                                        <td className="px-4 py-1.5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-azul-primary/20 to-celeste/20 flex items-center justify-center text-[9px] font-black text-azul-primary border border-white/10 shrink-0">
                                                        {s.player.name.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase italic leading-tight text-foreground/80 tracking-tight">{s.player.name}</span>
                                                        {isPlaying && (
                                                            <span className="text-[7px] font-black uppercase tracking-widest text-rojo flex items-center gap-1 mt-0.5">
                                                                <div className="w-1 h-1 bg-rojo rounded-full animate-pulse" />
                                                                Jugando
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {!readOnly && (
                                                    <button
                                                        onClick={() => setReplacingPlayer(s.player)}
                                                        className="w-6 h-6 rounded-lg flex items-center justify-center bg-celeste/20 text-azul-primary hover:bg-celeste/40 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <RotateCcw className="w-2.5 h-2.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5 text-center">
                                            {isDone ? <CheckCircle2 className="w-3.5 h-3.5 mx-auto text-azul-primary" /> : isPlaying ? <div className="text-[7px] font-black uppercase text-azul-primary animate-pulse">En Cancha</div> : <Clock className="w-3.5 h-3.5 mx-auto text-foreground/20" />}
                                        </td>
                                        <td className="px-4 py-1.5 text-center text-[9px] font-black italic text-foreground/50">{s.matchesPlayed} / {matchesPerTeam}</td>
                                        <td className="px-4 py-1.5 text-center font-bold text-[9px]">
                                            <span className="text-celeste">{s.won}</span>-<span className="text-rojo/60">{s.lost}</span>
                                        </td>
                                        <td className="px-4 py-1.5 text-center font-black text-[10px]">
                                            <span className={s.points >= 0 ? "text-azul-primary" : "text-rojo"}>
                                                {s.points > 0 ? `+${s.points}` : s.points}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
