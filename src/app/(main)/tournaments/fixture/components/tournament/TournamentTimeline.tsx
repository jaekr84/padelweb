"use client";

import { 
    Users2, LayoutGrid, Shuffle, Swords, Trophy, 
    Check, ChevronRight 
} from "lucide-react";
import { useRouter } from "next/navigation";

export type TournamentStep = "attendance" | "structure" | "draw" | "groups" | "bracket";

interface TournamentTimelineProps {
    tournamentId: string;
    currentStep: TournamentStep;
    status: string; // 'draft' | 'published' | 'en_curso' | 'en_eliminatorias' | 'finalizado'
    readOnly?: boolean;
}

export function TournamentTimeline({
    tournamentId,
    currentStep,
    status,
    readOnly = false
}: TournamentTimelineProps) {
    const router = useRouter();

    const steps = [
        { 
            id: "attendance" as TournamentStep, 
            label: "Asistencia", 
            icon: Users2,
            path: `/tournaments/${tournamentId}/fixture?step=checkin`,
            isCompleted: ["en_curso", "en_eliminatorias", "finalizado"].includes(status) || currentStep !== "attendance",
            isAccessible: true
        },
        { 
            id: "structure" as TournamentStep, 
            label: "Estructura", 
            icon: LayoutGrid,
            path: `/tournaments/${tournamentId}/fixture?step=config`,
            isCompleted: ["en_curso", "en_eliminatorias", "finalizado"].includes(status) && currentStep !== "structure",
            isAccessible: !readOnly
        },
        { 
            id: "draw" as TournamentStep, 
            label: "Sorteo", 
            icon: Shuffle,
            path: `/tournaments/${tournamentId}/fixture?step=assign`,
            isCompleted: ["en_curso", "en_eliminatorias", "finalizado"].includes(status) && currentStep !== "draw",
            isAccessible: !readOnly
        },
        { 
            id: "groups" as TournamentStep, 
            label: "Grupos", 
            icon: Swords,
            path: `/tournaments/${tournamentId}/manage?step=done`,
            isCompleted: ["en_eliminatorias", "finalizado"].includes(status),
            isAccessible: ["en_curso", "en_eliminatorias", "finalizado"].includes(status)
        },
        { 
            id: "bracket" as TournamentStep, 
            label: "Llaves", 
            icon: Trophy,
            path: `/tournaments/${tournamentId}/manage?step=elim`,
            isCompleted: status === "finalizado",
            isAccessible: ["en_curso", "en_eliminatorias", "finalizado"].includes(status)
        }
    ];

    const handleNavigate = (step: typeof steps[0]) => {
        if (!step.isAccessible) return;
        router.push(step.path);
    };

    return (
        <div className="flex items-center gap-1 bg-muted/10 p-1 rounded-2xl border border-border/40 backdrop-blur-md">
            {steps.map((s, idx) => {
                const Icon = s.icon;
                const isActive = s.id === currentStep;
                
                return (
                    <div key={s.id} className="flex items-center">
                        <button
                            onClick={() => handleNavigate(s)}
                            disabled={!s.isAccessible}
                            className={`
                                group relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300
                                ${isActive 
                                    ? "bg-azul-primary text-white shadow-lg shadow-azul-primary/20 scale-[1.02]" 
                                    : s.isCompleted
                                        ? "text-celeste hover:bg-celeste/10"
                                        : s.isAccessible
                                            ? "text-foreground/50 hover:bg-white/5 hover:text-foreground"
                                            : "opacity-20 cursor-not-allowed"}
                            `}
                        >
                            <div className="relative">
                                <Icon className={`w-3.5 h-3.5 transition-transform duration-300 ${isActive ? "animate-pulse" : "group-hover:scale-110"}`} />
                                {s.isCompleted && !isActive && (
                                    <div className="absolute -top-1 -right-1 bg-background rounded-full p-0.5">
                                        <Check className="w-2 h-2 text-celeste" />
                                    </div>
                                )}
                            </div>
                            
                            <span className={`
                                text-[9px] font-black uppercase tracking-wider hidden lg:block
                                ${isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"}
                            `}>
                                {s.label}
                            </span>

                            {isActive && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                            )}
                        </button>

                        {idx < steps.length - 1 && (
                            <ChevronRight className={`w-3 h-3 mx-0.5 ${steps[idx+1].isAccessible ? "text-border/40" : "text-border/10"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
