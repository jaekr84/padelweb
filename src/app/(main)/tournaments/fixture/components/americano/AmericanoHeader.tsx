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
        <header className="sticky top-0 z-[60] bg-background/60 backdrop-blur-3xl border-b border-border/40">
            <div className="w-full px-2 md:px-3 h-10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (step === "active") setStep("setup");
                            else router.push("/admin/tournaments");
                        }}
                        className="group flex items-center gap-1.5 text-foreground/70 hover:text-foreground transition-all px-2 py-1 hover:bg-muted/50 rounded-lg"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-[8px] font-black uppercase tracking-[0.15em] italic">Volver</span>
                    </button>

                    <div className="h-5 w-px bg-border/20 hidden md:block" />

                    <div className="hidden md:flex flex-col min-w-0">
                        <span className="text-[6px] font-black uppercase tracking-[0.2em] text-azul-primary leading-none mb-0.5">Torneo</span>
                        <span className="text-[9px] font-black uppercase italic tracking-tight text-foreground/90 leading-none truncate max-w-[120px] lg:max-w-[200px]">
                            {tournamentName}
                        </span>
                    </div>

                    <div className="h-5 w-px bg-border/20 hidden md:block" />

                    {/* DESKTOP STEPPER */}
                    <div className="hidden lg:flex items-center gap-1">
                        {(() => {
                            const steps = [
                                { id: "setup", label: "Asistencia", icon: Users2, active: step === "setup", completed: step !== "setup" },
                                { id: "active", label: "En Vivo", icon: SwitchedIcon, active: step === "active", completed: initialStatus === "finalizado" },
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
                                            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all ${s.active
                                                ? "bg-azul-primary text-white shadow-sm"
                                                : s.completed
                                                    ? "text-azul-primary bg-azul-primary/5 hover:bg-azul-primary/10"
                                                    : "text-foreground/60 hover:bg-muted/80"
                                                }`}
                                        >
                                            <Icon className={`w-3 h-3 ${s.active ? "animate-pulse" : ""}`} />
                                            <span className="text-[8px] font-black uppercase tracking-widest hidden sm:block">
                                                {s.label}
                                            </span>
                                            {s.completed && <Check className="w-2 h-2 ml-0.5" />}
                                        </button>
                                        {idx < 1 && <ChevronRight className="w-3 h-3 mx-0 text-border/20" />}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-azul-primary/5 border border-azul-primary/20 text-azul-primary text-[8px] font-black uppercase tracking-widest">
                        <div className="w-1 h-1 rounded-full bg-azul-primary animate-pulse" />
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
                            className="p-1.5 rounded-lg bg-muted/40 border border-border/40 text-foreground/50 hover:text-foreground hover:bg-muted transition-all"
                            title="Configuración"
                        >
                            <Settings className="w-3 h-3" />
                        </Link>
                    )}

                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-1.5 rounded-lg bg-muted/40 border border-border/40 text-foreground/50 hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>
        </header>
    );
}
