"use client";

import { Radio, Minus, Plus, Flag, Undo2, MapPin } from "lucide-react";
import { sortGroupsByName } from "@/lib/group-order";
import { Group, Match } from "./types";

// Cola de los partidos que están en cancha, juntando todos los grupos. Es la
// vista de trabajo mientras se juega: cargar el marcador y cerrar el partido
// sin tener que buscarlo dentro del card de su grupo.

interface TournamentLiveQueueProps {
    groups: Group[];
    matches: Match[];
    readOnly: boolean;
    handleScoreChange: (matchId: string, s1: string, s2: string) => void;
    handleConfirmScore: (matchId: string | string[]) => void;
    cancelGroupMatch: (matchId: string) => void;
}

const teamLabel = (name: string) => name.split(/[\/\+]/).map(n => n.trim()).join(" / ");

function ScoreStepper({
    value,
    onChange,
    readOnly,
}: {
    value: number;
    onChange: (v: number) => void;
    readOnly: boolean;
}) {
    if (readOnly) {
        return <span className="w-8 text-center text-sm font-black italic tabular-nums text-muted-foreground">{value}</span>;
    }
    return (
        <div className="flex items-center gap-0.5 bg-surface border border-hairline rounded-lg px-1 py-0.5">
            <button
                onClick={() => onChange(Math.max(0, value - 1))}
                className="p-1 text-muted-foreground hover:text-rojo transition-colors"
                title="Restar"
            >
                <Minus className="w-3 h-3" />
            </button>
            <input
                type="number"
                value={value}
                onChange={e => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-7 text-center text-sm font-black italic tabular-nums bg-transparent text-foreground outline-none no-spin-buttons focus:text-rojo"
            />
            <button
                onClick={() => onChange(value + 1)}
                className="p-1 text-muted-foreground hover:text-rojo transition-colors"
                title="Sumar"
            >
                <Plus className="w-3 h-3" />
            </button>
        </div>
    );
}

export function TournamentLiveQueue({
    groups,
    matches,
    readOnly,
    handleScoreChange,
    handleConfirmScore,
    cancelGroupMatch,
}: TournamentLiveQueueProps) {
    const groupById = new Map(groups.map(g => [g.id, g]));
    const groupOrder = new Map(sortGroupsByName(groups).map((g, i) => [g.id, i]));

    const liveMatches = matches
        .filter(m => m.status === 'in_progress' && !m.confirmed)
        .sort((a, b) => {
            const ga = groupOrder.get(a.groupId) ?? 99;
            const gb = groupOrder.get(b.groupId) ?? 99;
            if (ga !== gb) return ga - gb;
            return ((a.roundIndex ?? Number.MAX_SAFE_INTEGER) - (b.roundIndex ?? Number.MAX_SAFE_INTEGER))
                || a.id.localeCompare(b.id);
        });

    const withScore = liveMatches.filter(m => (m.score1 ?? 0) !== (m.score2 ?? 0));

    return (
        <section className="rounded-2xl border border-hairline overflow-hidden shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)]"
            style={{ background: "var(--arena-panel)" }}
        >
            <div className="px-4 py-2.5 border-b border-hairline bg-surface flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-rojo/10 border border-rojo/30 flex items-center justify-center">
                        <Radio className={`w-3.5 h-3.5 text-rojo ${liveMatches.length > 0 ? "animate-pulse" : ""}`} />
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black uppercase italic tracking-tight text-foreground">En Cancha</h3>
                        <p className="text-[6px] font-black uppercase tracking-[0.4em] text-muted-foreground leading-none mt-0.5">
                            Partidos en juego — carga de resultados
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-surface border border-hairline text-muted-foreground">
                        {liveMatches.length} en juego
                    </span>
                    {!readOnly && withScore.length > 1 && (
                        <button
                            onClick={() => handleConfirmScore(withScore.map(m => m.id))}
                            className="px-2 py-1 rounded text-[9px] font-black uppercase italic tracking-wider text-cyan-300 hover:text-foreground bg-cyan-400/10 hover:bg-cyan-400 border border-cyan-400/30 transition-colors"
                            title="Finalizar todos los partidos que ya tienen marcador cargado"
                        >
                            Guardar todo ({withScore.length})
                        </button>
                    )}
                </div>
            </div>

            {liveMatches.length === 0 ? (
                <p className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest text-subtle">
                    No hay partidos en juego — iniciá uno con START desde su grupo
                </p>
            ) : (
                <div className="divide-y divide-white/[0.06]">
                    {liveMatches.map(m => {
                        const group = groupById.get(m.groupId);
                        const isTie = (m.score1 ?? 0) === (m.score2 ?? 0);
                        const noScore = !m.score1 && !m.score2;
                        return (
                            <div key={m.id} className="flex flex-col md:flex-row md:items-center gap-2 px-4 py-2 hover:bg-surface transition-colors">
                                {/* Grupo / cancha */}
                                <div className="flex items-center gap-1.5 md:w-32 shrink-0">
                                    <span className="px-1.5 py-0.5 rounded bg-surface border border-hairline text-[9px] font-black uppercase italic tracking-wider text-muted-foreground">
                                        {group?.name || "Grupo"}
                                    </span>
                                    {group?.courtNumber && (
                                        <span className="flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-300">
                                            <MapPin className="w-2.5 h-2.5" />
                                            {group.courtNumber}
                                        </span>
                                    )}
                                </div>

                                {/* Parejas + marcador */}
                                <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
                                    <span className="text-[11px] font-black uppercase italic truncate text-right text-foreground">
                                        {teamLabel(m.team1.name)}
                                    </span>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <ScoreStepper
                                            value={m.score1 ?? 0}
                                            readOnly={readOnly}
                                            onChange={v => handleScoreChange(m.id, String(v), String(m.score2 ?? 0))}
                                        />
                                        <span className="text-[10px] font-black italic text-rojo">VS</span>
                                        <ScoreStepper
                                            value={m.score2 ?? 0}
                                            readOnly={readOnly}
                                            onChange={v => handleScoreChange(m.id, String(m.score1 ?? 0), String(v))}
                                        />
                                    </div>

                                    <span className="text-[11px] font-black uppercase italic truncate text-foreground">
                                        {teamLabel(m.team2.name)}
                                    </span>
                                </div>

                                {/* Acciones — ancho fijo para que la fila no se mueva
                                    cuando el ↩ deja de estar disponible al cargar puntos */}
                                {!readOnly && (
                                    <div className="flex items-center justify-end gap-1.5 shrink-0 md:w-[150px]">
                                        <button
                                            onClick={() => noScore && cancelGroupMatch(m.id)}
                                            aria-hidden={!noScore}
                                            tabIndex={noScore ? 0 : -1}
                                            className={`w-7 h-7 rounded-md inline-flex items-center justify-center border border-hairline bg-surface text-muted-foreground transition-colors ${noScore ? "hover:text-foreground hover:bg-surface-raised" : "invisible pointer-events-none"}`}
                                            title="Deshacer inicio: vuelve a pendiente"
                                        >
                                            <Undo2 className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => handleConfirmScore(m.id)}
                                            disabled={isTie}
                                            title={isTie ? "No se permiten empates: cargá el marcador" : "Finalizar partido"}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                                        >
                                            <Flag className="w-3 h-3" />
                                            Finalizar
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
