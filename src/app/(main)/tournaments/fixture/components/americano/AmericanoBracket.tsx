"use client";

import { 
    Trophy, Zap, RotateCcw, Minus, Plus, Pencil, Check, Circle 
} from "lucide-react";
import { BracketMatch, Player, Standing } from "./types";

interface AmericanoBracketProps {
    bracket: BracketMatch[];
    setBracket: (b: BracketMatch[]) => void;
    readOnly?: boolean;
    setReplacingPlayer: (p: Player) => void;
    handleBracketScore: (matchId: string, s1: string, s2: string) => void;
    handleBracketConfirm: (matchId: string) => void;
    handleBracketEdit: (matchId: string) => void;
    standings: Standing[];
}

export function AmericanoBracket({
    bracket,
    setBracket,
    readOnly,
    setReplacingPlayer,
    handleBracketScore,
    handleBracketConfirm,
    handleBracketEdit,
    standings
}: AmericanoBracketProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 border-t border-border/50 pt-24 mt-24">
            <div className="lg:col-span-12 flex flex-col gap-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-azul-primary/10 flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-azul-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase italic tracking-tight">Cuadro de Eliminatorias</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground/70 mt-0.5">Definición del campeonato • Actualización en tiempo real</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-azul-primary bg-azul-primary/10 px-4 py-2 rounded-full border border-azul-primary/20">
                            <Zap className="w-4 h-4 animate-pulse" />
                            Bracket Dinámico
                        </div>
                        {bracket.length > 0 && !readOnly && (
                            <button
                                onClick={() => { if (confirm("¿Borrar y reiniciar cuadro?")) setBracket([]); }}
                                className="p-2 rounded-lg bg-rojo/10 text-rojo hover:bg-rojo hover:text-white transition-all shadow-lg shadow-rojo/5"
                                title="Reiniciar Cuadro"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {bracket.length > 0 ? (
                    <div className="relative">
                        <div className="w-full relative overflow-x-auto pb-20 no-scrollbar cursor-grab active:cursor-grabbing px-4">
                            <div className="min-w-max flex gap-12 items-stretch justify-center h-[2200px]">
                                {[3, 2, 1, 0].map((round) => {
                                    const matchesInRound = bracket.filter(m => m.round === round).sort((a, b) => a.slot - b.slot);
                                    const rowSpan = Math.pow(2, 4 - round - 1) * 2; // R3: 2, R2: 4, R1: 8, R0: 16

                                    return (
                                        <div key={round} className="w-[300px] flex flex-col pt-12">
                                            <div className="flex-none flex flex-col items-center gap-4 mb-8">
                                                <span className="px-5 py-2 bg-foreground text-background rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic shadow-xl">
                                                    {round === 0 ? "🏆 Final" : round === 1 ? "Semis" : round === 2 ? "Cuartos" : "Octavos / Play-in"}
                                                </span>
                                            </div>

                                            <div className="flex-1 grid grid-rows-[repeat(16,1fr)] h-full gap-y-8">
                                                {Array.from({ length: 16 / rowSpan }).map((_, slotIdx) => {
                                                    const match = matchesInRound.find(m => m.slot === slotIdx);

                                                    return (
                                                        <div
                                                            key={slotIdx}
                                                            style={{
                                                                gridRowStart: slotIdx * rowSpan + 1,
                                                                gridRowEnd: `span ${rowSpan}`
                                                            }}
                                                            className="flex flex-col justify-center px-2"
                                                        >
                                                            {match ? (
                                                                <div className={`backdrop-blur-xl border-2 rounded-[2.5rem] p-5 transition-all duration-300 relative group shadow-lg ${match.confirmed ? (match.round === 0 ? "border-celeste shadow-[0_0_50px_rgba(34,211,238,0.3)] bg-celeste/5 ring-4 ring-celeste/10" : "border-azul-primary/30 bg-card/40") : "border-border/50 bg-card/40 hover:border-azul-primary/30"}`}>
                                                                    <div className="space-y-6">
                                                                        {match.round === 0 && match.confirmed && (
                                                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-celeste text-azul-primary p-2 rounded-full shadow-lg z-30">
                                                                                <Trophy className="w-4 h-4" />
                                                                            </div>
                                                                        )}
                                                                        {[match.team1, match.team2].map((team, tIdx) => (
                                                                            <div key={tIdx} className="flex items-center justify-between gap-4 group/team">
                                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                                    <div className="flex flex-col min-w-0">
                                                                                        {team === "BYE" ? (
                                                                                            <span className="text-foreground/20 italic text-xs font-black uppercase">PASO DIRECTO</span>
                                                                                        ) : (
                                                                                            ((team as Player)?.name || "Esperando...").split(/[\/\+]/).map((name, i) => (
                                                                                                <span key={i} className={`font-black uppercase truncate max-w-[150px] transition-all leading-tight ${match.winnerId === (team as Player)?.id ? (match.round === 0 ? "text-celeste text-sm scale-105" : "text-azul-primary text-xs") : "text-foreground/60 text-[9px]"}`}>
                                                                                                    {name.trim()}
                                                                                                </span>
                                                                                            ))
                                                                                        )}
                                                                                    </div>
                                                                                    {team && team !== "BYE" && !match.confirmed && !readOnly && (
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setReplacingPlayer(team as Player);
                                                                                            }}
                                                                                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-azul-primary/10 text-azul-primary opacity-0 group-hover/team:opacity-100 transition-all hover:bg-azul-primary hover:text-white shrink-0 shadow-lg shadow-azul-primary/5"
                                                                                            title="Reemplazar"
                                                                                        >
                                                                                            <RotateCcw className="w-3 h-3" />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                                <div className={`flex items-center bg-muted/40 rounded-2xl border border-border/50 overflow-hidden h-10 ${match.confirmed ? "pointer-events-none opacity-50" : ""}`}>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            const s1 = tIdx === 0 ? Math.max(0, (match.score1 || 0) - 1).toString() : (match.score1 || 0).toString();
                                                                                            const s2 = tIdx === 1 ? Math.max(0, (match.score2 || 0) - 1).toString() : (match.score2 || 0).toString();
                                                                                            handleBracketScore(match.id, s1, s2);
                                                                                        }}
                                                                                        disabled={match.confirmed || team === "BYE" || !team || readOnly}
                                                                                        className="w-8 h-full flex items-center justify-center hover:bg-muted transition-colors text-foreground/60 disabled:opacity-0"
                                                                                    >
                                                                                        <Minus className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                    <input
                                                                                        type="number"
                                                                                        value={tIdx === 0 ? (match.score1 ?? 0) : (match.score2 ?? 0)}
                                                                                        onChange={(e) => handleBracketScore(match.id, tIdx === 0 ? e.target.value : (match.score1?.toString() || ""), tIdx === 1 ? e.target.value : (match.score2?.toString() || ""))}
                                                                                        disabled={match.confirmed || team === "BYE" || !team || readOnly}
                                                                                        className="w-10 h-full bg-transparent text-center font-black text-sm focus:outline-none no-spin-buttons placeholder:text-foreground/10"
                                                                                        placeholder="0"
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            const s1 = tIdx === 0 ? ((match.score1 || 0) + 1).toString() : (match.score1 || 0).toString();
                                                                                            const s2 = tIdx === 1 ? ((match.score2 || 0) + 1).toString() : (match.score2 || 0).toString();
                                                                                            handleBracketScore(match.id, s1, s2);
                                                                                        }}
                                                                                        disabled={match.confirmed || team === "BYE" || !team || readOnly}
                                                                                        className="w-8 h-full flex items-center justify-center hover:bg-muted transition-colors text-foreground/60 disabled:opacity-0"
                                                                                    >
                                                                                        <Plus className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="mt-6">
                                                                        {(() => {
                                                                            const isBye = match.team1 === "BYE" || match.team2 === "BYE";
                                                                            const isPending = !match.confirmed && !isBye && match.team1 && match.team2 && !readOnly;
                                                                            const canEdit = match.confirmed && !isBye && !readOnly;
                                                                            const btnText = match.confirmed ? "FINALIZADO" : isBye ? "PASO DIRECTO" : "CONFIRMAR";

                                                                            return (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        if (isPending) handleBracketConfirm(match.id);
                                                                                        if (canEdit) handleBracketEdit(match.id);
                                                                                    }}
                                                                                    disabled={!isPending && !canEdit}
                                                                                    className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl group/btn flex items-center justify-center ${isPending
                                                                                        ? "bg-azul-primary text-white hover:bg-azul-dark shadow-azul-primary/20"
                                                                                        : canEdit
                                                                                            ? "bg-celeste/10 text-azul-primary hover:bg-celeste hover:text-azul-primary border border-celeste/50"
                                                                                            : "bg-muted/50 text-foreground/20 cursor-not-allowed shadow-none"
                                                                                        }`}
                                                                                >
                                                                                    <span className={canEdit ? "group-hover/btn:hidden" : ""}>{btnText}</span>
                                                                                    {canEdit && <span className="hidden group-hover/btn:flex items-center justify-center gap-3"><Pencil className="w-3.5 h-3.5" /> CORREGIR RESULTADO</span>}
                                                                                </button>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    {match.confirmed && <div className="absolute -right-3 -top-3 bg-azul-primary text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-4 border-background z-20"><Check className="w-4 h-4" /></div>}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-24 rounded-[3rem] border-4 border-dashed border-border/30 bg-muted/20 flex flex-col items-center gap-6">
                        <Circle className="w-12 h-12 text-rojo/20 animate-pulse fill-current" />
                        <div className="space-y-1">
                            <p className="text-sm font-black uppercase italic text-foreground/70">Sincronizando Cuadro...</p>
                            <p className="text-[10px] font-medium text-foreground/20 uppercase tracking-widest">Preparando eliminatorias basadas en el ranking actual</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
