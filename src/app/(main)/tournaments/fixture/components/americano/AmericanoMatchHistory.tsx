"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Search, Trash2, RotateCcw, AlertTriangle, Loader2, Swords } from "lucide-react";
import { Match } from "./types";

interface AmericanoMatchHistoryProps {
    matches: Match[];
    readOnly?: boolean;
    saving: boolean;
    hasBracket: boolean;
    onReopenMatch: (id: string) => Promise<any> | void;
    onDeleteMatch: (id: string) => Promise<any> | void;
}

type HistoryFilter = "all" | "finished" | "live";

export function AmericanoMatchHistory({
    matches,
    readOnly,
    saving,
    hasBracket,
    onReopenMatch,
    onDeleteMatch
}: AmericanoMatchHistoryProps) {
    const [filter, setFilter] = useState<HistoryFilter>("all");
    const [search, setSearch] = useState("");
    const [confirmAction, setConfirmAction] = useState<{ type: "reopen" | "delete"; match: Match } | null>(null);
    const [busyMatchId, setBusyMatchId] = useState<string | null>(null);

    const numbered = useMemo(() => matches.map((m, i) => ({ match: m, seq: i + 1 })), [matches]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return numbered
            .filter(({ match: m }) => {
                if (filter === "finished" && !m.confirmed) return false;
                if (filter === "live" && m.confirmed) return false;
                if (!q) return true;
                return m.team1?.name?.toLowerCase().includes(q) || m.team2?.name?.toLowerCase().includes(q);
            })
            .reverse(); // newest first
    }, [numbered, filter, search]);

    const finishedCount = matches.filter(m => m.confirmed).length;
    const liveCount = matches.length - finishedCount;

    const runAction = async (action: { type: "reopen" | "delete"; match: Match }) => {
        setConfirmAction(null);
        setBusyMatchId(action.match.id);
        try {
            if (action.type === "reopen") await onReopenMatch(action.match.id);
            else await onDeleteMatch(action.match.id);
        } finally {
            setBusyMatchId(null);
        }
    };

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-azul-primary/10 flex items-center justify-center">
                        <History className="w-3.5 h-3.5 text-azul-primary" />
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black uppercase italic tracking-tight">Historial de Partidos</h3>
                        <p className="text-[6px] font-black uppercase tracking-[0.4em] text-foreground/40 leading-none mt-0.5">
                            Registro completo del torneo
                        </p>
                    </div>
                </div>

                <div className="flex items-center p-0.5 bg-muted/40 border border-border/40 rounded-lg gap-0.5">
                    <button onClick={() => setFilter("all")} className={`px-2 py-1 rounded text-[7px] font-black uppercase tracking-widest transition-all ${filter === "all" ? "bg-foreground text-background" : "hover:bg-muted text-foreground/60"}`}>
                        Todos ({matches.length})
                    </button>
                    <button onClick={() => setFilter("finished")} className={`px-2 py-1 rounded text-[7px] font-black uppercase tracking-widest transition-all ${filter === "finished" ? "bg-azul-primary text-white" : "hover:bg-muted text-foreground/60"}`}>
                        Finalizados ({finishedCount})
                    </button>
                    <button onClick={() => setFilter("live")} className={`px-2 py-1 rounded text-[7px] font-black uppercase tracking-widest transition-all ${filter === "live" ? "bg-rojo text-white" : "hover:bg-muted text-foreground/60"}`}>
                        En Juego ({liveCount})
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/20" />
                <input
                    type="text"
                    placeholder="Buscar por jugador..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-card/40 backdrop-blur-xl border border-border/40 rounded-lg py-1.5 pl-8 pr-3 text-[9px] font-bold outline-none focus:ring-1 focus:ring-azul-primary transition-all placeholder:text-foreground/20"
                />
            </div>

            {/* Bracket lock notice */}
            {!readOnly && hasBracket && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <p className="text-[8px] font-black uppercase tracking-wider text-amber-500 leading-relaxed">
                        Las eliminatorias están activas: no se pueden reabrir ni eliminar partidos de grupos. Reiniciá el cuadro para modificar.
                    </p>
                </div>
            )}

            {/* Match list */}
            {filtered.length === 0 ? (
                <div className="py-14 text-center flex flex-col items-center gap-3 border-2 border-dashed border-border/40 rounded-xl bg-card/20">
                    <Swords className="w-8 h-8 text-foreground/10" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40 italic">
                        {matches.length === 0 ? "Todavía no se jugaron partidos" : "Sin resultados para este filtro"}
                    </span>
                </div>
            ) : (
                <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-lg overflow-hidden shadow-sm divide-y divide-border/30">
                    {filtered.map(({ match: m, seq }) => {
                        const winnerIs1 = m.confirmed && (m.score1 ?? 0) > (m.score2 ?? 0);
                        const winnerIs2 = m.confirmed && (m.score2 ?? 0) > (m.score1 ?? 0);
                        const isBusy = busyMatchId === m.id;
                        const actionsLocked = saving || isBusy || hasBracket;
                        return (
                            <div key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/20 transition-all">
                                {/* Seq + court */}
                                <div className="flex flex-col items-center w-10 shrink-0">
                                    <span className="text-[8px] font-black italic text-foreground/40">#{seq}</span>
                                    {m.courtNumber && (
                                        <span className="text-[6px] font-black uppercase tracking-wider text-foreground/30">C{m.courtNumber}</span>
                                    )}
                                </div>

                                {/* Teams + score */}
                                <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
                                    <span className={`text-[9px] font-black uppercase italic truncate text-right ${winnerIs1 ? "text-azul-primary" : "text-foreground/70"}`}>
                                        {m.team1?.name}
                                    </span>
                                    <span className="text-[10px] font-black italic tabular-nums text-foreground bg-muted/30 border border-border/30 rounded px-1.5 py-0.5 shrink-0">
                                        {m.score1 ?? 0} - {m.score2 ?? 0}
                                    </span>
                                    <span className={`text-[9px] font-black uppercase italic truncate ${winnerIs2 ? "text-azul-primary" : "text-foreground/70"}`}>
                                        {m.team2?.name}
                                    </span>
                                </div>

                                {/* Status */}
                                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[6px] font-black uppercase tracking-wider border ${m.confirmed
                                    ? "bg-azul-primary/10 border-azul-primary/20 text-azul-primary"
                                    : "bg-rojo/10 border-rojo/20 text-rojo animate-pulse"}`}>
                                    {m.confirmed ? "Final" : "En Juego"}
                                </span>

                                {/* Actions */}
                                {!readOnly && m.confirmed && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => setConfirmAction({ type: "reopen", match: m })}
                                            disabled={actionsLocked}
                                            title={hasBracket ? "Eliminatorias activas" : "Volver a jugar (reabre el partido en una cancha libre)"}
                                            className="w-6 h-6 rounded inline-flex items-center justify-center border border-border/40 bg-muted/30 text-foreground/30 hover:border-azul-primary/40 hover:text-azul-primary transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            {isBusy ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RotateCcw className="w-2.5 h-2.5" />}
                                        </button>
                                        <button
                                            onClick={() => setConfirmAction({ type: "delete", match: m })}
                                            disabled={actionsLocked}
                                            title={hasBracket ? "Eliminatorias activas" : "Eliminar partido del registro"}
                                            className="w-6 h-6 rounded inline-flex items-center justify-center border border-border/40 bg-muted/30 text-foreground/30 hover:border-rojo/40 hover:text-rojo transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            {isBusy ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Confirm modal */}
            <AnimatePresence>
                {confirmAction && (() => {
                    const isReopen = confirmAction.type === "reopen";
                    const m = confirmAction.match;
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
                                <div className={`w-14 h-14 rounded-full border flex items-center justify-center ${isReopen
                                    ? "bg-azul-primary/10 border-azul-primary/30 text-azul-primary"
                                    : "bg-rojo/10 border-rojo/30 text-rojo"}`}>
                                    {isReopen ? <RotateCcw className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-base font-black uppercase italic tracking-tight text-foreground leading-tight">
                                        {isReopen ? "Volver a jugar el partido" : "Eliminar partido del registro"}
                                    </h3>
                                    <p className="text-xs text-foreground/60 leading-relaxed">
                                        {isReopen
                                            ? "El resultado se quitará de la tabla y el partido volverá a una cancha libre con el marcador actual para corregirlo y confirmarlo de nuevo."
                                            : "El partido y su resultado se eliminarán definitivamente. Los partidos jugados de cada participante se recalcularán."}
                                    </p>
                                </div>

                                <div className="w-full bg-muted/20 border border-border/30 rounded-xl px-3 py-2.5 flex items-center justify-center gap-2">
                                    <span className="text-[9px] font-black uppercase italic text-foreground/80 truncate max-w-[35%] text-right">
                                        {m.team1?.name}
                                    </span>
                                    <span className="text-sm font-black italic tabular-nums text-foreground shrink-0">
                                        {m.score1 ?? 0} - {m.score2 ?? 0}
                                    </span>
                                    <span className="text-[9px] font-black uppercase italic text-foreground/80 truncate max-w-[35%] text-left">
                                        {m.team2?.name}
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
                                        className={`flex-1 py-3 rounded-xl text-white font-black uppercase italic text-[10px] tracking-wider transition-all shadow-lg cursor-pointer ${isReopen
                                            ? "bg-azul-primary hover:bg-azul-dark shadow-azul-primary/20"
                                            : "bg-rojo hover:bg-red-600 shadow-rojo/20"}`}
                                    >
                                        {isReopen ? "Volver a Jugar" : "Eliminar"}
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
