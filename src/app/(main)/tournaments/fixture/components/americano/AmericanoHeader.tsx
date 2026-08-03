"use client";

import { useState } from "react";
import Link from "next/link";
import {
    ArrowLeft, Users2, Swords, Trophy, ChevronRight,
    Check, Settings, RefreshCw, Layers
} from "lucide-react";
import { useRouter } from "next/navigation";
import TournamentPublishButton from "@/components/TournamentPublishButton";
import { finalizeTournament } from "../../actions";
import FinalizeTournamentModal from "../tournament/FinalizeTournamentModal";

interface AmericanoHeaderProps {
    tournamentId: string;
    tournamentName: string;
    step: "setup" | "active";
    setStep: (step: "setup" | "active") => void;
    initialStatus: string;
    isGroupStageFinished: boolean;
    readOnly?: boolean;
    handleRefresh: () => void;
    isRefreshing: boolean;
    hasBracket?: boolean;
}

export function AmericanoHeader({
    tournamentId,
    tournamentName,
    step,
    setStep,
    initialStatus,
    isGroupStageFinished,
    readOnly,
    handleRefresh,
    isRefreshing,
    hasBracket
}: AmericanoHeaderProps) {
    const router = useRouter();
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);

    const handleFinalizeConfirm = async (): Promise<boolean> => {
        const res = await finalizeTournament(tournamentId);
        return res.ok;
    };

    return (
        <>
            <header className="sticky top-0 z-[60] bg-background/60 backdrop-blur-3xl border-b border-hairline">
                <div className="w-full px-2 md:px-3 h-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                if (step === "active") setStep("setup");
                                else router.push("/admin/tournaments");
                            }}
                            className="group flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all px-2 py-1 hover:bg-muted/50 rounded-lg"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-[8px] font-black uppercase tracking-[0.15em] italic">Volver</span>
                        </button>

                        <div className="h-5 w-px bg-border/20 hidden md:block" />

                        <div className="hidden md:flex flex-col min-w-0">
                            <span className="text-[6px] font-black uppercase tracking-[0.2em] text-celeste leading-none mb-0.5">Torneo</span>
                            <span className="text-[9px] font-black uppercase italic tracking-tight text-foreground leading-none truncate max-w-[120px] lg:max-w-[200px]">
                                {tournamentName}
                            </span>
                        </div>

                        <div className="h-5 w-px bg-border/20 hidden md:block" />

                        {/* DESKTOP STEPPER */}
                        <div className="hidden lg:flex items-center gap-1">
                            {(() => {
                                const steps: {
                                    id: string;
                                    label: string;
                                    icon: any;
                                    active: boolean;
                                    completed: boolean;
                                    href?: string;
                                }[] = [
                                    { id: "setup", label: "Asistencia", icon: Users2, active: step === "setup", completed: step !== "setup" },
                                    // Mirrors the Robin stepper: leads to the format
                                    // step in the setup flow, where a running
                                    // tournament can still be switched (rearming the
                                    // fixture) after an explicit confirmation.
                                    ...(!readOnly && initialStatus !== "finalizado" ? [{
                                        id: "format",
                                        label: "Formato",
                                        icon: Layers,
                                        active: false,
                                        completed: true,
                                        href: `/tournaments/${tournamentId}/fixture?step=format`
                                    }] : []),
                                    { id: "active", label: "Grupos", icon: SwitchedIcon, active: step === "active", completed: initialStatus === "finalizado" },
                                ];

                                if (readOnly && hasBracket) {
                                    steps.push({
                                        id: "playoffs",
                                        label: "Fase de Llaves",
                                        icon: Trophy,
                                        active: false,
                                        completed: false,
                                        href: `/tournaments/${tournamentId}/playoffs`
                                    });
                                }

                                function SwitchedIcon(props: any) {
                                    return isGroupStageFinished ? <Trophy {...props} /> : <Swords {...props} />;
                                }

                                return steps.map((s, idx) => {
                                    const Icon = s.icon;
                                    const isAccessible = true;

                                    const buttonContent = (
                                        <>
                                            <Icon className={`w-3 h-3 ${s.active ? "animate-pulse" : ""}`} />
                                            <span className="text-[8px] font-black uppercase tracking-widest hidden sm:block">
                                                {s.label}
                                            </span>
                                            {s.completed && <Check className="w-2 h-2 ml-0.5" />}
                                        </>
                                    );

                                    const className = `flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all ${
                                        s.active
                                            ? "bg-celeste text-carbon-950 shadow-sm"
                                            : s.completed
                                                ? "text-celeste bg-celeste/5 hover:bg-celeste/10"
                                                : "text-muted-foreground hover:bg-muted/80"
                                    }`;

                                    return (
                                        <div key={s.id} className="flex items-center">
                                            {s.href ? (
                                                <Link href={s.href} className={className}>
                                                    {buttonContent}
                                                </Link>
                                            ) : (
                                                <button
                                                    onClick={() => isAccessible && setStep(s.id as any)}
                                                    className={className}
                                                >
                                                    {buttonContent}
                                                </button>
                                            )}
                                            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 mx-0 text-border/20" />}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-celeste/5 border border-celeste/20 text-celeste text-[8px] font-black uppercase tracking-widest">
                            <div className="w-1 h-1 rounded-full bg-celeste animate-pulse" />
                            {initialStatus === "finalizado" ? "Finalizado" : "En Vivo"}
                        </div>

                        {readOnly && hasBracket && (
                            <Link href={`/tournaments/${tournamentId}/playoffs`} className="lg:hidden">
                                <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-celeste/10 border border-celeste/20 text-celeste hover:bg-celeste hover:text-carbon-950 transition-all text-[8px] font-black uppercase tracking-widest shadow-sm">
                                    <Trophy className="w-3 h-3" />
                                    <span>Llaves</span>
                                </button>
                            </Link>
                        )}

                        {initialStatus === "finalizado" && (
                            <TournamentPublishButton
                                tournamentId={tournamentId}
                                tournamentName={tournamentName}
                                variant="management"
                            />
                        )}

                        {!readOnly && initialStatus !== "finalizado" && (
                            <button
                                onClick={() => setIsFinalizeModalOpen(true)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rojo/10 text-rojo hover:bg-rojo hover:text-white transition-all group border border-rojo/20 text-[8px] font-black uppercase tracking-widest"
                            >
                                <Check className="w-3 h-3 group-hover:scale-105 transition-transform" />
                                <span>Finalizar</span>
                            </button>
                        )}

                        {!readOnly && (
                            <Link
                                href={`/tournaments/${tournamentId}/edit`}
                                className="p-1.5 rounded-lg bg-surface border border-hairline text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                title="Configuración"
                            >
                                <Settings className="w-3 h-3" />
                            </Link>
                        )}

                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-1.5 rounded-lg bg-surface border border-hairline text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
                        </button>
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
    );
}
