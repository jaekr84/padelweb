"use client";

import Link from "next/link";
import { 
    ArrowLeft, Users2, Swords, Trophy, ChevronRight, 
    Check, Settings, RefreshCw 
} from "lucide-react";
import { useRouter } from "next/navigation";
import TournamentPublishButton from "@/components/TournamentPublishButton";

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
    isRefreshing
}: AmericanoHeaderProps) {
    const router = useRouter();

    return (
        <header className="sticky top-0 z-[60] bg-background/60 backdrop-blur-3xl border-b border-border/50">
            <div className="w-full px-4 md:px-6 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-8">
                    <button
                        onClick={() => {
                            if (step === "active") setStep("setup");
                            else router.push("/admin/tournaments");
                        }}
                        className="group flex items-center gap-3 text-foreground/70 hover:text-foreground transition-all px-4 py-2 hover:bg-muted rounded-2xl"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Volver</span>
                    </button>

                    <div className="h-10 w-px bg-border/30 hidden md:block" />

                    <div className="hidden md:flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-azul-primary leading-none mb-1">Torneo</span>
                        <span className="text-xs font-black uppercase italic tracking-tight text-foreground/90 leading-none truncate max-w-[150px] lg:max-w-[250px]">
                            {tournamentName}
                        </span>
                    </div>

                    <div className="h-10 w-px bg-border/30 hidden md:block" />

                    {/* DESKTOP STEPPER */}
                    <div className="hidden lg:flex items-center gap-2">
                        {(() => {
                            const steps = [
                                { id: "setup", label: "Asistencia", icon: Users2, active: step === "setup", completed: step !== "setup" },
                                { id: "active", label: "Gestión En Vivo", icon: SwitchedIcon, active: step === "active", completed: initialStatus === "finalizado" },
                            ];

                            function SwitchedIcon(props: any) {
                                return isGroupStageFinished ? <Trophy {...props} /> : <Swords {...props} />;
                            }

                            return steps.map((s, idx) => {
                                const Icon = s.icon;
                                const isAccessible = true;

                                return (
                                    <div key={s.id} className="flex items-center">
                                        <button
                                            onClick={() => isAccessible && setStep(s.id as any)}
                                            className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl transition-all ${s.active
                                                ? "bg-azul-primary text-white shadow-lg shadow-azul-primary/20"
                                                : s.completed
                                                    ? "text-azul-primary bg-azul-primary/5 hover:bg-azul-primary/10"
                                                    : "text-foreground/60 hover:bg-muted/80"
                                                }`}
                                        >
                                            <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${s.active ? "animate-pulse" : ""}`} />
                                            <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest hidden sm:block">
                                                {s.label}
                                            </span>
                                            {s.completed && <Check className="w-2.5 h-2.5 lg:w-3 lg:h-3 ml-1" />}
                                        </button>
                                        {idx < 1 && <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4 mx-0.5 lg:mx-1 text-border/40" />}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-azul-primary/5 border border-azul-primary/20 text-azul-primary text-[10px] font-black uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-azul-primary animate-pulse" />
                        {initialStatus === "finalizado" ? "Torneo Finalizado" : "En Vivo"}
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
                            className="p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground/60 hover:text-foreground hover:bg-muted transition-all"
                            title="Configuración"
                        >
                            <Settings className="w-4 h-4" />
                        </Link>
                    )}

                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground/60 hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>
        </header>
    );
}
