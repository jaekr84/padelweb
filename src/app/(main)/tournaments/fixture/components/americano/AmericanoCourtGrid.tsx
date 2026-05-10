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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: numCourts }).map((_, courtIdx) => {
                const courtNumber = courtIdx + 1;
                const activeMatch = matches.find(m => m.courtNumber === courtNumber && !m.confirmed);

                return (
                    <div key={courtNumber} className="relative group">
                        <div className="absolute -top-3 right-4 flex items-center gap-2 z-10">
                            <div className="px-3 py-1 bg-azul-primary/10 text-azul-primary border border-azul-primary/20 backdrop-blur-md rounded-full text-[7px] font-black uppercase tracking-widest shadow-lg">
                                Cancha {courtNumber}
                            </div>
                            {activeMatch && !readOnly && (
                                <button
                                    onClick={() => handleDeleteMatch(activeMatch.id)}
                                    className="p-1.5 bg-background/80 backdrop-blur-md text-rojo hover:bg-rojo hover:text-white rounded-lg transition-all border border-border/50 shadow-sm"
                                    title="Eliminar Partido"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        <div className={`rounded-xl border-2 transition-all duration-300 flex flex-col shadow-lg relative overflow-hidden group-hover:border-azul-primary/40 min-h-[90px] ${activeMatch && !readOnly ? "border-azul-primary/30 bg-azul-primary/[0.02]" : "border-border/20 bg-card/40 backdrop-blur-xl"}`}>
                            {activeMatch && !readOnly && (
                                <div className="absolute top-0 left-0 bg-rojo text-white px-1.5 py-0.5 text-[5px] font-black italic rounded-tl-lg rounded-br-md shadow-lg z-10 animate-pulse tracking-widest uppercase">
                                    VIVO
                                </div>
                            )}
                            {activeMatch ? (
                                <div className="p-2 flex-1 flex flex-col justify-center">
                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 relative">
                                        {/* Equipo 1 */}
                                        <div className="flex flex-col items-center gap-1 min-w-0">
                                            <div className="flex flex-col items-center min-w-0 text-center">
                                                {activeMatch.team1.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                    <span key={i} className={`font-black uppercase italic leading-tight truncate text-[8px] text-foreground/80`}>
                                                        {name.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                            {!readOnly ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={activeMatch.score1 ?? ""}
                                                        onChange={(e) => handleScoreChange(activeMatch.id, e.target.value, activeMatch.score2?.toString() ?? "")}
                                                        className="w-8 h-5 bg-muted/40 border border-border/40 rounded text-center font-black text-[9px] outline-none no-spin-buttons"
                                                        placeholder="0"
                                                    />
                                                    <div className="flex flex-col gap-0">
                                                        <button onClick={() => handleScoreChange(activeMatch.id, ((activeMatch.score1 || 0) + 1).toString(), activeMatch.score2?.toString() ?? "")} className="p-0 hover:bg-muted rounded text-foreground/40 hover:text-azul-primary transition-colors"><Plus className="w-2 h-2" /></button>
                                                        <button onClick={() => handleScoreChange(activeMatch.id, Math.max(0, (activeMatch.score1 || 0) - 1).toString(), activeMatch.score2?.toString() ?? "")} className="p-0 hover:bg-muted rounded text-foreground/40 hover:text-azul-primary transition-colors"><Minus className="w-2 h-2" /></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black italic text-azul-primary">{activeMatch.score1}</span>
                                            )}
                                        </div>

                                        {/* VS / Acciones en Hover */}
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="text-[6px] font-black text-foreground/20 italic">VS</div>
                                            {!readOnly && (
                                                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2 z-20 rounded-lg">
                                                    <button
                                                        onClick={() => handleConfirmScore(activeMatch.id)}
                                                        className="px-3 py-1 bg-azul-primary text-white text-[7px] font-black italic tracking-widest rounded-md shadow-lg shadow-azul-primary/20"
                                                    >
                                                        FINALIZAR
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMatch(activeMatch.id)}
                                                        className="p-1 bg-rojo/10 text-rojo border border-rojo/20 rounded-md hover:bg-rojo hover:text-white transition-all"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Equipo 2 */}
                                        <div className="flex flex-col items-center gap-1 min-w-0">
                                            <div className="flex flex-col items-center min-w-0 text-center">
                                                {activeMatch.team2.name.split(/[\/\+]/).map((name: string, i: number) => (
                                                    <span key={i} className={`font-black uppercase italic leading-tight truncate text-[8px] text-foreground/80`}>
                                                        {name.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                            {!readOnly ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={activeMatch.score2 ?? ""}
                                                        onChange={(e) => handleScoreChange(activeMatch.id, activeMatch.score1?.toString() ?? "", e.target.value)}
                                                        className="w-8 h-5 bg-muted/40 border border-border/40 rounded text-center font-black text-[9px] outline-none no-spin-buttons"
                                                        placeholder="0"
                                                    />
                                                    <div className="flex flex-col gap-0">
                                                        <button onClick={() => handleScoreChange(activeMatch.id, activeMatch.score1?.toString() ?? "", ((activeMatch.score2 || 0) + 1).toString())} className="p-0 hover:bg-muted rounded text-foreground/40 hover:text-azul-primary transition-colors"><Plus className="w-2 h-2" /></button>
                                                        <button onClick={() => handleScoreChange(activeMatch.id, activeMatch.score1?.toString() ?? "", Math.max(0, (activeMatch.score2 || 0) - 1).toString())} className="p-0 hover:bg-muted rounded text-foreground/40 hover:text-azul-primary transition-colors"><Minus className="w-2 h-2" /></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black italic text-azul-primary">{activeMatch.score2}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-2 flex flex-col items-center justify-center gap-2 min-h-[90px] text-center">
                                    <p className="text-[7px] font-black uppercase tracking-widest text-foreground/20 italic">Cancha Disponible</p>
                                    {!readOnly && (
                                        <button
                                            onClick={() => generateNextMatch(courtNumber)}
                                            disabled={saving}
                                            className="px-3 py-1 bg-azul-primary/10 text-azul-primary border border-azul-primary/20 rounded-md text-[7px] font-black uppercase tracking-widest hover:bg-azul-primary hover:text-white transition-all flex items-center justify-center gap-1"
                                        >
                                            <Plus className="w-2.5 h-2.5" />
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
