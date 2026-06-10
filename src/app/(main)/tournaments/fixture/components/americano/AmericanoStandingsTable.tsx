"use client";

import {
    Users2, RotateCcw, CheckCircle2, Clock, UserCheck, CreditCard, UserX, UserPlus
} from "lucide-react";
import { Player, Standing } from "./types";
import { pairNames, memberKey, isMemberChecked } from "./attendance-utils";

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
    requestWithdraw: (p: Player) => void;
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
    setReplacingPlayer,
    requestWithdraw
}: AmericanoStandingsTableProps) {
    // Withdrawn players have no pending matches: they count as "done"
    const filteredStandings = (() => {
        if (playersTab === "pending") return standings.filter(s => !s.player.withdrawn && s.matchesPlayed < matchesPerTeam);
        if (playersTab === "done") return standings.filter(s => s.player.withdrawn || s.matchesPlayed >= matchesPerTeam);
        return standings;
    })();

    return (
        <div className="lg:col-span-12 space-y-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-azul-primary/10 flex items-center justify-center">
                        <Users2 className="w-3.5 h-3.5 text-azul-primary" />
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black uppercase italic tracking-tight">Estado de Jugadores</h3>
                        <p className="text-[6px] font-black uppercase tracking-[0.4em] text-foreground/40 leading-none mt-0.5">Control Técnico de Participantes</p>
                    </div>
                </div>

                <div className="flex items-center p-0.5 bg-muted/40 border border-border/40 rounded-lg gap-0.5">
                    <button onClick={() => setPlayersTab("all")} className={`px-2 py-1 rounded text-[7px] font-black uppercase tracking-widest transition-all ${playersTab === "all" ? "bg-foreground text-background" : "hover:bg-muted text-foreground/60"}`}>
                        Todos ({standings.length})
                    </button>
                    <button onClick={() => setPlayersTab("pending")} className={`px-2 py-1 rounded text-[7px] font-black uppercase tracking-widest transition-all ${playersTab === "pending" ? "bg-celeste text-azul-primary" : "hover:bg-muted text-foreground/60"}`}>
                        Pendientes ({standings.filter(s => !s.player.withdrawn && s.matchesPlayed < matchesPerTeam).length})
                    </button>
                    <button onClick={() => setPlayersTab("done")} className={`px-2 py-1 rounded text-[7px] font-black uppercase tracking-widest transition-all ${playersTab === "done" ? "bg-azul-primary text-white" : "hover:bg-muted text-foreground/60"}`}>
                        Completos ({standings.filter(s => s.player.withdrawn || s.matchesPlayed >= matchesPerTeam).length})
                    </button>
                </div>
            </div>

            <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-lg overflow-hidden shadow-sm transition-all">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-muted text-[7px] font-black uppercase tracking-widest text-foreground/40 border-b border-border/40">
                            <tr>
                                <th className="px-3 py-1">#</th>
                                <th className="px-3 py-1 text-center">OK</th>
                                <th className="px-3 py-1 text-center">$$</th>
                                <th className="px-3 py-1">Jugador</th>
                                <th className="px-3 py-1 text-center">Estado</th>
                                <th className="px-3 py-1 text-center">PJ</th>
                                <th className="px-3 py-1 text-center">G-P</th>
                                <th className="px-3 py-1 text-center text-azul-primary">Dif</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {filteredStandings.map((s, idx) => {
                                const isPlaying = playingIds.has(s.playerId);
                                const isDone = s.matchesPlayed >= matchesPerTeam;
                                const rank = standings.findIndex(st => st.playerId === s.playerId) + 1;
                                const memberNames = pairNames(s.player);
                                const isPair = memberNames.length > 1;
                                return (
                                    <tr key={s.playerId} className={`group hover:bg-muted/30 transition-all ${s.player.withdrawn ? "opacity-50" : isPlaying ? "bg-azul-primary/[0.04]" : isDone ? "bg-azul-primary/[0.01]" : ""}`}>
                                        <td className="px-3 py-1">
                                            <span className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-black italic ${rank === 1 ? "bg-celeste text-azul-primary" : "bg-muted text-foreground/60"}`}>
                                                {rank}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1 text-center">
                                            {isPair ? (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    {([1, 2] as const).map(slot => (
                                                        <button
                                                            key={slot}
                                                            onClick={() => togglePresent(memberKey(s.playerId, slot))}
                                                            disabled={readOnly}
                                                            title={memberNames[slot - 1]}
                                                            className={`w-5 h-5 rounded flex items-center justify-center transition-all ${isMemberChecked(present, s.playerId, slot) ? "bg-celeste text-azul-primary" : "bg-muted/40 text-foreground/10 hover:text-azul-primary/40"}`}
                                                        >
                                                            <UserCheck className="w-2.5 h-2.5" />
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => togglePresent(s.playerId)}
                                                    disabled={readOnly}
                                                    className={`w-5 h-5 mx-auto rounded flex items-center justify-center transition-all ${present.has(s.playerId) ? "bg-celeste text-azul-primary" : "bg-muted/40 text-foreground/10 hover:text-azul-primary/40"}`}
                                                >
                                                    <UserCheck className="w-2.5 h-2.5" />
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-3 py-1 text-center">
                                            {isPair ? (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    {([1, 2] as const).map(slot => (
                                                        <button
                                                            key={slot}
                                                            onClick={() => togglePaid(memberKey(s.playerId, slot))}
                                                            disabled={readOnly}
                                                            title={memberNames[slot - 1]}
                                                            className={`w-5 h-5 rounded flex items-center justify-center transition-all ${isMemberChecked(paid, s.playerId, slot) ? "bg-azul-primary text-white" : "bg-muted/40 text-foreground/10 hover:text-azul-primary/40"}`}
                                                        >
                                                            <CreditCard className="w-2.5 h-2.5" />
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => togglePaid(s.playerId)}
                                                    disabled={readOnly}
                                                    className={`w-5 h-5 mx-auto rounded flex items-center justify-center transition-all ${paid.has(s.playerId) ? "bg-azul-primary text-white" : "bg-muted/40 text-foreground/10 hover:text-azul-primary/40"}`}
                                                >
                                                    <CreditCard className="w-2.5 h-2.5" />
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-3 py-1">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-azul-primary/10 to-celeste/10 flex items-center justify-center text-[8px] font-black text-azul-primary border border-white/5 shrink-0">
                                                        {s.player.name.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        {isPair ? (
                                                            <div className="flex flex-col gap-0.5">
                                                                {memberNames.map((n, i) => (
                                                                    <span key={i} className="text-[9px] font-black uppercase italic text-foreground/80 tracking-tight h-5 flex items-center">{n}</span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[9px] font-black uppercase italic leading-tight text-foreground/80 tracking-tight">{s.player.name}</span>
                                                        )}
                                                        {isPlaying && (
                                                            <span className="text-[6px] font-black uppercase tracking-widest text-rojo flex items-center gap-0.5 mt-0.5">
                                                                <div className="w-0.5 h-0.5 bg-rojo rounded-full animate-pulse" />
                                                                JUGANDO
                                                            </span>
                                                        )}
                                                        {s.player.withdrawn && (
                                                            <span className="text-[6px] font-black uppercase tracking-widest text-amber-500 mt-0.5">
                                                                RETIRADO
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {!readOnly && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => setReplacingPlayer(s.player)}
                                                            title="Reemplazar"
                                                            className="w-5 h-5 rounded flex items-center justify-center bg-celeste/10 text-azul-primary hover:bg-celeste/20 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                                                        >
                                                            <RotateCcw className="w-2 h-2" />
                                                        </button>
                                                        <button
                                                            onClick={() => requestWithdraw(s.player)}
                                                            title={s.player.withdrawn ? "Reincorporar al torneo" : "Retirar del torneo"}
                                                            className={`w-5 h-5 rounded flex items-center justify-center transition-all active:scale-90 ${s.player.withdrawn
                                                                ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                                                : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 opacity-0 group-hover:opacity-100"}`}
                                                        >
                                                            {s.player.withdrawn ? <UserPlus className="w-2 h-2" /> : <UserX className="w-2 h-2" />}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-1 text-center">
                                            {s.player.withdrawn ? <UserX className="w-3 h-3 mx-auto text-amber-500" /> : isDone ? <CheckCircle2 className="w-3 h-3 mx-auto text-azul-primary" /> : isPlaying ? <div className="text-[6px] font-black uppercase text-azul-primary animate-pulse">CANCHA</div> : <Clock className="w-3 h-3 mx-auto text-foreground/10" />}
                                        </td>
                                        <td className="px-3 py-1 text-center text-[8px] font-black italic text-foreground/40">{s.matchesPlayed} / {matchesPerTeam}</td>
                                        <td className="px-3 py-1 text-center font-bold text-[8px] tracking-tight">
                                            <span className="text-celeste">{s.won}</span>-<span className="text-rojo/40">{s.lost}</span>
                                        </td>
                                        <td className="px-3 py-1 text-center font-black text-[9px]">
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
