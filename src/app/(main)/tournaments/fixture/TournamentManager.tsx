"use client";

import { Trophy, Swords } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TournamentHeader } from "./components/tournament/TournamentHeader";
import { TournamentAttendance } from "./components/tournament/TournamentAttendance";
import { TournamentDashboard } from "./components/tournament/TournamentDashboard";
import { TournamentGroupsView } from "./components/tournament/TournamentGroupsView";
import { TournamentBracketView } from "./components/tournament/TournamentBracketView";
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
        roundLabel,
        isIndividual
    } = useTournamentLogic(props as any);

    return (
        <div className="min-h-screen bg-background pb-20">
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

            <div className="w-full px-4 md:px-6 lg:px-8 py-4 pb-24">
                <div className="mb-4 text-center">
                    <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight italic uppercase">
                        {tournamentName}
                    </h1>
                    <p className="mt-2 text-[9px] font-black uppercase tracking-[0.3em] text-foreground/40">
                        {readOnly ? 'Fixture' : 'Gestión'} de Torneo Round Robin
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {step === "setup" && (
                        <motion.div
                            key="setup-stage"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-12 pb-20"
                        >
                            <TournamentAttendance
                                readOnly={readOnly}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                allPlayers={allPlayers}
                                present={present}
                                setPresent={setPresent}
                                paid={paid}
                                setPaid={setPaid}
                                setPlayerToDelete={setPlayerToDelete}
                                setReplacingPlayer={setReplacingPlayer}
                                setStep={setStep}
                            />
                        </motion.div>
                    )}

                    {(step === "done" || step === "qual" || step === "elim") && (
                        <motion.div
                            key="tournament-flow"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-10 pb-40"
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
                                handleScoreChange={handleScoreChange}
                                handleConfirmScore={handleConfirmScore}
                                handleReopenMatch={handleReopenMatch}
                                setGroups={setGroups}
                                setMatches={setMatches}
                                computeStandings={computeStandings}
                            />

                            {(bracket.length > 0 || isGroupStageFinished) && (
                                <div className="relative py-12">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                        <div className="w-full border-t border-border/50"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-background px-8 text-sm font-black italic uppercase tracking-[0.4em] text-foreground/20">Llaves de Eliminación</span>
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
                                    setBracket={setBracket}
                                    roundLabel={roundLabel}
                                />
                            ) : isGroupStageFinished && !readOnly ? (
                                <div className="py-20 text-center space-y-6">
                                    <div className="w-20 h-20 bg-azul-primary/10 rounded-full flex items-center justify-center mx-auto">
                                        <Trophy className="w-10 h-10 text-azul-primary animate-bounce" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">Fase de Grupos Finalizada</h3>
                                        <p className="text-foreground/40 text-xs font-bold uppercase tracking-widest max-w-sm mx-auto">
                                            Todos los partidos han sido confirmados. Presiona el botón para generar las llaves de eliminación directa.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleGenerateBracket}
                                        className="px-10 py-4 bg-azul-primary text-white rounded-2xl font-black uppercase italic tracking-[0.2em] shadow-2xl shadow-azul-primary/20 hover:scale-105 transition-all flex items-center justify-center gap-3 mx-auto text-sm"
                                    >
                                        <Swords className="w-5 h-5" />
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
