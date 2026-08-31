"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Users2, UserCheck, Plus, Minus, RotateCcw, CreditCard, Play, Undo2, Pencil, Check, X, Loader2, ChevronDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, AlertTriangle, PanelTop, Maximize2 } from "lucide-react";
import { sortGroupsByName } from "@/lib/group-order";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Group, Match, Player, Standing } from "./types";

/**
 * Cancha del grupo: se abre con el lápiz y se confirma con el tilde. El guardado
 * es explícito (no autosave) porque el admin la usa como etiqueta en vivo y
 * necesita ver que quedó guardada.
 */
const FIXTURE_MODE_KEY = "acap:group-fixture-view";

const isMatchFinished = (m: Match) =>
    m.confirmed || m.status === 'finished' || m.status === 'completed';

function GroupCourtField({
    group,
    onSave,
}: {
    group: Group;
    onSave: (groupId: string, courtNumber: string) => Promise<boolean>;
}) {
    const saved = group.courtNumber != null ? String(group.courtNumber) : "";
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(saved);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Si el valor guardado cambia desde afuera (refresh, otro admin), y no estamos
    // editando, el input tiene que reflejarlo.
    useEffect(() => {
        if (!editing) setValue(saved);
    }, [saved, editing]);

    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);

    const commit = async () => {
        if (saving) return;
        if (value.trim() === saved) {
            setEditing(false);
            return;
        }
        setSaving(true);
        const ok = await onSave(group.id, value.trim());
        setSaving(false);
        if (ok) setEditing(false);
    };

    const cancel = () => {
        if (saving) return;
        setValue(saved);
        setEditing(false);
    };

    if (!editing) {
        return (
            <button
                onClick={() => setEditing(true)}
                title={saved ? "Editar cancha" : "Asignar cancha"}
                className={`group/court flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all w-fit ${saved
                    ? "bg-cyan-400/10 border-cyan-400/20 hover:border-cyan-400/50"
                    : "bg-surface border-hairline hover:border-cyan-400/50"}`}
            >
                <MapPin className={`w-2.5 h-2.5 ${saved ? "text-cyan-400" : "text-cyan-400/60"}`} />
                <span className={`text-[10px] font-black italic uppercase tracking-[0.1em] ${saved ? "text-cyan-300" : "text-subtle"}`}>
                    {saved || "Cancha"}
                </span>
                <Pencil className="w-2.5 h-2.5 text-subtle group-hover/court:text-cyan-300 transition-colors" />
            </button>
        );
    }

    return (
        <div className="flex items-center gap-1.5 bg-surface px-2 py-0.5 rounded-lg border border-cyan-400/50 w-fit">
            <MapPin className="w-2.5 h-2.5 text-cyan-400/60" />
            <input
                ref={inputRef}
                type="text"
                placeholder="CANCHA..."
                value={value}
                maxLength={50}
                disabled={saving}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); void commit(); }
                    if (e.key === "Escape") { e.preventDefault(); cancel(); }
                }}
                className="w-14 bg-transparent border-none p-0 text-[10px] font-black italic uppercase text-cyan-300 placeholder:text-subtle focus:ring-0 outline-none disabled:opacity-50"
            />
            <button
                onClick={() => void commit()}
                disabled={saving}
                title="Guardar cancha"
                className="p-0.5 rounded text-cyan-300 hover:text-foreground hover:bg-cyan-400/20 transition-colors disabled:opacity-60"
            >
                {saving
                    ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    : <Check className="w-2.5 h-2.5" />}
            </button>
            <button
                onClick={cancel}
                disabled={saving}
                title="Cancelar"
                className="p-0.5 rounded text-subtle hover:text-foreground transition-colors disabled:opacity-40"
            >
                <X className="w-2.5 h-2.5" />
            </button>
        </div>
    );
}

interface GroupMatchRowProps {
    m: Match;
    readOnly: boolean;
    isEntryPresent: (id: string) => boolean;
    isEntryBusy: (id: string) => boolean;
    startGroupMatch: (matchId: string) => void;
    cancelGroupMatch: (matchId: string) => void;
    handleScoreChange: (matchId: string, s1: string, s2: string) => void;
    handleConfirmScore: (matchId: string | string[]) => void;
    handleReopenMatch: (matchId: string) => void;
}

/**
 * Una línea de partido: parejas, marcador y acciones. Se reusa en las tres
 * vistas del grupo (el que está en cancha, el próximo, y el fixture completo).
 */
function GroupMatchRow({
    m,
    readOnly,
    isEntryPresent,
    isEntryBusy,
    startGroupMatch,
    cancelGroupMatch,
    handleScoreChange,
    handleConfirmScore,
    handleReopenMatch,
}: GroupMatchRowProps) {
                const isReady = isEntryPresent(m.team1.id) && isEntryPresent(m.team2.id);
                // Una pareja no puede estar en dos canchas a la vez.
                const busyTeam = [m.team1, m.team2].find(t => isEntryBusy(t.id));
                const isDone = isMatchFinished(m);
                const isLive = m.status === 'in_progress';
                return (
                    <div
                        className={`group/match relative min-w-0 transition-all text-[10px] ${!isReady && readOnly && !isDone ? "opacity-40 grayscale pointer-events-none" : ""}`}
                    >
                        <div
                            className={`rounded-md border transition-all overflow-hidden flex items-center justify-between px-1.5 py-1.5 gap-1 ${isDone
                                ? "bg-emerald-500/[0.06] border-emerald-500/30"
                                : isLive
                                    ? "bg-rojo/[0.08] border-rojo/40 shadow-[0_0_12px_rgba(255,45,85,0.25)]"
                                    : "bg-surface border-hairline hover:border-hairline-strong"
                                }`}
                        >
                            {/* Equipo 1 */}
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                                <div className={`flex-1 truncate font-black uppercase italic tracking-tight ${isDone ? (m.score1! > m.score2! ? "text-emerald-400" : "text-subtle") : isLive ? "text-foreground" : "text-muted-foreground"}`}>
                                    {m.team1.name.split(/[\/\+]/).map(n => n.trim()).join(" / ")}
                                </div>
                                {isLive && !readOnly ? (
                                    <div className="flex items-center gap-0.5 bg-surface border border-hairline rounded px-0.5">
                                        <button onClick={() => handleScoreChange(m.id, Math.max(0, (m.score1 || 0) - 1).toString(), m.score2?.toString() ?? "")} className="p-0.5 text-subtle hover:text-rojo transition-colors"><Minus className="w-2 h-2" /></button>
                                        <input type="number" value={m.score1 ?? 0} onChange={e => handleScoreChange(m.id, e.target.value, m.score2?.toString() ?? "")} className="w-4 h-4 text-center font-black outline-none no-spin-buttons bg-transparent text-[11px] text-foreground focus:text-rojo" />
                                        <button onClick={() => handleScoreChange(m.id, ((m.score1 || 0) + 1).toString(), m.score2?.toString() ?? "")} className="p-0.5 text-subtle hover:text-rojo transition-colors"><Plus className="w-2 h-2" /></button>
                                    </div>
                                ) : (
                                    <span className={`font-black w-6 text-center ${isDone && m.score1! > m.score2! ? "text-emerald-400" : "text-muted-foreground"}`}>{m.score1 ?? 0}</span>
                                )}
                            </div>

                            {/* VS */}
                            <span className="text-[10px] font-black text-muted-foreground shrink-0">VS</span>

                            {/* Equipo 2 */}
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                                {isLive && !readOnly ? (
                                    <div className="flex items-center gap-0.5 bg-surface border border-hairline rounded px-0.5">
                                        <button onClick={() => handleScoreChange(m.id, m.score1?.toString() ?? "", Math.max(0, (m.score2 || 0) - 1).toString())} className="p-0.5 text-subtle hover:text-rojo transition-colors"><Minus className="w-2 h-2" /></button>
                                        <input type="number" value={m.score2 ?? 0} onChange={e => handleScoreChange(m.id, m.score1?.toString() ?? "", e.target.value)} className="w-4 h-4 text-center font-black outline-none no-spin-buttons bg-transparent text-[11px] text-foreground focus:text-rojo" />
                                        <button onClick={() => handleScoreChange(m.id, m.score1?.toString() ?? "", ((m.score2 || 0) + 1).toString())} className="p-0.5 text-subtle hover:text-rojo transition-colors"><Plus className="w-2 h-2" /></button>
                                    </div>
                                ) : (
                                    <span className={`font-black w-6 text-center ${isDone && m.score2! > m.score1! ? "text-emerald-400" : "text-muted-foreground"}`}>{m.score2 ?? 0}</span>
                                )}
                                <div className={`flex-1 truncate font-black uppercase italic tracking-tight text-right ${isDone ? (m.score2! > m.score1! ? "text-emerald-400" : "text-subtle") : isLive ? "text-foreground" : "text-muted-foreground"}`}>
                                    {m.team2.name.split(/[\/\+]/).map(n => n.trim()).join(" / ")}
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                                {!m.confirmed && !readOnly && m.status !== 'finished' && m.status !== 'completed' && (
                                    isLive ? (
                                        <>
                                            {!m.score1 && !m.score2 && (
                                                <button
                                                    onClick={() => cancelGroupMatch(m.id)}
                                                    className="p-0.5 rounded bg-surface hover:bg-surface-raised text-muted-foreground hover:text-foreground border border-hairline transition-colors"
                                                    title="Deshacer inicio: vuelve a pendiente"
                                                >
                                                    <Undo2 className="w-2.5 h-2.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleConfirmScore(m.id)}
                                                className="px-1.5 py-0.5 rounded bg-cyan-400/10 hover:bg-cyan-400 text-cyan-300 hover:text-foreground text-[10px] font-black italic border border-cyan-400/30 transition-colors"
                                            >
                                                FIN
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => startGroupMatch(m.id)}
                                            disabled={!!busyTeam}
                                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black italic border transition-colors ${busyTeam
                                                ? "bg-surface text-subtle border-hairline opacity-50 cursor-not-allowed"
                                                : isReady
                                                    ? "bg-rojo/10 hover:bg-rojo text-rojo hover:text-white border-rojo/30"
                                                    : "bg-surface hover:bg-surface-raised text-muted-foreground hover:text-foreground border-hairline"}`}
                                            title={busyTeam
                                                ? `${busyTeam.name.split(/[\/\+]/)[0].trim()} ya está jugando otro partido`
                                                : isReady
                                                    ? "Iniciar este partido"
                                                    : "Iniciar igual (falta marcar presente a alguna pareja)"}
                                        >
                                            <Play className="w-2 h-2" />
                                            START
                                        </button>
                                    )
                                )}
                                {isDone && !readOnly && (
                                    <button
                                        onClick={() => handleReopenMatch(m.id)}
                                        className="p-0.5 text-subtle hover:text-cyan-300 transition-colors bg-surface border border-hairline rounded hover:border-cyan-400/40 group/reopen"
                                        title="Reabrir partido"
                                    >
                                        <RotateCcw className="w-2.5 h-2.5 group-hover/reopen:-rotate-45 transition-transform" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
}

interface GroupMatchSlotProps {
    m: Match;
    entries: Player[];
    position: number;
    total: number;
    readOnly: boolean;
    onPrev: () => void;
    onNext: () => void;
    onPlayFirst: () => void;
    onChangeTeam: (slot: 1 | 2, teamId: string) => void;
}

/**
 * El "slot" del próximo partido: además de la línea normal permite cambiar cada
 * pareja por cualquier otra del grupo, moverlo en el orden del fixture y pasar
 * al siguiente sin tener que mirar la lista entera.
 */
function GroupMatchSlot({
    m,
    entries,
    position,
    total,
    readOnly,
    onPrev,
    onNext,
    onPlayFirst,
    onChangeTeam,
}: GroupMatchSlotProps) {
    const short = (name: string) => name.split(/[\/\+]/).map(n => n.trim()).join(" / ");

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1 px-1">
                <span className="shrink-0 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    {position === 1 ? "Próximo" : "Más adelante"}
                </span>
                <div className="h-px flex-1 min-w-2 bg-surface-raised mx-1" />
                {/* Un solo control, con el texto adentro: "‹ 2 de 5 ›" se lee como
                    navegación. Los iconos sueltos no decían qué hacían. */}
                <div className="shrink-0 flex items-center rounded-lg border border-hairline bg-surface overflow-hidden">
                    <button
                        onClick={onPrev}
                        disabled={position <= 1}
                        title="Ver el partido anterior de la cola"
                        className="px-1 py-0.5 text-muted-foreground hover:text-cyan-300 hover:bg-cyan-400/10 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                    >
                        <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span className="px-1.5 text-[10px] font-black tabular-nums text-muted-foreground border-x border-hairline">
                        {position} <span className="font-bold text-subtle">de</span> {total}
                    </span>
                    <button
                        onClick={onNext}
                        disabled={position >= total}
                        title="Ver el siguiente partido de la cola"
                        className="px-1 py-0.5 text-muted-foreground hover:text-cyan-300 hover:bg-cyan-400/10 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                    >
                        <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Acción explícita en vez de flechas sin etiqueta: si estás mirando un
                partido de más adelante, esto lo trae al frente de la cola. El
                reordenamiento fino sigue estando en la lista completa. */}
            {!readOnly && position > 1 && (
                <button
                    onClick={onPlayFirst}
                    className="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 text-[10px] font-black uppercase italic tracking-wider hover:bg-cyan-400 hover:text-slate-900 transition-colors"
                >
                    <ArrowUp className="w-3 h-3" />
                    Jugar este primero
                </button>
            )}

            {!readOnly && (
                <div className="flex items-center gap-1 px-0.5">
                    {([1, 2] as const).map(slot => (
                        <select
                            key={slot}
                            value={(slot === 1 ? m.team1 : m.team2).id}
                            onChange={e => onChangeTeam(slot, e.target.value)}
                            title="Cambiar esta pareja por otra del grupo"
                            className={`flex-1 min-w-0 bg-surface border border-hairline rounded px-1 py-0.5 text-[10px] font-black uppercase italic tracking-tight text-muted-foreground outline-none focus:border-cyan-400/50 cursor-pointer ${slot === 2 ? "text-right" : ""}`}
                        >
                            {entries.map(p => (
                                <option key={p.id} value={p.id}>{short(p.name)}</option>
                            ))}
                        </select>
                    ))}
                </div>
            )}
        </div>
    );
}

interface TournamentGroupsViewProps {
    groups: Group[];
    matches: Match[];
    readOnly: boolean;
    isEntryPresent: (id: string) => boolean;
    isEntryBusy: (id: string) => boolean;
    groupEntries: (groupId: string) => Player[];
    updateMatchTeam: (matchId: string, slot: 1 | 2, teamId: string) => void;
    moveMatchOrder: (matchId: string, dir: -1 | 1) => void;
    moveMatchFirst: (matchId: string) => void;
    groupFixtureIssues: (groupId: string) => { repeated: number; missing: number };
    isMemberPresent: (pairId: string, slot: 0 | 1) => boolean;
    isMemberPaid: (pairId: string, slot: 0 | 1) => boolean;
    toggleMemberPresent: (pairId: string, slot: 0 | 1) => void;
    toggleMemberPaid: (pairId: string, slot: 0 | 1) => void;
    groupNextInfo: (groupId: string) => { pendingCount: number; availableCount: number };
    startGroupMatch: (matchId: string) => void;
    startAllGroupMatches: (groupId: string) => void;
    groupLiveInfo: (groupId: string) => { cancellableCount: number };
    cancelGroupMatch: (matchId: string) => void;
    cancelAllGroupMatches: (groupId: string) => void;
    handleScoreChange: (matchId: string, s1: string, s2: string) => void;
    handleConfirmScore: (matchId: string | string[]) => void;
    handleReopenMatch: (matchId: string) => void;
    isGroupChecked: (kind: 'present' | 'paid', groupId: string) => boolean;
    toggleGroupChecked: (kind: 'present' | 'paid', groupId: string) => void;
    saveGroupCourt: (groupId: string, courtNumber: string) => Promise<boolean>;
    computeStandings: (groupId: string) => Standing[];
}

export function TournamentGroupsView({
    groups,
    matches,
    readOnly,
    isEntryPresent,
    isEntryBusy,
    groupEntries,
    updateMatchTeam,
    moveMatchOrder,
    moveMatchFirst,
    groupFixtureIssues,
    isMemberPresent,
    isMemberPaid,
    toggleMemberPresent,
    toggleMemberPaid,
    groupNextInfo,
    startGroupMatch,
    startAllGroupMatches,
    groupLiveInfo,
    cancelGroupMatch,
    cancelAllGroupMatches,
    handleScoreChange,
    handleConfirmScore,
    handleReopenMatch,
    isGroupChecked,
    toggleGroupChecked,
    saveGroupCourt,
    computeStandings
}: TournamentGroupsViewProps) {
    // Fixture plegable: con 4+ grupos las listas de partidos empujan las tablas
    // fuera de pantalla y no se puede mirar la fase entera de un vistazo.
    // El fixture se abre como dropdown por encima de lo de abajo: si empujara el
    // contenido, cada plegado reacomodaría toda la grilla. Uno solo a la vez,
    // porque dos paneles superpuestos se taparían entre sí.
    const [openGroupId, setOpenGroupId] = useState<string | null>(null);

    // Dropdown o modal, a gusto del admin. Se guarda por navegador: es una
    // preferencia de visualización, no un dato del torneo.
    const [fixtureMode, setFixtureMode] = useState<"dropdown" | "modal">("dropdown");
    useEffect(() => {
        try {
            const saved = localStorage.getItem(FIXTURE_MODE_KEY);
            if (saved === "modal" || saved === "dropdown") setFixtureMode(saved);
        } catch { /* modo privado o storage bloqueado: queda el default */ }
    }, []);

    const changeFixtureMode = (mode: "dropdown" | "modal") => {
        setFixtureMode(mode);
        setOpenGroupId(null);
        try { localStorage.setItem(FIXTURE_MODE_KEY, mode); } catch { /* idem */ }
    };
    // Índice del partido que muestra el slot de cada grupo. Se navega con las
    // flechas y se re-clampea solo si la lista de pendientes se achica.
    const [slotCursor, setSlotCursor] = useState<Record<string, number>>({});

    const moveCursor = (groupId: string, delta: number, max: number) =>
        setSlotCursor(prev => ({
            ...prev,
            [groupId]: Math.min(Math.max((prev[groupId] ?? 0) + delta, 0), Math.max(0, max - 1)),
        }));

    const toggleOpen = (groupId: string) =>
        setOpenGroupId(prev => (prev === groupId ? null : groupId));

    // Cerrar al clickear afuera o con Escape, como cualquier dropdown.
    const gridRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!openGroupId || fixtureMode === "modal") return;
        const onPointerDown = (e: MouseEvent) => {
            if (!gridRef.current?.contains(e.target as Node)) setOpenGroupId(null);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpenGroupId(null);
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [openGroupId, fixtureMode]);

    return (
        <section
            // sin overflow-hidden: el dropdown del fixture tiene que poder salirse
            // de la tarjeta y de la sección.
            className="relative rounded-2xl p-5 border border-hairline shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_60px_-24px_rgba(0,0,0,0.6)] space-y-4"
            style={{ background: "var(--arena)" }}
        >
            {/* Faint arena grid */}
            <div
                className="absolute inset-0 rounded-2xl pointer-events-none opacity-[0.05]"
                style={{
                    backgroundImage: "linear-gradient(rgba(148,163,184,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.6) 1px, transparent 1px)",
                    backgroundSize: "26px 26px",
                }}
            />

            <div className="relative flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <h2 className="text-sm font-black text-foreground tracking-tighter uppercase italic leading-none">Fase de Grupos</h2>
                    <p className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Resultados y Clasificación</p>
                </div>
                {/* Cómo se abre el fixture: cada admin lo prefiere distinto. */}
                <div className="absolute right-0 flex items-center gap-0.5 p-0.5 rounded-lg border border-hairline bg-surface">
                    {([
                        { mode: "dropdown" as const, Icon: PanelTop, label: "Desplegable sobre la tarjeta" },
                        { mode: "modal" as const, Icon: Maximize2, label: "Ventana centrada" },
                    ]).map(({ mode, Icon, label }) => (
                        <button
                            key={mode}
                            onClick={() => changeFixtureMode(mode)}
                            title={`Ver el fixture como ${label.toLowerCase()}`}
                            aria-pressed={fixtureMode === mode}
                            className={`p-1 rounded-md transition-colors ${fixtureMode === mode
                                ? "bg-cyan-400/15 text-cyan-300"
                                : "text-subtle hover:text-muted-foreground"}`}
                        >
                            <Icon className="w-3 h-3" />
                        </button>
                    ))}
                </div>
            </div>

            <div ref={gridRef} className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-3 items-start">
                {sortGroupsByName(groups).map((g: Group) => {
                    const standings = computeStandings(g.id);
                    const groupMatches = matches
                        .filter(m => m.groupId === g.id)
                        // roundIndex es el orden armado por generateGroupMatches (nadie
                        // juega dos veces seguidas). Los ids se reescriben como UUID al
                        // guardar, así que ordenar por id daría un orden azaroso; sólo
                        // sirve de desempate para fixtures viejos sin roundIndex.
                        .sort((a, b) => (a.roundIndex ?? Number.MAX_SAFE_INTEGER) - (b.roundIndex ?? Number.MAX_SAFE_INTEGER)
                            || a.id.localeCompare(b.id));
                    // Los jugados caen al final: lo que importa es lo que falta jugar.
                    // Es sólo del orden en pantalla — no toca `roundIndex`, así el
                    // orden que armó el admin a mano queda intacto. El sort de JS es
                    // estable, así que dentro de cada bloque se respeta el fixture.
                    const visibleMatches = [...groupMatches].sort(
                        (a, b) => Number(isMatchFinished(a)) - Number(isMatchFinished(b)));
                    const nextInfo = groupNextInfo(g.id);
                    const liveInfo = groupLiveInfo(g.id);
                    const isOpen = openGroupId === g.id;
                    // Parejas con un partido en curso: se resaltan en la tabla para
                    // saber quién está en cancha sin abrir el fixture.
                    const liveMatches = groupMatches.filter(m => m.status === 'in_progress' && !m.confirmed);
                    const playingIds = new Set(liveMatches.flatMap(m => [m.team1.id, m.team2.id]));
                    // Vista de a uno: sólo pendientes. Los que están en cancha van
                    // arriba en su propia sección y los jugados quedan en el fixture.
                    const pendingMatches = groupMatches.filter(m => !isMatchFinished(m) && m.status !== 'in_progress');
                    const pendingOrder = new Map(pendingMatches.map((m, i) => [m.id, i]));
                    const cursor = Math.min(slotCursor[g.id] ?? 0, Math.max(0, pendingMatches.length - 1));
                    const slotMatch = pendingMatches[cursor];
                    const entries = groupEntries(g.id);
                    const issues = groupFixtureIssues(g.id);

                    const fixtureBody = (
                        <>
                            {!readOnly && nextInfo.availableCount > 1 && (
                                <button
                                    onClick={() => startAllGroupMatches(g.id)}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg font-black uppercase italic tracking-widest text-[10px] transition-all border bg-surface text-muted-foreground border-hairline hover:bg-cyan-400/10 hover:text-cyan-300 hover:border-cyan-400/30 active:scale-95"
                                    title="Iniciar de una todos los partidos con las dos parejas presentes"
                                >
                                    <Play className="w-3 h-3" />
                                    Iniciar todos ({nextInfo.availableCount})
                                </button>
                            )}

                            <div className="grid gap-1">
                                {visibleMatches.map(m => {
                                    // Sólo se reordena entre pendientes: los jugados ya
                                    // pasaron y los que están en cancha no se mueven.
                                    const pendingIdx = pendingOrder.get(m.id);
                                    const canReorder = pendingIdx !== undefined;
                                    return (
                                        <div key={m.id} className="flex items-stretch gap-1">
                                            {!readOnly && (
                                                <div className="shrink-0 flex flex-col justify-center">
                                                    <button
                                                        onClick={() => moveMatchOrder(m.id, -1)}
                                                        disabled={!canReorder || pendingIdx === 0}
                                                        title="Adelantar este partido"
                                                        className="p-0.5 rounded text-subtle hover:text-cyan-300 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                                                    >
                                                        <ArrowUp className="w-2.5 h-2.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveMatchOrder(m.id, 1)}
                                                        disabled={!canReorder || pendingIdx === pendingMatches.length - 1}
                                                        title="Atrasar este partido"
                                                        className="p-0.5 rounded text-subtle hover:text-cyan-300 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                                                    >
                                                        <ArrowDown className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <GroupMatchRow
                                                    m={m}
                                                    readOnly={readOnly}
                                                    isEntryPresent={isEntryPresent}
                                                    isEntryBusy={isEntryBusy}
                                                    startGroupMatch={startGroupMatch}
                                                    cancelGroupMatch={cancelGroupMatch}
                                                    handleScoreChange={handleScoreChange}
                                                    handleConfirmScore={handleConfirmScore}
                                                    handleReopenMatch={handleReopenMatch}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    );


                    return (
                        <div
                            key={g.id}
                            // min-w-0: sin esto el ítem de grid no baja del ancho mínimo de
                            // su contenido (botones + steppers) y la tarjeta se corta.
                            className={`min-w-0 relative rounded-xl border border-hairline shadow-lg flex flex-col ${isOpen ? "z-30" : "z-0"}`}
                            style={{ background: "var(--arena-panel)" }}
                        >
                            <div className="px-3 py-1.5 border-b border-hairline flex items-center justify-between bg-surface">
                                <div className="flex items-center gap-2 min-w-0">
                                    <h3 className="shrink-0 text-base font-black italic uppercase tracking-tighter text-foreground leading-none">{g.name}</h3>
                                    {!readOnly && (
                                        <GroupCourtField group={g} onSave={saveGroupCourt} />
                                    )}
                                    {readOnly && g.courtNumber && (
                                        <div className="flex items-center gap-1.5 bg-cyan-400/10 px-2 py-0.5 rounded-lg border border-cyan-400/20 w-fit">
                                            <MapPin className="w-2.5 h-2.5 text-cyan-400" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-cyan-300">{g.courtNumber}</span>
                                        </div>
                                    )}
                                    {/* Cancha ocupada: se distingue a distancia con los 4 grupos en pantalla. */}
                                    {liveMatches.length > 0 && (
                                        <div className="shrink-0 flex items-center gap-1.5 bg-rojo/10 px-2 py-0.5 rounded-lg border border-rojo/30 w-fit">
                                            <span className="relative flex w-1.5 h-1.5">
                                                <span className="absolute inline-flex w-full h-full rounded-full bg-rojo opacity-75 animate-ping" />
                                                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-rojo" />
                                            </span>
                                            <span className="text-[10px] font-black uppercase italic tracking-[0.1em] text-rojo">
                                                {liveMatches.length > 1 ? `${liveMatches.length} en juego` : "En juego"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Users2 className="w-4 h-4 text-muted-foreground" />
                                    <button
                                        onClick={() => toggleOpen(g.id)}
                                        title={isOpen ? `Cerrar el fixture de ${g.name}` : `Ver el fixture de ${g.name} (${groupMatches.length} partidos)`}
                                        className={`flex items-center gap-1 px-1.5 py-1 rounded-lg border transition-colors ${isOpen
                                            ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                                            : "border-hairline bg-surface text-muted-foreground hover:text-cyan-300 hover:border-cyan-400/30"}`}
                                    >
                                        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="px-3 py-1 border-b border-hairline bg-surface">
                                <div className="flex-1 overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-[11px]">
                                        <thead>
                                            <tr className="border-b border-hairline">
                                                {/* Los encabezados marcan/desmarcan la columna entera del grupo:
                                                    ir fila por fila con la tanda completa es incómodo. */}
                                                <th className="px-0.5 py-1 text-center">
                                                    {readOnly ? (
                                                        <span className="font-black italic text-muted-foreground uppercase tracking-widest text-[11px]">OK</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => toggleGroupChecked('present', g.id)}
                                                            title={isGroupChecked('present', g.id) ? "Desmarcar presentes del grupo" : "Marcar presentes a todo el grupo"}
                                                            className={`font-black italic uppercase tracking-widest text-[11px] px-1 rounded transition-colors ${isGroupChecked('present', g.id) ? "text-cyan-400 hover:text-cyan-300" : "text-muted-foreground hover:text-cyan-400"}`}
                                                        >
                                                            OK
                                                        </button>
                                                    )}
                                                </th>
                                                <th className="px-0.5 py-1 text-center">
                                                    {readOnly ? (
                                                        <span className="font-black italic text-muted-foreground uppercase tracking-widest text-[11px]">$$</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => toggleGroupChecked('paid', g.id)}
                                                            title={isGroupChecked('paid', g.id) ? "Desmarcar pagos del grupo" : "Marcar pago a todo el grupo"}
                                                            className={`font-black italic uppercase tracking-widest text-[11px] px-1 rounded transition-colors ${isGroupChecked('paid', g.id) ? "text-emerald-500 hover:text-emerald-400" : "text-muted-foreground hover:text-emerald-500"}`}
                                                        >
                                                            $$
                                                        </button>
                                                    )}
                                                </th>
                                                <th className="px-1.5 py-1 text-left font-black italic text-muted-foreground uppercase tracking-widest text-[11px]">#</th>
                                                <th className="px-1 py-1 text-left font-black italic text-muted-foreground uppercase tracking-widest text-[11px]">Jugador</th>
                                                <th className="px-1 py-1 text-center font-black italic text-muted-foreground uppercase tracking-widest text-[11px]">PG</th>
                                                <th className="px-1 py-1 text-center font-black italic text-muted-foreground uppercase tracking-widest text-[11px]">+/-</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {standings.map((s, idx: number) => {
                                                // Check-in y pago son por jugador: una fila de la pareja = un
                                                // botón por integrante, alineado con su nombre.
                                                const memberNames = s.player.name.split(/[\/\+]/).map((n: string) => n.trim()).filter(Boolean);
                                                const slots: (0 | 1)[] = memberNames.length > 1 ? [0, 1] : [0];
                                                const isPlaying = playingIds.has(s.playerId);
                                                return (
                                                <tr
                                                    key={s.playerId}
                                                    className={`border-b border-hairline transition-colors ${isPlaying
                                                        ? "bg-rojo/[0.08] hover:bg-rojo/[0.12]"
                                                        : "hover:bg-surface"}`}
                                                >
                                                    {/* borde transparente en las que no juegan: si no, la fila
                                                        resaltada se corre 2px y baila la tabla. */}
                                                    <td className={`px-0.5 py-0.5 align-top border-l-2 ${isPlaying ? "border-rojo" : "border-transparent"}`}>
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            {slots.map(slot => (
                                                                <button
                                                                    key={slot}
                                                                    onClick={() => toggleMemberPresent(s.playerId, slot)}
                                                                    title={`${memberNames[slot] || s.player.name}: ${isMemberPresent(s.playerId, slot) ? "presente" : "marcar presente"}`}
                                                                    className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${isMemberPresent(s.playerId, slot) ? "bg-cyan-400 text-slate-900 shadow-sm shadow-cyan-400/30" : "bg-surface-raised text-muted-foreground hover:text-cyan-400"}`}
                                                                >
                                                                    <UserCheck className="w-2.5 h-2.5" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-0.5 py-0.5 align-top">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            {slots.map(slot => (
                                                                <button
                                                                    key={slot}
                                                                    onClick={() => toggleMemberPaid(s.playerId, slot)}
                                                                    title={`${memberNames[slot] || s.player.name}: ${isMemberPaid(s.playerId, slot) ? "pagó" : "marcar pago"}`}
                                                                    className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${isMemberPaid(s.playerId, slot) ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30" : "bg-surface-raised text-muted-foreground hover:text-emerald-400"}`}
                                                                >
                                                                    <CreditCard className="w-2.5 h-2.5" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-1.5 py-0.5 text-left align-top">
                                                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-md font-black italic text-[10px] ${idx === 0 ? "bg-rojo text-white shadow-sm shadow-rojo/30" : "bg-surface text-muted-foreground"}`}>
                                                            {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-1 py-0.5 align-top">
                                                        <div className="flex flex-col gap-0.5">
                                                            {(memberNames.length ? memberNames : [s.player.name]).map((name: string, i: number) => (
                                                                <span
                                                                    key={i}
                                                                    className={`font-black uppercase italic tracking-tight leading-none text-[11px] h-4 flex items-center ${isPlaying
                                                                        ? "text-foreground"
                                                                        : isMemberPresent(s.playerId, (i === 1 ? 1 : 0)) ? "text-muted-foreground" : "text-subtle"}`}
                                                                >
                                                                    {name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-1 py-0.5 text-center align-top font-black italic text-cyan-400">{s.won}</td>
                                                    <td className="px-1 py-0.5 text-center align-top font-black italic text-muted-foreground">{s.points > 0 ? `+${s.points}` : s.points}</td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="p-2.5 space-y-2">
                                {/* En cancha: no se puede esconder lo que se está jugando. */}
                                {liveMatches.length > 0 && (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1 px-1">
                                            <span className="shrink-0 text-[11px] font-black uppercase tracking-[0.2em] text-rojo">En cancha</span>
                                            <div className="h-px flex-1 min-w-2 bg-surface-raised mx-1" />
                                        </div>
                                        <div className="grid gap-1">
                                            {liveMatches.map(m => (
                                                <GroupMatchRow
                                                    key={m.id}
                                                    m={m}
                                                    readOnly={readOnly}
                                                    isEntryPresent={isEntryPresent}
                                                    isEntryBusy={isEntryBusy}
                                                    startGroupMatch={startGroupMatch}
                                                    cancelGroupMatch={cancelGroupMatch}
                                                    handleScoreChange={handleScoreChange}
                                                    handleConfirmScore={handleConfirmScore}
                                                    handleReopenMatch={handleReopenMatch}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Próximo partido, de a uno. */}
                                {slotMatch && (
                                    <div className="space-y-1.5">
                                        <GroupMatchSlot
                                            m={slotMatch}
                                            entries={entries}
                                            position={cursor + 1}
                                            total={pendingMatches.length}
                                            readOnly={readOnly}
                                            onPrev={() => moveCursor(g.id, -1, pendingMatches.length)}
                                            onNext={() => moveCursor(g.id, 1, pendingMatches.length)}
                                            onPlayFirst={() => {
                                                moveMatchFirst(slotMatch.id);
                                                // Pasa a ser el primero: el slot lo sigue mostrando.
                                                setSlotCursor(prev => ({ ...prev, [g.id]: 0 }));
                                            }}
                                            onChangeTeam={(slot, teamId) => updateMatchTeam(slotMatch.id, slot, teamId)}
                                        />
                                        <GroupMatchRow
                                            m={slotMatch}
                                            readOnly={readOnly}
                                            isEntryPresent={isEntryPresent}
                                            isEntryBusy={isEntryBusy}
                                            startGroupMatch={startGroupMatch}
                                            cancelGroupMatch={cancelGroupMatch}
                                            handleScoreChange={handleScoreChange}
                                            handleConfirmScore={handleConfirmScore}
                                            handleReopenMatch={handleReopenMatch}
                                        />
                                    </div>
                                )}

                                {/* Editar parejas a mano puede romper el todos-contra-todos. */}
                                {!readOnly && (issues.repeated > 0 || issues.missing > 0) && (
                                    <div className="flex items-start gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                        <span className="text-[10px] font-bold text-amber-500 leading-tight">
                                            {issues.repeated > 0 && `${issues.repeated} cruce${issues.repeated === 1 ? "" : "s"} repetido${issues.repeated === 1 ? "" : "s"}`}
                                            {issues.repeated > 0 && issues.missing > 0 && " · "}
                                            {issues.missing > 0 && `${issues.missing} cruce${issues.missing === 1 ? "" : "s"} sin jugar`}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-1 px-1 min-w-0">
                                    <button
                                        onClick={() => toggleOpen(g.id)}
                                        title={isOpen ? "Cerrar el fixture" : "Ver el fixture"}
                                        className={`shrink-0 flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${isOpen ? "text-cyan-300" : "text-muted-foreground hover:text-cyan-300"}`}
                                    >
                                        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                        Fixture del Grupo
                                        <span className="text-subtle tracking-normal">({groupMatches.length})</span>
                                    </button>
                                    <div className="h-px flex-1 min-w-2 bg-surface-raised mx-1" />
                                    {!readOnly && groupMatches.some(m => !m.confirmed && m.status === 'in_progress' && m.score1 !== undefined && m.score2 !== undefined && m.score1 !== m.score2) && (
                                        <button
                                            onClick={() => {
                                                const matchesToConfirm = groupMatches.filter(m =>
                                                    !m.confirmed &&
                                                    m.status === 'in_progress' &&
                                                    m.score1 !== undefined &&
                                                    m.score2 !== undefined &&
                                                    m.score1 !== m.score2
                                                );
                                                if (matchesToConfirm.length > 0) {
                                                    handleConfirmScore(matchesToConfirm.map(m => m.id));
                                                }
                                            }}
                                            className="shrink-0 text-[10px] font-black uppercase italic tracking-wider text-cyan-300 hover:text-foreground bg-cyan-400/10 hover:bg-cyan-400 px-1.5 py-0.5 rounded transition-colors border border-cyan-400/30"
                                        >
                                            GUARDAR TODO
                                        </button>
                                    )}
                                    {!readOnly && liveInfo.cancellableCount > 1 && (
                                        <button
                                            onClick={() => cancelAllGroupMatches(g.id)}
                                            className="shrink-0 ml-1 flex items-center gap-1 text-[10px] font-black uppercase italic tracking-wider text-muted-foreground hover:text-foreground bg-surface hover:bg-surface-raised px-1.5 py-0.5 rounded transition-colors border border-hairline"
                                            title="Devolver a pendiente los partidos iniciados sin puntos"
                                        >
                                            <Undo2 className="w-2.5 h-2.5" />
                                            Deshacer ({liveInfo.cancellableCount})
                                        </button>
                                    )}
                                </div>

                            </div>

                            {/* El fixture se muestra en dropdown flotante (no empuja la
                                grilla) o en modal centrado, según la preferencia guardada.
                                El contenido se define una sola vez para que no se
                                desincronicen los dos contenedores. */}
                            {isOpen && fixtureMode === "dropdown" && (
                                <div
                                    className="absolute left-0 right-0 top-full z-40 mt-1 p-2.5 space-y-1.5 rounded-xl border border-cyan-400/30 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.65)] max-h-[65vh] overflow-y-auto custom-scrollbar"
                                    style={{ background: "var(--arena-panel)" }}
                                >
                                    {fixtureBody}
                                </div>
                            )}

                            <Dialog
                                open={isOpen && fixtureMode === "modal"}
                                onOpenChange={open => !open && setOpenGroupId(null)}
                            >
                                <DialogContent className="max-w-2xl rounded-2xl p-5" style={{ background: "var(--arena-panel)" }}>
                                    <DialogHeader>
                                        <DialogTitle className="text-base font-black italic uppercase tracking-tighter">
                                            {g.name} <span className="text-subtle font-bold">· Fixture ({groupMatches.length})</span>
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-1.5 max-h-[65vh] overflow-y-auto custom-scrollbar -mx-1 px-1">
                                        {fixtureBody}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
