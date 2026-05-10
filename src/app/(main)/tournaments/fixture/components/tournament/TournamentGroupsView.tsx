"use client";

import { MapPin, Users2, UserCheck, Check, Plus, Minus, X, Circle, RotateCcw } from "lucide-react";
import { Group, Match, Standing, Player } from "./types";

interface TournamentGroupsViewProps {
    groups: Group[];
    matches: Match[];
    readOnly: boolean;
    present: Set<string>;
    togglePresent: (id: string) => void;
    handleScoreChange: (matchId: string, s1: string, s2: string) => void;
    handleConfirmScore: (matchId: string) => void;
    handleReopenMatch: (matchId: string) => void;
    setGroups: (groups: Group[]) => void;
    setMatches: (matches: Match[] | ((prev: Match[]) => Match[])) => void;
    computeStandings: (groupId: string) => Standing[];
}

export function TournamentGroupsView({
    groups,
    matches,
    readOnly,
    present,
    togglePresent,
    handleScoreChange,
    handleConfirmScore,
    handleReopenMatch,
    setGroups,
    setMatches,
    computeStandings
}: TournamentGroupsViewProps) {
    return (
        <section className="space-y-6">
            <div className="text-center space-y-0.5">
                <h2 className="text-lg md:text-xl font-black text-foreground tracking-tighter uppercase italic">Fase de Grupos</h2>
                <p className="text-azul-primary text-[8px] font-black uppercase tracking-[0.3em]">Resultados y Clasificación en Tiempo Real</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {groups.map((g: Group) => {
                    const standings = computeStandings(g.id);
                    const groupMatches = matches
                        .filter(m => m.groupId === g.id)
                        .sort((a, b) => a.id.localeCompare(b.id));

                    return (
                        <div key={g.id} className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full group/g">
                            <div className="bg-muted/50 px-3 py-2 border-b border-border/40 flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    {!readOnly && (
                                        <div className="flex items-center gap-2 bg-background/50 px-3 py-1 rounded-xl border border-border/50 focus-within:border-azul-primary/50 transition-all w-fit">
                                            <MapPin className="w-2.5 h-2.5 text-azul-primary/50" />
                                            <input
                                                type="text"
                                                placeholder="CANCHA..."
                                                value={g.courtNumber || ""}
                                                onChange={(e) => {
                                                    const newGroups = groups.map(group =>
                                                        group.id === g.id ? { ...group, courtNumber: e.target.value } : group
                                                    );
                                                    setGroups(newGroups);
                                                }}
                                                className="w-16 bg-transparent border-none p-0 text-[10px] font-black italic uppercase text-azul-primary/70 placeholder:text-azul-primary/20 focus:ring-0 outline-none"
                                            />
                                        </div>
                                    )}
                                    {readOnly && g.courtNumber && (
                                        <div className="flex items-center gap-2 bg-azul-primary/5 px-3 py-1 rounded-xl border border-azul-primary/10 w-fit">
                                            <MapPin className="w-3 h-3 text-azul-primary" />
                                            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-azul-primary">{g.courtNumber}</span>
                                        </div>
                                    )}
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-azul-primary leading-none mt-1">{g.name}</h3>
                                </div>
                                <Users2 className="w-6 h-6 text-foreground/10 group-hover:text-azul-primary/20" />
                            </div>
                            <div className="px-3 py-2 border-b border-border/30 bg-card/20">
                                <div className="flex-1 overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-[10px]">
                                        <thead>
                                            <tr className="border-b border-border/30">
                                                <th className="px-1 py-2 text-center font-black italic text-foreground/60 uppercase tracking-widest text-[8px]">OK</th>
                                                <th className="px-3 py-2 text-left font-black italic text-foreground/60 uppercase tracking-widest text-[8px]">Pos</th>
                                                <th className="px-2 py-2 text-left font-black italic text-foreground/60 uppercase tracking-widest text-[8px]">Jugador</th>
                                                <th className="px-3 py-2 text-center font-black italic text-foreground/60 uppercase tracking-widest text-[8px]">PG</th>
                                                <th className="px-3 py-2 text-center font-black italic text-foreground/60 uppercase tracking-widest text-[8px]">+/-</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {standings.map((s, idx: number) => (
                                                <tr key={s.playerId} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                                                    <td className="px-1 py-1 text-center">
                                                        <button
                                                            onClick={() => togglePresent(s.playerId)}
                                                            className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${present.has(s.playerId) ? "bg-celeste text-azul-primary shadow-sm shadow-celeste/20" : "bg-muted/50 text-foreground/10 hover:text-foreground/30"}`}
                                                        >
                                                            <UserCheck className="w-3 h-3" />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-1 text-left">
                                                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-lg font-black italic text-[9px] ${idx === 0 ? "bg-rojo text-white" : "bg-muted text-foreground/40"}`}>
                                                            #{idx + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <div className="flex flex-col">
                                                            {s.player.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                                <span key={i} className={`font-black uppercase italic tracking-tight leading-tight ${i === 0 ? "text-[10px] text-foreground/80" : "text-[8px] text-foreground/50"}`}>
                                                                    {name.trim()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-1 text-center font-black italic text-azul-primary">{s.won}</td>
                                                    <td className="px-3 py-1 text-center font-black italic text-foreground/60">{s.points > 0 ? `+${s.points}` : s.points}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="p-2.5 space-y-1.5">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[7px] font-black uppercase tracking-[0.2em] text-foreground/50">Fixture del Grupo</h4>
                                    <div className="h-px flex-1 bg-border/10 mx-2" />
                                </div>
                                <div className="grid gap-1">
                                    {groupMatches.map(m => {
                                        const isReady = present.has(m.team1.id) && present.has(m.team2.id);
                                        return (
                                            <div
                                                key={m.id}
                                                className={`group/match relative transition-all ${!isReady && !(m.confirmed || m.status === 'finished' || m.status === 'completed') ? "opacity-60 grayscale pointer-events-none" : ""} ${(m.confirmed || m.status === 'finished' || m.status === 'completed') ? "border-emerald-500/20 bg-emerald-500/[0.02]" : ""}`}
                                            >
                                                {(m.confirmed || m.status === 'finished' || m.status === 'completed') && (
                                                    <div className="absolute -top-1.5 -right-1.5 z-20">
                                                        <div className="bg-emerald-500 text-white p-1 rounded-full shadow-lg shadow-emerald-500/30">
                                                            <Check className="w-3 h-3 stroke-[4]" />
                                                        </div>
                                                    </div>
                                                )}
                                                {!isReady && !m.confirmed && (
                                                    <div className="absolute inset-0 flex items-center justify-center z-[20] pointer-events-none">
                                                        <div className="px-3 py-1 bg-background/90 backdrop-blur-md border border-border/50 rounded-full shadow-2xl">
                                                            <span className="text-[7px] font-black uppercase tracking-widest text-foreground/40 animate-pulse">Esperando Jugadores</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div
                                                    className={`rounded-2xl border transition-all overflow-hidden min-h-[64px] flex flex-col justify-center ${(m.confirmed || m.status === 'finished' || m.status === 'completed')
                                                        ? "bg-emerald-500/[0.03] border-emerald-500/40"
                                                        : m.status === 'in_progress'
                                                            ? "bg-rojo/[0.03] border-rojo/40 shadow-lg shadow-rojo/5"
                                                            : "bg-background/40 border-border/40 hover:border-border/60"
                                                        }`}
                                                >
                                                    {m.status === 'in_progress' && (
                                                        <div className="absolute top-0 left-0 bg-rojo text-white px-2 py-0.5 text-[6px] font-black italic rounded-tl-xl rounded-br-lg shadow-lg z-10 animate-pulse tracking-widest uppercase">
                                                            VIVO
                                                        </div>
                                                    )}
                                                    <div className="px-2 py-2">
                                                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">

                                                            {/* Equipo 1 */}
                                                            <div className="flex flex-col gap-1.5 min-w-0">
                                                                <div className="flex flex-col min-w-0">
                                                                    {m.team1.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                                        <span key={i} className={`font-black uppercase italic tracking-tight leading-tight truncate ${i === 0 ? "text-[9px]" : "text-[7px] opacity-60 mt-0.5"} ${(m.confirmed || m.status === 'finished' || m.status === 'completed') ? "text-emerald-500/70" : (m.confirmed || m.status === 'finished' || m.status === 'completed') && m.score1! > m.score2! ? "text-rojo" : "text-foreground/70"}`}>
                                                                            {name.trim()}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                {m.status === 'in_progress' && !readOnly ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            type="number"
                                                                            value={m.score1 ?? ""}
                                                                            onChange={e => handleScoreChange(m.id, e.target.value, m.score2?.toString() ?? "")}
                                                                            className="w-8 h-6 bg-muted/40 border border-border/40 rounded-md text-center font-black text-[10px] outline-none focus:border-rojo/50 no-spin-buttons placeholder:text-foreground/10"
                                                                            placeholder="0"
                                                                        />
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <button onClick={() => handleScoreChange(m.id, ((m.score1 || 0) + 1).toString(), m.score2?.toString() ?? "")} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-rojo transition-colors"><Plus className="w-2.5 h-2.5" /></button>
                                                                            <button onClick={() => handleScoreChange(m.id, Math.max(0, (m.score1 || 0) - 1).toString(), m.score2?.toString() ?? "")} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-rojo transition-colors"><Minus className="w-2.5 h-2.5" /></button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className={`text-[11px] font-black ${m.score1! > m.score2! ? "text-rojo" : "text-foreground/40"}`}>{m.score1 ?? 0}</span>
                                                                )}
                                                            </div>

                                                            {/* Centro: Acciones */}
                                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                                <div className="text-[7px] font-black text-foreground/40 mb-1">VS</div>
                                                                {!m.confirmed && !readOnly && m.status !== 'finished' && m.status !== 'completed' && (
                                                                    <div className="flex flex-col items-center gap-1 opacity-0 group-hover/match:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={() => {
                                                                                const nextStatus = m.status === 'in_progress' ? 'pending' : 'in_progress';
                                                                                setMatches(prev => prev.map(match => match.id === m.id ? { ...match, status: nextStatus } : match));
                                                                            }}
                                                                            className={`w-[52px] py-1 rounded-md transition-all flex items-center justify-center gap-1 text-[8px] font-black italic border ${m.status === 'in_progress' ? "bg-rojo text-white border-rojo" : "hover:bg-rojo/10 text-rojo border-rojo/20"}`}
                                                                            title={m.status === 'in_progress' ? "Pausar Partido" : "Iniciar Grabación"}
                                                                        >
                                                                            {m.status === 'in_progress' ? (
                                                                                <><X className="w-2 h-2" /> PAU</>
                                                                            ) : (
                                                                                <><Circle className="w-2 h-2 fill-current" /> Go!</>
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                handleConfirmScore(m.id);
                                                                                setMatches(prev => prev.map(match => match.id === m.id ? { ...match, status: 'completed', confirmed: true } : match));
                                                                            }}
                                                                            className="w-[52px] py-1 rounded-md hover:bg-azul-primary/10 text-azul-primary text-[8px] font-black italic border border-azul-primary/20 flex items-center justify-center"
                                                                            title="Finalizar Partido"
                                                                        >
                                                                            FIN
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                {(m.confirmed || m.status === 'finished' || m.status === 'completed') && !readOnly && (
                                                                    <button
                                                                        onClick={() => handleReopenMatch(m.id)}
                                                                        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-azul-primary/5 text-azul-primary/30 hover:text-azul-primary transition-all group/reopen"
                                                                        title="Reabrir Partido"
                                                                    >
                                                                        <RotateCcw className="w-2.5 h-2.5 group-hover/reopen:-rotate-45 transition-transform" />
                                                                        <span className="text-[7px] font-black uppercase italic tracking-wider">Reabrir</span>
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Equipo 2 */}
                                                            <div className="flex flex-col items-end gap-1.5 min-w-0 text-right">
                                                                <div className="flex flex-col items-end min-w-0">
                                                                    {m.team2.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                                        <span key={i} className={`font-black uppercase italic tracking-tight leading-tight truncate ${i === 0 ? "text-[9px]" : "text-[7px] opacity-60 mt-0.5"} ${(m.confirmed || m.status === 'finished' || m.status === 'completed') ? "text-emerald-500/70" : (m.confirmed || m.status === 'finished' || m.status === 'completed') && m.score2! > m.score1! ? "text-rojo" : "text-foreground/70"}`}>
                                                                            {name.trim()}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                {m.status === 'in_progress' && !readOnly ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <button onClick={() => handleScoreChange(m.id, m.score1?.toString() ?? "", ((m.score2 || 0) + 1).toString())} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-rojo transition-colors"><Plus className="w-2.5 h-2.5" /></button>
                                                                            <button onClick={() => handleScoreChange(m.id, m.score1?.toString() ?? "", Math.max(0, (m.score2 || 0) - 1).toString())} className="p-0.5 hover:bg-muted rounded text-foreground/40 hover:text-rojo transition-colors"><Minus className="w-2.5 h-2.5" /></button>
                                                                        </div>
                                                                        <input
                                                                            type="number"
                                                                            value={m.score2 ?? ""}
                                                                            onChange={e => handleScoreChange(m.id, m.score1?.toString() ?? "", e.target.value)}
                                                                            className="w-8 h-6 bg-muted/40 border border-border/40 rounded-md text-center font-black text-[10px] outline-none focus:border-rojo/50 no-spin-buttons placeholder:text-foreground/10"
                                                                            placeholder="0"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <span className={`text-[11px] font-black ${m.score2! > m.score1! ? "text-rojo" : "text-foreground/40"}`}>{m.score2 ?? 0}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
