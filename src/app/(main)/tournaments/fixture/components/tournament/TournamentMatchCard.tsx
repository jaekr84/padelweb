"use client";

import React from "react";
import { Check, Plus, Minus, RotateCcw, Trophy, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BracketMatch, Player, BracketSlot } from "./types";
import Image from "next/image";

interface TournamentMatchCardProps {
    match: BracketMatch;
    readOnly: boolean;
    handleBracketScore: (matchId: string, s1: string, s2: string) => void;
    handleBracketConfirm: (matchId: string) => void;
    handleReopenMatch: (matchId: string) => void;
    handleSwapPlayers: (matchId: string, teamSlot: 1 | 2) => void;
    swappingPlayer: { matchId: string, teamSlot: 1 | 2 } | null;
    setBracket: (bracket: BracketMatch[] | ((prev: BracketMatch[]) => BracketMatch[])) => void;
    isIndividual: boolean;
}

export function TournamentMatchCard({
    match: m,
    readOnly,
    handleBracketScore,
    handleBracketConfirm,
    handleReopenMatch,
    handleSwapPlayers,
    swappingPlayer,
    setBracket,
    isIndividual
}: TournamentMatchCardProps) {
    const isFinished = m.confirmed || m.status === 'finished' || m.status === 'completed';
    const isInProgress = m.status === 'in_progress' && !m.confirmed;

    const renderTeam = (slot: BracketSlot, side: "left" | "right", teamIndex: 1 | 2) => {
        const isWinner = isFinished && m.winnerId === (slot as Player)?.id;
        const isBye = slot === "BYE";
        const isTBD = (slot as any)?.id?.startsWith('TBD_');
        
        let names: string[] = [];
        let images: (string | null)[] = [];
        
        if (!isBye && !isTBD && (slot as Player)?.name) {
            const p = slot as Player;
            names = p.name.split(/[\/\+]/).map(n => n.trim());
            
            // Try to get images. If it's a couple, we might have image1/image2 or just image
            // Fallback to imageUrl for legacy data
            const img1 = p.image || (p as any).imageUrl || (p as any).player1Image || null;
            const img2 = (p as any).partnerImage || (p as any).player2Image || null;
            
            images = [img1];
            if (names.length > 1) images.push(img2); 
        } else {
            const label = isBye ? "DESCANSO" : isTBD ? ((slot as Player).name || "TBD") : "A DEFINIR";
            names = !isIndividual ? [label, label] : [label];
            images = names.map(() => null);
        }

        return (
            <div className={`flex flex-row gap-1 ${side === 'left' ? 'justify-end' : 'justify-start'}`}>
                {names.map((name, i) => (
                    <MiniProfileCard 
                        key={i}
                        name={name}
                        image={images[i]}
                        category={(slot as Player)?.category ?? undefined}
                        ranking={(slot as Player)?.ranking ?? undefined}
                        isWinner={isWinner}
                        side={side}
                        isBye={isBye}
                        isTBD={isTBD}
                        isInProgress={isInProgress}
                        isFinished={isFinished}
                        score={teamIndex === 1 ? m.score1 : m.score2}
                        showScore={i === (side === 'left' ? names.length - 1 : 0)} 
                        onScoreChange={(val) => {
                            if (teamIndex === 1) handleBracketScore(m.id, val, m.score2?.toString() ?? "0");
                            else handleBracketScore(m.id, m.score1?.toString() ?? "0", val);
                        }}
                        onIncrement={() => {
                            if (teamIndex === 1) handleBracketScore(m.id, ((m.score1 || 0) + 1).toString(), m.score2?.toString() ?? "0");
                            else handleBracketScore(m.id, m.score1?.toString() ?? "0", ((m.score2 || 0) + 1).toString());
                        }}
                        onDecrement={() => {
                            if (teamIndex === 1) handleBracketScore(m.id, Math.max(0, (m.score1 || 0) - 1).toString(), m.score2?.toString() ?? "0");
                            else handleBracketScore(m.id, m.score1?.toString() ?? "0", Math.max(0, (m.score2 || 0) - 1).toString());
                        }}
                        onSwap={() => !readOnly && !m.confirmed && handleSwapPlayers(m.id, teamIndex)}
                        isSwapping={swappingPlayer?.matchId === m.id && swappingPlayer?.teamSlot === teamIndex}
                        readOnly={readOnly}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="relative group/match py-6 px-2">
            {/* Live Indicator */}
            <AnimatePresence>
                {isInProgress && (
                    <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-1 left-1/2 -translate-x-1/2 z-40"
                    >
                        <div className="bg-rojo text-white px-3 py-0.5 rounded-full text-[7px] font-black italic shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse tracking-[0.15em] border border-white/10">
                            VIVO
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center gap-3">
                {/* Team 1 (Left) */}
                <div className="flex-1 flex justify-end min-w-0">
                    {renderTeam(m.team1, "left", 1)}
                </div>

                {/* VS Center */}
                <div className="flex flex-col items-center justify-center gap-2 px-1 min-w-[50px]">
                    <div className="relative">
                        <span className="text-2xl font-black italic text-foreground/5 tracking-tighter select-none">VS</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        {!readOnly && m.team1 !== "BYE" && m.team2 !== "BYE" && !m.confirmed && m.status !== 'completed' && m.status !== 'finished' && !isInProgress && (
                            <button
                                onClick={() => setBracket(prev => (Array.isArray(prev) ? prev : []).map(bm => bm.id === m.id ? { ...bm, status: 'in_progress' } : bm))}
                                className="w-10 h-10 rounded-full bg-azul-primary text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all group/start border-2 border-background z-20"
                            >
                                <span className="text-[9px] font-black italic">GO</span>
                            </button>
                        )}

                        {isInProgress && !readOnly && (
                            <button
                                onClick={() => handleBracketConfirm(m.id)}
                                className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all group/fin border-2 border-background z-20"
                            >
                                <Check className="w-5 h-5 stroke-[4]" />
                            </button>
                        )}

                        {isFinished && !readOnly && (
                            <button
                                onClick={() => handleReopenMatch(m.id)}
                                className="p-1.5 rounded-lg bg-muted/30 text-muted-foreground hover:bg-azul-primary/20 hover:text-azul-primary transition-all opacity-0 group-hover/match:opacity-100 border border-border/30"
                            >
                                <RotateCcw className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Team 2 (Right) */}
                <div className="flex-1 flex justify-start min-w-0">
                    {renderTeam(m.team2, "right", 2)}
                </div>
            </div>
        </div>
    );
}

interface MiniProfileCardProps {
    name: string;
    image?: string | null;
    category?: string;
    ranking?: number;
    isWinner: boolean;
    side: "left" | "right";
    isBye: boolean;
    isTBD: boolean;
    isInProgress: boolean;
    isFinished: boolean;
    score: number | undefined;
    showScore: boolean;
    onScoreChange: (val: string) => void;
    onIncrement: () => void;
    onDecrement: () => void;
    onSwap: () => void;
    isSwapping: boolean;
    readOnly: boolean;
}

function MiniProfileCard({
    name,
    image,
    category,
    ranking,
    isWinner,
    side,
    isBye,
    isTBD,
    isInProgress,
    isFinished,
    score,
    showScore,
    onScoreChange,
    onIncrement,
    onDecrement,
    onSwap,
    isSwapping,
    readOnly
}: MiniProfileCardProps) {
    const isGuest = name.toUpperCase().includes("INVITADO");
    
    const theme = {
        bg: isWinner ? "bg-emerald-950/90" : "bg-slate-950/90",
        border: isWinner ? "border-emerald-500/50" : isInProgress ? "border-azul-primary/50" : "border-white/5",
    };

    const cardStyle = {
        clipPath: 'polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)'
    };

    return (
        <div 
            onClick={onSwap}
            className={`
                relative group/card cursor-pointer transition-all duration-300 w-[85px]
                ${isSwapping ? "scale-105 z-20" : "hover:scale-[1.05] hover:z-10"}
            `}
        >
            <div 
                className={`
                    p-[1px] transition-all duration-500
                    ${isSwapping ? "bg-azul-primary" : isWinner ? "bg-emerald-500" : "bg-white/10"}
                    ${isWinner ? "shadow-md shadow-emerald-500/20" : "shadow-md"}
                `}
                style={cardStyle}
            >
                <div 
                    className={`relative h-[125px] overflow-hidden ${theme.bg} flex flex-col`}
                    style={cardStyle}
                >
                    {/* Background Player Image or Logo */}
                    <div className="absolute inset-0 z-0">
                        {image ? (
                            <img 
                                src={image} 
                                alt={name}
                                className="w-full h-full object-cover transition-all duration-500"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center p-4 group-hover/card:opacity-100 transition-opacity">
                                <img 
                                    src="/img/acap%20logo%20svg%20blanco%20sombra.svg" 
                                    alt="ACAP"
                                    className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                                />
                            </div>
                        )}
                    </div>

                    {/* Grid Background */}
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('/grid.svg')] invert bg-[size:10px:10px] z-1" />
                    
                    {/* Category Overlay */}
                    {!isBye && !isTBD && category && (
                        <div className="absolute top-1 right-2 opacity-10 font-black italic text-sm select-none z-10">
                            {category.replace(/[^0-9]/g, '')}
                        </div>
                    )}

                    {/* Guest Badge */}
                    {isGuest && (
                        <div className="absolute top-1.5 left-2 flex items-center gap-1 z-20">
                            <div className="w-1 h-1 rounded-full bg-azul-primary animate-pulse" />
                            <span className="text-[4px] font-black italic text-azul-primary uppercase tracking-[0.1em]">INV</span>
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="mt-auto p-1.5 z-10 space-y-1">
                        {/* Rank Info */}
                        {!isBye && !isTBD && ranking && (
                            <div className="flex items-center gap-1 opacity-40 ml-0.5">
                                <span className="text-[4px] font-black italic uppercase tracking-widest text-white">
                                    RK <span className="text-azul-primary">{ranking}</span>
                                </span>
                            </div>
                        )}

                        {/* Name Plate */}
                        <div className="relative">
                            <div className={`
                                py-1 px-1.5 transform -skew-x-12 relative border-r-2
                                ${isWinner ? "bg-emerald-500 border-white" : "bg-white border-azul-primary"}
                            `}>
                                <div className="transform skew-x-12 text-center">
                                    <span className={`
                                        block text-[7px] font-black uppercase italic leading-none truncate
                                        ${isWinner ? "text-white" : "text-slate-900"}
                                    `}>
                                        {name.replace(/INVITADO/gi, "").trim() || "PLAYER"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Score Ribbon */}
                    {showScore && (
                        <div className={`
                            absolute top-0 ${side === 'left' ? 'left-0' : 'right-0'} w-10 h-10 flex items-center justify-center z-30
                        `}>
                            <div className={`
                                absolute inset-0 ${isWinner ? 'bg-emerald-500' : 'bg-white/10 backdrop-blur-md border border-white/20'}
                                ${side === 'left' ? 'rounded-br-xl' : 'rounded-bl-xl'}
                            `} />
                            
                            <div className="relative">
                                {isInProgress && !readOnly ? (
                                    <div className="flex flex-col items-center -space-y-0.5">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onIncrement(); }}
                                            className="text-white hover:text-emerald-400 p-1"
                                        >
                                            <Plus className="w-3 h-3 stroke-[3]" />
                                        </button>
                                        <span className="text-xs font-black italic leading-none tabular-nums text-white">{score ?? 0}</span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDecrement(); }}
                                            className="text-white hover:text-rojo p-1"
                                        >
                                            <Minus className="w-3 h-3 stroke-[3]" />
                                        </button>
                                    </div>
                                ) : (
                                    <span className={`
                                        text-base font-black italic tabular-nums
                                        ${isWinner ? 'text-white' : 'text-white/60'}
                                    `}>
                                        {score ?? 0}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Winner Badge */}
                    {isWinner && showScore && (
                        <div className={`absolute top-0 ${side === 'left' ? 'right-0' : 'left-0'} p-1 z-40`}>
                             <div className="bg-emerald-500 text-white p-0.5 rounded-full shadow-lg border border-white">
                                <Check className="w-1.5 h-1.5 stroke-[5]" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
