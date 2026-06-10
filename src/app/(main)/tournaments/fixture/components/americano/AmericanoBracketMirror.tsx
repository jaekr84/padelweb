"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, RotateCcw, X, Eye } from "lucide-react";
import { BracketMatch, Player } from "./types";

interface AmericanoBracketMirrorProps {
    bracket: BracketMatch[];
    readOnly?: boolean;
    onResetBracket?: () => void;
}

const teamOf = (slot: BracketMatch["team1"]): Player | null =>
    slot && typeof slot !== "string" ? (slot as Player) : null;

const roundTitle = (round: number, short = false) => {
    switch (round) {
        case 0: return "FINAL";
        case 1: return short ? "SEMIS" : "SEMIFINALES";
        case 2: return "CUARTOS";
        case 3: return "OCTAVOS";
        case 4: return "16AVOS";
        default: return `R${Math.pow(2, round + 1)}`;
    }
};

export function AmericanoBracketMirror({
    bracket,
    readOnly,
    onResetBracket
}: AmericanoBracketMirrorProps) {
    const [detailMatch, setDetailMatch] = useState<BracketMatch | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);

    const maxRound = useMemo(() =>
        bracket.length ? Math.max(...bracket.map(m => m.round)) : 0,
    [bracket]);

    // Mirror columns: outer rounds at the edges, final at the center.
    // Round r (r>0) splits by slot: first half left, second half right.
    const columns = useMemo(() => {
        const cols: { key: string; round: number; side: "L" | "C" | "R"; matches: BracketMatch[] }[] = [];
        const byRound = (r: number) => bracket.filter(m => m.round === r).sort((a, b) => a.slot - b.slot);

        for (let r = maxRound; r >= 1; r--) {
            const ms = byRound(r);
            const half = Math.pow(2, r - 1);
            cols.push({ key: `L${r}`, round: r, side: "L", matches: ms.filter(m => m.slot < half) });
        }
        cols.push({ key: "C0", round: 0, side: "C", matches: byRound(0) });
        for (let r = 1; r <= maxRound; r++) {
            const ms = byRound(r);
            const half = Math.pow(2, r - 1);
            cols.push({ key: `R${r}`, round: r, side: "R", matches: ms.filter(m => m.slot >= half) });
        }
        return cols;
    }, [bracket, maxRound]);

    const champion = useMemo(() => {
        const final = bracket.find(m => m.round === 0);
        return final?.confirmed ? final.winnerName ?? null : null;
    }, [bracket]);

    // Shared column height: driven by the densest (outermost) column.
    // 120px per cell leaves vertical clearance so brick-overlapped columns interlock without touching.
    const cellsPerOuterCol = Math.max(Math.pow(2, Math.max(maxRound - 1, 0)), 1);
    const colHeight = Math.max(cellsPerOuterCol * 120, 300);

    // Brick layout: same-side neighbor columns overlap 50% horizontally — their cells
    // interlock vertically. Across the center (semi → final → semi) both cells are
    // vertically centered, so those columns don't overlap.
    const COL_WIDTH = 185;

    if (bracket.length === 0) return null;

    return (
        <div className="space-y-3 border-t border-border/40 pt-8 mt-8">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-azul-primary/10 flex items-center justify-center">
                        <Trophy className="w-3.5 h-3.5 text-azul-primary" />
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black uppercase italic tracking-tight">Cuadro de Eliminatorias</h3>
                        <p className="text-[6px] font-black uppercase tracking-[0.4em] text-foreground/40 leading-none mt-0.5">
                            Referencia visual • Click en un partido para ver detalle
                        </p>
                    </div>
                </div>
                {!readOnly && onResetBracket && (
                    <button
                        onClick={() => setConfirmReset(true)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-rojo/5 text-rojo hover:bg-rojo hover:text-white transition-all text-[7px] font-black uppercase tracking-widest"
                        title="Reiniciar Cuadro"
                    >
                        <RotateCcw className="w-2.5 h-2.5" />
                        Reiniciar
                    </button>
                )}
            </div>

            <div className="bg-card/30 backdrop-blur-xl border border-border/30 rounded-xl p-4 overflow-x-auto custom-scrollbar">
                <div className="flex items-stretch min-w-max mx-auto w-fit">
                    {columns.map((col, idx) => {
                        const prev = columns[idx - 1];
                        const interlocks = !!prev && prev.side === col.side;
                        return (
                        <div
                            key={col.key}
                            className="flex flex-col pointer-events-none"
                            style={{
                                width: COL_WIDTH,
                                marginLeft: idx === 0 ? 0 : interlocks ? -COL_WIDTH / 2 : 10,
                                zIndex: idx + 1
                            }}
                        >
                            <div className="text-center mb-2">
                                <span className={`text-[9px] font-black uppercase tracking-[0.25em] ${col.side === "C" ? "text-celeste" : "text-foreground/40"}`}>
                                    {col.side === "C" ? "🏆 FINAL" : roundTitle(col.round, true)}
                                </span>
                            </div>
                            <div className="flex flex-col justify-around shrink-0" style={{ height: colHeight }}>
                                {col.side === "C" && champion && (
                                    <div className="text-center px-1 py-1.5 rounded-lg bg-celeste/10 border border-celeste/30">
                                        <span className="block text-[8px] font-black uppercase tracking-[0.3em] text-celeste">Campeón</span>
                                        <span className="block text-[11px] font-black uppercase italic text-foreground truncate mt-0.5">{champion}</span>
                                    </div>
                                )}
                                {col.matches.map(m => (
                                    <MirrorCell key={m.id} match={m} onClick={() => setDetailMatch(m)} />
                                ))}
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>

            {/* VS detail modal */}
            <AnimatePresence>
                {detailMatch && (
                    <VersusModal match={detailMatch} onClose={() => setDetailMatch(null)} />
                )}
            </AnimatePresence>

            {/* Reset confirm */}
            <AnimatePresence>
                {confirmReset && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setConfirmReset(false)}
                            className="absolute inset-0 bg-black/75 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 10 }}
                            className="relative w-full max-w-sm bg-card border border-border/40 rounded-2xl p-6 shadow-2xl z-10 flex flex-col items-center text-center gap-4"
                        >
                            <div className="w-14 h-14 rounded-full border bg-rojo/10 border-rojo/30 text-rojo flex items-center justify-center">
                                <RotateCcw className="w-6 h-6" />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-base font-black uppercase italic tracking-tight text-foreground leading-tight">
                                    Vas a reiniciar el cuadro
                                </h3>
                                <p className="text-xs text-foreground/60 leading-relaxed">
                                    Se borran todas las llaves y resultados de eliminatorias y el torneo vuelve a la fase de grupos.
                                </p>
                            </div>
                            <div className="w-full flex gap-2 pt-1">
                                <button
                                    onClick={() => setConfirmReset(false)}
                                    className="flex-1 py-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 text-foreground/70 font-black uppercase italic text-[10px] tracking-wider transition-all cursor-pointer"
                                >
                                    Volver
                                </button>
                                <button
                                    onClick={() => { setConfirmReset(false); onResetBracket?.(); }}
                                    className="flex-1 py-3 rounded-xl bg-rojo hover:bg-red-600 text-white font-black uppercase italic text-[10px] tracking-wider transition-all shadow-lg shadow-rojo/20 cursor-pointer"
                                >
                                    Reiniciar Cuadro
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MirrorCell({ match, onClick }: { match: BracketMatch; onClick: () => void }) {
    const t1 = teamOf(match.team1);
    const t2 = teamOf(match.team2);
    const isBye = (match.team1 as any) === "BYE" || (match.team2 as any) === "BYE";
    const isLive = !match.confirmed && match.status === "live";
    const winnerIs1 = match.confirmed && (match.score1 ?? 0) > (match.score2 ?? 0);
    const winnerIs2 = match.confirmed && (match.score2 ?? 0) > (match.score1 ?? 0);

    const rowName = (slot: BracketMatch["team1"], p: Player | null) =>
        (slot as any) === "BYE" ? "BYE" : p ? p.name : "A definir";

    return (
        <button
            type="button"
            onClick={onClick}
            className={`group/cell pointer-events-auto relative w-full text-left rounded-md border transition-all cursor-pointer overflow-hidden
                ${isLive
                    ? "border-rojo/40 bg-rojo/[0.04] shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                    : match.confirmed && !isBye
                        ? "border-border/30 bg-muted/10 opacity-70 hover:opacity-100"
                        : isBye
                            ? "border-border/20 bg-muted/5 opacity-40"
                            : "border-border/30 bg-card/40 hover:border-azul-primary/40"
                }`}
            title="Ver detalle"
        >
            {[1, 2].map(side => {
                const p = side === 1 ? t1 : t2;
                const slot = side === 1 ? match.team1 : match.team2;
                const isWinner = side === 1 ? winnerIs1 : winnerIs2;
                const score = side === 1 ? match.score1 : match.score2;
                return (
                    <div key={side} className={`flex items-center justify-between gap-1 px-2 py-1 ${side === 1 ? "border-b border-border/20" : ""} ${isWinner ? "bg-azul-primary/10" : ""}`}>
                        <span className={`text-[10px] font-black uppercase italic truncate ${
                            isWinner ? "text-azul-primary" : p ? "text-foreground/80" : "text-foreground/30"
                        }`}>
                            {rowName(slot, p)}
                        </span>
                        <span className={`text-[11px] font-black italic tabular-nums shrink-0 ${isWinner ? "text-azul-primary" : "text-foreground/40"}`}>
                            {match.confirmed && !isBye ? score ?? 0 : isLive ? score ?? 0 : ""}
                        </span>
                    </div>
                );
            })}
            {isLive && (
                <div className="flex items-center justify-center gap-1 py-[3px] bg-rojo/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-rojo animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-rojo">En Juego</span>
                </div>
            )}
            {/* Hover overlay — absolute so the cell (and the diagram) never changes size */}
            <div className="absolute inset-0 hidden group-hover/cell:flex items-center justify-center gap-1 bg-background/80 backdrop-blur-[2px] pointer-events-none">
                <Eye className="w-3.5 h-3.5 text-azul-primary" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-azul-primary">Ver Detalle</span>
            </div>
        </button>
    );
}

// ── Fighting-game style VS modal ──

function VersusModal({ match, onClose }: { match: BracketMatch; onClose: () => void }) {
    const t1 = teamOf(match.team1);
    const t2 = teamOf(match.team2);
    const isLive = !match.confirmed && match.status === "live";
    const winnerIs1 = match.confirmed && (match.score1 ?? 0) > (match.score2 ?? 0);
    const winnerIs2 = match.confirmed && (match.score2 ?? 0) > (match.score1 ?? 0);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-hidden">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-lg"
            />

            {/* Impact flash */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.55, 0] }}
                transition={{ delay: 0.4, duration: 0.45, times: [0, 0.2, 1] }}
                className="absolute inset-0 bg-white pointer-events-none z-20"
            />

            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-5"
            >
                {/* Round label */}
                <motion.div
                    initial={{ y: -25, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-center"
                >
                    <span className="px-4 py-1 bg-white/10 border border-white/20 rounded-full text-[8px] font-black uppercase tracking-[0.35em] text-white">
                        {roundTitle(match.round)}
                    </span>
                </motion.div>

                <div className="w-full flex items-center justify-center gap-3 md:gap-6">
                    <FighterSide team={t1} side="left" isWinner={winnerIs1} dimmed={winnerIs2} />

                    {/* VS + score */}
                    <div className="flex flex-col items-center gap-2 shrink-0 z-10">
                        <motion.span
                            initial={{ scale: 4, opacity: 0, rotate: -12 }}
                            animate={{ scale: 1, opacity: 1, rotate: -6 }}
                            transition={{ delay: 0.38, type: "spring", stiffness: 320, damping: 13 }}
                            className="text-5xl md:text-6xl font-black italic text-rojo drop-shadow-[0_0_25px_rgba(239,68,68,0.7)] select-none"
                        >
                            VS
                        </motion.span>
                        {(match.confirmed || isLive) && (
                            <motion.span
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="text-2xl font-black italic tabular-nums text-white bg-white/10 border border-white/20 rounded-lg px-3 py-1"
                            >
                                {match.score1 ?? 0} - {match.score2 ?? 0}
                            </motion.span>
                        )}
                        {isLive && (
                            <motion.span
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                                className="text-[8px] font-black uppercase tracking-[0.3em] text-rojo animate-pulse"
                            >
                                ● En Juego
                            </motion.span>
                        )}
                    </div>

                    <FighterSide team={t2} side="right" isWinner={winnerIs2} dimmed={winnerIs1} />
                </div>

                {/* Winner banner */}
                {match.confirmed && (winnerIs1 || winnerIs2) && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.75 }}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-celeste/10 border border-celeste/30"
                    >
                        <Trophy className="w-4 h-4 text-celeste" />
                        <span className="text-[10px] font-black uppercase italic tracking-wide text-white">
                            Ganador: {winnerIs1 ? t1?.name : t2?.name}
                        </span>
                    </motion.div>
                )}

                <motion.button
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                    onClick={onClose}
                    className="absolute -top-2 -right-2 md:top-0 md:right-0 w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all text-white"
                >
                    <X className="w-4 h-4" />
                </motion.button>
            </motion.div>
        </div>
    );
}

function FighterSide({ team, side, isWinner, dimmed }: {
    team: Player | null;
    side: "left" | "right";
    isWinner: boolean;
    dimmed: boolean;
}) {
    const names = team ? team.name.split(/[\/\+]/).map(n => n.trim()).filter(Boolean) : ["A definir"];
    const images = team ? [team.image || null, team.partnerImage || null] : [null];

    return (
        <div className={`flex gap-2 min-w-0 ${side === "left" ? "justify-end" : "justify-start"} ${dimmed ? "opacity-50 grayscale-[0.6]" : ""} transition-all`}>
            {names.map((n, i) => (
                <motion.div
                    key={i}
                    initial={{ x: side === "left" ? -380 : 380, opacity: 0, rotate: side === "left" ? -10 : 10 }}
                    animate={{ x: 0, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 230, damping: 21, delay: 0.12 + i * 0.08 }}
                    className="w-[105px] md:w-[130px]"
                >
                    <div
                        className={`p-[1.5px] transition-all ${isWinner ? "bg-celeste shadow-[0_0_25px_rgba(34,211,238,0.5)]" : "bg-white/25"}`}
                        style={{ clipPath: "polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)" }}
                    >
                        <div
                            className="relative h-[150px] md:h-[180px] bg-[#020617] flex flex-col overflow-hidden"
                            style={{ clipPath: "polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)" }}
                        >
                            <div className="absolute inset-0">
                                {images[i] ? (
                                    <img src={images[i] as string} alt={n} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center p-5 bg-[#0f172a]">
                                        <img
                                            src="/img/acap%20logo%20svg%20blanco%20sombra.svg"
                                            alt="ACAP"
                                            className="w-full h-full object-contain opacity-20"
                                        />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
                            </div>

                            {team?.category && (
                                <div className="absolute top-1.5 right-2 flex flex-col items-end z-10 opacity-70">
                                    <span className="text-[5px] font-black uppercase tracking-[0.2em] text-white">CAT</span>
                                    <span className="text-xs font-black italic text-white leading-none">
                                        {team.category.replace(/[^0-9]/g, "") || team.category}
                                    </span>
                                </div>
                            )}

                            <div className="mt-auto p-1 z-10">
                                <div className={`py-1 px-1.5 transform -skew-x-12 border-r-2 ${isWinner ? "bg-celeste border-white" : "bg-white border-azul-primary"}`}>
                                    <div className="transform skew-x-12 text-center">
                                        <span className={`block text-[8px] font-black uppercase italic leading-none truncate ${isWinner ? "text-slate-950" : "text-slate-950"}`}>
                                            {n}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
