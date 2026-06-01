"use client";

import React from "react";
import { Flag, ChevronUp, ChevronDown, RotateCcw, Award, User, Zap, Lock, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BracketMatch, Player, BracketSlot } from "./types";
import PlayerCard from "@/components/PlayerCard";
import { getPlayerProfileData } from "@/app/actions/players";

interface TournamentMatchCardProps {
    match: BracketMatch;
    readOnly: boolean;
    handleBracketStart: (matchId: string) => void;
    handleBracketScore: (matchId: string, s1: string, s2: string) => void;
    handleBracketConfirm: (matchId: string) => void;
    handleReopenMatch: (matchId: string) => void;
    handleSwapPlayers: (matchId: string, teamSlot: 1 | 2) => void;
    swappingPlayer: { matchId: string, teamSlot: 1 | 2 } | null;
    isIndividual: boolean;
}

export function TournamentMatchCard({
    match: m,
    readOnly,
    handleBracketStart,
    handleBracketScore,
    handleBracketConfirm,
    handleReopenMatch,
    handleSwapPlayers,
    swappingPlayer,
    isIndividual
}: TournamentMatchCardProps) {
    const [selectedPlayer, setSelectedPlayer] = React.useState<{
        id: string;
        name: string;
        imageUrl: string | null;
        category?: string | null;
        club?: string | null;
        ranking?: number | null;
    } | null>(null);

    const [loadedProfile, setLoadedProfile] = React.useState<any>(null);
    const [loadingProfile, setLoadingProfile] = React.useState(false);

    React.useEffect(() => {
        if (!selectedPlayer) {
            setLoadedProfile(null);
            return;
        }

        const isRealUser = selectedPlayer.id && 
                           !selectedPlayer.id.startsWith("guest_") && 
                           !selectedPlayer.id.startsWith("second_") &&
                           selectedPlayer.id.length > 20;

        if (!isRealUser) {
            setLoadedProfile(null);
            return;
        }

        let isMounted = true;
        const load = async () => {
            setLoadingProfile(true);
            try {
                const data = await getPlayerProfileData(selectedPlayer.id);
                if (isMounted) {
                    setLoadedProfile(data);
                }
            } catch (err) {
                console.error("Error loading player profile", err);
            } finally {
                if (isMounted) setLoadingProfile(false);
            }
        };

        load();
        return () => {
            isMounted = false;
        };
    }, [selectedPlayer]);

    const isFinished = m.confirmed || m.status === 'finished' || m.status === 'completed';
    const isInProgress = m.status === 'in_progress' && !m.confirmed;

    const isTeam1Defined = m.team1 !== null && m.team1 !== undefined && m.team1 !== "BYE" && !(m.team1 as any)?.id?.startsWith('TBD_');
    const isTeam2Defined = m.team2 !== null && m.team2 !== undefined && m.team2 !== "BYE" && !(m.team2 as any)?.id?.startsWith('TBD_');
    const canStartMatch = isTeam1Defined && isTeam2Defined;

    // Detect if this is single player mode (individual)
    const isSingleLayout = isIndividual || (() => {
        const t1Name = m.team1 && typeof m.team1 !== "string" ? (m.team1 as Player).name : "";
        const t2Name = m.team2 && typeof m.team2 !== "string" ? (m.team2 as Player).name : "";
        
        const hasT1Slash = t1Name && (t1Name.includes("/") || t1Name.includes("+"));
        const hasT2Slash = t2Name && (t2Name.includes("/") || t2Name.includes("+"));
        
        if (t1Name && t2Name) {
            return !hasT1Slash && !hasT2Slash;
        }
        if (t1Name) return !hasT1Slash;
        if (t2Name) return !hasT2Slash;
        
        return false;
    })();

    const renderTeam = (slot: BracketSlot, side: "left" | "right", teamIndex: 1 | 2) => {
        const isWinner = isFinished && m.winnerId === (slot as Player)?.id;
        const isBye = slot === "BYE";
        const isTBD = (slot as any)?.id?.startsWith('TBD_');

        let names: string[] = [];
        let images: (string | null)[] = [];

        if (!isBye && !isTBD && (slot as Player)?.name) {
            const p = slot as Player;
            names = p.name.split(/[\/\+]/).map(n => n.trim());

            const img1 = p.image || (p as any).imageUrl || (p as any).player1Image || null;
            const img2 = (p as any).partnerImage || (p as any).player2Image || null;

            images = [img1];
            if (names.length > 1) images.push(img2);
        } else {
            const label = isBye ? "DESCANSO" : isTBD ? ((slot as Player).name || "TBD") : "A DEFINIR";
            names = !isSingleLayout ? [label, label] : [label];
            images = names.map(() => null);
        }

        return (
            <div className={`flex flex-row gap-2 ${side === 'left' ? 'justify-end' : 'justify-start'}`}>
                {names.map((name, i) => {
                    const handleClick = () => {
                        if (isBye || isTBD) return;
                        const p = slot as Player;
                        const isSecondPlayer = i === 1;
                        const activeId = isSecondPlayer ? (p.partnerUserId || `second_${p.id}`) : (p.userId || p.id);
                        setSelectedPlayer({
                            id: activeId,
                            name: name,
                            imageUrl: images[i],
                            category: p.category,
                            club: p.club,
                            ranking: p.ranking
                        });
                    };

                    return (
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
                            onSwap={() => !readOnly && !m.confirmed && handleSwapPlayers(m.id, teamIndex)}
                            onCardClick={handleClick}
                            isSwapping={swappingPlayer?.matchId === m.id && swappingPlayer?.teamSlot === teamIndex}
                            readOnly={readOnly}
                        />
                    );
                })}
            </div>
        );
    };

    return (
        <div className={`relative group/match px-1 ${isSingleLayout ? "max-w-[304px] mx-auto w-full" : ""}`}>
            <div className={`flex items-center gap-0.5 transition-all ${isSingleLayout ? "justify-center" : ""}`}>

                {/* Team 1 Score Module */}
                <div className="flex-shrink-0">
                    <ScoreControl
                        score={m.score1}
                        isWinner={isFinished && m.winnerId === (m.team1 as Player)?.id}
                        isInProgress={isInProgress}
                        readOnly={readOnly}
                        onIncrement={() => handleBracketScore(m.id, ((m.score1 || 0) + 1).toString(), m.score2?.toString() ?? "0")}
                        onDecrement={() => handleBracketScore(m.id, Math.max(0, (m.score1 || 0) - 1).toString(), m.score2?.toString() ?? "0")}
                    />
                </div>

                {/* Team 1 Profile */}
                <motion.div
                    initial={false}
                    animate={{ opacity: isFinished && m.winnerId !== (m.team1 as Player)?.id ? 0.4 : 1 }}
                    className="flex-shrink-0"
                >
                    {renderTeam(m.team1, "left", 1)}
                </motion.div>

                {/* Central Command Hub */}
                <div className={`flex flex-col items-center justify-center gap-1 px-1 border-x border-white/5 ${isSingleLayout ? "w-14 flex-none" : "flex-1 min-w-[40px]"}`}>
                    {!readOnly && (
                        <>
                            {/* START MATCH: Not started yet */}
                             {!isInProgress && !isFinished && m.team1 !== "BYE" && m.team2 !== "BYE" && (
                                 <>
                                     {canStartMatch ? (
                                         <motion.button
                                             whileHover={{ scale: 1.1 }}
                                             whileTap={{ scale: 0.9 }}
                                             onClick={() => handleBracketStart(m.id)}
                                             className="w-10 h-10 flex items-center justify-center rounded-full bg-azul-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-white/20 hover:bg-azul-dark transition-all"
                                             title="Iniciar Partido"
                                         >
                                             <Zap className="w-5 h-5 fill-current animate-pulse" />
                                         </motion.button>
                                     ) : (
                                         <div
                                             className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/40 text-slate-500 border border-white/5 cursor-not-allowed"
                                             title="Esperando que se definan los participantes de los partidos anteriores"
                                         >
                                             <Lock className="w-4 h-4 stroke-[1.5]" />
                                         </div>
                                     )}
                                 </>
                             )}

                            {/* FINISH MATCH: In progress */}
                            {isInProgress && (
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleBracketConfirm(m.id)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_20px_rgba(10,185,129,0.4)] border border-white/20 hover:bg-emerald-600 transition-all"
                                    title="Finalizar Partido"
                                >
                                    <Flag className="w-5 h-5 stroke-[2.5]" />
                                </motion.button>
                            )}

                            {/* REOPEN MATCH: Already finished */}
                            {isFinished && (
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: -45 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleReopenMatch(m.id)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-rojo text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-white/20 hover:bg-red-700 transition-all"
                                    title="Re-abrir Partido"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </motion.button>
                            )}
                        </>
                    )}

                    <span className="text-[10px] font-black italic text-rojo tracking-[0.2em] select-none mt-1">VS</span>

                    {isInProgress && (
                        <span className="text-[7px] font-black italic text-rojo animate-pulse tracking-[0.1em] select-none uppercase">LIVE</span>
                    )}
                </div>

                {/* Team 2 Profile */}
                <motion.div
                    initial={false}
                    animate={{ opacity: isFinished && m.winnerId !== (m.team2 as Player)?.id ? 0.4 : 1 }}
                    className="flex-shrink-0"
                >
                    {renderTeam(m.team2, "right", 2)}
                </motion.div>

                {/* Team 2 Score Module */}
                <div className="flex-shrink-0">
                    <ScoreControl
                        score={m.score2}
                        isWinner={isFinished && m.winnerId === (m.team2 as Player)?.id}
                        isInProgress={isInProgress}
                        readOnly={readOnly}
                        onIncrement={() => handleBracketScore(m.id, m.score1?.toString() ?? "0", ((m.score2 || 0) + 1).toString())}
                        onDecrement={() => handleBracketScore(m.id, m.score1?.toString() ?? "0", Math.max(0, (m.score2 || 0) - 1).toString())}
                    />
                </div>
            </div>

            {/* Modal de Ficha Completa del Jugador */}
            <AnimatePresence>
                {selectedPlayer && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedPlayer(null)}
                            className="absolute inset-0 bg-black/75 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-sm bg-slate-950 border border-white/10 rounded-2xl p-6 overflow-hidden flex flex-col items-center justify-center shadow-2xl z-10"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedPlayer(null)}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-105 active:scale-95 transition-all z-50 text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Ficha Title */}
                            <div className="text-center mb-4 shrink-0 z-10 mt-2">
                                <span className="text-[9px] font-black text-celeste uppercase tracking-[0.3em]">Coleccionable Oficial</span>
                                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter mt-1">{selectedPlayer.name}</h2>
                            </div>

                            {/* Card Display Area */}
                            <div className="w-full flex justify-center py-2 relative z-10">
                                {loadingProfile ? (
                                    <div className="h-[420px] w-[280px] flex flex-col items-center justify-center bg-slate-900 border border-white/5 rounded-2xl relative shadow-inner">
                                        <Loader2 className="w-8 h-8 text-azul-primary animate-spin" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-4 animate-pulse">Cargando Ficha...</span>
                                    </div>
                                ) : (
                                    <div className="scale-[0.82] sm:scale-90 origin-center">
                                        <PlayerCard
                                            player={
                                                loadedProfile?.player || {
                                                    firstName: selectedPlayer.name.split(" ")[0] || "Jugador",
                                                    lastName: selectedPlayer.name.split(" ").slice(1).join(" ") || "",
                                                    imageUrl: selectedPlayer.imageUrl,
                                                    category: selectedPlayer.category || "5TA",
                                                    side: "ambos",
                                                    points: selectedPlayer.ranking ? selectedPlayer.ranking * 100 : 1200,
                                                    clubName: selectedPlayer.club || "Socio Independiente",
                                                    gender: "masculino"
                                                }
                                            }
                                            stats={
                                                loadedProfile?.stats || {
                                                    pj: 0,
                                                    pg: 0,
                                                    pp: 0,
                                                    wr: 0,
                                                    trofeos: 0
                                                }
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ScoreControl({
    score,
    isWinner,
    isInProgress,
    readOnly,
    onIncrement,
    onDecrement
}: {
    score: number | undefined;
    isWinner: boolean;
    isInProgress: boolean;
    readOnly: boolean;
    onIncrement: () => void;
    onDecrement: () => void;
}) {
    return (
        <div className="flex flex-col items-center gap-1 min-w-[44px]">
            {/* Increment Button */}
            {isInProgress && !readOnly ? (
                <button
                    onClick={onIncrement}
                    className="w-9 h-7 flex items-center justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white transition-all border border-emerald-500/20 shadow-lg group/plus"
                >
                    <ChevronUp className="w-4 h-4 stroke-[3] group-hover/plus:scale-125 transition-transform" />
                </button>
            ) : <div className="h-7" />}

            {/* Score Display */}
            <motion.div
                key={score}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`
                    w-10 h-10 flex items-center justify-center rounded-lg transition-all relative overflow-hidden border-2
                    ${isWinner
                        ? 'bg-emerald-500 border-white/40 shadow-lg'
                        : 'bg-white/5 border-white/5 shadow-inner'}
                `}
            >
                <span className={`
                    text-xl font-black italic tabular-nums tracking-tighter relative z-10
                    ${isWinner ? 'text-black' : score && score > 0 ? 'text-black' : 'text-black'}
                `}>
                    {score ?? 0}
                </span>
            </motion.div>

            {/* Decrement Button */}
            {isInProgress && !readOnly ? (
                <button
                    onClick={onDecrement}
                    className="w-9 h-7 flex items-center justify-center rounded-lg bg-rojo/10 hover:bg-rojo text-rojo hover:text-white transition-all border border-rojo/20 shadow-lg group/minus"
                >
                    <ChevronDown className="w-4 h-4 stroke-[3] group-hover/minus:scale-125 transition-transform" />
                </button>
            ) : <div className="h-7" />}
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
    onSwap: () => void;
    onCardClick: () => void;
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
    onSwap,
    onCardClick,
    isSwapping,
    readOnly
}: MiniProfileCardProps) {
    const isGuest = name.toUpperCase().includes("INVITADO");

    const cardStyle = {
        clipPath: 'polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)'
    };

    return (
        <div
            onClick={onCardClick}
            className={`
                relative group/card cursor-pointer transition-all duration-500 w-[80px]
                ${isSwapping ? "scale-110 z-20" : "hover:scale-[1.1] hover:z-10"}
            `}
        >
            {/* Floating Swap Button */}
            {!readOnly && !isFinished && !isBye && !isTBD && (
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Evita que se abra el modal al intercambiar
                        onSwap();
                    }}
                    className={`
                        absolute -top-1.5 -left-1.5 z-30 w-7 h-7 flex items-center justify-center rounded-full
                        border transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.6)]
                        ${isSwapping 
                            ? "bg-azul-primary text-white border-white/40 scale-110 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.6)]" 
                            : "bg-slate-900 text-slate-300 border-white/10 hover:bg-azul-primary hover:text-white hover:border-white/20 hover:scale-105 active:scale-95"}
                    `}
                    title="Intercambiar Jugador"
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8v12M17 20l-4-4M17 20l4-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            )}
            {/* Holographic Border Effect */}
            <div
                className={`
                    p-[1px] transition-all duration-700 relative
                    ${isSwapping ? "bg-azul-primary shadow-lg" : isWinner ? "bg-emerald-500 shadow-lg" : "bg-white/20"}
                `}
                style={cardStyle}
            >
                <div
                    className={`relative h-[120px] overflow-hidden bg-[#020617] flex flex-col`}
                    style={cardStyle}
                >
                    {/* Background Player Image */}
                    <div className="absolute inset-0 z-0">
                        {image ? (
                            <img
                                src={image}
                                alt={name}
                                className="w-full h-full object-cover transition-all duration-700 group-hover/card:scale-110"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center p-5 bg-[#0f172a]">
                                <img
                                    src="/img/acap%20logo%20svg%20blanco%20sombra.svg"
                                    alt="ACAP"
                                    className="w-full h-full object-contain filter drop-shadow-xl opacity-20"
                                />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-[#020617]/20 group-hover/card:bg-transparent transition-colors duration-500" />
                    </div>

                    {/* HUD Elements */}
                    {!isBye && !isTBD && category && (
                        <div className="absolute top-2 right-2 flex flex-col items-end opacity-40 group-hover/card:opacity-100 transition-opacity z-10">
                            <span className="text-[6px] font-black uppercase tracking-[0.2em] text-white">CAT</span>
                            <span className="text-sm font-black italic text-white leading-none">
                                {category.replace(/[^0-9]/g, '') || '5'}
                            </span>
                        </div>
                    )}

                    {/* Guest Badge */}
                    {isGuest && (
                        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-1.5 py-0.5 bg-azul-primary border border-white/20 rounded-sm">
                            <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                            <span className="text-[5px] font-black italic text-white uppercase tracking-[0.1em]">GUEST</span>
                        </div>
                    )}

                    {/* Bottom Info Module */}
                    <div className="mt-auto p-1 z-10 space-y-0.5 bg-[#020617]">
                        {!isBye && !isTBD && ranking && (
                            <div className="flex items-center gap-1 px-1 py-0.5 bg-[#1e293b] rounded-sm border border-white/5 w-fit">
                                <span className="text-[5px] font-black italic uppercase text-white/60 tracking-widest">
                                    RANK <span className="text-azul-primary">#{ranking}</span>
                                </span>
                            </div>
                        )}

                        {/* Name Plate */}
                        <div className="relative">
                            <div className={`
                                py-1 px-2 transform -skew-x-12 relative border-r-2
                                ${isWinner ? "bg-emerald-500 border-white shadow-lg" : "bg-white border-azul-primary shadow-lg"}
                            `}>
                                <div className="transform skew-x-12 text-center">
                                    <span className={`
                                        block text-[8px] font-black uppercase italic leading-none truncate
                                        ${isWinner ? "text-white" : "text-slate-950"}
                                    `}>
                                        {name.replace(/INVITADO/gi, "").trim() || "PLAYER"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Winner Badge Removed to preserve HUD aesthetic */}
                    {isWinner && isFinished && (
                        <div className="absolute inset-0 pointer-events-none ring-2 ring-emerald-500/50 rounded-xl" />
                    )}
                </div>
            </div>
        </div>
    );
}
