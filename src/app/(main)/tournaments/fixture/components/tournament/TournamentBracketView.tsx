"use client";

import { RefreshCw } from "lucide-react";
import { TournamentMatchCard } from "./TournamentMatchCard";
import { BracketMatch, Player } from "./types";

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
    isIndividual: boolean;
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
    roundLabel,
    isIndividual
}: TournamentBracketViewProps) {
    // Set isSingleBracket strictly to isIndividual to preserve spacious couples columns
    const isSingleBracket = isIndividual;

    return (
        <section className="space-y-8 relative">
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

            <div className="pb-8 -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12 overflow-x-auto custom-scrollbar">
                <div className={`flex items-stretch justify-start min-w-max h-auto px-2 ${isSingleBracket ? "gap-12 md:gap-16" : "gap-32"}`}>
                    {roundsArr.map((round) => {
                        const matchesInRound = bracket.filter(m => m.round === round).sort((a, b) => a.slot - b.slot);
                        const maxRounds = roundsArr.length;
                        const totalRows = Math.pow(2, maxRounds);
                        const rowSpan = Math.pow(2, maxRounds - round - 1) * 2;

                        return (
                            <div key={round} className={`${isSingleBracket ? "w-[320px]" : "w-[450px]"} flex flex-col pt-3`}>
                                <div className="flex-none flex flex-col items-center mb-4">
                                    <span className="px-5 py-2 bg-slate-900 border border-white/10 rounded-xl text-[10px] font-black uppercase italic tracking-[0.2em] text-white shadow-xl">
                                        {roundLabel(round)}
                                    </span>
                                </div>

                                <div className={`flex-1 grid h-full gap-y-2`} style={{ gridTemplateRows: `repeat(${totalRows}, 1fr)` }}>
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
                                                <TournamentMatchCard
                                                    match={m}
                                                    readOnly={readOnly}
                                                    handleBracketScore={handleBracketScore}
                                                    handleBracketConfirm={handleBracketConfirm}
                                                    handleReopenMatch={handleReopenMatch}
                                                    handleSwapPlayers={handleSwapPlayers}
                                                    swappingPlayer={swappingPlayer}
                                                    setBracket={setBracket}
                                                    isIndividual={isSingleBracket}
                                                />
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
