"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users2, Check, Settings, Eye, BarChart3, RefreshCw } from "lucide-react";
import TournamentPublishButton from "@/components/TournamentPublishButton";
import { TournamentTimeline, TournamentStep, TournamentFormatKind } from "./TournamentTimeline";
import { finalizeTournament } from "../../actions";
import FinalizeTournamentModal from "./FinalizeTournamentModal";

// Única barra superior de toda la gestión de torneos: setup (asistencia,
// formato, estructura, sorteo), gestión en vivo y llaves, tanto en Round Robin
// como en Americano. Antes cada pantalla tenía su propio header con distinto
// juego de acciones; acá las acciones dependen del ESTADO del torneo, no de
// qué componente dibuja la barra.

interface TournamentNavBarProps {
    tournamentId: string;
    tournamentName: string;
    /** 'draft' | 'published' | 'en_curso' | 'en_eliminatorias' | 'finalizado' */
    status: string;
    format: TournamentFormatKind;
    currentStep: TournamentStep;
    readOnly?: boolean;
    /** Steps rendered in-page by the caller: no navegan, avisan por onStepChange. */
    localSteps?: TournamentStep[];
    onStepChange?: (step: TournamentStep) => void;
    /** Americano: sin cuadro generado, el paso "Llaves" no se puede abrir. */
    hasBracket?: boolean;
    /** Back button. Por defecto vuelve al detalle del torneo. */
    onBack?: () => void;
    /** Si se pasa, aparece el botón "Jugadores". */
    onOpenPlayers?: () => void;
    /** Si no se pasa, el refresh usa router.refresh(). */
    onRefresh?: () => void;
    isRefreshing?: boolean;
    /** Bloquea "Finalizar" (ej: falta definir la final). */
    finalizeDisabled?: boolean;
    finalizeHint?: string;
    /** A dónde mandar después de finalizar. */
    onFinalizeRedirect?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
    draft: "Borrador",
    published: "Preparación",
    setup: "Preparación",
    en_curso: "En vivo",
    en_eliminatorias: "Eliminatorias",
    finalizado: "Finalizado",
};

export function TournamentNavBar({
    tournamentId,
    tournamentName,
    status,
    format,
    currentStep,
    readOnly = false,
    localSteps,
    onStepChange,
    hasBracket,
    onBack,
    onOpenPlayers,
    onRefresh,
    isRefreshing,
    finalizeDisabled = false,
    finalizeHint,
    onFinalizeRedirect,
}: TournamentNavBarProps) {
    const router = useRouter();
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
    const [selfRefreshing, setSelfRefreshing] = useState(false);

    const started = ["en_curso", "en_eliminatorias", "finalizado"].includes(status);
    // Mismo criterio que tenían los headers de gestión: cualquier torneo que ya
    // salió de la etapa de inscripción y todavía no se cerró.
    const canFinalize = !readOnly && !["draft", "published", "finalizado"].includes(status);
    const refreshing = isRefreshing ?? selfRefreshing;

    const handleBack = () => {
        if (onBack) {
            onBack();
            return;
        }
        router.push(`/tournaments/${tournamentId}`);
    };

    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
            return;
        }
        setSelfRefreshing(true);
        router.refresh();
        setTimeout(() => setSelfRefreshing(false), 1000);
    };

    const handleFinalizeConfirm = async (): Promise<boolean> => {
        const res = await finalizeTournament(tournamentId);
        return res.ok;
    };

    return (
        <>
            <header className="sticky top-0 z-[60] bg-background/90 backdrop-blur-3xl border-b border-hairline px-3 md:px-4 py-2">
                {/*
                  Dos filas fijas: arriba identidad + acciones, abajo el stepper.
                  Los seis pasos más las siete acciones no entran en una sola fila
                  ni a 1600px con el sidebar abierto, así que en vez de buscar un
                  breakpoint que aguante todos los casos el stepper tiene su propia
                  fila y scrollea en horizontal cuando hace falta.
                */}
                <div className="w-full flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="flex items-center gap-3 min-w-0 shrink-0">
                        <button
                            onClick={handleBack}
                            className="group flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all font-black uppercase tracking-widest text-[9px] shrink-0 bg-surface hover:bg-surface-raised px-2.5 py-1.5 rounded-xl border border-hairline"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                            Volver
                        </button>

                        <div className="h-5 w-px bg-hairline hidden md:block" />

                        <div className="hidden md:flex flex-col min-w-0">
                            <span className="text-[6px] font-black uppercase tracking-[0.2em] text-celeste leading-none mb-0.5">Torneo</span>
                            <span className="text-[9px] font-black uppercase italic tracking-tight text-foreground leading-none truncate max-w-[120px] lg:max-w-[200px]">
                                {tournamentName}
                            </span>
                        </div>

                    </div>

                    {/* Fila 2: siempre debajo de la identidad y las acciones. */}
                    <div className="order-last w-full min-w-0 overflow-x-auto">
                        <TournamentTimeline
                            tournamentId={tournamentId}
                            currentStep={currentStep}
                            status={status}
                            format={format}
                            readOnly={readOnly}
                            localSteps={localSteps}
                            onStepChange={onStepChange}
                            hasBracket={hasBracket}
                        />
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-celeste/5 border border-celeste/20 text-celeste text-[8px] font-black uppercase tracking-widest">
                            <div className={`w-1 h-1 rounded-full bg-celeste ${started && status !== "finalizado" ? "animate-pulse" : ""}`} />
                            {STATUS_LABEL[status] ?? status}
                        </div>

                        {onOpenPlayers && !readOnly && (
                            <button
                                onClick={onOpenPlayers}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-celeste/15 text-celeste hover:bg-celeste hover:text-carbon-950 transition-all group border border-celeste/40"
                                title="Jugadores"
                            >
                                <Users2 className="w-3.5 h-3.5 group-hover:scale-105 transition-transform" />
                                <span className="text-[9px] font-black uppercase tracking-widest hidden lg:inline">Jugadores</span>
                            </button>
                        )}

                        {canFinalize && (
                            <button
                                onClick={() => setIsFinalizeModalOpen(true)}
                                disabled={finalizeDisabled}
                                title={finalizeHint}
                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border transition-all font-black text-[9px] uppercase tracking-widest ${finalizeDisabled
                                    ? "bg-surface border-hairline text-subtle cursor-not-allowed"
                                    : "bg-live/15 text-live hover:bg-live hover:text-white border-live/40"}`}
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span className="hidden lg:inline">Finalizar</span>
                            </button>
                        )}

                        {status === "finalizado" && (
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
                                title="Información del torneo"
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
                            className="flex items-center gap-1.5 p-2 lg:px-3 rounded-xl bg-celeste/15 border border-celeste/40 text-celeste hover:bg-celeste hover:text-carbon-950 transition-all"
                            title="Estadísticas del torneo"
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest hidden xl:inline">Estadísticas</span>
                        </Link>

                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2 rounded-xl bg-surface border border-hairline text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-all disabled:opacity-50"
                            title="Actualizar"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>
            </header>

            <FinalizeTournamentModal
                isOpen={isFinalizeModalOpen}
                onClose={() => setIsFinalizeModalOpen(false)}
                onConfirm={handleFinalizeConfirm}
                tournamentName={tournamentName}
                onRedirect={onFinalizeRedirect ?? (() => window.location.href = "/admin/tournaments")}
            />
        </>
    );
}
