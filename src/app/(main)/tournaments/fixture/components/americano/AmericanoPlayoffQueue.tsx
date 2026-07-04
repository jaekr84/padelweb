"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ListOrdered, Play, Flag, RotateCcw, Loader2,
    Minus, Plus, Trophy, Clock, AlertTriangle, ArrowLeftRight
} from "lucide-react";
import { BracketMatch, Player } from "./types";

interface AmericanoPlayoffQueueProps {
    bracket: BracketMatch[];
    readOnly?: boolean;
    saving: boolean;
    handleBracketScore: (matchId: string, s1: string, s2: string) => void;
    handleBracketStart: (matchId: string) => void | Promise<any>;
    handleBracketConfirm: (matchId: string) => void | Promise<any>;
    handleBracketEdit: (matchId: string) => void | Promise<any>;
    // Manual reordering of pairs in the bracket (robin playoffs). Optional so the
    // americano flow can render the same queue without swap controls.
    handleSwapPlayers?: (matchId: string, teamSlot: 1 | 2) => void;
    swappingPlayer?: { matchId: string; teamSlot: 1 | 2 } | null;
    // When the reopen handler brings its own confirmation (robin), skip the queue's modal
    skipReopenConfirm?: boolean;
}

type MatchStatus = "bye" | "finished" | "live" | "ready" | "waiting";

const roundTitle = (round: number) => {
    switch (round) {
        case 0: return "Final";
        case 1: return "Semifinales";
        case 2: return "Cuartos de Final";
        case 3: return "Octavos de Final";
        case 4: return "16avos de Final";
        default: return `Ronda de ${Math.pow(2, round + 1)}`;
    }
};

const teamName = (slot: BracketMatch["team1"]) =>
    slot && typeof slot !== "string" ? (slot as Player).name : null;

export function AmericanoPlayoffQueue({
    bracket,
    readOnly,
    saving,
    handleBracketScore,
    handleBracketStart,
    handleBracketConfirm,
    handleBracketEdit,
    handleSwapPlayers,
    swappingPlayer,
    skipReopenConfirm
}: AmericanoPlayoffQueueProps) {
    const [confirmAction, setConfirmAction] = useState<{ type: "start" | "finish" | "reopen"; match: BracketMatch } | null>(null);
    const [busyMatchId, setBusyMatchId] = useState<string | null>(null);

    // A pair can be reordered while it is a real (non-BYE, non-placeholder) team
    // and its match has not started or finished. Reuses the tested swap logic.
    const canSwap = (m: BracketMatch, slot: 1 | 2): boolean => {
        if (readOnly || !handleSwapPlayers) return false;
        if (m.confirmed || m.status === "live" || m.status === "in_progress") return false;
        const t = slot === 1 ? m.team1 : m.team2;
        if (!t || typeof t === "string") return false; // null slot or "BYE"
        if ((t as any).id?.startsWith?.("TBD")) return false;
        return true;
    };

    // Play order: first round first, then inward to the final; sequential numbering
    const ordered = useMemo(() =>
        [...bracket].sort((a, b) => (b.round - a.round) || (a.slot - b.slot)),
    [bracket]);

    const seqMap = useMemo(() => new Map(ordered.map((m, i) => [m.id, i + 1])), [ordered]);

    const statusOf = (m: BracketMatch): MatchStatus => {
        const isBye = (m.team1 as any) === "BYE" || (m.team2 as any) === "BYE";
        if (m.confirmed) return isBye ? "bye" : "finished";
        // "live" (americano) / "in_progress" (robin)
        if (m.status === "live" || m.status === "in_progress") return "live";
        if (teamName(m.team1) && teamName(m.team2)) return "ready";
        return "waiting";
    };

    // Placeholder for undefined teams: which earlier match feeds this slot
    const feederLabel = (m: BracketMatch, side: 0 | 1) => {
        const feeder = bracket.find(f => f.round === m.round + 1 && f.slot === m.slot * 2 + side);
        return feeder ? `Ganador P${seqMap.get(feeder.id)}` : "A definir";
    };

    const rounds = useMemo(() => {
        const maxRound = bracket.length ? Math.max(...bracket.map(m => m.round)) : 0;
        return Array.from({ length: maxRound + 1 }, (_, i) => maxRound - i);
    }, [bracket]);

    const runAction = async (action: NonNullable<typeof confirmAction>) => {
        setConfirmAction(null);
        setBusyMatchId(action.match.id);
        try {
            if (action.type === "start") await handleBracketStart(action.match.id);
            else if (action.type === "finish") await handleBracketConfirm(action.match.id);
            else await handleBracketEdit(action.match.id);
        } finally {
            setBusyMatchId(null);
        }
    };

    const onFinishClick = (m: BracketMatch) => {
        if ((m.score1 ?? 0) === (m.score2 ?? 0)) {
            // handleBracketConfirm rejects ties anyway; fail fast before the modal
            return;
        }
        setConfirmAction({ type: "finish", match: m });
    };

    if (bracket.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
                <div className="w-7 h-7 rounded-lg bg-azul-primary/10 flex items-center justify-center">
                    <ListOrdered className="w-3.5 h-3.5 text-azul-primary" />
                </div>
                <div>
                    <h3 className="text-[11px] font-black uppercase italic tracking-tight">Orden de Partidos</h3>
                    <p className="text-[6px] font-black uppercase tracking-[0.4em] text-foreground/40 leading-none mt-0.5">
                        Gestión de la fase eliminatoria
                    </p>
                </div>
            </div>

            {swappingPlayer && handleSwapPlayers && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-azul-primary/10 border border-azul-primary/30">
                    <span className="text-[10px] font-black uppercase italic tracking-wide text-azul-primary flex items-center gap-1.5">
                        <ArrowLeftRight className="w-3 h-3" />
                        Intercambio activo — elegí otra pareja para completar el cambio
                    </span>
                    <button
                        type="button"
                        onClick={() => handleSwapPlayers(swappingPlayer.matchId, swappingPlayer.teamSlot)}
                        className="shrink-0 text-[9px] font-black uppercase tracking-widest text-foreground/50 hover:text-rojo transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {rounds.map(round => {
                const roundMatches = ordered.filter(m => m.round === round);
                const playable = roundMatches.filter(m => (m.team1 as any) !== "BYE" && (m.team2 as any) !== "BYE");
                const done = playable.filter(m => m.confirmed).length;

                return (
                    <div key={round} className="space-y-1.5">
                        <div className="flex items-center justify-between px-1 pt-1">
                            <span className="px-2.5 py-0.5 bg-foreground text-background rounded text-[9px] font-black uppercase tracking-[0.2em] italic">
                                {round === 0 ? "🏆 " : ""}{roundTitle(round)}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40">
                                {done} / {playable.length} jugados
                            </span>
                        </div>

                        <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-lg overflow-hidden shadow-sm divide-y divide-border/30">
                            {roundMatches.map(m => {
                                const status = statusOf(m);
                                const seq = seqMap.get(m.id);
                                const name1 = teamName(m.team1);
                                const name2 = teamName(m.team2);
                                const isBusy = busyMatchId === m.id;
                                const isLive = status === "live";
                                const winnerIs1 = m.confirmed && (m.score1 ?? 0) > (m.score2 ?? 0);
                                const winnerIs2 = m.confirmed && (m.score2 ?? 0) > (m.score1 ?? 0);
                                const isTie = (m.score1 ?? 0) === (m.score2 ?? 0);

                                if (status === "bye") {
                                    const advancing = name1 && (m.team1 as any) !== "BYE" ? name1 : name2;
                                    return (
                                        <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 opacity-40">
                                            <span className="w-9 shrink-0 text-[10px] font-black italic text-foreground/40">P{seq}</span>
                                            <span className="flex-1 text-[11px] font-black uppercase italic text-foreground/60 truncate">{advancing}</span>
                                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-muted/40 border border-border/30 text-foreground/40">
                                                BYE — Pasa directo
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={m.id} className={`flex flex-col md:flex-row md:items-center gap-2 px-3 py-2 transition-all ${
                                        isLive ? "bg-rojo/[0.03]" : status === "finished" ? "opacity-70" : status === "waiting" ? "opacity-50" : ""
                                    }`}>
                                        <span className="w-9 shrink-0 text-[10px] font-black italic text-foreground/40">P{seq}</span>

                                        {/* Teams + score */}
                                        <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
                                            <div className="flex items-center justify-end gap-1.5 min-w-0">
                                                {canSwap(m, 1) && (
                                                    <SwapButton
                                                        active={swappingPlayer?.matchId === m.id && swappingPlayer?.teamSlot === 1}
                                                        onClick={() => handleSwapPlayers!(m.id, 1)}
                                                    />
                                                )}
                                                <span className={`text-[11px] font-black uppercase italic truncate text-right ${
                                                    winnerIs1 ? "text-azul-primary" : name1 ? "text-foreground/80" : "text-foreground/30"
                                                }`}>
                                                    {name1 || feederLabel(m, 0)}
                                                </span>
                                            </div>

                                            {isLive && !readOnly ? (
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <ScoreStepper
                                                        value={m.score1 ?? 0}
                                                        onChange={(v) => handleBracketScore(m.id, String(v), String(m.score2 ?? 0))}
                                                        disabled={isBusy || saving}
                                                    />
                                                    <span className="text-[10px] font-black italic text-rojo">VS</span>
                                                    <ScoreStepper
                                                        value={m.score2 ?? 0}
                                                        onChange={(v) => handleBracketScore(m.id, String(m.score1 ?? 0), String(v))}
                                                        disabled={isBusy || saving}
                                                    />
                                                </div>
                                            ) : (
                                                <span className={`text-sm font-black italic tabular-nums shrink-0 rounded px-1.5 py-0.5 border ${
                                                    status === "finished"
                                                        ? "text-foreground bg-muted/30 border-border/30"
                                                        : "text-foreground/30 bg-transparent border-transparent"
                                                }`}>
                                                    {status === "finished" || isLive ? `${m.score1 ?? 0} - ${m.score2 ?? 0}` : "VS"}
                                                </span>
                                            )}

                                            <div className="flex items-center justify-start gap-1.5 min-w-0">
                                                <span className={`text-[11px] font-black uppercase italic truncate ${
                                                    winnerIs2 ? "text-azul-primary" : name2 ? "text-foreground/80" : "text-foreground/30"
                                                }`}>
                                                    {name2 || feederLabel(m, 1)}
                                                </span>
                                                {canSwap(m, 2) && (
                                                    <SwapButton
                                                        active={swappingPlayer?.matchId === m.id && swappingPlayer?.teamSlot === 2}
                                                        onClick={() => handleSwapPlayers!(m.id, 2)}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Status + actions */}
                                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                                            {status === "finished" && (
                                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-azul-primary/10 border border-azul-primary/20 text-azul-primary flex items-center gap-1">
                                                    <Trophy className="w-2.5 h-2.5" />
                                                    {winnerIs1 ? name1 : name2}
                                                </span>
                                            )}
                                            {status === "waiting" && (
                                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-muted/40 border border-border/30 text-foreground/40 flex items-center gap-1">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    Esperando Rivales
                                                </span>
                                            )}
                                            {isLive && (
                                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rojo/10 border border-rojo/20 text-rojo animate-pulse">
                                                    En Juego
                                                </span>
                                            )}

                                            {!readOnly && status === "ready" && (
                                                <button
                                                    onClick={() => setConfirmAction({ type: "start", match: m })}
                                                    disabled={saving || isBusy}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-azul-primary hover:bg-azul-dark text-white rounded-md text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm shadow-azul-primary/20 disabled:opacity-50"
                                                >
                                                    {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                                                    Iniciar
                                                </button>
                                            )}
                                            {!readOnly && isLive && (
                                                <button
                                                    onClick={() => onFinishClick(m)}
                                                    disabled={saving || isBusy || isTie}
                                                    title={isTie ? "No se permiten empates: cargá el marcador" : "Finalizar partido"}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                                                >
                                                    {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flag className="w-3 h-3" />}
                                                    Finalizar
                                                </button>
                                            )}
                                            {!readOnly && status === "finished" && (
                                                <button
                                                    onClick={() => skipReopenConfirm
                                                        ? handleBracketEdit(m.id)
                                                        : setConfirmAction({ type: "reopen", match: m })}
                                                    disabled={saving || isBusy}
                                                    title="Corregir resultado (reabre el partido)"
                                                    className="w-7 h-7 rounded inline-flex items-center justify-center border border-border/40 bg-muted/30 text-foreground/30 hover:border-azul-primary/40 hover:text-azul-primary transition-all active:scale-95 disabled:opacity-30"
                                                >
                                                    {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* Confirm modal */}
            <AnimatePresence>
                {confirmAction && (() => {
                    const m = confirmAction.match;
                    const config = confirmAction.type === "start"
                        ? {
                            icon: <Play className="w-6 h-6 fill-current" />,
                            iconBox: "bg-azul-primary/10 border-azul-primary/30 text-azul-primary",
                            title: "Vas a iniciar el partido",
                            description: "El partido quedará marcado en juego y podrás cargar el marcador desde la lista.",
                            confirmLabel: "Iniciar Partido",
                            confirmClass: "bg-azul-primary hover:bg-azul-dark shadow-azul-primary/20"
                        }
                        : confirmAction.type === "finish"
                        ? {
                            icon: <Flag className="w-6 h-6" />,
                            iconBox: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
                            title: "Vas a finalizar el partido",
                            description: "El ganador avanzará automáticamente a la siguiente ronda del cuadro.",
                            confirmLabel: "Finalizar Partido",
                            confirmClass: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                        }
                        : {
                            icon: <AlertTriangle className="w-6 h-6" />,
                            iconBox: "bg-amber-500/10 border-amber-500/30 text-amber-500",
                            title: "Vas a corregir el resultado",
                            description: "El partido se reabre para editar el marcador. El ganador se quitará de la siguiente ronda.",
                            confirmLabel: "Reabrir Partido",
                            confirmClass: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                        };

                    return (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setConfirmAction(null)}
                                className="absolute inset-0 bg-black/75 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ scale: 0.92, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.92, opacity: 0, y: 10 }}
                                className="relative w-full max-w-sm bg-card border border-border/40 rounded-2xl p-6 shadow-2xl z-10 flex flex-col items-center text-center gap-4"
                            >
                                <div className={`w-14 h-14 rounded-full border flex items-center justify-center ${config.iconBox}`}>
                                    {config.icon}
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-base font-black uppercase italic tracking-tight text-foreground leading-tight">
                                        {config.title}
                                    </h3>
                                    <p className="text-xs text-foreground/60 leading-relaxed">{config.description}</p>
                                </div>

                                <div className="w-full bg-muted/20 border border-border/30 rounded-xl px-3 py-2.5 flex items-center justify-center gap-2">
                                    <span className="text-[9px] font-black uppercase italic text-foreground/80 truncate max-w-[35%] text-right">
                                        {teamName(m.team1)}
                                    </span>
                                    <span className="text-sm font-black italic tabular-nums text-foreground shrink-0">
                                        {confirmAction.type === "start" ? "VS" : `${m.score1 ?? 0} - ${m.score2 ?? 0}`}
                                    </span>
                                    <span className="text-[9px] font-black uppercase italic text-foreground/80 truncate max-w-[35%] text-left">
                                        {teamName(m.team2)}
                                    </span>
                                </div>

                                <div className="w-full flex gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmAction(null)}
                                        className="flex-1 py-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 text-foreground/70 font-black uppercase italic text-[10px] tracking-wider transition-all cursor-pointer"
                                    >
                                        Volver
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => runAction(confirmAction)}
                                        className={`flex-1 py-3 rounded-xl text-white font-black uppercase italic text-[10px] tracking-wider transition-all shadow-lg cursor-pointer ${config.confirmClass}`}
                                    >
                                        {config.confirmLabel}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
}

function SwapButton({ active, onClick }: { active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={active ? "Cancelar intercambio" : "Intercambiar esta pareja de posición"}
            className={`shrink-0 w-5 h-5 rounded inline-flex items-center justify-center border transition-all active:scale-95 ${
                active
                    ? "bg-azul-primary text-white border-white/30 animate-pulse shadow-sm shadow-azul-primary/30"
                    : "bg-muted/30 text-foreground/30 border-border/40 hover:border-azul-primary/40 hover:text-azul-primary"
            }`}
        >
            <ArrowLeftRight className="w-3 h-3" />
        </button>
    );
}

function ScoreStepper({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
    return (
        <div className="flex items-center gap-0.5">
            <button
                type="button"
                onClick={() => onChange(Math.max(0, value - 1))}
                disabled={disabled}
                className="w-5 h-5 rounded bg-rojo/10 text-rojo border border-rojo/20 hover:bg-rojo hover:text-white transition-all flex items-center justify-center active:scale-95 disabled:opacity-40"
            >
                <Minus className="w-2.5 h-2.5 stroke-[3]" />
            </button>
            <span className="w-6 text-center text-sm font-black italic tabular-nums text-foreground">{value}</span>
            <button
                type="button"
                onClick={() => onChange(value + 1)}
                disabled={disabled}
                className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center active:scale-95 disabled:opacity-40"
            >
                <Plus className="w-2.5 h-2.5 stroke-[3]" />
            </button>
        </div>
    );
}
