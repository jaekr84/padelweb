"use client";

import { 
    ArrowLeft, Users2, Swords, ChevronRight, 
    Check, RefreshCw, Settings 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TournamentPublishButton from "@/components/TournamentPublishButton";

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

    const steps = [
        { id: "setup", label: "Participantes", icon: Users2, active: step === "setup", completed: step !== "setup" },
        { id: "done", label: "Torneo en Curso", icon: Swords, active: step === "done" || step === "qual" || step === "elim", completed: initialStatus === "finalizado" },
    ];

    return (
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 transition-all shadow-sm">
            <div className="w-full px-3 md:px-4 lg:px-6 h-11 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (readOnly) {
                                router.push(`/tournaments/${tournamentId}`);
                                return;
                            }
                            
                            if (step === "elim") {
                                setStep("done");
                            } else if (step === "done" || step === "qual") {
                                setStep("setup");
                            } else {
                                router.push(`/tournaments/${tournamentId}`);
                            }
                        }}
                        className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-foreground/60 hover:text-foreground transition-all group"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        Volver
                    </button>

                    <div className="h-5 w-[1px] bg-border/40 hidden md:block" />

                    <div className="hidden md:flex flex-col min-w-0">
                        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-celeste leading-none mb-0.5">Torneo</span>
                        <span className="text-[9px] font-black uppercase italic tracking-tight text-foreground/80 leading-none truncate max-w-[120px] lg:max-w-[180px]">
                            {tournamentName}
                        </span>
                    </div>

                    <div className="h-5 w-[1px] bg-border/40 hidden md:block" />

                    {/* Navigation Stepper */}
                    <div className="hidden md:flex items-center gap-1 bg-muted/20 p-1 rounded-xl border border-border/40">
                        {steps.map((s, idx) => {
                            const Icon = s.icon;
                            const isAccessible = s.id === "setup" || s.id === "done";

                            return (
                                <div key={s.id} className="flex items-center">
                                    <button
                                        onClick={() => isAccessible && setStep(s.id as any)}
                                        disabled={!isAccessible}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${s.active
                                            ? "bg-azul-primary text-white shadow-sm"
                                            : s.completed
                                                ? "text-celeste bg-celeste/5 hover:bg-celeste/10"
                                                : isAccessible
                                                    ? "text-foreground/60 hover:bg-muted/80"
                                                    : "opacity-30 cursor-not-allowed"
                                            }`}
                                    >
                                        <Icon className={`w-3 h-3 ${s.active ? "animate-pulse" : ""}`} />
                                        <span className="text-[8px] font-black uppercase tracking-widest hidden sm:block">
                                            {s.label}
                                        </span>
                                        {s.completed && <Check className="w-2.5 h-2.5 ml-0.5 text-celeste" />}
                                    </button>
                                    {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 mx-0.5 text-border/30" />}
                                </div>
                            );
                        })}
                    </div>

                    <div className="h-6 w-[1px] bg-border/40 hidden md:block" />
                    
                    <button
                        onClick={() => setIsPlayersModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-azul-primary/10 text-azul-primary hover:bg-azul-primary hover:text-white transition-all group shadow-sm border border-azul-primary/20"
                    >
                        <Users2 className="w-3.5 h-3.5 group-hover:scale-105 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Jugadores</span>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-celeste/5 border border-celeste/20 text-celeste text-[9px] font-black uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-celeste animate-pulse" />
                        {initialStatus === "finalizado" ? "Finalizado" : "En Vivo"}
                    </div>

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
                            className="p-2 rounded-lg bg-muted/40 border border-border/40 text-foreground/50 hover:text-foreground hover:bg-muted transition-all"
                            title="Configuración"
                        >
                            <Settings className="w-3.5 h-3.5" />
                        </Link>
                    )}

                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-2 rounded-lg bg-muted/40 border border-border/40 text-foreground/50 hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>
        </header>
    );
}
