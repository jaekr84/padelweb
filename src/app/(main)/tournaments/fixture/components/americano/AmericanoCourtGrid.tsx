"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, Minus, ChevronUp, ChevronDown, Check, Loader2, X, ArrowLeftRight, CheckCircle2, AlertCircle, Info, Flag, AlertTriangle } from "lucide-react";
import { Match, Player } from "./types";
import PlayerCard from "@/components/PlayerCard";
import { getPlayerProfileData } from "@/app/actions/players";

// ── Swap candidate type ──
type SwapCandidate = {
    player: Player;
    matchCount: number;
    hasPlayedOpponent: boolean;
    sameClub: boolean;
    quality: "ideal" | "ok" | "repeated";
};

interface AmericanoCourtGridProps {
    numCourts: number;
    matches: Match[];
    readOnly?: boolean;
    handleDeleteMatch: (id: string) => void | Promise<any>;
    handleScoreChange: (matchId: string, s1: string, s2: string) => void;
    handleConfirmScore: (matchId: string) => void | Promise<any>;
    generateNextMatch: (courtNum: number) => void | Promise<any>;
    saving: boolean;
    onUpdateCourts?: (newCount: number) => void | Promise<any>;
    isIndividual?: boolean;
    // Swap-team props
    allGroupPlayers?: Player[];
    matchesPerTeam?: number;
    presentIds?: Set<string>;
    onSwapTeam?: (matchId: string, teamSlot: 1 | 2, newPlayer: Player) => Promise<any>;
}

export function AmericanoCourtGrid({
    numCourts,
    matches,
    readOnly,
    handleDeleteMatch,
    handleScoreChange,
    handleConfirmScore,
    generateNextMatch,
    saving,
    onUpdateCourts,
    isIndividual,
    allGroupPlayers = [],
    matchesPerTeam = 2,
    presentIds,
    onSwapTeam
}: AmericanoCourtGridProps) {
    // ── Confirmation modal state (start / finish / cancel match) ──
    const [confirmAction, setConfirmAction] = useState<
        | { type: "start"; courtNum: number }
        | { type: "finish"; match: Match }
        | { type: "cancel"; match: Match }
        | null
    >(null);

    // ── Swap-menu state ──
    const [swapMatchId, setSwapMatchId] = useState<string | null>(null);
    const [swapSlot, setSwapSlot] = useState<1 | 2>(1);
    const [swapSaving, setSwapSaving] = useState(false);
    const swapRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!swapMatchId) return;
        const handler = (e: MouseEvent) => {
            if (swapRef.current && !swapRef.current.contains(e.target as Node)) {
                setSwapMatchId(null);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [swapMatchId]);

    /** Compute eligible swap candidates for a given match + slot */
    const getSwapCandidates = (matchId: string, teamSlot: 1 | 2): SwapCandidate[] => {
        const targetMatch = matches.find(m => m.id === matchId);
        if (!targetMatch || !allGroupPlayers.length) return [];

        const swappedOut = teamSlot === 1 ? targetMatch.team1 : targetMatch.team2;
        const opponent   = teamSlot === 1 ? targetMatch.team2 : targetMatch.team1;

        // Players currently in an unconfirmed match (excluding this one)
        const currentlyPlaying = new Set(
            matches
                .filter(m => !m.confirmed && m.id !== matchId)
                .flatMap(m => [m.team1.id, m.team2.id])
        );

        // Confirmed match counts per player
        const matchCounts = new Map<string, number>();
        allGroupPlayers.forEach(p => matchCounts.set(p.id, 0));
        matches.filter(m => m.confirmed).forEach(m => {
            matchCounts.set(m.team1.id, (matchCounts.get(m.team1.id) ?? 0) + 1);
            matchCounts.set(m.team2.id, (matchCounts.get(m.team2.id) ?? 0) + 1);
        });

        // Who has the opponent already played?
        const opponentPlayed = new Set(
            matches
                .filter(m => m.id !== matchId && (m.team1.id === opponent.id || m.team2.id === opponent.id))
                .map(m => m.team1.id === opponent.id ? m.team2.id : m.team1.id)
        );

        return allGroupPlayers
            .filter(p =>
                p.id !== swappedOut.id &&
                p.id !== opponent.id &&
                (!presentIds || presentIds.has(p.id)) &&
                !currentlyPlaying.has(p.id) &&
                (matchCounts.get(p.id) ?? 0) < matchesPerTeam
            )
            .map(p => {
                const hasPlayedOpponent = opponentPlayed.has(p.id);
                const sameClub = !!(p.clubId && opponent.clubId && p.clubId === opponent.clubId);
                const matchCount = matchCounts.get(p.id) ?? 0;

                let quality: SwapCandidate["quality"] = "ideal";
                if (hasPlayedOpponent) quality = "repeated";
                else if (sameClub) quality = "ok";

                // Sort score (lower = better)
                const score = matchCount + (hasPlayedOpponent ? 20 : 0) + (sameClub ? 5 : 0);
                return { player: p, matchCount, hasPlayedOpponent, sameClub, quality, _score: score } as SwapCandidate & { _score: number };
            })
            .sort((a, b) => (a as any)._score - (b as any)._score);
    };

    const handleSwapClick = async (matchId: string, teamSlot: 1 | 2, candidate: Player) => {
        if (!onSwapTeam) return;
        setSwapSaving(true);
        try {
            await onSwapTeam(matchId, teamSlot, candidate);
            setSwapMatchId(null);
        } finally {
            setSwapSaving(false);
        }
    };
    const [selectedPlayer, setSelectedPlayer] = useState<{
        id: string;
        name: string;
        imageUrl: string | null;
        category?: string | null;
        club?: string | null;
        ranking?: number | null;
    } | null>(null);

    const [loadedProfile, setLoadedProfile] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    const [localSavingCourts, setLocalSavingCourts] = useState<Set<number>>(new Set());
    const [localSavingMatches, setLocalSavingMatches] = useState<Set<string>>(new Set());

    const onConfirmClick = async (matchId: string) => {
        setLocalSavingMatches(prev => {
            const next = new Set(prev);
            next.add(matchId);
            return next;
        });
        try {
            await handleConfirmScore(matchId);
        } finally {
            setLocalSavingMatches(prev => {
                const next = new Set(prev);
                next.delete(matchId);
                return next;
            });
        }
    };

    const onDeleteClick = async (matchId: string) => {
        setLocalSavingMatches(prev => {
            const next = new Set(prev);
            next.add(matchId);
            return next;
        });
        try {
            await handleDeleteMatch(matchId);
        } finally {
            setLocalSavingMatches(prev => {
                const next = new Set(prev);
                next.delete(matchId);
                return next;
            });
        }
    };

    const onGenerateClick = async (courtNum: number) => {
        setLocalSavingCourts(prev => {
            const next = new Set(prev);
            next.add(courtNum);
            return next;
        });
        try {
            await generateNextMatch(courtNum);
        } finally {
            setLocalSavingCourts(prev => {
                const next = new Set(prev);
                next.delete(courtNum);
                return next;
            });
        }
    };

    useEffect(() => {
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

    const renderTeam = (team: Player | null | undefined, side: "left" | "right", isSingleLayout: boolean) => {
        let names: string[] = [];
        let images: (string | null)[] = [];

        if (team && team.name) {
            names = team.name.split(/[\/\+]/).map(n => n.trim());
            const img1 = team.image || (team as any).imageUrl || null;
            const img2 = team.partnerImage || null;

            images = [img1];
            if (names.length > 1) images.push(img2);
        } else {
            const label = "A DEFINIR";
            names = !isSingleLayout ? [label, label] : [label];
            images = names.map(() => null);
        }

        const slotsCount = isSingleLayout ? 1 : 2;
        const slots = Array.from({ length: slotsCount }).map((_, i) => {
            if (team && names[i]) {
                const isSecondPlayer = i === 1;
                const activeId = isSecondPlayer ? (team.partnerUserId || `second_${team.id}`) : (team.userId || team.id);
                return {
                    id: activeId,
                    name: names[i],
                    image: images[i],
                    category: team.category,
                    club: team.club,
                    ranking: team.ranking,
                    partnerImage: team.partnerImage,
                    partnerUserId: team.partnerUserId,
                    userId: team.userId
                } as Player;
            }
            return null;
        });

        return (
            <div className={`flex flex-row gap-1.5 ${side === 'left' ? 'justify-end' : 'justify-start'}`}>
                {slots.map((player, i) => (
                    <FlippableProfileCard
                        key={i}
                        player={player}
                        side={side}
                        isSingleLayout={isSingleLayout}
                        readOnly={readOnly ?? false}
                        onCardClick={(clickedPlayer) => {
                            setSelectedPlayer({
                                id: clickedPlayer.id,
                                name: clickedPlayer.name,
                                imageUrl: clickedPlayer.image || null,
                                category: clickedPlayer.category,
                                club: clickedPlayer.club,
                                ranking: clickedPlayer.ranking
                            });
                        }}
                        playerIndex={i}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: numCourts }).map((_, courtIdx) => {
                const courtNumber = courtIdx + 1;
                const activeMatch = matches.find(m => m.courtNumber === courtNumber && !m.confirmed);

                const isSingleLayout = activeMatch
                    ? (() => {
                          const t1Name = activeMatch.team1?.name || "";
                          const t2Name = activeMatch.team2?.name || "";
                          const hasT1Slash = t1Name.includes("/") || t1Name.includes("+");
                          const hasT2Slash = t2Name.includes("/") || t2Name.includes("+");
                          return !hasT1Slash && !hasT2Slash;
                      })()
                    : (isIndividual ?? false);

                // Unique keys for animating flips when transitions occur
                const team1Key = `t1_wrap_${courtNumber}`;
                const team2Key = `t2_wrap_${courtNumber}`;
                const score1Key = `s1_wrap_${courtNumber}`;
                const score2Key = `s2_wrap_${courtNumber}`;

                const isSwapOpen = swapMatchId === activeMatch?.id;

                return (
                    <div
                        key={courtNumber}
                        className="relative group"
                        ref={isSwapOpen ? swapRef : undefined}
                        style={{ zIndex: isSwapOpen ? 50 : undefined }}
                    >
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

                            <div className={`p-3 flex-1 flex items-center justify-center ${isSingleLayout ? "max-w-[304px] mx-auto w-full" : ""}`}>
                                <div className="flex items-center gap-1.5 justify-center w-full">
                                    {/* Team 1 Score Module */}
                                    <motion.div
                                        key={score1Key}
                                        initial={{ rotateY: 180, opacity: 0 }}
                                        animate={{ rotateY: 0, opacity: 1 }}
                                        transition={{ duration: 0.6, type: "spring", stiffness: 70, damping: 12 }}
                                        style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                                        className="flex-shrink-0"
                                    >
                                        <ScoreControl
                                            score={activeMatch?.score1}
                                            isWinner={false}
                                            isInProgress={!!activeMatch}
                                            readOnly={(readOnly ?? false) || (activeMatch ? localSavingMatches.has(activeMatch.id) : false)}
                                            onIncrement={() => activeMatch && handleScoreChange(activeMatch.id, ((activeMatch.score1 || 0) + 1).toString(), activeMatch.score2?.toString() ?? "0")}
                                            onDecrement={() => activeMatch && handleScoreChange(activeMatch.id, Math.max(0, (activeMatch.score1 || 0) - 1).toString(), activeMatch.score2?.toString() ?? "0")}
                                        />
                                    </motion.div>

                                    {/* Team 1 Profile */}
                                    <motion.div
                                        key={team1Key}
                                        initial={{ rotateY: 180, opacity: 0 }}
                                        animate={{ rotateY: 0, opacity: 1 }}
                                        transition={{ duration: 0.6, type: "spring", stiffness: 70, damping: 12 }}
                                        style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                                        className="flex-shrink-0"
                                    >
                                        {renderTeam(activeMatch?.team1, "left", isSingleLayout)}
                                    </motion.div>

                                    {/* Central Command Hub */}
                                    <div className={`flex flex-col items-center justify-center gap-1 px-1 border-x border-white/5 ${isSingleLayout ? "w-14 flex-none" : "flex-1 min-w-[50px]"}`}>
                                        {activeMatch ? (() => {
                                            const isMatchSaving = localSavingMatches.has(activeMatch.id);
                                            return (
                                                <>
                                                    {!readOnly && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => setConfirmAction({ type: "finish", match: activeMatch })}
                                                            disabled={isMatchSaving}
                                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_15px_rgba(10,185,129,0.4)] border border-white/20 hover:bg-emerald-600 transition-all disabled:opacity-55"
                                                            title="Confirmar Resultado"
                                                        >
                                                            {isMatchSaving ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Check className="w-4 h-4 stroke-[3]" />
                                                            )}
                                                        </motion.button>
                                                    )}

                                                    <span className="text-[9px] font-black italic text-rojo tracking-[0.2em] select-none mt-1">VS</span>
                                                    <span className="text-[6px] font-black italic text-rojo animate-pulse tracking-[0.1em] select-none uppercase">LIVE</span>

                                                    {!readOnly && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => setConfirmAction({ type: "cancel", match: activeMatch })}
                                                            disabled={isMatchSaving}
                                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-rojo/10 text-rojo border border-rojo/20 hover:bg-rojo hover:text-white transition-all active:scale-95 shadow-[0_0_10px_rgba(239,68,68,0.1)] disabled:opacity-55"
                                                            title="Eliminar Partido"
                                                        >
                                                            {isMatchSaving ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </motion.button>
                                                    )}
                                                </>
                                            );
                                        })() : (() => {
                                            const isCourtSaving = localSavingCourts.has(courtNumber);
                                            return (
                                                <>
                                                    {!readOnly && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => setConfirmAction({ type: "start", courtNum: courtNumber })}
                                                            disabled={isCourtSaving}
                                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-azul-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-white/20 hover:bg-azul-dark transition-all disabled:opacity-55"
                                                            title="Generar Partido"
                                                        >
                                                            {isCourtSaving ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Plus className="w-4 h-4 stroke-[3]" />
                                                            )}
                                                        </motion.button>
                                                    )}

                                                    <span className="text-[9px] font-black italic text-foreground/20 tracking-[0.2em] select-none mt-1">VS</span>
                                                    <span className="text-[5px] font-black italic text-foreground/30 tracking-[0.1em] select-none uppercase">LIBRE</span>

                                                    {!readOnly && courtNumber === numCourts && numCourts > 1 && onUpdateCourts && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => onUpdateCourts(numCourts - 1)}
                                                            disabled={isCourtSaving}
                                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-rojo/10 text-rojo border border-rojo/20 hover:bg-rojo hover:text-white transition-all active:scale-95 shadow-[0_0_10px_rgba(239,68,68,0.1)] disabled:opacity-55"
                                                            title="Quitar Cancha"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </motion.button>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {/* Team 2 Profile */}
                                    <motion.div
                                        key={team2Key}
                                        initial={{ rotateY: 180, opacity: 0 }}
                                        animate={{ rotateY: 0, opacity: 1 }}
                                        transition={{ duration: 0.6, type: "spring", stiffness: 70, damping: 12 }}
                                        style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                                        className="flex-shrink-0"
                                    >
                                        {renderTeam(activeMatch?.team2, "right", isSingleLayout)}
                                    </motion.div>

                                    {/* Team 2 Score Module */}
                                    <motion.div
                                        key={score2Key}
                                        initial={{ rotateY: 180, opacity: 0 }}
                                        animate={{ rotateY: 0, opacity: 1 }}
                                        transition={{ duration: 0.6, type: "spring", stiffness: 70, damping: 12 }}
                                        style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                                        className="flex-shrink-0"
                                    >
                                        <ScoreControl
                                            score={activeMatch?.score2}
                                            isWinner={false}
                                            isInProgress={!!activeMatch}
                                            readOnly={(readOnly ?? false) || (activeMatch ? localSavingMatches.has(activeMatch.id) : false)}
                                            onIncrement={() => activeMatch && handleScoreChange(activeMatch.id, activeMatch.score1?.toString() ?? "0", ((activeMatch.score2 || 0) + 1).toString())}
                                            onDecrement={() => activeMatch && handleScoreChange(activeMatch.id, activeMatch.score1?.toString() ?? "0", Math.max(0, (activeMatch.score2 || 0) - 1).toString())}
                                        />
                                    </motion.div>
                                </div>
                            </div>

                            {/* ── Swap toggle button (stays inside card) ── */}
                            {activeMatch && !readOnly && onSwapTeam && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isSwapOpen) {
                                            setSwapMatchId(null);
                                        } else {
                                            setSwapMatchId(activeMatch.id);
                                            setSwapSlot(1);
                                        }
                                    }}
                                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 border-t transition-all cursor-pointer
                                        ${isSwapOpen
                                            ? "border-azul-primary/40 bg-azul-primary/10 text-azul-primary"
                                            : "border-border/10 text-foreground/30 hover:text-azul-primary hover:border-azul-primary/20 hover:bg-azul-primary/5"
                                        }`}
                                >
                                    <ArrowLeftRight className="w-3 h-3" />
                                    <span className="text-[7px] font-black uppercase tracking-[0.2em]">
                                        {isSwapOpen ? "Cerrar" : "Cambiar Pareja"}
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* ── Swap dropdown — floating overlay, outside the card ── */}
                        <AnimatePresence>
                            {isSwapOpen && activeMatch && (() => {
                                const candidates = getSwapCandidates(activeMatch.id, swapSlot);
                                const team1Name = activeMatch.team1?.name ?? "Equipo 1";
                                const team2Name = activeMatch.team2?.name ?? "Equipo 2";

                                return (
                                    <motion.div
                                        key="swap-panel"
                                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                        transition={{ duration: 0.18, ease: "easeOut" }}
                                        className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-lg border border-azul-primary/30 bg-card/98 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
                                    >
                                        <div className="p-3 space-y-2.5">
                                            {/* Header */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-foreground/40">
                                                    Reemplazar pareja
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSwapMatchId(null)}
                                                    className="w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
                                                >
                                                    <X className="w-3 h-3 text-foreground/50" />
                                                </button>
                                            </div>

                                            {/* Slot Tabs */}
                                            <div className="flex gap-1 p-0.5 bg-muted/30 rounded-lg border border-border/30">
                                                {([1, 2] as const).map(slot => {
                                                    const name = slot === 1 ? team1Name : team2Name;
                                                    const label = name.split(/[\/\+]/)[0]?.trim() ?? `Equipo ${slot}`;
                                                    return (
                                                        <button
                                                            key={slot}
                                                            type="button"
                                                            onClick={() => setSwapSlot(slot)}
                                                            className={`flex-1 py-1.5 px-2 rounded-md text-[7px] font-black uppercase tracking-widest transition-all cursor-pointer truncate
                                                                ${swapSlot === slot
                                                                    ? "bg-azul-primary text-white shadow-sm"
                                                                    : "text-foreground/50 hover:text-foreground/80"
                                                                }`}
                                                        >
                                                            {label}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Legend */}
                                            <div className="flex items-center gap-3 px-0.5">
                                                <span className="flex items-center gap-1 text-[6px] font-bold text-foreground/40 uppercase tracking-wider">
                                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Ideal
                                                </span>
                                                <span className="flex items-center gap-1 text-[6px] font-bold text-foreground/40 uppercase tracking-wider">
                                                    <Info className="w-2.5 h-2.5 text-yellow-400" /> Mismo club
                                                </span>
                                                <span className="flex items-center gap-1 text-[6px] font-bold text-foreground/40 uppercase tracking-wider">
                                                    <AlertCircle className="w-2.5 h-2.5 text-orange-400" /> Ya jugaron
                                                </span>
                                            </div>

                                            {/* Candidates list */}
                                            {candidates.length === 0 ? (
                                                <div className="py-3 text-center">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-foreground/30">
                                                        Sin jugadores disponibles
                                                    </p>
                                                    <p className="text-[7px] text-foreground/20 mt-0.5">
                                                        Todos están jugando o completaron sus partidos.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-0.5">
                                                    {candidates.map(({ player: c, matchCount, quality }) => {
                                                        const iconEl = quality === "ideal"
                                                            ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                                            : quality === "ok"
                                                            ? <Info className="w-3 h-3 text-yellow-400 shrink-0" />
                                                            : <AlertCircle className="w-3 h-3 text-orange-400 shrink-0" />;

                                                        const badgeColor = quality === "ideal"
                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                            : quality === "ok"
                                                            ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                                            : "bg-orange-500/10 text-orange-400 border-orange-500/20";

                                                        return (
                                                            <motion.button
                                                                key={c.id}
                                                                type="button"
                                                                whileTap={{ scale: 0.97 }}
                                                                disabled={swapSaving}
                                                                onClick={() => handleSwapClick(activeMatch.id, swapSlot, c)}
                                                                className="w-full flex items-center gap-2 p-2 rounded-lg border border-border/30 bg-card/50 hover:bg-azul-primary/10 hover:border-azul-primary/40 transition-all group/cand cursor-pointer disabled:opacity-50 text-left"
                                                            >
                                                                {swapSaving
                                                                    ? <Loader2 className="w-3 h-3 animate-spin text-azul-primary shrink-0" />
                                                                    : iconEl
                                                                }
                                                                <span className="text-[9px] font-black uppercase italic flex-1 truncate text-foreground group-hover/cand:text-azul-primary transition-colors">
                                                                    {c.name}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    <span className={`text-[6px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded border ${badgeColor}`}>
                                                                        {matchCount}P
                                                                    </span>
                                                                    <ArrowLeftRight className="w-3 h-3 text-foreground/20 group-hover/cand:text-azul-primary transition-colors" />
                                                                </div>
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })()}
                        </AnimatePresence>
                    </div>
                );
            })}

            {!readOnly && onUpdateCourts && (
                <button
                    type="button"
                    onClick={() => onUpdateCourts(numCourts + 1)}
                    disabled={saving}
                    className="rounded-lg border-2 border-dashed border-border/30 hover:border-azul-primary/40 hover:bg-azul-primary/[0.01] transition-all duration-300 flex flex-col items-center justify-center gap-1.5 min-h-[75px] text-center p-2 group cursor-pointer disabled:opacity-50"
                >
                    <Plus className="w-4 h-4 text-azul-primary/60 group-hover:text-azul-primary group-hover:scale-110 transition-all" />
                    <span className="text-[7px] font-black uppercase tracking-widest text-azul-primary/60 group-hover:text-azul-primary transition-all">
                        Agregar Cancha
                    </span>
                </button>
            )}

            {/* Modal de Confirmación: Iniciar / Finalizar / Cancelar Partido */}
            <AnimatePresence>
                {confirmAction && (() => {
                    const config = confirmAction.type === "start"
                        ? {
                            icon: <Plus className="w-6 h-6 stroke-[3]" />,
                            iconBox: "bg-azul-primary/10 border-azul-primary/30 text-azul-primary",
                            title: "Vas a iniciar un partido",
                            description: `Se generará un nuevo partido en la Cancha ${confirmAction.courtNum} con los jugadores disponibles.`,
                            confirmLabel: "Iniciar Partido",
                            confirmClass: "bg-azul-primary hover:bg-azul-dark shadow-azul-primary/20"
                        }
                        : confirmAction.type === "finish"
                        ? {
                            icon: <Flag className="w-6 h-6" />,
                            iconBox: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
                            title: "Vas a finalizar el partido",
                            description: "El resultado quedará confirmado y se sumará a la tabla de posiciones.",
                            confirmLabel: "Finalizar Partido",
                            confirmClass: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                        }
                        : {
                            icon: <AlertTriangle className="w-6 h-6" />,
                            iconBox: "bg-rojo/10 border-rojo/30 text-rojo",
                            title: "Vas a cancelar el partido",
                            description: "El partido se eliminará sin registrar resultado y los jugadores volverán a estar disponibles.",
                            confirmLabel: "Cancelar Partido",
                            confirmClass: "bg-rojo hover:bg-red-600 shadow-rojo/20"
                        };

                    const match = confirmAction.type !== "start" ? confirmAction.match : null;

                    const handleConfirm = () => {
                        const action = confirmAction;
                        setConfirmAction(null);
                        if (action.type === "start") onGenerateClick(action.courtNum);
                        else if (action.type === "finish") onConfirmClick(action.match.id);
                        else onDeleteClick(action.match.id);
                    };

                    return (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setConfirmAction(null)}
                                className="absolute inset-0 bg-black/75 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ scale: 0.92, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.92, opacity: 0, y: 10 }}
                                className="relative w-full max-w-sm bg-card border border-border/40 rounded-2xl p-6 shadow-2xl z-10 flex flex-col items-center text-center gap-4"
                            >
                                <div className={`w-14 h-14 rounded-full border flex items-center justify-center ${config.iconBox}`}>
                                    {config.icon}
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-base font-black uppercase italic tracking-tight text-foreground leading-tight">
                                        {config.title}
                                    </h3>
                                    <p className="text-xs text-foreground/60 leading-relaxed">
                                        {config.description}
                                    </p>
                                </div>

                                {match && (
                                    <div className="w-full bg-muted/20 border border-border/30 rounded-xl px-3 py-2.5 flex items-center justify-center gap-2">
                                        <span className="text-[9px] font-black uppercase italic text-foreground/80 truncate max-w-[35%] text-right">
                                            {match.team1?.name}
                                        </span>
                                        <span className="text-sm font-black italic tabular-nums text-foreground shrink-0">
                                            {match.score1 ?? 0} - {match.score2 ?? 0}
                                        </span>
                                        <span className="text-[9px] font-black uppercase italic text-foreground/80 truncate max-w-[35%] text-left">
                                            {match.team2?.name}
                                        </span>
                                    </div>
                                )}

                                <div className="w-full flex gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmAction(null)}
                                        className="flex-1 py-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 text-foreground/70 font-black uppercase italic text-[10px] tracking-wider transition-all cursor-pointer"
                                    >
                                        Volver
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirm}
                                        className={`flex-1 py-3 rounded-xl text-white font-black uppercase italic text-[10px] tracking-wider transition-all shadow-lg cursor-pointer ${config.confirmClass}`}
                                    >
                                        {config.confirmLabel}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

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
                    text-black
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
    onCardClick: () => void;
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
    onCardClick,
    readOnly
}: MiniProfileCardProps) {
    const isGuest = name.toUpperCase().includes("INVITADO") || name.toUpperCase().includes("(INV)");

    const cardStyle = {
        clipPath: "polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)"
    };

    return (
        <div
            onClick={onCardClick}
            title={isTBD ? undefined : name}
            className="relative group/card cursor-pointer transition-all duration-500 w-[80px] hover:scale-[1.1] hover:z-10"
        >
            {/* Holographic Border Effect */}
            <div
                className={`
                    p-[1px] transition-all duration-700 relative
                    ${isWinner ? "bg-emerald-500 shadow-lg" : "bg-white/20"}
                `}
                style={cardStyle}
            >
                <div
                    className="relative h-[120px] overflow-hidden bg-[#020617] flex flex-col"
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
                                {category.replace(/[^0-9]/g, "") || "5"}
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
                                        {name.replace(/INVITADO/gi, "").replace(/\(INV\)/gi, "").trim() || "PLAYER"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isWinner && isFinished && (
                        <div className="absolute inset-0 pointer-events-none ring-2 ring-emerald-500/50 rounded-xl" />
                    )}
                </div>
            </div>
        </div>
    );
}

interface FlippableProfileCardProps {
    player: Player | null | undefined;
    side: "left" | "right";
    isSingleLayout: boolean;
    readOnly: boolean;
    onCardClick: (player: Player) => void;
    playerIndex: number;
}

function FlippableProfileCard({
    player,
    side,
    isSingleLayout,
    readOnly,
    onCardClick,
    playerIndex
}: FlippableProfileCardProps) {
    const isTBD = !player;
    const rotateY = isTBD ? 0 : 180;
    const [lastPlayer, setLastPlayer] = useState<Player | null>(null);

    useEffect(() => {
        if (player) {
            setLastPlayer(player);
        }
    }, [player]);

    const activePlayer = player || lastPlayer;

    return (
        <div 
            style={{ perspective: 1000 }} 
            className="w-[80px] h-[120px] relative"
        >
            <motion.div
                animate={{ rotateY }}
                transition={{ duration: 0.8, type: "spring", stiffness: 80, damping: 14 }}
                style={{ transformStyle: "preserve-3d" }}
                className="w-full h-full relative"
            >
                {/* Front Face (Placeholder "A DEFINIR") */}
                <div 
                    className="absolute inset-0 w-full h-full"
                    style={{ 
                        backfaceVisibility: "hidden", 
                        WebkitBackfaceVisibility: "hidden",
                        zIndex: isTBD ? 2 : 1
                    }}
                >
                    <MiniProfileCard
                        name="A DEFINIR"
                        image={null}
                        isWinner={false}
                        side={side}
                        isBye={true}
                        isTBD={true}
                        isInProgress={true}
                        isFinished={false}
                        onCardClick={() => {}}
                        readOnly={readOnly}
                    />
                </div>

                {/* Back Face (Actual Player Card) */}
                <div 
                    className="absolute inset-0 w-full h-full"
                    style={{ 
                        backfaceVisibility: "hidden", 
                        WebkitBackfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                        zIndex: isTBD ? 1 : 2
                    }}
                >
                    {activePlayer ? (
                        <MiniProfileCard
                            name={activePlayer.name}
                            image={activePlayer.image || (activePlayer as any).imageUrl}
                            category={activePlayer.category ?? undefined}
                            ranking={activePlayer.ranking ?? undefined}
                            isWinner={false}
                            side={side}
                            isBye={false}
                            isTBD={false}
                            isInProgress={true}
                            isFinished={false}
                            onCardClick={() => onCardClick(activePlayer)}
                            readOnly={readOnly}
                        />
                    ) : (
                        <div className="w-full h-full" />
                    )}
                </div>
            </motion.div>
        </div>
    );
}
