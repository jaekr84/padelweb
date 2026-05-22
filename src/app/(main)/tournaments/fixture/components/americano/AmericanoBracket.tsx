"use client";

import { useMemo } from "react";
import { 
    Trophy, Zap, RotateCcw, Minus, Plus, Pencil, Check, Circle 
} from "lucide-react";
import { BracketMatch, Player, Standing } from "./types";

interface AmericanoBracketProps {
    bracket: BracketMatch[];
    setBracket: (b: BracketMatch[]) => void;
    onResetBracket?: () => void;
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
    onResetBracket,
    readOnly,
    setReplacingPlayer,
    handleBracketScore,
    handleBracketConfirm,
    handleBracketEdit,
    standings
}: AmericanoBracketProps) {
    const maxRound = useMemo(() => {
        if (!bracket || bracket.length === 0) return 0;
        return Math.max(...bracket.map(m => m.round), 0);
    }, [bracket]);

    const rounds = useMemo(() => {
        return Array.from({ length: maxRound + 1 }, (_, i) => maxRound - i);
    }, [maxRound]);

    const totalGridRows = useMemo(() => {
        return Math.pow(2, maxRound) * 2;
    }, [maxRound]);

    const heightStyle = useMemo(() => {
        const heights: Record<number, string> = {
            0: "250px",
            1: "450px",
            2: "800px",
            3: "1400px",
            4: "2800px",
            5: "5600px",
        };
        const heightVal = heights[maxRound] || `${Math.pow(2, maxRound) * 175}px`;
        return { height: heightVal };
    }, [maxRound]);

    const getRoundTitle = (roundNum: number) => {
        switch (roundNum) {
            case 0: return "🏆 FINAL";
            case 1: return "SEMIFINALES";
            case 2: return "CUARTOS";
            case 3: return "OCTAVOS";
            case 4: return "16AVOS";
            case 5: return "32AVOS";
            default: return `RONDA DE ${Math.pow(2, roundNum + 1)}`;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 border-t border-border/40 pt-12 mt-12">
            <div className="lg:col-span-12 flex flex-col gap-6">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-azul-primary/10 flex items-center justify-center">
                            <Trophy className="w-4.5 h-4.5 text-azul-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase italic tracking-tight">Cuadro de Eliminatorias</h3>
                            <p className="text-[6px] font-black uppercase tracking-[0.4em] text-foreground/40 leading-none mt-0.5">Definición de Campeonato • Tiempo Real</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-azul-primary bg-azul-primary/5 px-3 py-1.5 rounded border border-azul-primary/10">
                            <Zap className="w-3 h-3 animate-pulse" />
                            Bracket Dinámico
                        </div>
                        {bracket.length > 0 && !readOnly && (
                            <button
                                onClick={() => {
                                    if (confirm("¿Borrar y reiniciar cuadro?")) {
                                        if (onResetBracket) {
                                            onResetBracket();
                                        } else {
                                            setBracket([]);
                                        }
                                    }
                                }}
                                className="p-1.5 rounded bg-rojo/5 text-rojo hover:bg-rojo hover:text-white transition-all"
                                title="Reiniciar Cuadro"
                            >
                                <RotateCcw className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                {bracket.length > 0 ? (
                    <div className="relative">
                        <div className="w-full relative overflow-x-auto pb-12 no-scrollbar px-1">
                            <div 
                                style={heightStyle}
                                className="min-w-max flex gap-8 items-stretch justify-center"
                            >
                                {rounds.map((round) => {
                                    const matchesInRound = bracket.filter(m => m.round === round).sort((a, b) => a.slot - b.slot);
                                    const rowSpan = Math.pow(2, maxRound - round) * 2;

                                    return (
                                        <div key={round} className="w-[240px] flex flex-col pt-6">
                                            <div className="flex-none flex flex-col items-center gap-2 mb-6">
                                                <span className="px-4 py-1 bg-foreground text-background rounded text-[8px] font-black uppercase tracking-[0.2em] italic">
                                                    {getRoundTitle(round)}
                                                </span>
                                            </div>

                                            <div 
                                                className="flex-1 grid gap-y-4 h-full"
                                                style={{ gridTemplateRows: `repeat(${totalGridRows}, minmax(0, 1fr))` }}
                                            >
                                                {Array.from({ length: totalGridRows / rowSpan }).map((_, slotIdx) => {
                                                    const match = matchesInRound.find(m => m.slot === slotIdx);

                                                    return (
                                                        <div
                                                            key={slotIdx}
                                                            style={{
                                                                gridRowStart: slotIdx * rowSpan + 1,
                                                                gridRowEnd: `span ${rowSpan}`
                                                            }}
                                                            className="flex flex-col justify-center px-1"
                                                        >
                                                            {match ? (
                                                                <div className={`backdrop-blur-xl border rounded-xl p-3 transition-all duration-300 relative group shadow-sm ${match.confirmed ? (match.round === 0 ? "border-celeste bg-celeste/5 shadow-[0_0_30px_rgba(34,211,238,0.2)]" : "border-azul-primary/20 bg-card/40") : "border-border/30 bg-card/40 hover:border-azul-primary/20"}`}>
                                                                    <div className="space-y-4">
                                                                        {match.round === 0 && match.confirmed && (
                                                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-celeste text-azul-primary p-1.5 rounded-full shadow-sm z-30">
                                                                                <Trophy className="w-3 h-3" />
                                                                            </div>
                                                                        )}
                                                                        {[match.team1, match.team2].map((team, tIdx) => (
                                                                            <div key={tIdx} className="flex items-center justify-between gap-2 group/team">
                                                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                                                    <div className="flex flex-col min-w-0">
                                                                                        {team === "BYE" ? (
                                                                                            <span className="text-foreground/10 italic text-[8px] font-black uppercase">BYE</span>
                                                                                        ) : (
                                                                                            ((team as Player)?.name || "Pending...").split(/[\/\+]/).map((name, i) => (
                                                                                                <span key={i} className={`font-black uppercase truncate max-w-[120px] transition-all leading-tight ${match.winnerId === (team as Player)?.id ? (match.round === 0 ? "text-celeste text-[9px]" : "text-azul-primary text-[8px]") : "text-foreground/50 text-[7px]"}`}>
                                                                                                    {name.trim()}
                                                                                                </span>
                                                                                            ))
                                                                                        )}
                                                                                    </div>
                                                                                    {team && team !== "BYE" && !match.confirmed && !readOnly && (
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); setReplacingPlayer(team as Player); }}
                                                                                            className="w-5 h-5 rounded flex items-center justify-center bg-azul-primary/5 text-azul-primary opacity-0 group-hover/team:opacity-100 transition-all hover:bg-azul-primary hover:text-white shrink-0 active:scale-90"
                                                                                        >
                                                                                            <RotateCcw className="w-2.5 h-2.5" />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                                <div className={`flex items-center bg-muted/20 rounded border border-border/30 overflow-hidden h-7 ${match.confirmed ? "pointer-events-none opacity-40" : ""}`}>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            const s1 = tIdx === 0 ? Math.max(0, (match.score1 || 0) - 1).toString() : (match.score1 || 0).toString();
                                                                                            const s2 = tIdx === 1 ? Math.max(0, (match.score2 || 0) - 1).toString() : (match.score2 || 0).toString();
                                                                                            handleBracketScore(match.id, s1, s2);
                                                                                        }}
                                                                                        disabled={match.confirmed || team === "BYE" || !team || readOnly}
                                                                                        className="w-6 h-full flex items-center justify-center hover:bg-muted transition-colors text-foreground/40 disabled:opacity-0"
                                                                                    >
                                                                                        <Minus className="w-2.5 h-2.5" />
                                                                                    </button>
                                                                                    <input
                                                                                        type="number"
                                                                                        value={tIdx === 0 ? (match.score1 ?? 0) : (match.score2 ?? 0)}
                                                                                        onChange={(e) => handleBracketScore(match.id, tIdx === 0 ? e.target.value : (match.score1?.toString() || ""), tIdx === 1 ? e.target.value : (match.score2?.toString() || ""))}
                                                                                        disabled={match.confirmed || team === "BYE" || !team || readOnly}
                                                                                        className="w-7 h-full bg-transparent text-center font-black text-[9px] focus:outline-none no-spin-buttons"
                                                                                        placeholder="0"
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            const s1 = tIdx === 0 ? ((match.score1 || 0) + 1).toString() : (match.score1 || 0).toString();
                                                                                            const s2 = tIdx === 1 ? ((match.score2 || 0) + 1).toString() : (match.score2 || 0).toString();
                                                                                            handleBracketScore(match.id, s1, s2);
                                                                                        }}
                                                                                        disabled={match.confirmed || team === "BYE" || !team || readOnly}
                                                                                        className="w-6 h-full flex items-center justify-center hover:bg-muted transition-colors text-foreground/40 disabled:opacity-0"
                                                                                    >
                                                                                        <Plus className="w-2.5 h-2.5" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="mt-4">
                                                                        {(() => {
                                                                            const isBye = match.team1 === "BYE" || match.team2 === "BYE";
                                                                            const isPending = !match.confirmed && !isBye && match.team1 && match.team2 && !readOnly;
                                                                            const canEdit = match.confirmed && !isBye && !readOnly;
                                                                            const btnText = match.confirmed ? "FINALIZADO" : isBye ? "BYE" : "CONFIRMAR";

                                                                            return (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        if (isPending) handleBracketConfirm(match.id);
                                                                                        if (canEdit) handleBracketEdit(match.id);
                                                                                    }}
                                                                                    disabled={!isPending && !canEdit}
                                                                                    className={`w-full py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all group/btn flex items-center justify-center ${isPending
                                                                                        ? "bg-azul-primary text-white hover:bg-azul-dark shadow-sm"
                                                                                        : canEdit
                                                                                            ? "bg-celeste/5 text-azul-primary hover:bg-celeste/10 border border-celeste/20"
                                                                                            : "bg-muted/40 text-foreground/10 cursor-not-allowed"
                                                                                        }`}
                                                                                >
                                                                                    <span className={canEdit ? "group-hover/btn:hidden" : ""}>{btnText}</span>
                                                                                    {canEdit && <span className="hidden group-hover/btn:flex items-center justify-center gap-2"><Pencil className="w-3 h-3" /> EDITAR</span>}
                                                                                </button>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    {match.confirmed && <div className="absolute -right-2 -top-2 bg-azul-primary text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm border-2 border-background z-20"><Check className="w-3 h-3" /></div>}
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
                    <div className="text-center py-16 rounded-3xl border-2 border-dashed border-border/20 bg-muted/5 flex flex-col items-center gap-4">
                        <Circle className="w-8 h-8 text-rojo/10 animate-pulse fill-current" />
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase italic text-foreground/50">Calculando Cuadro de Play-offs...</p>
                            <p className="text-[6px] font-black uppercase tracking-[0.4em] text-foreground/10">Sincronizando Ranking en Tiempo Real</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
