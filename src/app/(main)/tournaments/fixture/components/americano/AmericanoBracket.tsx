"use client";

import { useMemo } from "react";
import { 
    Trophy, Zap, RotateCcw, Circle 
} from "lucide-react";
import { BracketMatch, Player, Standing } from "./types";
import { AmericanoMatchCard } from "./AmericanoMatchCard";

interface AmericanoBracketProps {
    bracket: BracketMatch[];
    setBracket: (b: BracketMatch[]) => void;
    onResetBracket?: () => void;
    readOnly?: boolean;
    setReplacingPlayer: (p: Player) => void;
    handleBracketScore: (matchId: string, s1: string, s2: string) => void;
    handleBracketStart: (matchId: string) => void;
    handleBracketConfirm: (matchId: string) => void;
    handleBracketEdit: (matchId: string) => void;
    standings: Standing[];
    isIndividual?: boolean;
}

export function AmericanoBracket({
    bracket,
    setBracket,
    onResetBracket,
    readOnly,
    setReplacingPlayer,
    handleBracketScore,
    handleBracketStart,
    handleBracketConfirm,
    handleBracketEdit,
    standings,
    isIndividual
}: AmericanoBracketProps) {
    const isSingleBracket = isIndividual ?? (() => {
        return !bracket.some(m => {
            const name1 = m.team1 && typeof m.team1 !== "string" ? m.team1.name : "";
            const name2 = m.team2 && typeof m.team2 !== "string" ? m.team2.name : "";
            return name1.includes("/") || name1.includes("+") || name2.includes("/") || name2.includes("+");
        });
    })();
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 border-t border-hairline pt-12 mt-12">
            <div className="lg:col-span-12 flex flex-col gap-6">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-celeste/10 flex items-center justify-center">
                            <Trophy className="w-4.5 h-4.5 text-celeste" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase italic tracking-tight">Cuadro de Eliminatorias</h3>
                            <p className="text-[6px] font-black uppercase tracking-[0.4em] text-muted-foreground leading-none mt-0.5">Definición de Campeonato • Tiempo Real</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-celeste bg-celeste/5 px-3 py-1.5 rounded border border-celeste/10">
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
                                className={`min-w-max flex items-stretch justify-center ${isSingleBracket ? "gap-12 md:gap-16" : "gap-32"}`}
                            >
                                {rounds.map((round) => {
                                    const matchesInRound = bracket.filter(m => m.round === round).sort((a, b) => a.slot - b.slot);
                                    const rowSpan = Math.pow(2, maxRound - round) * 2;

                                    return (
                                        <div key={round} className={`${isSingleBracket ? "w-[320px]" : "w-[450px]"} flex flex-col pt-6`}>
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
                                                                <AmericanoMatchCard
                                                                    match={match}
                                                                    readOnly={readOnly || false}
                                                                    handleBracketScore={handleBracketScore}
                                                                    handleBracketStart={handleBracketStart}
                                                                    handleBracketConfirm={handleBracketConfirm}
                                                                    handleBracketEdit={handleBracketEdit}
                                                                    setReplacingPlayer={setReplacingPlayer}
                                                                    isIndividual={isSingleBracket}
                                                                />
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
                    <div className="text-center py-16 rounded-3xl border-2 border-dashed border-hairline bg-surface flex flex-col items-center gap-4">
                        <Circle className="w-8 h-8 text-rojo/10 animate-pulse fill-current" />
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase italic text-muted-foreground">Calculando Cuadro de Play-offs...</p>
                            <p className="text-[6px] font-black uppercase tracking-[0.4em] text-subtle">Sincronizando Ranking en Tiempo Real</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
