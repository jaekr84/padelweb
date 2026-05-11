"use client";

import { motion } from "framer-motion";
import { Trash2, Plus, Minus } from "lucide-react";
import { Match } from "./types";

interface AmericanoCourtGridProps {
    numCourts: number;
    matches: Match[];
    readOnly?: boolean;
    handleDeleteMatch: (id: string) => void;
    handleScoreChange: (matchId: string, s1: string, s2: string) => void;
    handleConfirmScore: (matchId: string) => void;
    generateNextMatch: (courtNum: number) => void;
    saving: boolean;
}

export function AmericanoCourtGrid({
    numCourts,
    matches,
    readOnly,
    handleDeleteMatch,
    handleScoreChange,
    handleConfirmScore,
    generateNextMatch,
    saving
}: AmericanoCourtGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {Array.from({ length: numCourts }).map((_, courtIdx) => {
                const courtNumber = courtIdx + 1;
                const activeMatch = matches.find(m => m.courtNumber === courtNumber && !m.confirmed);

                return (
                    <div key={courtNumber} className="relative group">
                        <div className="absolute -top-2 left-2 flex items-center gap-1.5 z-10">
                            <div className="px-2 py-0.5 bg-background border border-border/40 backdrop-blur-md rounded text-[6px] font-black uppercase tracking-[0.2em] shadow-sm">
                                CANCHA {courtNumber}
                            </div>
                        </div>

                        <div className={`rounded-lg border transition-all duration-300 flex flex-col shadow-sm relative overflow-hidden group-hover:border-azul-primary/40 min-h-[75px] ${activeMatch && !readOnly ? "border-azul-primary/20 bg-azul-primary/[0.01]" : "border-border/20 bg-card/40 backdrop-blur-xl"}`}>
                            {activeMatch && !readOnly && (
                                <div className="absolute top-0 right-0 bg-rojo text-white px-1 py-0.5 text-[5px] font-black italic rounded-bl shadow-sm z-10 animate-pulse tracking-widest uppercase">
                                    VIVO
                                </div>
                            )}
                            
                            {activeMatch ? (
                                <div className="p-1.5 pt-2.5 flex-1 flex flex-col justify-center">
                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 relative">
                                        {/* Equipo 1 */}
                                        <div className="flex flex-col items-center gap-1 min-w-0">
                                            <div className="flex flex-col items-center min-w-0 text-center">
                                                {activeMatch.team1.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                    <span key={i} className={`font-black uppercase italic leading-none truncate text-[7px] text-foreground/70`}>
                                                        {name.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                            {!readOnly ? (
                                                <div className="flex items-center gap-0.5">
                                                    <input
                                                        type="number"
                                                        value={activeMatch.score1 ?? ""}
                                                        onChange={(e) => handleScoreChange(activeMatch.id, e.target.value, activeMatch.score2?.toString() ?? "")}
                                                        className="w-7 h-4 bg-muted/30 border border-border/30 rounded text-center font-black text-[8px] outline-none no-spin-buttons focus:ring-1 focus:ring-azul-primary/30"
                                                        placeholder="0"
                                                    />
                                                    <div className="flex flex-col -gap-1 scale-75">
                                                        <button onClick={() => handleScoreChange(activeMatch.id, ((activeMatch.score1 || 0) + 1).toString(), activeMatch.score2?.toString() ?? "")} className="p-0 hover:text-azul-primary transition-colors"><Plus className="w-2 h-2" /></button>
                                                        <button onClick={() => handleScoreChange(activeMatch.id, Math.max(0, (activeMatch.score1 || 0) - 1).toString(), activeMatch.score2?.toString() ?? "")} className="p-0 hover:text-azul-primary transition-colors"><Minus className="w-2 h-2" /></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-black italic text-azul-primary">{activeMatch.score1}</span>
                                            )}
                                        </div>

                                        {/* VS / Acciones en Hover */}
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="text-[5px] font-black text-foreground/20 italic">VS</div>
                                            {!readOnly && (
                                                <div className="absolute inset-0 bg-background/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center gap-1.5 z-20 rounded-md">
                                                    <button
                                                        onClick={() => handleConfirmScore(activeMatch.id)}
                                                        className="px-2 py-1 bg-azul-primary text-white text-[7px] font-black italic tracking-widest rounded shadow-sm hover:scale-105 active:scale-95 transition-all"
                                                    >
                                                        OK
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMatch(activeMatch.id)}
                                                        className="p-1 bg-rojo/5 text-rojo border border-rojo/10 rounded hover:bg-rojo hover:text-white transition-all active:scale-95"
                                                    >
                                                        <Trash2 className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Equipo 2 */}
                                        <div className="flex flex-col items-center gap-1 min-w-0">
                                            <div className="flex flex-col items-center min-w-0 text-center">
                                                {activeMatch.team2.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                    <span key={i} className={`font-black uppercase italic leading-none truncate text-[7px] text-foreground/70`}>
                                                        {name.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                            {!readOnly ? (
                                                <div className="flex items-center gap-0.5">
                                                    <input
                                                        type="number"
                                                        value={activeMatch.score2 ?? ""}
                                                        onChange={(e) => handleScoreChange(activeMatch.id, activeMatch.score1?.toString() ?? "", e.target.value)}
                                                        className="w-7 h-4 bg-muted/30 border border-border/30 rounded text-center font-black text-[8px] outline-none no-spin-buttons focus:ring-1 focus:ring-azul-primary/30"
                                                        placeholder="0"
                                                    />
                                                    <div className="flex flex-col -gap-1 scale-75">
                                                        <button onClick={() => handleScoreChange(activeMatch.id, activeMatch.score1?.toString() ?? "", ((activeMatch.score2 || 0) + 1).toString())} className="p-0 hover:text-azul-primary transition-colors"><Plus className="w-2 h-2" /></button>
                                                        <button onClick={() => handleScoreChange(activeMatch.id, activeMatch.score1?.toString() ?? "", Math.max(0, (activeMatch.score2 || 0) - 1).toString())} className="p-0 hover:text-azul-primary transition-colors"><Minus className="w-2 h-2" /></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-black italic text-azul-primary">{activeMatch.score2}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-2 flex flex-col items-center justify-center gap-1.5 min-h-[75px] text-center">
                                    <p className="text-[6px] font-black uppercase tracking-widest text-foreground/10 italic">Cancha Libre</p>
                                    {!readOnly && (
                                        <button
                                            onClick={() => generateNextMatch(courtNumber)}
                                            disabled={saving}
                                            className="px-2.5 py-1 bg-azul-primary/[0.03] text-azul-primary border border-azul-primary/10 rounded text-[7px] font-black uppercase tracking-widest hover:bg-azul-primary hover:text-white transition-all flex items-center justify-center gap-1 active:scale-95"
                                        >
                                            <Plus className="w-2 h-2" />
                                            Generar
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
