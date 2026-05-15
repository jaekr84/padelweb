"use client";

import { Check, Plus, Minus, RotateCcw, RefreshCw, ArrowLeftRight } from "lucide-react";
import { BracketMatch, BracketSlot, Player } from "./types";

interface TournamentBracketViewProps {
    bracket: BracketMatch[];
    roundsArr: number[];
    readOnly: boolean;
    handleBracketScore: (matchId: string, s1: string, s2: string) => void;
    handleBracketConfirm: (matchId: string) => void;
    handleReopenMatch: (matchId: string) => void;
    handleGenerateBracket: () => void;
    handleSwapPlayers: (matchId: string, teamSlot: 1 | 2) => void;
    swappingPlayer: { matchId: string, teamSlot: 1 | 2 } | null;
    setBracket: (bracket: BracketMatch[] | ((prev: BracketMatch[]) => BracketMatch[])) => void;
    roundLabel: (r: number) => string;
}

export function TournamentBracketView({
    bracket,
    roundsArr,
    readOnly,
    handleBracketScore,
    handleBracketConfirm,
    handleReopenMatch,
    handleGenerateBracket,
    handleSwapPlayers,
    swappingPlayer,
    setBracket,
    roundLabel
}: TournamentBracketViewProps) {
    return (
        <section className="space-y-8">
            <div className="text-center space-y-1 relative group/title">
                <div className="flex items-center justify-center gap-3 relative">
                    <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight uppercase">Cuadro del Torneo</h2>
                    {!readOnly && (
                        <button
                            onClick={handleGenerateBracket}
                            className="p-2 rounded-full bg-azul-primary/10 text-azul-primary hover:bg-azul-primary hover:text-white transition-all shadow-lg shadow-azul-primary/10 group/reg"
                            title="Regenerar llaves desde cero"
                        >
                            <RefreshCw className="w-4 h-4 group-hover/reg:rotate-180 transition-transform duration-500" />
                        </button>
                    )}
                </div>
                <div className="flex items-center justify-center gap-2">
                    <div className="h-px w-8 bg-celeste/30" />
                    <p className="text-celeste text-[10px] font-bold uppercase tracking-[0.4em]">Playoffs Pro</p>
                    <div className="h-px w-8 bg-celeste/30" />
                </div>
            </div>

            <div className="pb-8 -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12">
                <div className="flex items-stretch justify-center h-auto min-h-[600px] gap-4">
                    {roundsArr.map((round) => {
                        const matchesInRound = bracket.filter(m => m.round === round).sort((a, b) => a.slot - b.slot);
                        const maxRounds = roundsArr.length;
                        const totalRows = Math.pow(2, maxRounds);
                        const rowSpan = Math.pow(2, maxRounds - round - 1) * 2;

                        return (
                            <div key={round} className="w-[280px] flex flex-col pt-3">
                                <div className="flex-none flex flex-col items-center mb-2">
                                    <span className="px-4 py-1.5 bg-background border border-border/60 rounded-full text-[11px] font-bold uppercase tracking-widest text-muted-foreground shadow-sm">
                                        {roundLabel(round)}
                                    </span>
                                </div>

                                <div className={`flex-1 grid h-full gap-y-1`} style={{ gridTemplateRows: `repeat(${totalRows}, 1fr)` }}>
                                    {Array.from({ length: totalRows / rowSpan }).map((_, slotIdx) => {
                                        const m = matchesInRound.find(m => m.slot === slotIdx);
                                        if (!m) return <div key={slotIdx} style={{ gridRow: `span ${rowSpan}` }} />;

                                        return (
                                            <div
                                                key={m.id}
                                                className="flex flex-col justify-center px-2"
                                                style={{
                                                    gridRowStart: slotIdx * rowSpan + 1,
                                                    gridRowEnd: `span ${rowSpan}`
                                                }}
                                            >
                                                <div className="relative group/match">
                                                    <div className={`relative transition-all ${(m.confirmed || m.status === 'finished' || m.status === 'completed') ? "z-10" : "z-20"}`}>
                                                        {(m.confirmed || m.status === 'finished' || m.status === 'completed') && (
                                                            <div className="absolute -top-1 -right-1 z-30">
                                                                <div className="bg-emerald-500 text-white p-1 rounded-full shadow-lg shadow-emerald-500/30 border-2 border-background">
                                                                    <Check className="w-2 h-2 stroke-[4]" />
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div
                                                            className={`rounded-2xl border transition-all min-h-[75px] flex flex-col justify-center relative group/match ${
                                                                (m.confirmed || m.status === 'finished' || m.status === 'completed')
                                                                    ? "bg-emerald-500/[0.03] border-emerald-500/30"
                                                                    : m.status === 'in_progress'
                                                                        ? "bg-rojo/[0.03] border-rojo/40 shadow-xl shadow-rojo/5"
                                                                        : "bg-background border-border/40 hover:border-border/60 shadow-sm"
                                                            }`}
                                                        >
                                                            {m.status === 'in_progress' && !m.confirmed && (
                                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-rojo text-white px-2.5 py-0.5 text-[11px] font-black italic rounded-b-lg shadow-lg z-20 animate-pulse tracking-widest uppercase whitespace-nowrap">
                                                                    VIVO
                                                                </div>
                                                            )}

                                                            <div className="flex flex-col py-2 min-h-[110px] justify-between">
                                                                {/* Names Row - Fixed Height */}
                                                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 px-2 min-h-[32px]">
                                                                    {/* Equipo 1 */}
                                                                    <div 
                                                                        onClick={() => !readOnly && !m.confirmed && handleSwapPlayers(m.id, 1)}
                                                                        className={`flex items-center gap-1 min-w-0 cursor-pointer p-0.5 rounded transition-all group/player1 ${swappingPlayer?.matchId === m.id && swappingPlayer?.teamSlot === 1 ? "bg-azul-primary/20 ring-1 ring-azul-primary shadow-sm" : "hover:bg-muted/50"}`}
                                                                    >
                                                                        {!readOnly && !m.confirmed && (
                                                                            <ArrowLeftRight className="w-2.5 h-2.5 text-azul-primary shrink-0 opacity-0 group-hover/player1:opacity-100 transition-opacity" />
                                                                        )}
                                                                        <div className="flex flex-col min-w-0">
                                                                            {m.team1 === "BYE" ? (
                                                                                <span className="text-muted-foreground/30 text-[10px] font-black uppercase italic tracking-tighter">BYE</span>
                                                                            ) : (m.team1 as any)?.id?.startsWith('TBD_') ? (
                                                                                <span className="text-azul-primary/40 text-[10px] font-black uppercase italic tracking-tighter border border-dashed border-azul-primary/20 rounded px-1 py-0.5 bg-azul-primary/[0.02] truncate">
                                                                                    {(m.team1 as Player).name}
                                                                                </span>
                                                                            ) : (
                                                                                (m.team1 as Player)?.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                                                    <div key={i} data-tooltip={name.trim()} className="min-w-0">
                                                                                        <span className={`block font-black uppercase italic tracking-tight leading-[1.1] truncate text-[11px] ${(m.confirmed || m.status === 'finished' || m.status === 'completed') && m.winnerId === (m.team1 as Player)?.id ? "text-emerald-600" : "text-foreground/70"}`}>
                                                                                            {name.trim()}
                                                                                        </span>
                                                                                    </div>
                                                                                )) || <span className="text-muted-foreground/20 text-[10px] font-black uppercase italic">A definir</span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* VS central column */}
                                                                    <div className="flex items-center justify-center px-1">
                                                                        <span className="text-[10px] font-black text-foreground/10 italic tracking-widest pt-1">VS</span>
                                                                    </div>

                                                                    {/* Equipo 2 */}
                                                                    <div 
                                                                        onClick={() => !readOnly && !m.confirmed && handleSwapPlayers(m.id, 2)}
                                                                        className={`flex flex-row-reverse items-center gap-1 min-w-0 text-right cursor-pointer p-0.5 rounded transition-all group/player2 ${swappingPlayer?.matchId === m.id && swappingPlayer?.teamSlot === 2 ? "bg-azul-primary/20 ring-1 ring-azul-primary shadow-sm" : "hover:bg-muted/50"}`}
                                                                    >
                                                                        {!readOnly && !m.confirmed && (
                                                                            <ArrowLeftRight className="w-2.5 h-2.5 text-azul-primary shrink-0 opacity-0 group-hover/player2:opacity-100 transition-opacity" />
                                                                        )}
                                                                        <div className="flex flex-col items-end min-w-0 text-right">
                                                                            {m.team2 === "BYE" ? (
                                                                                <span className="text-muted-foreground/30 text-[10px] font-black uppercase italic tracking-tighter">BYE</span>
                                                                            ) : (m.team2 as any)?.id?.startsWith('TBD_') ? (
                                                                                <span className="text-azul-primary/40 text-[10px] font-black uppercase italic tracking-tighter border border-dashed border-azul-primary/20 rounded px-1 py-0.5 bg-azul-primary/[0.02] truncate">
                                                                                    {(m.team2 as Player).name}
                                                                                </span>
                                                                            ) : (
                                                                                (m.team2 as Player)?.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                                                    <div key={i} data-tooltip={name.trim()} className="min-w-0">
                                                                                        <span className={`block font-black uppercase italic tracking-tight leading-[1.1] truncate text-[11px] ${(m.confirmed || m.status === 'finished' || m.status === 'completed') && m.winnerId === (m.team2 as Player)?.id ? "text-emerald-600" : "text-foreground/70"}`}>
                                                                                            {name.trim()}
                                                                                        </span>
                                                                                    </div>
                                                                                )) || <span className="text-muted-foreground/20 text-[10px] font-black uppercase italic">A definir</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Middle Row: Scores - Fixed Height & Centered */}
                                                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 px-2 h-8">
                                                                    <div className="flex justify-center">
                                                                        {m.status === 'in_progress' && !readOnly ? (
                                                                            <div className="flex items-center gap-1 bg-muted/20 rounded-md p-0.5 border border-border/10">
                                                                                <input
                                                                                    type="number"
                                                                                    value={m.score1 ?? 0}
                                                                                    onChange={e => handleBracketScore(m.id, e.target.value, m.score2?.toString() ?? "0")}
                                                                                    className="w-8 h-6 bg-transparent text-center font-black text-xs outline-none no-spin-buttons"
                                                                                    placeholder="0"
                                                                                />
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <button onClick={() => handleBracketScore(m.id, ((m.score1 || 0) + 1).toString(), m.score2?.toString() ?? "0")} className="p-0.5 hover:text-rojo transition-colors"><Plus className="w-1.5 h-1.5" /></button>
                                                                                    <button onClick={() => handleBracketScore(m.id, Math.max(0, (m.score1 || 0) - 1).toString(), m.score2?.toString() ?? "0")} className="p-0.5 hover:text-rojo transition-colors"><Minus className="w-1.5 h-1.5" /></button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <span className={`text-sm font-black tabular-nums ${(m.confirmed || m.status === 'finished' || m.status === 'completed') && m.winnerId === (m.team1 as Player)?.id ? "text-emerald-600" : "text-foreground/40"}`}>
                                                                                {m.score1 ?? 0}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center gap-1.5">
                                                                        {!readOnly && m.team1 !== "BYE" && m.team2 !== "BYE" && !m.confirmed && m.status !== 'completed' && m.status !== 'finished' && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    const nextStatus = m.status === 'in_progress' ? 'pending' : 'in_progress';
                                                                                    setBracket(prev => prev.map(bm => bm.id === m.id ? { ...bm, status: nextStatus } : bm));
                                                                                }}
                                                                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase italic tracking-widest border transition-all shadow-sm ${m.status === 'in_progress' ? "bg-rojo text-white border-rojo" : "bg-white hover:bg-rojo/5 text-rojo border-rojo/20"}`}
                                                                            >
                                                                                {m.status === 'in_progress' ? "STOP" : "START"}
                                                                            </button>
                                                                        )}
                                                                        {m.status === 'in_progress' && !readOnly && (
                                                                            <button
                                                                                onClick={() => handleBracketConfirm(m.id)}
                                                                                className="px-3 py-1 rounded-full bg-azul-primary text-white text-[10px] font-black uppercase italic tracking-widest border border-azul-primary shadow-lg shadow-azul-primary/20 hover:scale-105 active:scale-95 transition-all"
                                                                            >
                                                                                FIN
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex justify-center">
                                                                        {m.status === 'in_progress' && !readOnly ? (
                                                                            <div className="flex items-center gap-1 bg-muted/20 rounded-md p-0.5 border border-border/10">
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <button onClick={() => handleBracketScore(m.id, m.score1?.toString() ?? "0", ((m.score2 || 0) + 1).toString())} className="p-0.5 hover:text-rojo transition-colors"><Plus className="w-1.5 h-1.5" /></button>
                                                                                    <button onClick={() => handleBracketScore(m.id, m.score1?.toString() ?? "0", Math.max(0, (m.score2 || 0) - 1).toString())} className="p-0.5 hover:text-rojo transition-colors"><Minus className="w-1.5 h-1.5" /></button>
                                                                                </div>
                                                                                <input
                                                                                    type="number"
                                                                                    value={m.score2 ?? 0}
                                                                                    onChange={e => handleBracketScore(m.id, m.score1?.toString() ?? "0", e.target.value)}
                                                                                    className="w-8 h-6 bg-transparent text-center font-black text-xs outline-none no-spin-buttons"
                                                                                    placeholder="0"
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <span className={`text-sm font-black tabular-nums ${(m.confirmed || m.status === 'finished' || m.status === 'completed') && m.winnerId === (m.team2 as Player)?.id ? "text-emerald-600" : "text-foreground/40"}`}>
                                                                                {m.score2 ?? 0}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Bottom Row: Admin Reopen - Fixed Height */}
                                                                <div className="flex items-center justify-center h-6 mt-1">
                                                                    {(m.confirmed || m.status === 'finished' || m.status === 'completed') && !readOnly && (
                                                                        <button
                                                                            onClick={() => handleReopenMatch(m.id)}
                                                                            className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-azul-primary/5 text-azul-primary/40 hover:text-azul-primary hover:bg-azul-primary/10 transition-all group/reopen border border-azul-primary/10 opacity-0 group-hover/match:opacity-100"
                                                                        >
                                                                            <RotateCcw className="w-2.5 h-2.5 group-hover/reopen:-rotate-45 transition-transform" />
                                                                            <span className="text-[10px] font-black uppercase italic tracking-wider">Reabrir Partido</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
