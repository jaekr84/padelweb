"use client";

import {
    ArrowLeft, Users2, Swords, ChevronRight,
    Check, RefreshCw, Settings
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TournamentPublishButton from "@/components/TournamentPublishButton";
import { TournamentTimeline, TournamentStep } from "./TournamentTimeline";

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

    return (
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-3xl border-b border-border/50 px-4 py-4">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleBack}
                            className="group flex items-center gap-2 text-foreground/70 hover:text-foreground transition-all font-black uppercase tracking-widest text-[9px] shrink-0 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                            Volver
                        </button>


                        <TournamentTimeline
                            tournamentId={tournamentId}
                            currentStep={timelineStep}
                            status={initialStatus}
                            readOnly={readOnly}
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsPlayersModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-azul-primary/10 text-azul-primary hover:bg-azul-primary hover:text-white transition-all group shadow-sm border border-azul-primary/20"
                        >
                            <Users2 className="w-3.5 h-3.5 group-hover:scale-105 transition-transform" />
                            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Jugadores</span>
                        </button>

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
                                    className="p-2 rounded-xl bg-muted/30 border border-border/50 text-foreground/50 hover:text-foreground hover:bg-muted transition-all"
                                    title="Configuración"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                </Link>
                            )}

                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-2 rounded-xl bg-muted/30 border border-border/50 text-foreground/50 hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
