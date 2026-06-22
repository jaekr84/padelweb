"use client";

import { useMemo, useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, RotateCcw, X, Play, Flag, Loader2, Minus, Plus, Clock, AlertTriangle, Settings2 } from "lucide-react";
import { BracketMatch, Player } from "./types";

interface AmericanoBracketMirrorProps {
    bracket: BracketMatch[];
    readOnly?: boolean;
    onResetBracket?: () => void;
    saving?: boolean;
    handleBracketScore?: (matchId: string, s1: string, s2: string) => void;
    handleBracketStart?: (matchId: string) => void | Promise<any>;
    handleBracketConfirm?: (matchId: string) => void | Promise<any>;
    handleBracketEdit?: (matchId: string) => void | Promise<any>;
    skipReopenConfirm?: boolean;
}

const teamOf = (slot: BracketMatch["team1"]): Player | null =>
    slot && typeof slot !== "string" ? (slot as Player) : null;

// Neon accent per round (0 = final). Dark graphite cards + an electric edge per
// phase: broadcast-scoreboard energy, aggressive and competitive.
const ROUND_ACCENTS: Record<number, string> = {
    0: "#ffd200", // FINAL    — volt / oro
    1: "#00e0ff", // SEMIS    — cian eléctrico
    2: "#2e6bff", // CUARTOS  — azul eléctrico
    3: "#ff2d55", // OCTAVOS  — carmesí eléctrico
    4: "#b026ff", // 16AVOS   — violeta eléctrico
    5: "#ff6a00", // 32AVOS   — naranja blaze
};
const roundAccent = (round: number) => ROUND_ACCENTS[round] ?? "#64748b";

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
    onResetBracket,
    saving,
    handleBracketScore,
    handleBracketStart,
    handleBracketConfirm,
    handleBracketEdit,
    skipReopenConfirm
}: AmericanoBracketMirrorProps) {
    const [manageId, setManageId] = useState<string | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);

    // Management is available when the handlers are wired and we're not in read-only mode.
    const canManage = !readOnly && !!handleBracketStart;
    const manageMatch = manageId ? bracket.find(m => m.id === manageId) ?? null : null;

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
    // With justify-around on every column, a parent cell lands exactly between its two
    // children — the connector elbows then read as a clean binary tree.
    const cellsPerOuterCol = Math.max(Math.pow(2, Math.max(maxRound - 1, 0)), 1);
    const colHeight = Math.max(cellsPerOuterCol * 72, 240);

    // Compact, initials-based cells let the whole tree fit; a fit-to-width scale
    // guarantees no horizontal overflow no matter how many rounds there are.
    const COL_WIDTH = 96;
    const COL_GAP = 30; // horizontal room for the connector elbows

    // ── Connector lines + fit-to-width scale (measured from the real DOM) ──
    const boxRef = useRef<HTMLDivElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [paths, setPaths] = useState<{ d: string; active: boolean }[]>([]);
    const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
    const [scale, setScale] = useState(1);

    const measure = useCallback(() => {
        const wrap = wrapRef.current;
        const boxEl = boxRef.current;
        if (!wrap || !boxEl) return;

        // offsetWidth/Height are layout-natural (unaffected by the CSS transform).
        const natW = wrap.offsetWidth;
        const natH = wrap.offsetHeight;
        const avail = boxEl.clientWidth - 40; // minus the p-5 padding
        const s = natW > 0 ? Math.min(1, avail / natW) : 1;
        setScale(s);
        setSvgSize({ w: natW, h: natH });

        const wb = wrap.getBoundingClientRect(); // scaled rect — divide back to natural coords
        const box = (id: string) => {
            const el = cellRefs.current.get(id);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {
                left: (r.left - wb.left) / s,
                right: (r.right - wb.left) / s,
                cy: (r.top - wb.top) / s + r.height / s / 2,
            };
        };

        const next: { d: string; active: boolean }[] = [];
        for (const m of bracket) {
            if (m.round === 0) continue;
            const parent = bracket.find(p => p.round === m.round - 1 && p.slot === Math.floor(m.slot / 2));
            if (!parent) continue;
            const c = box(m.id);
            const p = box(parent.id);
            if (!c || !p) continue;
            const childIsLeft = (c.left + c.right) / 2 < (p.left + p.right) / 2;
            const startX = childIsLeft ? c.right : c.left;
            const endX = childIsLeft ? p.left : p.right;
            const midX = (startX + endX) / 2;
            next.push({
                d: `M ${startX} ${c.cy} H ${midX} V ${p.cy} H ${endX}`,
                active: m.confirmed,
            });
        }
        setPaths(next);
    }, [bracket]);

    useLayoutEffect(() => { measure(); }, [measure, colHeight, maxRound, columns]);
    useEffect(() => {
        const boxEl = boxRef.current;
        if (!boxEl) return;
        // Observe the container (not the scaled wrapper) so changing the scale never loops.
        const ro = new ResizeObserver(() => measure());
        ro.observe(boxEl);
        window.addEventListener("resize", measure);
        const t = setTimeout(measure, 100); // re-measure once fonts/layout settle
        return () => { ro.disconnect(); window.removeEventListener("resize", measure); clearTimeout(t); };
    }, [measure]);

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

            <div
                ref={boxRef}
                className="relative rounded-2xl p-5 overflow-hidden border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_60px_-24px_rgba(0,0,0,0.6)]"
                style={{ background: "radial-gradient(130% 95% at 50% -10%, #1b2942 0%, #0d1526 45%, #060a13 100%)" }}
            >
                {/* Faint grid — arena texture so the neon has something to glow against */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.05]"
                    style={{
                        backgroundImage: "linear-gradient(rgba(148,163,184,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.6) 1px, transparent 1px)",
                        backgroundSize: "26px 26px",
                    }}
                />
                {/* Spacer reserves the scaled footprint and centers the tree */}
                <div className="mx-auto" style={{ width: svgSize.w * scale, height: svgSize.h * scale }}>
                <div
                    ref={wrapRef}
                    className="relative w-fit"
                    style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
                >
                    {/* Connector tree — drawn behind the cells so lines only show in the gaps */}
                    <svg
                        className="absolute top-0 left-0 pointer-events-none"
                        width={svgSize.w}
                        height={svgSize.h}
                        style={{ zIndex: 0 }}
                        aria-hidden
                    >
                        {paths.map((p, i) => (
                            <path
                                key={i}
                                d={p.d}
                                fill="none"
                                stroke={p.active ? "#38bdf8" : "#5b6e8c"}
                                strokeWidth={p.active ? 2.25 : 1.5}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                style={p.active ? { filter: "drop-shadow(0 0 3px rgba(56,189,248,0.6))" } : undefined}
                            />
                        ))}
                    </svg>

                    <div className="flex items-stretch" style={{ gap: COL_GAP }}>
                        {columns.map((col, idx) => (
                            <div
                                key={col.key}
                                className="relative flex flex-col pointer-events-none"
                                style={{ width: COL_WIDTH, zIndex: idx + 1 }}
                            >
                                <div className="text-center mb-2.5">
                                    <span
                                        className="inline-block text-[8px] font-black uppercase italic tracking-[0.3em] px-2.5 py-1 rounded-sm"
                                        style={{
                                            color: roundAccent(col.round),
                                            backgroundColor: "#0f1420",
                                            boxShadow: `inset 0 0 0 1px ${roundAccent(col.round)}80, 0 0 8px ${roundAccent(col.round)}40`,
                                        }}
                                    >
                                        {col.side === "C" ? "🏆 FINAL" : roundTitle(col.round, true)}
                                    </span>
                                </div>
                                <div
                                    className={`flex flex-col shrink-0 ${col.side === "C" ? "justify-center gap-2.5" : "justify-around"}`}
                                    style={{ height: colHeight }}
                                >
                                    {col.side === "C" && champion && (
                                        <div className="text-center px-1 py-1.5 rounded-md bg-amber-400/15 border border-amber-400/40 shadow-[0_0_18px_rgba(251,191,36,0.25)]">
                                            <span className="block text-[8px] font-black uppercase tracking-[0.3em] text-amber-300">Campeón</span>
                                            <span className="block text-[11px] font-black uppercase italic text-white truncate mt-0.5">{champion}</span>
                                        </div>
                                    )}
                                    {col.matches.map(m => (
                                        <div
                                            key={m.id}
                                            ref={el => { if (el) cellRefs.current.set(m.id, el); else cellRefs.current.delete(m.id); }}
                                        >
                                            <MirrorCell match={m} canManage={canManage} onManage={() => setManageId(m.id)} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                </div>
            </div>

            {/* Match management — flips open from the card */}
            <AnimatePresence>
                {manageMatch && canManage && (
                    <ManageModal
                        match={manageMatch}
                        saving={!!saving}
                        skipReopenConfirm={skipReopenConfirm}
                        onScore={(s1, s2) => handleBracketScore?.(manageMatch.id, s1, s2)}
                        onStart={() => handleBracketStart?.(manageMatch.id)}
                        onConfirm={() => handleBracketConfirm?.(manageMatch.id)}
                        onEdit={() => handleBracketEdit?.(manageMatch.id)}
                        onClose={() => setManageId(null)}
                    />
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

// Compact label for a team: surname-based 3-letter codes per player, e.g. "Juan Pérez / Gómez" → "PÉR/GÓM".
const shortToken = (name: string) =>
    name
        .split(/[\/+]/)
        .map(part => {
            const words = part.trim().split(/\s+/).filter(Boolean);
            const key = words[words.length - 1] || part.trim();
            return key.slice(0, 3).toUpperCase();
        })
        .filter(Boolean)
        .join("/");

function MirrorCell({ match, canManage, onManage }: { match: BracketMatch; canManage: boolean; onManage: () => void }) {
    const t1 = teamOf(match.team1);
    const t2 = teamOf(match.team2);
    const isBye = (match.team1 as any) === "BYE" || (match.team2 as any) === "BYE";
    const isLive = !match.confirmed && (match.status === "live" || match.status === "in_progress");
    const winnerIs1 = match.confirmed && (match.score1 ?? 0) > (match.score2 ?? 0);
    const winnerIs2 = match.confirmed && (match.score2 ?? 0) > (match.score1 ?? 0);

    const fullName = (slot: BracketMatch["team1"], p: Player | null) =>
        (slot as any) === "BYE" ? "BYE" : p ? p.name : "A definir";
    const shortName = (slot: BracketMatch["team1"], p: Player | null) =>
        (slot as any) === "BYE" ? "BYE" : p ? shortToken(p.name) : "—";

    const accent = roundAccent(match.round); // round colour — washes the whole card
    const filled = !!(t1 || t2);
    const emptyCell = !filled && !isBye;
    const bothTeams = !!(t1 && t2);
    const isReady = !match.confirmed && !isLive && bothTeams && !isBye;
    // Manageable states: ready (to start), live (to score/finish), finished (to correct)
    const manageable = canManage && !isBye && (isReady || isLive || (match.confirmed && !isBye));

    const HoverIcon = isLive ? Flag : isReady ? Play : Settings2;
    const hoverLabel = isLive ? "Cargar / Finalizar" : isReady ? "Iniciar" : "Corregir";

    return (
        <button
            type="button"
            onClick={manageable ? onManage : undefined}
            disabled={!manageable}
            title={manageable
                ? `${fullName(match.team1, t1)} vs ${fullName(match.team2, t2)} — ${hoverLabel}`
                : `${fullName(match.team1, t1)} vs ${fullName(match.team2, t2)}`}
            style={{
                background: `linear-gradient(155deg, ${accent}33 0%, #1a2030 42%, #0f1420 100%)`,
                boxShadow: isLive
                    ? `0 0 0 1.5px #ff2d55, 0 0 18px #ff2d5566`
                    : `0 2px 6px rgba(0,0,0,0.45), inset 0 0 0 1px ${accent}73, 0 0 10px ${accent}26`,
                clipPath: "polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px)",
            }}
            className={`group/cell pointer-events-auto relative w-full text-left transition-all overflow-hidden
                ${isBye ? "opacity-35" : ""} ${manageable ? "cursor-pointer hover:brightness-125" : "cursor-default"}`}
        >
            {/* Ready-to-start pulse dot so the manager spots playable matches at a glance */}
            {isReady && canManage && (
                <span className="absolute top-1 right-1 flex h-1.5 w-1.5 z-10">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: accent }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: accent }} />
                </span>
            )}
            {/* Leading accent bar — the round's "heat" colour */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: accent, opacity: emptyCell ? 0.45 : 1 }} />

            {[1, 2].map(side => {
                const p = side === 1 ? t1 : t2;
                const slot = side === 1 ? match.team1 : match.team2;
                const isWinner = side === 1 ? winnerIs1 : winnerIs2;
                const loser = match.confirmed && !isWinner && !isBye;
                const score = side === 1 ? match.score1 : match.score2;
                return (
                    <div
                        key={side}
                        title={fullName(slot, p)}
                        style={isWinner ? { backgroundColor: `${accent}2e` } : undefined}
                        className={`flex items-center justify-between gap-1 pl-2 pr-1.5 py-[9px] ${side === 1 ? "border-b border-white/10" : ""}`}
                    >
                        <span
                            className="text-[9px] font-black uppercase italic tabular-nums truncate tracking-tight"
                            style={{ color: emptyCell ? "#64748b" : isWinner ? accent : loser ? "#64748b" : "#f1f5f9" }}
                        >
                            {shortName(slot, p)}
                        </span>
                        <span
                            className="text-[10px] font-black italic tabular-nums shrink-0"
                            style={{ color: emptyCell ? "#64748b" : isWinner ? accent : loser ? "#64748b" : "#e2e8f0" }}
                        >
                            {match.confirmed && !isBye ? score ?? 0 : isLive ? score ?? 0 : ""}
                        </span>
                    </div>
                );
            })}
            {isLive && (
                <div className="flex items-center justify-center gap-1 py-[2px]" style={{ backgroundColor: "#ef444426" }}>
                    <div className="w-1 h-1 rounded-full bg-rojo animate-pulse" />
                    <span className="text-[7px] font-black uppercase italic tracking-[0.2em] text-rojo">Live</span>
                </div>
            )}
            {/* Hover overlay — absolute so the cell (and the diagram) never changes size */}
            {manageable && (
                <div className="absolute inset-0 hidden group-hover/cell:flex flex-col items-center justify-center gap-1 px-1 bg-[#0b1120]/80 backdrop-blur-[1px] pointer-events-none">
                    <HoverIcon className="w-3 h-3 shrink-0" style={{ color: accent }} fill={isReady ? "currentColor" : "none"} />
                    <span className="text-[7px] font-black uppercase italic tracking-[0.15em] text-center leading-tight" style={{ color: accent }}>{hoverLabel}</span>
                </div>
            )}
        </button>
    );
}

// ── Match management panel — flips open from the card, same handlers as the queue ──

interface ManageModalProps {
    match: BracketMatch;
    saving: boolean;
    skipReopenConfirm?: boolean;
    onScore: (s1: string, s2: string) => void;
    onStart: () => void | Promise<any>;
    onConfirm: () => void | Promise<any>;
    onEdit: () => void | Promise<any>;
    onClose: () => void;
}

function ManageModal({ match, saving, skipReopenConfirm, onScore, onStart, onConfirm, onEdit, onClose }: ManageModalProps) {
    const [busy, setBusy] = useState(false);
    const [confirmReopen, setConfirmReopen] = useState(false);

    const t1 = teamOf(match.team1);
    const t2 = teamOf(match.team2);
    const isLive = !match.confirmed && (match.status === "live" || match.status === "in_progress");
    const finished = match.confirmed;
    const bothTeams = !!(t1 && t2);
    const isReady = !match.confirmed && !isLive && bothTeams;
    const winnerIs1 = finished && (match.score1 ?? 0) > (match.score2 ?? 0);
    const winnerIs2 = finished && (match.score2 ?? 0) > (match.score1 ?? 0);
    const s1 = match.score1 ?? 0;
    const s2 = match.score2 ?? 0;
    const isTie = s1 === s2;
    const accent = isLive ? "#ef4444" : finished ? "#fbbf24" : roundAccent(match.round);

    const run = async (fn: () => void | Promise<any>) => {
        setBusy(true);
        try { await fn(); } finally { setBusy(false); }
    };

    const TeamRow = ({ team, isWinner, score, editable, onScoreChange }: {
        team: Player | null; isWinner: boolean; score: number; editable?: boolean; onScoreChange?: (v: number) => void;
    }) => (
        <div
            className="flex items-center justify-between gap-3 pl-3 pr-2 py-2 rounded-lg border"
            style={{
                borderColor: isWinner ? `${accent}66` : "rgba(148,163,184,0.15)",
                background: isWinner ? `${accent}1f` : "rgba(255,255,255,0.03)",
            }}
        >
            <span className="text-xs font-black uppercase italic truncate min-w-0" style={{ color: isWinner ? accent : "#e2e8f0" }}>
                {team ? team.name : "A definir"}
            </span>
            {editable ? (
                <ScoreStepper value={score} onChange={onScoreChange!} disabled={busy || saving} accent={accent} />
            ) : (
                <span className="text-lg font-black italic tabular-nums shrink-0 pr-1" style={{ color: isWinner ? accent : "#cbd5e1" }}>
                    {finished || isLive ? score : "–"}
                </span>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ perspective: 1200 }}>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
                initial={{ rotateY: -90, opacity: 0, scale: 0.9 }}
                animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                exit={{ rotateY: 90, opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                style={{ transformStyle: "preserve-3d", background: "linear-gradient(180deg, #1c2740 0%, #0f1727 100%)" }}
                className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl p-5 flex flex-col gap-4"
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <span
                        className="text-[9px] font-black uppercase italic tracking-[0.3em] px-2.5 py-1 rounded"
                        style={{ color: accent, backgroundColor: `${accent}1f`, boxShadow: `inset 0 0 0 1px ${accent}40` }}
                    >
                        {match.round === 0 ? "🏆 FINAL" : roundTitle(match.round)}
                    </span>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Teams + scores — each team carries its own +/- when live */}
                <div className="flex flex-col gap-1.5">
                    <TeamRow team={t1} isWinner={winnerIs1} score={s1} editable={isLive} onScoreChange={(v) => onScore(String(v), String(s2))} />
                    <div className="flex items-center gap-2 px-1">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-[9px] font-black italic text-white/40">VS</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>
                    <TeamRow team={t2} isWinner={winnerIs2} score={s2} editable={isLive} onScoreChange={(v) => onScore(String(s1), String(v))} />
                </div>

                {/* Controls by state */}
                {isReady && (
                    <button
                        onClick={() => run(onStart)}
                        disabled={busy || saving}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-azul-primary hover:bg-azul-dark text-white font-black uppercase italic text-xs tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-azul-primary/20 disabled:opacity-50"
                    >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                        Iniciar Partido
                    </button>
                )}

                {isLive && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-rojo animate-pulse" />
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-rojo">En Juego — cargá el marcador</span>
                        </div>
                        <button
                            onClick={() => run(onConfirm)}
                            disabled={busy || saving || isTie}
                            title={isTie ? "No se permiten empates: cargá el marcador" : "Finalizar partido"}
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase italic text-xs tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20 disabled:opacity-40"
                        >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                            {isTie ? "Empate no permitido" : "Finalizar Partido"}
                        </button>
                    </div>
                )}

                {finished && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: `${accent}1f`, boxShadow: `inset 0 0 0 1px ${accent}40` }}>
                            <Trophy className="w-4 h-4" style={{ color: accent }} />
                            <span className="text-[10px] font-black uppercase italic tracking-wide" style={{ color: accent }}>
                                Ganador: {winnerIs1 ? t1?.name : t2?.name}
                            </span>
                        </div>
                        {confirmReopen ? (
                            <div className="flex flex-col gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-white/70 leading-relaxed">
                                        Se reabre el partido para editar el marcador. El ganador se quitará de la siguiente ronda.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setConfirmReopen(false)}
                                        className="flex-1 py-2 rounded-lg border border-white/10 bg-white/5 text-white/70 font-black uppercase italic text-[9px] tracking-wider hover:bg-white/10 transition-all"
                                    >
                                        Volver
                                    </button>
                                    <button
                                        onClick={() => { setConfirmReopen(false); run(onEdit); }}
                                        disabled={busy || saving}
                                        className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black uppercase italic text-[9px] tracking-wider transition-all disabled:opacity-50"
                                    >
                                        Reabrir
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => skipReopenConfirm ? run(onEdit) : setConfirmReopen(true)}
                                disabled={busy || saving}
                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 font-black uppercase italic text-[10px] tracking-widest transition-all disabled:opacity-50"
                            >
                                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                Corregir Resultado
                            </button>
                        )}
                    </div>
                )}

                {!isReady && !isLive && !finished && (
                    <div className="flex items-center justify-center gap-2 py-3 text-white/50">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase italic tracking-widest">Esperando rivales</span>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

function ScoreStepper({ value, onChange, disabled, accent }: { value: number; onChange: (v: number) => void; disabled?: boolean; accent: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <button
                type="button"
                onClick={() => onChange(Math.max(0, value - 1))}
                disabled={disabled}
                className="w-8 h-8 rounded-lg bg-rojo/10 text-rojo border border-rojo/30 hover:bg-rojo hover:text-white transition-all flex items-center justify-center active:scale-95 disabled:opacity-40"
            >
                <Minus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
            <span className="w-9 text-center text-2xl font-black italic tabular-nums" style={{ color: accent }}>{value}</span>
            <button
                type="button"
                onClick={() => onChange(value + 1)}
                disabled={disabled}
                className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center active:scale-95 disabled:opacity-40"
            >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
        </div>
    );
}
