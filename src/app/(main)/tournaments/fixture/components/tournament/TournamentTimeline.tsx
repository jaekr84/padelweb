"use client";

import {
    Users2, LayoutGrid, Shuffle, Swords, Trophy,
    Check, ChevronRight, Layers
} from "lucide-react";
import { useRouter } from "next/navigation";

export type TournamentStep = "attendance" | "format" | "structure" | "draw" | "groups" | "bracket";

export type TournamentFormatKind = "round_robin" | "americano";

interface TournamentTimelineProps {
    tournamentId: string;
    currentStep: TournamentStep;
    status: string; // 'draft' | 'published' | 'en_curso' | 'en_eliminatorias' | 'finalizado'
    /** Americano has no draw step and keeps its bracket on a dedicated route. */
    format?: TournamentFormatKind;
    readOnly?: boolean;
    /**
     * Steps the caller already renders in-page: clicking them calls
     * `onStepChange` instead of navigating away.
     */
    localSteps?: TournamentStep[];
    onStepChange?: (step: TournamentStep) => void;
    /** Americano: sin cuadro generado, el paso "Llaves" no se puede abrir. */
    hasBracket?: boolean;
}

export function TournamentTimeline({
    tournamentId,
    currentStep,
    status,
    format = "round_robin",
    readOnly = false,
    localSteps = [],
    onStepChange,
    hasBracket
}: TournamentTimelineProps) {
    const router = useRouter();

    const isAmericano = format === "americano";
    const started = ["en_curso", "en_eliminatorias", "finalizado"].includes(status);

    const steps = [
        {
            id: "attendance" as TournamentStep,
            // Robin habilita/deshabilita jugadores; Americano sigue con check-in de asistencia.
            label: isAmericano ? "Asistencia" : "Jugadores",
            icon: Users2,
            path: `/tournaments/${tournamentId}/fixture?step=checkin`,
            isCompleted: started || currentStep !== "attendance",
            isAccessible: true
        },
        {
            id: "format" as TournamentStep,
            label: "Formato",
            icon: Layers,
            path: `/tournaments/${tournamentId}/fixture?step=format`,
            isCompleted: started || !["attendance", "format"].includes(currentStep),
            isAccessible: !readOnly
        },
        {
            id: "structure" as TournamentStep,
            label: "Estructura",
            icon: LayoutGrid,
            path: `/tournaments/${tournamentId}/fixture?step=config`,
            isCompleted: started && currentStep !== "structure",
            isAccessible: !readOnly
        },
        // Americano genera los partidos sobre la marcha: no hay sorteo de grupos.
        ...(isAmericano ? [] : [{
            id: "draw" as TournamentStep,
            label: "Sorteo",
            icon: Shuffle,
            path: `/tournaments/${tournamentId}/fixture?step=assign`,
            isCompleted: started && currentStep !== "draw",
            isAccessible: !readOnly
        }]),
        {
            id: "groups" as TournamentStep,
            label: isAmericano ? "Partidos" : "Grupos",
            icon: Swords,
            path: isAmericano
                ? `/tournaments/${tournamentId}/manage`
                : `/tournaments/${tournamentId}/manage?step=done`,
            isCompleted: ["en_eliminatorias", "finalizado"].includes(status),
            isAccessible: readOnly || started
        },
        {
            id: "bracket" as TournamentStep,
            label: "Llaves",
            icon: Trophy,
            path: isAmericano
                ? (readOnly
                    ? `/tournaments/${tournamentId}/playoffs`
                    : `/tournaments/${tournamentId}/manage/playoffs`)
                : `/tournaments/${tournamentId}/manage?step=elim`,
            isCompleted: status === "finalizado",
            // En Americano el cuadro vive en su propia ruta: sin cuadro generado
            // el paso no lleva a ningún lado, así que queda deshabilitado.
            isAccessible: isAmericano
                ? (hasBracket ?? ["en_eliminatorias", "finalizado"].includes(status))
                : (readOnly || started)
        }
    ];

    const handleNavigate = (s: typeof steps[0]) => {
        if (!s.isAccessible) return;
        // In-page steps never leave the current route.
        if (onStepChange && localSteps.includes(s.id)) {
            onStepChange(s.id);
            return;
        }
        router.push(s.path);
    };

    const filteredSteps = readOnly
        ? steps.filter(s => ["groups", "bracket"].includes(s.id))
        : steps;

    // `w-max`: dentro de un contenedor con overflow-x-auto los pasos conservan su
    // ancho y scrollean, en vez de comprimirse unos sobre otros.
    return (
        <div className="flex w-max items-center gap-1 bg-surface p-1 rounded-2xl border border-hairline backdrop-blur-md">
            {filteredSteps.map((s, idx) => {
                const Icon = s.icon;
                const isActive = s.id === currentStep;

                return (
                    <div key={s.id} className="flex items-center shrink-0">
                        <button
                            onClick={() => handleNavigate(s)}
                            disabled={!s.isAccessible}
                            className={`
                                group relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300
                                ${isActive
                                    ? "bg-celeste text-carbon-950 shadow-lg shadow-celeste/30 scale-[1.02]"
                                    : s.isCompleted
                                        ? "text-volt-ink hover:bg-volt/10"
                                        : s.isAccessible
                                            ? "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                                            : "text-subtle cursor-not-allowed"}
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
                                ${isActive ? "opacity-100" : "opacity-90 group-hover:opacity-100"}
                            `}>
                                {s.label}
                            </span>

                            {isActive && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                            )}
                        </button>

                        {idx < filteredSteps.length - 1 && (
                            <ChevronRight className={`w-3 h-3 mx-0.5 ${filteredSteps[idx + 1].isAccessible ? "text-subtle" : "text-muted-foreground"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
