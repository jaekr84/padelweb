"use client";

import { Trophy, Swords } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TournamentHeader } from "./components/tournament/TournamentHeader";
import { TournamentAttendance } from "./components/tournament/TournamentAttendance";
import { TournamentDashboard } from "./components/tournament/TournamentDashboard";
import { TournamentGroupsView } from "./components/tournament/TournamentGroupsView";
import { TournamentBracketView } from "./components/tournament/TournamentBracketView";
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
        bracket, setBracket,
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
        searchQuery, setSearchQuery,
        confirmModal, setConfirmModal,
        allPlayers,
        filteredPlayers,
        isGroupStageFinished,
        progressPercent,
        confirmedGroupMatches,
        totalGroupMatches,
        roundsArr,
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
        handleBracketScore,
        handleBracketConfirm,
        handleSwapPlayers,
        swappingPlayer,
        roundLabel,
        isIndividual,
        bulkUpdateStatus,
        finalQualifiers
    } = useTournamentLogic(props as any);

    return (
        <div className="min-h-screen bg-background pb-10">
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
                <div className="mb-3 text-center">
                    <h1 className="text-lg md:text-xl font-black text-foreground tracking-tight italic uppercase">
                        {tournamentName}
                    </h1>
                    <p className="mt-1 text-[8px] font-black uppercase tracking-[0.25em] text-foreground/30">
                        {readOnly ? 'Fixture' : 'Gestión'} • Round Robin
                    </p>
                </div>

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
                                setStep={setStep}
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

                            <TournamentGroupsView
                                groups={groups}
                                matches={matches}
                                readOnly={readOnly}
                                present={present}
                                togglePresent={togglePresent}
                                paid={paid}
                                togglePaid={togglePaid}
                                handleScoreChange={handleScoreChange}
                                handleConfirmScore={handleConfirmScore}
                                handleReopenMatch={handleReopenMatch}
                                setGroups={setGroups}
                                setMatches={setMatches}
                                computeStandings={computeStandings}
                            />

                            <TournamentQualifiersView finalQualifiers={finalQualifiers} />

                            {(bracket.length > 0 || isGroupStageFinished) && (
                                <div className="relative py-6">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                        <div className="w-full border-t border-border/30"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-background px-6 text-[10px] font-black italic uppercase tracking-[0.3em] text-foreground/20">Play-offs</span>
                                    </div>
                                </div>
                            )}

                            {bracket.length > 0 ? (
                                <TournamentBracketView
                                    bracket={bracket}
                                    roundsArr={roundsArr}
                                    readOnly={readOnly}
                                    handleBracketScore={handleBracketScore}
                                    handleBracketConfirm={handleBracketConfirm}
                                    handleReopenMatch={handleReopenMatch}
                                    handleGenerateBracket={handleGenerateBracket}
                                    handleSwapPlayers={handleSwapPlayers}
                                    swappingPlayer={swappingPlayer}
                                    setBracket={setBracket}
                                    roundLabel={roundLabel}
                                />
                            ) : isGroupStageFinished && !readOnly ? (
                                <div className="py-12 text-center space-y-4">
                                    <div className="w-16 h-16 bg-azul-primary/10 rounded-full flex items-center justify-center mx-auto">
                                        <Trophy className="w-8 h-8 text-azul-primary animate-bounce" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <h3 className="text-xl font-black italic uppercase tracking-tighter text-foreground">Grupos Finalizados</h3>
                                        <p className="text-foreground/40 text-[9px] font-bold uppercase tracking-widest max-w-sm mx-auto">
                                            Todos los partidos confirmados. Genera las llaves de eliminación.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleGenerateBracket}
                                        className="px-8 py-3 bg-azul-primary text-white rounded-xl font-black uppercase italic tracking-[0.15em] shadow-xl shadow-azul-primary/10 hover:scale-105 transition-all flex items-center justify-center gap-2 mx-auto text-xs"
                                    >
                                        <Swords className="w-4 h-4" />
                                        Generar Play-offs
                                    </button>
                                </div>
                            ) : null}
                        </motion.div>
                    )}
                </AnimatePresence>
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
            />
        </div>
    );
}
