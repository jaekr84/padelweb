"use client";

import { MapPin, Users2, UserCheck, Plus, Minus, RotateCcw, CreditCard, Play, Undo2 } from "lucide-react";
import { Group, Match, Standing } from "./types";

interface TournamentGroupsViewProps {
    groups: Group[];
    matches: Match[];
    readOnly: boolean;
    isEntryPresent: (id: string) => boolean;
    isMemberPresent: (pairId: string, slot: 0 | 1) => boolean;
    isMemberPaid: (pairId: string, slot: 0 | 1) => boolean;
    toggleMemberPresent: (pairId: string, slot: 0 | 1) => void;
    toggleMemberPaid: (pairId: string, slot: 0 | 1) => void;
    groupNextInfo: (groupId: string) => { pendingCount: number; availableCount: number };
    startGroupMatch: (matchId: string) => void;
    startAllGroupMatches: (groupId: string) => void;
    groupLiveInfo: (groupId: string) => { cancellableCount: number };
    cancelGroupMatch: (matchId: string) => void;
    cancelAllGroupMatches: (groupId: string) => void;
    handleScoreChange: (matchId: string, s1: string, s2: string) => void;
    handleConfirmScore: (matchId: string | string[]) => void;
    handleReopenMatch: (matchId: string) => void;
    setGroups: (groups: Group[]) => void;
    computeStandings: (groupId: string) => Standing[];
}

export function TournamentGroupsView({
    groups,
    matches,
    readOnly,
    isEntryPresent,
    isMemberPresent,
    isMemberPaid,
    toggleMemberPresent,
    toggleMemberPaid,
    groupNextInfo,
    startGroupMatch,
    startAllGroupMatches,
    groupLiveInfo,
    cancelGroupMatch,
    cancelAllGroupMatches,
    handleScoreChange,
    handleConfirmScore,
    handleReopenMatch,
    setGroups,
    computeStandings
}: TournamentGroupsViewProps) {
    return (
        <section
            className="relative rounded-2xl p-5 overflow-hidden border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_60px_-24px_rgba(0,0,0,0.6)] space-y-4"
            style={{ background: "radial-gradient(130% 95% at 50% -10%, #1b2942 0%, #0d1526 45%, #060a13 100%)" }}
        >
            {/* Faint arena grid */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.05]"
                style={{
                    backgroundImage: "linear-gradient(rgba(148,163,184,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.6) 1px, transparent 1px)",
                    backgroundSize: "26px 26px",
                }}
            />

            <div className="relative flex flex-col items-center">
                <h2 className="text-sm font-black text-white tracking-tighter uppercase italic leading-none">Fase de Grupos</h2>
                <p className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Resultados y Clasificación</p>
            </div>

            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-3">
                {groups.map((g: Group) => {
                    const standings = computeStandings(g.id);
                    const groupMatches = matches
                        .filter(m => m.groupId === g.id)
                        .sort((a, b) => a.id.localeCompare(b.id));
                    // The whole fixture is listed: the admin picks which match goes to
                    // court and starts it manually (the order on court rarely follows
                    // the listed order).
                    const visibleMatches = groupMatches;
                    const nextInfo = groupNextInfo(g.id);
                    const liveInfo = groupLiveInfo(g.id);

                    return (
                        <div
                            key={g.id}
                            // min-w-0: sin esto el ítem de grid no baja del ancho mínimo de
                            // su contenido (botones + steppers) y la tarjeta se corta.
                            className="min-w-0 rounded-xl overflow-hidden border border-white/10 shadow-lg flex flex-col h-full"
                            style={{ background: "linear-gradient(155deg, #1b2536 0%, #0f1420 100%)" }}
                        >
                            <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
                                <div className="flex flex-col gap-0.5">
                                    {!readOnly && (
                                        <div className="flex items-center gap-1.5 bg-black/30 px-2 py-0.5 rounded-lg border border-white/10 focus-within:border-cyan-400/50 transition-all w-fit">
                                            <MapPin className="w-2.5 h-2.5 text-cyan-400/60" />
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
                                                className="w-12 bg-transparent border-none p-0 text-[10px] font-black italic uppercase text-cyan-300 placeholder:text-slate-600 focus:ring-0 outline-none"
                                            />
                                        </div>
                                    )}
                                    {readOnly && g.courtNumber && (
                                        <div className="flex items-center gap-1.5 bg-cyan-400/10 px-2 py-0.5 rounded-lg border border-cyan-400/20 w-fit">
                                            <MapPin className="w-2.5 h-2.5 text-cyan-400" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-cyan-300">{g.courtNumber}</span>
                                        </div>
                                    )}
                                    <h3 className="text-base font-black italic uppercase tracking-tighter text-white leading-none">{g.name}</h3>
                                </div>
                                <Users2 className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="px-3 py-1 border-b border-white/10 bg-white/[0.02]">
                                <div className="flex-1 overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-[11px]">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="px-0.5 py-1 text-center font-black italic text-slate-400 uppercase tracking-widest text-[11px]">OK</th>
                                                <th className="px-0.5 py-1 text-center font-black italic text-slate-400 uppercase tracking-widest text-[11px]">$$</th>
                                                <th className="px-1.5 py-1 text-left font-black italic text-slate-400 uppercase tracking-widest text-[11px]">#</th>
                                                <th className="px-1 py-1 text-left font-black italic text-slate-400 uppercase tracking-widest text-[11px]">Jugador</th>
                                                <th className="px-1 py-1 text-center font-black italic text-slate-400 uppercase tracking-widest text-[11px]">PG</th>
                                                <th className="px-1 py-1 text-center font-black italic text-slate-400 uppercase tracking-widest text-[11px]">+/-</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {standings.map((s, idx: number) => {
                                                // Check-in y pago son por jugador: una fila de la pareja = un
                                                // botón por integrante, alineado con su nombre.
                                                const memberNames = s.player.name.split(/[\/\+]/).map((n: string) => n.trim()).filter(Boolean);
                                                const slots: (0 | 1)[] = memberNames.length > 1 ? [0, 1] : [0];
                                                return (
                                                <tr key={s.playerId} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                                                    <td className="px-0.5 py-0.5 align-top">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            {slots.map(slot => (
                                                                <button
                                                                    key={slot}
                                                                    onClick={() => toggleMemberPresent(s.playerId, slot)}
                                                                    title={`${memberNames[slot] || s.player.name}: ${isMemberPresent(s.playerId, slot) ? "presente" : "marcar presente"}`}
                                                                    className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${isMemberPresent(s.playerId, slot) ? "bg-cyan-400 text-slate-900 shadow-sm shadow-cyan-400/30" : "bg-white/10 text-slate-400 hover:text-cyan-400"}`}
                                                                >
                                                                    <UserCheck className="w-2.5 h-2.5" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-0.5 py-0.5 align-top">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            {slots.map(slot => (
                                                                <button
                                                                    key={slot}
                                                                    onClick={() => toggleMemberPaid(s.playerId, slot)}
                                                                    title={`${memberNames[slot] || s.player.name}: ${isMemberPaid(s.playerId, slot) ? "pagó" : "marcar pago"}`}
                                                                    className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${isMemberPaid(s.playerId, slot) ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30" : "bg-white/10 text-slate-400 hover:text-emerald-400"}`}
                                                                >
                                                                    <CreditCard className="w-2.5 h-2.5" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-1.5 py-0.5 text-left align-top">
                                                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-md font-black italic text-[10px] ${idx === 0 ? "bg-rojo text-white shadow-sm shadow-rojo/30" : "bg-white/5 text-slate-400"}`}>
                                                            {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-1 py-0.5 align-top">
                                                        <div className="flex flex-col gap-0.5">
                                                            {(memberNames.length ? memberNames : [s.player.name]).map((name: string, i: number) => (
                                                                <span
                                                                    key={i}
                                                                    className={`font-black uppercase italic tracking-tight leading-none text-[11px] h-4 flex items-center ${isMemberPresent(s.playerId, (i === 1 ? 1 : 0)) ? "text-slate-200" : "text-slate-500"}`}
                                                                >
                                                                    {name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-1 py-0.5 text-center align-top font-black italic text-cyan-400">{s.won}</td>
                                                    <td className="px-1 py-0.5 text-center align-top font-black italic text-slate-400">{s.points > 0 ? `+${s.points}` : s.points}</td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="p-2.5 space-y-1.5">
                                <div className="flex items-center justify-between gap-1 px-1 min-w-0">
                                    <h4 className="shrink-0 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Fixture del Grupo</h4>
                                    <div className="h-px flex-1 min-w-2 bg-white/10 mx-1" />
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
                                                    handleConfirmScore(matchesToConfirm.map(m => m.id));
                                                }
                                            }}
                                            className="shrink-0 text-[10px] font-black uppercase italic tracking-wider text-cyan-300 hover:text-slate-900 bg-cyan-400/10 hover:bg-cyan-400 px-1.5 py-0.5 rounded transition-colors border border-cyan-400/30"
                                        >
                                            GUARDAR TODO
                                        </button>
                                    )}
                                    {!readOnly && liveInfo.cancellableCount > 1 && (
                                        <button
                                            onClick={() => cancelAllGroupMatches(g.id)}
                                            className="shrink-0 ml-1 flex items-center gap-1 text-[10px] font-black uppercase italic tracking-wider text-slate-300 hover:text-white bg-white/5 hover:bg-white/15 px-1.5 py-0.5 rounded transition-colors border border-white/15"
                                            title="Devolver a pendiente los partidos iniciados sin puntos"
                                        >
                                            <Undo2 className="w-2.5 h-2.5" />
                                            Deshacer ({liveInfo.cancellableCount})
                                        </button>
                                    )}
                                </div>

                                {!readOnly && nextInfo.availableCount > 1 && (
                                    <button
                                        onClick={() => startAllGroupMatches(g.id)}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg font-black uppercase italic tracking-widest text-[10px] transition-all border bg-white/[0.03] text-slate-300 border-white/12 hover:bg-cyan-400/10 hover:text-cyan-300 hover:border-cyan-400/30 active:scale-95"
                                        title="Iniciar de una todos los partidos con las dos parejas presentes"
                                    >
                                        <Play className="w-3 h-3" />
                                        Iniciar todos ({nextInfo.availableCount})
                                    </button>
                                )}

                                <div className="grid gap-1">
                                    {visibleMatches.map(m => {
                                        const isReady = isEntryPresent(m.team1.id) && isEntryPresent(m.team2.id);
                                        const isDone = m.confirmed || m.status === 'finished' || m.status === 'completed';
                                        const isLive = m.status === 'in_progress';
                                        return (
                                            <div
                                                key={m.id}
                                                className={`group/match relative min-w-0 transition-all text-[10px] ${!isReady && readOnly && !isDone ? "opacity-40 grayscale pointer-events-none" : ""}`}
                                            >
                                                <div
                                                    className={`rounded-md border transition-all overflow-hidden flex items-center justify-between px-1.5 py-1.5 gap-1 ${isDone
                                                        ? "bg-emerald-500/[0.06] border-emerald-500/30"
                                                        : isLive
                                                            ? "bg-rojo/[0.08] border-rojo/40 shadow-[0_0_12px_rgba(255,45,85,0.25)]"
                                                            : "bg-white/[0.02] border-white/10 hover:border-white/25"
                                                        }`}
                                                >
                                                    {/* Equipo 1 */}
                                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                                        <div className={`flex-1 truncate font-black uppercase italic tracking-tight ${isDone ? (m.score1! > m.score2! ? "text-emerald-400" : "text-slate-500") : isLive ? "text-slate-100" : "text-slate-400"}`}>
                                                            {m.team1.name.split(/[\/\+]/).map(n => n.trim()).join(" / ")}
                                                        </div>
                                                        {isLive && !readOnly ? (
                                                            <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 rounded px-0.5">
                                                                <button onClick={() => handleScoreChange(m.id, Math.max(0, (m.score1 || 0) - 1).toString(), m.score2?.toString() ?? "")} className="p-0.5 text-slate-500 hover:text-rojo transition-colors"><Minus className="w-2 h-2" /></button>
                                                                <input type="number" value={m.score1 ?? 0} onChange={e => handleScoreChange(m.id, e.target.value, m.score2?.toString() ?? "")} className="w-4 h-4 text-center font-black outline-none no-spin-buttons bg-transparent text-[11px] text-white focus:text-rojo" />
                                                                <button onClick={() => handleScoreChange(m.id, ((m.score1 || 0) + 1).toString(), m.score2?.toString() ?? "")} className="p-0.5 text-slate-500 hover:text-rojo transition-colors"><Plus className="w-2 h-2" /></button>
                                                            </div>
                                                        ) : (
                                                            <span className={`font-black w-6 text-center ${isDone && m.score1! > m.score2! ? "text-emerald-400" : "text-slate-400"}`}>{m.score1 ?? 0}</span>
                                                        )}
                                                    </div>

                                                    {/* VS */}
                                                    <span className="text-[10px] font-black text-slate-400 shrink-0">VS</span>

                                                    {/* Equipo 2 */}
                                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                                        {isLive && !readOnly ? (
                                                            <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 rounded px-0.5">
                                                                <button onClick={() => handleScoreChange(m.id, m.score1?.toString() ?? "", Math.max(0, (m.score2 || 0) - 1).toString())} className="p-0.5 text-slate-500 hover:text-rojo transition-colors"><Minus className="w-2 h-2" /></button>
                                                                <input type="number" value={m.score2 ?? 0} onChange={e => handleScoreChange(m.id, m.score1?.toString() ?? "", e.target.value)} className="w-4 h-4 text-center font-black outline-none no-spin-buttons bg-transparent text-[11px] text-white focus:text-rojo" />
                                                                <button onClick={() => handleScoreChange(m.id, m.score1?.toString() ?? "", ((m.score2 || 0) + 1).toString())} className="p-0.5 text-slate-500 hover:text-rojo transition-colors"><Plus className="w-2 h-2" /></button>
                                                            </div>
                                                        ) : (
                                                            <span className={`font-black w-6 text-center ${isDone && m.score2! > m.score1! ? "text-emerald-400" : "text-slate-400"}`}>{m.score2 ?? 0}</span>
                                                        )}
                                                        <div className={`flex-1 truncate font-black uppercase italic tracking-tight text-right ${isDone ? (m.score2! > m.score1! ? "text-emerald-400" : "text-slate-500") : isLive ? "text-slate-100" : "text-slate-400"}`}>
                                                            {m.team2.name.split(/[\/\+]/).map(n => n.trim()).join(" / ")}
                                                        </div>
                                                    </div>

                                                    {/* Acciones */}
                                                    <div className="flex items-center gap-1 shrink-0 ml-1">
                                                        {!m.confirmed && !readOnly && m.status !== 'finished' && m.status !== 'completed' && (
                                                            isLive ? (
                                                                <>
                                                                    {!m.score1 && !m.score2 && (
                                                                        <button
                                                                            onClick={() => cancelGroupMatch(m.id)}
                                                                            className="p-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white border border-white/15 transition-colors"
                                                                            title="Deshacer inicio: vuelve a pendiente"
                                                                        >
                                                                            <Undo2 className="w-2.5 h-2.5" />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleConfirmScore(m.id)}
                                                                        className="px-1.5 py-0.5 rounded bg-cyan-400/10 hover:bg-cyan-400 text-cyan-300 hover:text-slate-900 text-[10px] font-black italic border border-cyan-400/30 transition-colors"
                                                                    >
                                                                        FIN
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    onClick={() => startGroupMatch(m.id)}
                                                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black italic border transition-colors ${isReady
                                                                        ? "bg-rojo/10 hover:bg-rojo text-rojo hover:text-white border-rojo/30"
                                                                        : "bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white border-white/15"}`}
                                                                    title={isReady
                                                                        ? "Iniciar este partido"
                                                                        : "Iniciar igual (falta marcar presente a alguna pareja)"}
                                                                >
                                                                    <Play className="w-2 h-2" />
                                                                    START
                                                                </button>
                                                            )
                                                        )}
                                                        {isDone && !readOnly && (
                                                            <button
                                                                onClick={() => handleReopenMatch(m.id)}
                                                                className="p-0.5 text-slate-500 hover:text-cyan-300 transition-colors bg-white/5 border border-white/10 rounded hover:border-cyan-400/40 group/reopen"
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
