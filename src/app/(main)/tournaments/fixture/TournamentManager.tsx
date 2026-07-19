"use client";

import { Trophy, Swords, Plus, Minus, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TournamentHeader } from "./components/tournament/TournamentHeader";
import { TournamentAttendance } from "./components/tournament/TournamentAttendance";
import { TournamentDashboard } from "./components/tournament/TournamentDashboard";
import { TournamentGroupsView } from "./components/tournament/TournamentGroupsView";
import { AmericanoPlayoffQueue } from "./components/americano/AmericanoPlayoffQueue";
import { AmericanoBracketMirror } from "./components/americano/AmericanoBracketMirror";
import { TournamentQualifiersView } from "./components/tournament/TournamentQualifiersView";
import { TournamentModals } from "./components/tournament/TournamentModals";
import { useTournamentLogic } from "./components/tournament/useTournamentLogic";
import { Group, Match, BracketMatch } from "./components/tournament/types";

export interface TournamentManagerProps {
    tournamentId: string;
    tournamentName: string;
    initialGroups: Group[];
    initialMatches: Match[];
    initialBracket: BracketMatch[];
    initialStatus: string;
    initialPresent?: string[];
    initialPaid?: string[];
    initialUpdatedAt?: string;
    readOnly?: boolean;
    isLoggedIn?: boolean;
    modality?: any;
}

export default function TournamentManager(props: TournamentManagerProps) {
    const {
        tournamentId,
        tournamentName,
        initialStatus,
        readOnly = false,
    } = props;

    const {
        step, setStep,
        groups, setGroups,
        matches, setMatches,
        bracket,
        resolvedBracket,
        present, setPresent,
        paid, setPaid,
        isPlayersModalOpen, setIsPlayersModalOpen,
        playerSearchQuery, setPlayerSearchQuery,
        replacingPlayer, setReplacingPlayer,
        playerToDelete, setPlayerToDelete,
        allPotentialPlayers,
        isFetchLoading,
        guestName, setGuestName,
        guestName2, setGuestName2,
        replaceSlot, setReplaceSlot,
        isRefreshing,
        showSuccessModal, setShowSuccessModal,
        saving,
        searchQuery, setSearchQuery,
        confirmModal, setConfirmModal,
        allPlayers,
        filteredPlayers,
        isGroupStageFinished,
        progressPercent,
        confirmedGroupMatches,
        totalGroupMatches,
        handleRefresh,
        togglePresent,
        togglePaid,
        handleReplacePlayer,
        handleReplaceOneInPair,
        handleReplaceWithGuest,
        handleDeletePlayer,
        computeStandings,
        handleScoreChange,
        handleConfirmScore,
        handleReopenMatch,
        handleSimulateResults,
        handleGenerateBracket,
        handleBracketStart,
        handleBracketScore,
        handleBracketConfirm,
        handleSwapPlayers,
        swappingPlayer,
        isIndividual,
        bulkUpdateStatus,
        isEntryPresent,
        isEntryPaid,
        togglePairPresent,
        togglePairPaid,
        groupNextInfo,
        startNextGroupMatch,
        startAllGroupMatches,
        finalQualifiers,
        qualLimit,
        setQualLimit
    } = useTournamentLogic(props as any);

    return (
        <div className="theme-night min-h-screen bg-background text-foreground relative overflow-x-hidden">
            {/* Page Background Watermark */}
            <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden opacity-10">
                <img 
                    src="/img/acap%20logo%20svg.svg" 
                    alt="" 
                    className="w-[1200px] h-[1200px] object-contain rotate-[-10deg]"
                />
            </div>

            <div className="max-w-[1800px] mx-auto space-y-6 relative z-10 pb-10">
                <TournamentHeader
                    tournamentId={tournamentId}
                    tournamentName={tournamentName}
                    step={step}
                    setStep={setStep}
                    initialStatus={initialStatus}
                    readOnly={readOnly}
                    isRefreshing={isRefreshing}
                    handleRefresh={handleRefresh}
                    setIsPlayersModalOpen={setIsPlayersModalOpen}
                />

                <div className="w-full px-3 md:px-6 lg:px-10 py-3 pb-16">
                    <AnimatePresence mode="wait">
                        {step === "setup" && (
                            <motion.div
                                key="setup-stage"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6 pb-10"
                            >
                                <TournamentAttendance
                                    readOnly={readOnly}
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    allPlayers={allPlayers}
                                    present={present}
                                    togglePresent={togglePresent}
                                    paid={paid}
                                    togglePaid={togglePaid}
                                    setPlayerToDelete={setPlayerToDelete}
                                    setReplacingPlayer={setReplacingPlayer}
                                    onContinue={() => setStep("done")}
                                    bulkUpdateStatus={bulkUpdateStatus}
                                />
                            </motion.div>
                        )}

                        {(step === "done" || step === "qual" || step === "elim") && (
                            <motion.div
                                key="tournament-flow"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6 pb-20"
                            >
                                <TournamentDashboard
                                    readOnly={readOnly}
                                    progressPercent={progressPercent}
                                    confirmedGroupMatches={confirmedGroupMatches}
                                    totalGroupMatches={totalGroupMatches}
                                    handleSimulateResults={handleSimulateResults}
                                />

                                {step !== "elim" ? (
                                    <div className="space-y-6">
                                        <TournamentGroupsView
                                            groups={groups}
                                            matches={matches}
                                            readOnly={readOnly}
                                            present={present}
                                            togglePresent={togglePresent}
                                            paid={paid}
                                            togglePaid={togglePaid}
                                            isEntryPresent={isEntryPresent}
                                            isEntryPaid={isEntryPaid}
                                            togglePairPresent={togglePairPresent}
                                            togglePairPaid={togglePairPaid}
                                            groupNextInfo={groupNextInfo}
                                            startNextGroupMatch={startNextGroupMatch}
                                            startAllGroupMatches={startAllGroupMatches}
                                            handleScoreChange={handleScoreChange}
                                            handleConfirmScore={handleConfirmScore}
                                            handleReopenMatch={handleReopenMatch}
                                            setGroups={setGroups}
                                            setMatches={setMatches}
                                            computeStandings={computeStandings}
                                        />

                                        <div className="space-y-4 pt-4 border-t border-border/40">
                                            <div className="flex items-center justify-between px-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-azul-primary animate-pulse" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">Configuración de Clasificados</span>
                                                </div>
                                                <div className="flex items-center gap-3 bg-muted/40 p-1.5 rounded-lg border border-border/40">
                                                    <button
                                                        onClick={() => setQualLimit(Math.max(2, qualLimit - 1))}
                                                        className="w-6 h-6 flex items-center justify-center rounded-md bg-background border border-border/40 text-foreground/60 hover:text-azul-primary hover:border-azul-primary/40 transition-all"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <div className="flex flex-col items-center min-w-[60px]">
                                                        <span className="text-sm font-black text-azul-primary leading-none">{qualLimit}</span>
                                                        <span className="text-[6px] font-black uppercase tracking-tighter text-foreground/30">Jugadores</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setQualLimit(Math.min(finalQualifiers.length, qualLimit + 1))}
                                                        className="w-6 h-6 flex items-center justify-center rounded-md bg-background border border-border/40 text-foreground/60 hover:text-azul-primary hover:border-azul-primary/40 transition-all"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            <TournamentQualifiersView
                                                finalQualifiers={finalQualifiers}
                                                qualLimit={qualLimit}
                                            />

                                            {!readOnly && (
                                                <div className="pt-8 flex flex-col items-center gap-3">
                                                    <button
                                                        onClick={() => isGroupStageFinished && setStep("elim")}
                                                        disabled={!isGroupStageFinished}
                                                        className={`
                                                            group relative px-12 py-4 rounded-2xl font-black uppercase italic tracking-[0.2em] transition-all flex items-center gap-4 text-sm overflow-hidden
                                                            ${isGroupStageFinished 
                                                                ? "bg-azul-primary text-white shadow-2xl shadow-azul-primary/20 hover:scale-105 active:scale-95 cursor-pointer" 
                                                                : "bg-muted text-foreground/20 cursor-not-allowed border border-border/50 grayscale opacity-50"}
                                                        `}
                                                    >
                                                        {isGroupStageFinished && <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
                                                        <span className="relative">Armar Play-offs</span>
                                                        <Trophy className={`w-5 h-5 relative ${isGroupStageFinished ? "animate-bounce" : ""}`} />
                                                    </button>
                                                    {!isGroupStageFinished && (
                                                        <p className="text-[8px] font-bold uppercase tracking-widest text-foreground/30 animate-pulse">
                                                            Pendiente: Completar todos los partidos de grupos
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-2">
                                            <button
                                                onClick={() => setStep("done")}
                                                className="text-[10px] font-black uppercase tracking-widest text-foreground/40 hover:text-azul-primary transition-colors flex items-center gap-2"
                                            >
                                                ← Volver a Grupos
                                            </button>
                                            {!readOnly && (
                                                <button
                                                    onClick={handleGenerateBracket}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-azul-primary/10 text-azul-primary hover:bg-azul-primary hover:text-white transition-all text-[9px] font-black uppercase tracking-widest"
                                                    title="Regenerar llaves desde cero"
                                                >
                                                    <RefreshCw className="w-3 h-3" />
                                                    Regenerar Llaves
                                                </button>
                                            )}
                                        </div>

                                        <AmericanoPlayoffQueue
                                            bracket={resolvedBracket}
                                            readOnly={readOnly}
                                            saving={saving}
                                            handleBracketScore={handleBracketScore}
                                            handleBracketStart={handleBracketStart}
                                            handleBracketConfirm={handleBracketConfirm}
                                            handleBracketEdit={handleReopenMatch}
                                            handleSwapPlayers={handleSwapPlayers}
                                            swappingPlayer={swappingPlayer}
                                            skipReopenConfirm
                                        />

                                        <AmericanoBracketMirror
                                            bracket={resolvedBracket}
                                            readOnly={readOnly}
                                            saving={saving}
                                            handleBracketScore={handleBracketScore}
                                            handleBracketStart={handleBracketStart}
                                            handleBracketConfirm={handleBracketConfirm}
                                            handleBracketEdit={handleReopenMatch}
                                            skipReopenConfirm
                                        />
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <TournamentModals
                confirmModal={confirmModal}
                setConfirmModal={setConfirmModal}
                isPlayersModalOpen={isPlayersModalOpen}
                setIsPlayersModalOpen={setIsPlayersModalOpen}
                playerSearchQuery={playerSearchQuery}
                setPlayerSearchQuery={setPlayerSearchQuery}
                filteredPlayers={filteredPlayers}
                present={present}
                togglePresent={togglePresent}
                paid={paid}
                togglePaid={togglePaid}
                showSuccessModal={showSuccessModal}
                setShowSuccessModal={setShowSuccessModal}
                tournamentName={tournamentName}
                replacingPlayer={replacingPlayer}
                setReplacingPlayer={setReplacingPlayer}
                guestName={guestName}
                setGuestName={setGuestName}
                guestName2={guestName2}
                setGuestName2={setGuestName2}
                replaceSlot={replaceSlot}
                setReplaceSlot={setReplaceSlot}
                handleReplaceWithGuest={handleReplaceWithGuest}
                handleReplaceOneInPair={handleReplaceOneInPair}
                allPotentialPlayers={allPotentialPlayers}
                isFetchLoading={isFetchLoading}
                handleReplacePlayer={handleReplacePlayer}
                playerToDelete={playerToDelete}
                setPlayerToDelete={setPlayerToDelete}
                handleDeletePlayer={handleDeletePlayer}
                isIndividual={isIndividual}
                bulkUpdateStatus={bulkUpdateStatus}
                allPlayers={allPlayers}
            />
        </div>
    );
}
