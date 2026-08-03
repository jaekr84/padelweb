"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    ArrowLeft, ArrowRight, Check, Lock, LayoutGrid,
    Zap, Users2, AlertTriangle, Loader2, Unlock, Trash2, X
} from "lucide-react";
import { setTournamentFormat, getFormatResetImpact, type TournamentFormat } from "../actions";

// Shown right after the (shared) attendance phase: with the real turnout on
// screen the organizer picks whether this tournament runs as Round Robin or
// Americano. The choice writes `tournaments.type`, which is what routes the
// tournament to FixtureSetup/TournamentManager or AmericanoSetup/AmericanoManager.
//
// Once a fixture exists the format is locked (the saved data shape differs per
// format) — the cards then render read-only and point to resetting the fixture.

interface FormatSelectorProps {
    tournamentId: string;
    /** Format currently saved in the DB. */
    currentFormat: TournamentFormat;
    /** Teams/players marked present in the check-in step. */
    presentCount: number;
    isIndividual?: boolean;
    /** True when a fixture already exists, so the format can no longer change. */
    locked?: boolean;
    onBack?: () => void;
    /**
     * Called when the picked format is the one already saved: no round-trip
     * needed, the caller just advances to its own next step.
     */
    onContinueSameFormat: () => void;
}

const UNIT_LABEL = (isIndividual: boolean, n: number) =>
    isIndividual ? (n === 1 ? "jugador" : "jugadores") : (n === 1 ? "pareja" : "parejas");

const PRESENT_LABEL = (isIndividual: boolean, n: number) =>
    `${n} ${UNIT_LABEL(isIndividual, n)} ${n === 1 ? "presente" : "presentes"}`;

export function FormatSelector({
    tournamentId,
    currentFormat,
    presentCount,
    isIndividual = false,
    locked = false,
    onBack,
    onContinueSameFormat,
}: FormatSelectorProps) {
    const router = useRouter();
    const [pending, setPending] = useState<TournamentFormat | null>(null);
    const [resetTarget, setResetTarget] = useState<TournamentFormat | null>(null);
    const [impact, setImpact] = useState<Awaited<ReturnType<typeof getFormatResetImpact>> | null>(null);
    const [confirming, setConfirming] = useState(false);

    const otherFormat: TournamentFormat = currentFormat === "americano" ? "round_robin" : "americano";
    const FORMAT_LABEL: Record<TournamentFormat, string> = {
        round_robin: "Round Robin",
        americano: "Americano",
    };

    // Opens the destructive path: ask the server what exists before showing the
    // confirmation, so the dialog states the real damage rather than a guess.
    const openResetDialog = async (format: TournamentFormat) => {
        setResetTarget(format);
        setImpact(null);
        const res = await getFormatResetImpact(tournamentId);
        setImpact(res);
    };

    const confirmReset = async () => {
        if (!resetTarget) return;
        setConfirming(true);
        const res = await setTournamentFormat({ tournamentId, format: resetTarget, resetFixture: true });

        if (!res.ok) {
            toast.error(res.error || "No se pudo cambiar el formato");
            setConfirming(false);
            return;
        }

        toast.success(`Fixture reiniciado · ${FORMAT_LABEL[resetTarget]}`);
        setResetTarget(null);
        setConfirming(false);
        router.replace(`/tournaments/${tournamentId}/fixture?step=config`);
        router.refresh();
    };

    // Which group layouts divide the turnout exactly — the actual reason to
    // switch formats when fewer people show up than expected.
    const groupOptions = useMemo(() => {
        const out: { groups: number; size: number }[] = [];
        for (const size of [3, 4, 5]) {
            if (presentCount >= size * 2 && presentCount % size === 0) {
                out.push({ groups: presentCount / size, size });
            }
        }
        return out;
    }, [presentCount]);

    const canPlay = presentCount >= 2;

    const handleSelect = async (format: TournamentFormat) => {
        if (pending) return;

        // Picking the format already saved never needs a round-trip — and stays
        // available even when locked, so the step isn't a dead end.
        if (format === currentFormat) {
            onContinueSameFormat();
            return;
        }

        // Fixture already exists: changing format means destroying it, so route
        // through the confirmation dialog instead of switching silently.
        if (locked) {
            openResetDialog(format);
            return;
        }

        if (!canPlay) {
            toast.error(`Se necesitan al menos 2 ${UNIT_LABEL(isIndividual, 2)} presentes`);
            return;
        }

        setPending(format);
        const res = await setTournamentFormat({ tournamentId, format });

        if (!res.ok) {
            toast.error(res.error || "No se pudo cambiar el formato");
            setPending(null);
            return;
        }

        toast.success(format === "americano" ? "Formato: Americano" : "Formato: Round Robin");
        // The page re-branches server-side on the new `type`, mounting the other
        // setup component straight into its configuration step.
        router.replace(`/tournaments/${tournamentId}/fixture?step=config`);
        router.refresh();
    };

    const cards: {
        format: TournamentFormat;
        label: string;
        tagline: string;
        icon: typeof LayoutGrid;
        bullets: string[];
        hint?: { text: string; warn?: boolean };
    }[] = [
            {
                format: "round_robin",
                label: "Round Robin",
                tagline: "Grupos + Eliminatorias",
                icon: LayoutGrid,
                bullets: [
                    "Se reparten en grupos y juegan todos contra todos",
                    "Los mejores de cada grupo pasan a las llaves",
                    "Sorteo de grupos manual o automático",
                ],
                hint: groupOptions.length > 0
                    ? {
                        text: `Con ${presentCount} ${UNIT_LABEL(isIndividual, presentCount)}: ` +
                            groupOptions.map(o => `${o.groups} grupo${o.groups > 1 ? "s" : ""} de ${o.size}`).join(" · "),
                    }
                    : {
                        text: `Con ${presentCount} ${UNIT_LABEL(isIndividual, presentCount)} no salen grupos parejos de 3, 4 o 5`,
                        warn: true,
                    },
            },
            {
                format: "americano",
                label: "Americano",
                tagline: "Partidos rotativos",
                icon: Zap,
                bullets: [
                    "Sin grupos: los partidos se generan sobre la marcha",
                    "Cada uno juega la cantidad de partidos que definís",
                    "Tabla general única y llaves con los clasificados",
                ],
                hint: {
                    text: `Funciona con cualquier cantidad${presentCount % 2 !== 0 ? " — al ser impar alguien descansa cada ronda" : ""}`,
                    warn: false,
                },
            },
        ];

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 px-1">
                <div className="flex items-stretch gap-2.5">
                    <div className="w-[3px] min-h-8 bg-volt rounded-full shrink-0" />
                    <div>
                        <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-foreground">
                            Formato del torneo
                        </h2>
                        <p className="text-muted-foreground text-[9px] font-black tracking-widest uppercase mt-0.5">
                            {PRESENT_LABEL(isIndividual, presentCount)} · elegí cómo se juega
                        </p>
                    </div>
                </div>
                {onBack && (
                    <button
                        onClick={onBack}
                        className="group flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all font-black uppercase tracking-widest text-[8px] shrink-0 bg-surface px-2.5 py-1.5 rounded-lg border border-hairline"
                    >
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                        Asistencia
                    </button>
                )}
            </div>

            {locked && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-surface border border-hairline">
                    <div className="flex items-start gap-2.5 flex-1">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-relaxed">
                            El fixture ya está armado, así que el formato quedó fijo. Podés cambiarlo igual,
                            pero se borran los partidos y las llaves para volver a armarlos.
                        </p>
                    </div>
                    <button
                        onClick={() => openResetDialog(otherFormat)}
                        className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rojo/10 border border-rojo/25 text-rojo hover:bg-rojo hover:text-white transition-all text-[8px] font-black uppercase tracking-[0.15em]"
                    >
                        <Unlock className="w-3 h-3" />
                        Cambiar a {FORMAT_LABEL[otherFormat]}
                    </button>
                </div>
            )}

            {!locked && !canPlay && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rojo/5 border border-rojo/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-rojo shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold uppercase tracking-wider text-rojo leading-relaxed">
                        Marcá al menos 2 {UNIT_LABEL(isIndividual, 2)} presentes para poder elegir el formato.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cards.map(card => {
                    const Icon = card.icon;
                    const isCurrent = card.format === currentFormat;
                    const isPending = pending === card.format;
                    // When locked the other format stays clickable: it opens the
                    // confirmation dialog rather than switching outright.
                    const isDisabled = locked ? false : (!canPlay || pending !== null);
                    const isDestructive = locked && !isCurrent;

                    return (
                        <button
                            key={card.format}
                            onClick={() => handleSelect(card.format)}
                            disabled={isDisabled}
                            className={`
                                group relative text-left p-4 rounded-2xl border transition-all overflow-hidden
                                ${isCurrent
                                    ? "bg-celeste/5 border-celeste/40 shadow-lg shadow-celeste/5"
                                    : isDestructive
                                        ? "bg-card/40 border-hairline hover:border-rojo/40 hover:bg-rojo/5"
                                        : "bg-card/40 border-hairline hover:border-celeste/40 hover:bg-surface"}
                                ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer active:scale-[0.99]"}
                            `}
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className={`p-2 rounded-xl border ${isCurrent ? "bg-celeste/10 border-celeste/30 text-celeste" : "bg-surface border-hairline text-muted-foreground group-hover:text-celeste"}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="block text-sm font-black uppercase italic tracking-tight text-foreground leading-none">
                                            {card.label}
                                        </span>
                                        <span className="block text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                                            {card.tagline}
                                        </span>
                                    </div>
                                </div>
                                {isCurrent && (
                                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-celeste/10 border border-celeste/20 text-celeste text-[7px] font-black uppercase tracking-[0.15em] shrink-0">
                                        <Check className="w-2.5 h-2.5" />
                                        Actual
                                    </span>
                                )}
                            </div>

                            <ul className="space-y-1.5 mb-3">
                                {card.bullets.map(b => (
                                    <li key={b} className="flex items-start gap-1.5 text-[9px] font-bold text-muted-foreground leading-relaxed">
                                        <span className="w-1 h-1 rounded-full bg-celeste/50 shrink-0 mt-1.5" />
                                        {b}
                                    </li>
                                ))}
                            </ul>

                            {card.hint && (
                                <div className={`flex items-start gap-1.5 p-2 rounded-lg border ${card.hint.warn ? "bg-volt/5 border-volt/20 text-volt-ink" : "bg-surface border-hairline text-muted-foreground"}`}>
                                    {card.hint.warn
                                        ? <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
                                        : <Users2 className="w-3 h-3 shrink-0 mt-px" />}
                                    <span className="text-[8px] font-black uppercase tracking-wider leading-relaxed">
                                        {card.hint.text}
                                    </span>
                                </div>
                            )}

                            <div className={`flex items-center gap-1.5 mt-3 text-[8px] font-black uppercase tracking-[0.2em] ${isDestructive ? "text-rojo" : "text-celeste"}`}>
                                {isPending
                                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Cambiando formato…</>
                                    : isDestructive
                                        ? <><Trash2 className="w-3 h-3" /> Cambiar y rearmar el fixture</>
                                        : <>{isCurrent ? "Continuar" : "Cambiar a este formato"} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /></>}
                            </div>
                        </button>
                    );
                })}
            </div>

            {resetTarget && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-card border border-hairline rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-start justify-between gap-3 p-4 border-b border-hairline">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-rojo/10 border border-rojo/25 text-rojo">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase italic tracking-tight text-foreground leading-none">
                                        Cambiar a {FORMAT_LABEL[resetTarget]}
                                    </h3>
                                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                                        Se rearma el fixture desde cero
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setResetTarget(null)}
                                disabled={confirming}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all disabled:opacity-40"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-3">
                            {!impact ? (
                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground py-3">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Revisando el fixture actual…
                                </div>
                            ) : !impact.ok ? (
                                <p className="text-[9px] font-bold uppercase tracking-wider text-rojo leading-relaxed">
                                    {impact.error || "No se pudo leer el estado del torneo"}
                                </p>
                            ) : impact.isFinalized ? (
                                <p className="text-[9px] font-bold uppercase tracking-wider text-rojo leading-relaxed">
                                    El torneo está finalizado y ya repartió puntos de ranking. No se puede cambiar el formato.
                                </p>
                            ) : (
                                <>
                                    <p className="text-[10px] font-bold text-foreground leading-relaxed">
                                        Se van a borrar y no se pueden recuperar:
                                    </p>
                                    <ul className="space-y-1.5">
                                        {[
                                            { n: impact.groups ?? 0, label: (impact.groups ?? 0) === 1 ? "grupo" : "grupos" },
                                            { n: impact.matches ?? 0, label: (impact.matches ?? 0) === 1 ? "partido de grupos" : "partidos de grupos" },
                                            { n: impact.playedMatches ?? 0, label: "con resultado cargado", danger: true },
                                            { n: impact.bracket ?? 0, label: (impact.bracket ?? 0) === 1 ? "partido de llaves" : "partidos de llaves" },
                                        ].map(row => (
                                            <li key={row.label} className={`flex items-center gap-2 text-[10px] font-bold ${row.danger && row.n > 0 ? "text-rojo" : "text-muted-foreground"}`}>
                                                <Trash2 className="w-3 h-3 shrink-0" />
                                                <span className="font-black tabular-nums">{row.n}</span>
                                                {row.label}
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="p-2.5 rounded-lg bg-surface border border-hairline space-y-1">
                                        <p className="text-[8px] font-black uppercase tracking-wider text-muted-foreground leading-relaxed">
                                            La asistencia y los inscriptos se mantienen. El torneo vuelve al estado
                                            «publicado» hasta que armes el fixture nuevo, así que durante ese rato
                                            vuelve a figurar como abierto en la home.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 p-4 border-t border-hairline">
                            <button
                                onClick={() => setResetTarget(null)}
                                disabled={confirming}
                                className="px-3 py-2 rounded-lg bg-surface border border-hairline text-muted-foreground hover:text-foreground transition-all text-[8px] font-black uppercase tracking-[0.15em] disabled:opacity-40"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmReset}
                                disabled={confirming || !impact?.ok || impact?.isFinalized}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rojo text-white hover:brightness-110 transition-all text-[8px] font-black uppercase tracking-[0.15em] disabled:opacity-40"
                            >
                                {confirming
                                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Rearmando…</>
                                    : <><Trash2 className="w-3 h-3" /> Borrar y cambiar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
