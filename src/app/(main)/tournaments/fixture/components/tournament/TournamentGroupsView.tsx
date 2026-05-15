"use client";

import { MapPin, Users2, UserCheck, Check, Plus, Minus, X, Circle, RotateCcw, CreditCard } from "lucide-react";
import { Group, Match, Standing, Player } from "./types";

interface TournamentGroupsViewProps {
    groups: Group[];
    matches: Match[];
    readOnly: boolean;
    present: Set<string>;
    togglePresent: (id: string) => void;
    paid: Set<string>;
    togglePaid: (id: string) => void;
    handleScoreChange: (matchId: string, s1: string, s2: string) => void;
    handleConfirmScore: (matchId: string | string[]) => void;
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
    paid,
    togglePaid,
    handleScoreChange,
    handleConfirmScore,
    handleReopenMatch,
    setGroups,
    setMatches,
    computeStandings
}: TournamentGroupsViewProps) {
    return (
        <section className="space-y-4">
            <div className="flex flex-col items-center">
                <h2 className="text-sm font-black text-foreground tracking-tighter uppercase italic leading-none">Fase de Grupos</h2>
                <p className="text-azul-primary text-[10px] font-black uppercase tracking-[0.3em] mt-1">Resultados y Clasificación</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-3">
                {groups.map((g: Group) => {
                    const standings = computeStandings(g.id);
                    const groupMatches = matches
                        .filter(m => m.groupId === g.id)
                        .sort((a, b) => a.id.localeCompare(b.id));

                    return (
                        <div key={g.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full group/g">
                            <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex flex-col gap-0.5">
                                    {!readOnly && (
                                        <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-slate-200 focus-within:border-azul-primary/50 transition-all w-fit shadow-sm">
                                            <MapPin className="w-2.5 h-2.5 text-azul-primary/40" />
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
                                                className="w-12 bg-transparent border-none p-0 text-[10px] font-black italic uppercase text-azul-primary placeholder:text-slate-300 focus:ring-0 outline-none"
                                            />
                                        </div>
                                    )}
                                    {readOnly && g.courtNumber && (
                                        <div className="flex items-center gap-1.5 bg-azul-primary/5 px-2 py-0.5 rounded-lg border border-azul-primary/10 w-fit">
                                            <MapPin className="w-2.5 h-2.5 text-azul-primary" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-azul-primary">{g.courtNumber}</span>
                                        </div>
                                    )}
                                    <h3 className="text-base font-black italic uppercase tracking-tighter text-slate-800 leading-none">{g.name}</h3>
                                </div>
                                <Users2 className="w-4 h-4 text-slate-300" />
                            </div>
                            <div className="px-3 py-1 border-b border-slate-100 bg-slate-50/30">
                                <div className="flex-1 overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-[11px]">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="px-0.5 py-1 text-center font-black italic text-slate-400 uppercase tracking-widest text-[11px]">OK</th>
                                                <th className="px-0.5 py-1 text-center font-black italic text-slate-400 uppercase tracking-widest text-[11px]">$$</th>
                                                <th className="px-1.5 py-1 text-left font-black italic text-slate-400 uppercase tracking-widest text-[11px]">#</th>
                                                <th className="px-1 py-1 text-left font-black italic text-slate-400 uppercase tracking-widest text-[11px]">Jugador</th>
                                                <th className="px-1 py-1 text-center font-black italic text-slate-400 uppercase tracking-widest text-[11px]">PG</th>
                                                <th className="px-1 py-1 text-center font-black italic text-slate-400 uppercase tracking-widest text-[11px]">+/-</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {standings.map((s, idx: number) => (
                                                <tr key={s.playerId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-0.5 py-0.5 text-center">
                                                        <button
                                                            onClick={() => togglePresent(s.playerId)}
                                                            className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${present.has(s.playerId) ? "bg-celeste text-white shadow-sm shadow-celeste/20" : "bg-slate-100 text-slate-300 hover:text-celeste"}`}
                                                        >
                                                            <UserCheck className="w-2.5 h-2.5" />
                                                        </button>
                                                    </td>
                                                    <td className="px-0.5 py-0.5 text-center">
                                                        <button
                                                            onClick={() => togglePaid(s.playerId)}
                                                            className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${paid.has(s.playerId) ? "bg-azul-primary text-white shadow-sm shadow-azul-primary/20" : "bg-slate-100 text-slate-300 hover:text-azul-primary"}`}
                                                        >
                                                            <CreditCard className="w-2.5 h-2.5" />
                                                        </button>
                                                    </td>
                                                    <td className="px-1.5 py-0.5 text-left">
                                                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-md font-black italic text-[10px] ${idx === 0 ? "bg-rojo text-white" : "bg-slate-100 text-slate-400"}`}>
                                                            {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-1 py-0.5">
                                                        <div className="flex flex-col">
                                                            {s.player.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                                <span key={i} className="font-black uppercase italic tracking-tight leading-none text-[11px] text-slate-700">
                                                                    {name.trim()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-1 py-0.5 text-center font-black italic text-azul-primary">{s.won}</td>
                                                    <td className="px-1 py-0.5 text-center font-black italic text-slate-400">{s.points > 0 ? `+${s.points}` : s.points}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="p-2.5 space-y-1.5">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">Fixture del Grupo</h4>
                                    <div className="h-px flex-1 bg-border/10 mx-2" />
                                    {!readOnly && groupMatches.some(m => !m.confirmed && m.status === 'in_progress' && m.score1 !== undefined && m.score2 !== undefined && m.score1 !== m.score2) && (
                                        <button
                                            onClick={() => {
                                                const matchesToConfirm = groupMatches.filter(m => 
                                                    !m.confirmed && 
                                                    m.status === 'in_progress' && 
                                                    m.score1 !== undefined && 
                                                    m.score2 !== undefined && 
                                                    m.score1 !== m.score2
                                                );
                                                if (matchesToConfirm.length > 0) {
                                                    const ids = matchesToConfirm.map(m => m.id);
                                                    handleConfirmScore(ids);
                                                    setMatches(prev => {
                                                        if (typeof prev === 'function') return prev;
                                                        return prev.map(match => ids.includes(match.id) ? { ...match, status: 'completed', confirmed: true } : match);
                                                    });
                                                }
                                            }}
                                            className="text-[10px] font-black uppercase italic tracking-wider text-azul-primary hover:text-white bg-azul-primary/10 hover:bg-azul-primary px-1.5 py-0.5 rounded transition-colors border border-azul-primary/20"
                                        >
                                            GUARDAR TODO
                                        </button>
                                    )}
                                </div>
                                <div className="grid gap-1">
                                    {groupMatches.map(m => {
                                        const isReady = present.has(m.team1.id) && present.has(m.team2.id);
                                        return (
                                            <div
                                                key={m.id}
                                                className={`group/match relative transition-all text-[10px] ${!isReady && readOnly && !(m.confirmed || m.status === 'finished' || m.status === 'completed') ? "opacity-40 grayscale pointer-events-none" : ""} ${(m.confirmed || m.status === 'finished' || m.status === 'completed') ? "border-emerald-500/20 bg-emerald-500/[0.01]" : ""}`}
                                            >
                                                <div
                                                    className={`rounded border transition-all overflow-hidden flex items-center justify-between px-1.5 py-1 gap-1 ${(m.confirmed || m.status === 'finished' || m.status === 'completed')
                                                        ? "bg-slate-50 border-emerald-500/30"
                                                        : m.status === 'in_progress'
                                                            ? "bg-rojo/[0.02] border-rojo/30"
                                                            : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                                                        }`}
                                                >
                                                    {/* Equipo 1 */}
                                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                                        <div className={`flex-1 truncate font-black uppercase italic tracking-tight ${(m.confirmed || m.status === 'finished' || m.status === 'completed') ? "text-slate-400" : (m.confirmed || m.status === 'finished' || m.status === 'completed') && m.score1! > m.score2! ? "text-rojo" : "text-slate-700"}`}>
                                                            {m.team1.name.split(/[\/\+]/).map(n => n.trim()).join(" / ")}
                                                        </div>
                                                        {m.status === 'in_progress' && !readOnly ? (
                                                            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded px-0.5 shadow-sm">
                                                                <button onClick={() => handleScoreChange(m.id, Math.max(0, (m.score1 || 0) - 1).toString(), m.score2?.toString() ?? "")} className="p-0.5 text-slate-300 hover:text-rojo transition-colors"><Minus className="w-2 h-2" /></button>
                                                                <input type="number" value={m.score1 ?? 0} onChange={e => handleScoreChange(m.id, e.target.value, m.score2?.toString() ?? "")} className="w-4 h-4 text-center font-black outline-none no-spin-buttons bg-transparent text-[11px] focus:text-rojo" />
                                                                <button onClick={() => handleScoreChange(m.id, ((m.score1 || 0) + 1).toString(), m.score2?.toString() ?? "")} className="p-0.5 text-slate-300 hover:text-rojo transition-colors"><Plus className="w-2 h-2" /></button>
                                                            </div>
                                                        ) : (
                                                            <span className={`font-black w-6 text-center ${m.score1! > m.score2! ? "text-rojo" : "text-slate-400"}`}>{m.score1 ?? 0}</span>
                                                        )}
                                                    </div>

                                                    {/* VS */}
                                                    <span className="text-[10px] font-black text-slate-300 shrink-0">VS</span>

                                                    {/* Equipo 2 */}
                                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                                        {m.status === 'in_progress' && !readOnly ? (
                                                            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded px-0.5 shadow-sm">
                                                                <button onClick={() => handleScoreChange(m.id, m.score1?.toString() ?? "", Math.max(0, (m.score2 || 0) - 1).toString())} className="p-0.5 text-slate-300 hover:text-rojo transition-colors"><Minus className="w-2 h-2" /></button>
                                                                <input type="number" value={m.score2 ?? 0} onChange={e => handleScoreChange(m.id, m.score1?.toString() ?? "", e.target.value)} className="w-4 h-4 text-center font-black outline-none no-spin-buttons bg-transparent text-[11px] focus:text-rojo" />
                                                                <button onClick={() => handleScoreChange(m.id, m.score1?.toString() ?? "", ((m.score2 || 0) + 1).toString())} className="p-0.5 text-slate-300 hover:text-rojo transition-colors"><Plus className="w-2 h-2" /></button>
                                                            </div>
                                                        ) : (
                                                            <span className={`font-black w-6 text-center ${m.score2! > m.score1! ? "text-rojo" : "text-slate-400"}`}>{m.score2 ?? 0}</span>
                                                        )}
                                                        <div className={`flex-1 truncate font-black uppercase italic tracking-tight text-right ${(m.confirmed || m.status === 'finished' || m.status === 'completed') ? "text-slate-400" : (m.confirmed || m.status === 'finished' || m.status === 'completed') && m.score2! > m.score1! ? "text-rojo" : "text-slate-700"}`}>
                                                            {m.team2.name.split(/[\/\+]/).map(n => n.trim()).join(" / ")}
                                                        </div>
                                                    </div>

                                                    {/* Acciones */}
                                                    <div className="flex items-center gap-1 shrink-0 ml-1">
                                                        {!m.confirmed && !readOnly && m.status !== 'finished' && m.status !== 'completed' && (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        const nextStatus = m.status === 'in_progress' ? 'pending' : 'in_progress';
                                                                        setMatches(prev => prev.map(match => match.id === m.id ? { ...match, status: nextStatus } : match));
                                                                    }}
                                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-black italic border transition-colors ${m.status === 'in_progress' ? "bg-rojo text-white border-rojo" : "bg-white hover:bg-rojo/10 text-rojo border-rojo/20"}`}
                                                                >
                                                                    {m.status === 'in_progress' ? "STOP" : "START"}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        const targetId = m.id;
                                                                        handleConfirmScore(targetId);
                                                                        setMatches(prev => prev.map(match => match.id === targetId ? { ...match, status: 'completed', confirmed: true } : match));
                                                                    }}
                                                                    className="px-1.5 py-0.5 rounded bg-white hover:bg-azul-primary/10 text-azul-primary text-[10px] font-black italic border border-azul-primary/20 transition-colors"
                                                                >
                                                                    FIN
                                                                </button>
                                                            </>
                                                        )}
                                                        {(m.confirmed || m.status === 'finished' || m.status === 'completed') && !readOnly && (
                                                            <button
                                                                onClick={() => handleReopenMatch(m.id)}
                                                                className="p-0.5 text-slate-300 hover:text-azul-primary transition-colors bg-white border border-slate-200 rounded hover:border-azul-primary/30 group/reopen"
                                                                title="Reabrir partido"
                                                            >
                                                                <RotateCcw className="w-2.5 h-2.5 group-hover/reopen:-rotate-45 transition-transform" />
                                                            </button>
                                                        )}
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
