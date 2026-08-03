"use client";

import { useState } from "react";
import {
    ArrowLeft, Users2, Swords, ChevronRight,
    Check, RefreshCw, Settings, Eye, BarChart3
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TournamentPublishButton from "@/components/TournamentPublishButton";
import { TournamentTimeline, TournamentStep } from "./TournamentTimeline";
import { finalizeTournament } from "../../actions";
import FinalizeTournamentModal from "./FinalizeTournamentModal";

interface TournamentHeaderProps {
    tournamentId: string;
    tournamentName: string;
    step: "setup" | "done" | "qual" | "elim";
    setStep: (step: any) => void;
    initialStatus: string;
    readOnly: boolean;
    isRefreshing: boolean;
    handleRefresh: () => void;
    setIsPlayersModalOpen: (open: boolean) => void;
}

export function TournamentHeader({
    tournamentId,
    tournamentName,
    step,
    setStep,
    initialStatus,
    readOnly,
    isRefreshing,
    handleRefresh,
    setIsPlayersModalOpen
}: TournamentHeaderProps) {
    const router = useRouter();
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);

    const timelineStep: TournamentStep =
        step === "setup" ? "attendance" :
            step === "elim" ? "bracket" :
                "groups";

    const handleBack = () => {
        if (readOnly) {
            router.push(`/tournaments/${tournamentId}`);
            return;
        }

        if (step === "elim") {
            setStep("done");
        } else if (step === "done" || step === "qual") {
            setStep("setup");
        } else if (step === "setup") {
            router.push(`/tournaments/${tournamentId}/fixture?step=assign`);
        } else {
            router.push(`/tournaments/${tournamentId}`);
        }
    };

    const handleFinalizeConfirm = async (): Promise<boolean> => {
        const res = await finalizeTournament(tournamentId);
        return res.ok;
    };

    return (
        <>
            <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-3xl border-b border-hairline px-4 py-4">
                <div className="max-w-6xl mx-auto space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            {!readOnly && (
                                <button
                                    onClick={handleBack}
                                    className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all font-black uppercase tracking-widest text-[9px] shrink-0 bg-surface hover:bg-surface-raised px-3 py-1.5 rounded-xl border border-hairline"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                                    Volver
                                </button>
                            )}


                            <TournamentTimeline
                                tournamentId={tournamentId}
                                currentStep={timelineStep}
                                status={initialStatus}
                                readOnly={readOnly}
                                onStepChange={(newStep) => {
                                    // Map timeline steps back to Manager steps
                                    const managerStep =
                                        newStep === "attendance" ? "setup" :
                                            newStep === "bracket" ? "elim" :
                                                "done";
                                    setStep(managerStep);
                                }}
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            {!readOnly && (
                                <button
                                    onClick={() => setIsPlayersModalOpen(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-celeste/15 text-celeste hover:bg-celeste hover:text-carbon-950 transition-all group border border-celeste/40"
                                >
                                    <Users2 className="w-3.5 h-3.5 group-hover:scale-105 transition-transform" />
                                    <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Jugadores</span>
                                </button>
                            )}

                            {!readOnly && initialStatus !== "finalizado" && (
                                <button
                                    onClick={() => setIsFinalizeModalOpen(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-live/15 text-live hover:bg-live hover:text-white transition-all group border border-live/40 font-bold text-[9px] uppercase tracking-widest"
                                >
                                    <Check className="w-3.5 h-3.5 group-hover:scale-105 transition-transform" />
                                    <span>Finalizar Torneo</span>
                                </button>
                            )}

                            <div className="flex items-center gap-2">
                                {initialStatus === "finalizado" && (
                                    <TournamentPublishButton
                                        tournamentId={tournamentId}
                                        tournamentName={tournamentName}
                                        variant="management"
                                    />
                                )}

                                {!readOnly && (
                                    <Link
                                        href={`/tournaments/${tournamentId}/edit`}
                                        className="p-2 rounded-xl bg-surface border border-hairline text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-all"
                                        title="Configuración"
                                    >
                                        <Settings className="w-3.5 h-3.5" />
                                    </Link>
                                )}

                                <Link
                                    href={`/tournaments/${tournamentId}/resultados`}
                                    target="_blank"
                                    className="p-2 rounded-xl bg-surface border border-hairline text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all"
                                    title="Ver resultados públicos"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                </Link>

                                <Link
                                    href={`/tournaments/${tournamentId}/stats`}
                                    className="flex items-center gap-2 p-2 sm:px-3 rounded-xl bg-celeste/15 border border-celeste/40 text-celeste hover:bg-celeste hover:text-carbon-950 transition-all"
                                    title="Estadísticas del torneo"
                                >
                                    <BarChart3 className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Estadísticas</span>
                                </Link>

                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="p-2 rounded-xl bg-surface border border-hairline text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-all disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <FinalizeTournamentModal
                isOpen={isFinalizeModalOpen}
                onClose={() => setIsFinalizeModalOpen(false)}
                onConfirm={handleFinalizeConfirm}
                tournamentName={tournamentName}
                onRedirect={() => window.location.href = "/admin/tournaments"}
            />
        </>
    );;
}
