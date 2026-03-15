"use client";

import { useState, DragEvent } from "react";
import Link from "next/link";

import styles from "./setup.module.css";

// ─── Datos simulados ───────────────────────────────────────────────────────────
const REGISTERED: Record<string, { id: string; name: string; level: string }[]> = {
    "D": [
        { id: "p1", name: "Perez / García", level: "D Cat." },
        { id: "p2", name: "Torres / Silva", level: "D Cat." },
        { id: "p3", name: "Gomez / Lopez", level: "D Cat." },
        { id: "p4", name: "Ruiz / Soto", level: "D Cat." },
        { id: "p5", name: "Díaz / Fernández", level: "D Cat." },
        { id: "p6", name: "Mora / Ríos", level: "D Cat." },
    ],
    "A+": [
        { id: "q1", name: "Tapia / Coello", level: "A+ Cat." },
        { id: "q2", name: "Galán / Chingotto", level: "A+ Cat." },
        { id: "q3", name: "Lebron / Paquito", level: "A+ Cat." },
        { id: "q4", name: "Stupaczuk / Di Nenno", level: "A+ Cat." },
    ],
    "B": [
        { id: "r1", name: "Olaeta / Vergara", level: "B Cat." },
        { id: "r2", name: "Suarez / Ibáñez", level: "B Cat." },
        { id: "r3", name: "Perales / Méndez", level: "B Cat." },
        { id: "r4", name: "Castro / Vega", level: "B Cat." },
    ],
};

const CATEGORIES = Object.keys(REGISTERED);

function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function nextPow2(n: number) {
    let s = 1; while (s < n) s *= 2; return s;
}

// ─── Match list view ──────────────────────────────────────────────────────────
function MatchListView({
    slotsByCat,
    onBack,
}: {
    slotsByCat: Record<string, (string | null)[]>;
    onBack: () => void;
}) {
    const playerName = (cat: string, id: string | null) =>
        id ? (REGISTERED[cat]?.find((p) => p.id === id)?.name ?? id) : "BYE";

    // Build match pairs for every category
    const allMatches: { cat: string; matchIdx: number; t1: string; t2: string; id: string }[] = [];
    CATEGORIES.forEach((cat) => {
        const slots = slotsByCat[cat] ?? [];
        const playerCount = REGISTERED[cat]?.length ?? 0;
        const firstRoundMatches = Math.ceil(playerCount / 2);
        for (let i = 0; i < firstRoundMatches; i++) {
            const t1 = playerName(cat, slots[i * 2]);
            const t2 = slots[i * 2 + 1] !== undefined && i * 2 + 1 < playerCount
                ? playerName(cat, slots[i * 2 + 1])
                : "BYE";
            allMatches.push({ cat, matchIdx: i, t1, t2, id: `${cat}-m${i}` });
        }
    });

    return (
        <div className={styles.matchListPage}>
            <div className={styles.topBar}>
                <div className={styles.topBarLeft}>
                    <button className={styles.backLink} onClick={onBack}>← Volver al Fixture</button>
                    <div>
                        <div className={styles.tournamentName}>Copa Primavera – Partidos</div>
                        <div className={styles.tournamentMeta}>Hacé click en un partido para abrir el panel de puntuación</div>
                    </div>
                </div>
            </div>

            <div className={styles.matchListContent}>
                {CATEGORIES.map((cat) => {
                    const catMatches = allMatches.filter((m) => m.cat === cat);
                    if (!catMatches.length) return null;
                    return (
                        <div key={cat}>
                            <div className={styles.matchGroupTitle}>{cat} Categoría — {catMatches.length} partidos</div>
                            {catMatches.map((match) => (
                                <Link
                                    href="/tournaments/dashboard"
                                    key={match.id}
                                    className={styles.matchRow}
                                >
                                    <div className={styles.matchRowIcon}>🎾</div>
                                    <div style={{ flex: 1 }}>
                                        <div className={styles.matchRowVs}>
                                            {match.t1}
                                            <span style={{ color: "var(--text-muted)", fontWeight: 400, margin: "0 0.5rem" }}>vs</span>
                                            {match.t2}
                                        </div>
                                        <div className={styles.matchRowMeta}>
                                            {cat} · Partido {match.matchIdx + 1}
                                            {match.t2 === "BYE" && <span style={{ color: "var(--primary)", marginLeft: "0.5rem" }}>· Pasa directo →</span>}
                                        </div>
                                    </div>
                                    <span className={`${styles.matchStatusBadge} ${styles.statusPending}`}>Pendiente</span>
                                    <span className={styles.matchArrow}>
                                        {match.t2 === "BYE" ? "⚡" : "→ Panel"}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Confirmation dialog ──────────────────────────────────────────────────────
function ConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
    return (
        <div className={styles.overlay}>
            <div className={styles.dialog}>
                <div className={styles.dialogIcon}>💾</div>
                <h2 className={styles.dialogTitle}>¿Guardar y continuar?</h2>
                <p className={styles.dialogBody}>
                    El fixture quedará guardado y no podrás modificar los emparejamientos una vez que avances.
                    ¿Estás seguro?
                </p>
                <div className={styles.dialogActions}>
                    <button className={styles.btnSecondary} onClick={onCancel}>Cancelar</button>
                    <button className={styles.btnPrimary} onClick={onConfirm}>Guardar y continuar →</button>
                </div>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SetupFixturePage() {
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
    const [dragId, setDragId] = useState<string | null>(null);
    const [overSlot, setOverSlot] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [saved, setSaved] = useState(false);

    const bracketSize = (cat: string) => nextPow2(REGISTERED[cat]?.length ?? 0);

    const [slotsByCat, setSlotsByCat] = useState<Record<string, (string | null)[]>>(
        Object.fromEntries(CATEGORIES.map((c) => [c, Array(bracketSize(c)).fill(null)]))
    );

    const slots = slotsByCat[activeCategory] ?? [];
    const registered = REGISTERED[activeCategory] ?? [];
    const playerCount = registered.length;
    const firstRoundMatches = Math.ceil(playerCount / 2);
    const assignedIds = new Set(slots.filter(Boolean) as string[]);

    const playerName = (id: string) => registered.find((p) => p.id === id)?.name ?? id;

    // ── Drag ──────────────────────────────────────────────────────────────────
    const onDragStart = (e: DragEvent, id: string) => {
        setDragId(id);
        e.dataTransfer.effectAllowed = "move";
    };

    const onDragOverSlot = (e: DragEvent, slotKey: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOverSlot(slotKey);
    };

    const onDropSlot = (e: DragEvent, slotIdx: number) => {
        e.preventDefault();
        if (!dragId) return;
        setSlotsByCat((prev) => {
            const next = [...(prev[activeCategory] ?? [])];
            const oldIdx = next.indexOf(dragId);
            if (oldIdx >= 0) next[oldIdx] = null;
            next[slotIdx] = dragId;
            return { ...prev, [activeCategory]: next };
        });
        setDragId(null);
        setOverSlot(null);
    };

    const clearSlot = (slotIdx: number) => {
        setSlotsByCat((prev) => {
            const next = [...(prev[activeCategory] ?? [])];
            next[slotIdx] = null;
            return { ...prev, [activeCategory]: next };
        });
    };

    const filledCount = slots.filter(Boolean).length;
    const allFilled = CATEGORIES.every((c) =>
        (slotsByCat[c] ?? []).filter(Boolean).length >= (REGISTERED[c]?.length ?? 0)
    );

    // ── Saved: show match list ─────────────────────────────────────────────────
    if (saved) {
        return <MatchListView slotsByCat={slotsByCat} onBack={() => setSaved(false)} />;
    }

    return (

            <div className={styles.page}>
                {/* ── Top bar ── */}
                <div className={styles.topBar}>
                    <div className={styles.topBarLeft}>
                        <Link href="/tournaments/dashboard" className={styles.backLink}>← Panel</Link>
                        <div>
                            <div className={styles.tournamentName}>Copa Primavera – Armado de Fixture</div>
                            <div className={styles.tournamentMeta}>Arrastrá los equipos inscriptos a los slots del cuadro</div>
                        </div>
                    </div>
                </div>

                {/* ── Category tabs ── */}
                <div className={styles.catTabsRow}>
                    {CATEGORIES.map((cat) => {
                        const filled = (slotsByCat[cat] ?? []).filter(Boolean).length;
                        const total = REGISTERED[cat]?.length ?? 0;
                        const done = filled >= total;
                        return (
                            <button
                                key={cat}
                                className={`${styles.catTab} ${activeCategory === cat ? styles.active : ""}`}
                                onClick={() => setActiveCategory(cat)}
                            >
                                {done ? "✓ " : ""}{cat} ({filled}/{total})
                            </button>
                        );
                    })}
                </div>

                {/* ── Workspace ── */}
                <div className={styles.workspace}>
                    {/* Left: player list */}
                    <div className={styles.sidePanel}>
                        <div className={styles.sidePanelHeader}>
                            <div className={styles.sidePanelTitle}>Inscriptos – {activeCategory}</div>
                            <div className={styles.sidePanelCount}>{registered.length} equipos registrados</div>
                        </div>
                        <div className={styles.playerList}>
                            {registered.map((player) => {
                                const isAssigned = assignedIds.has(player.id);
                                const isDragging = dragId === player.id;
                                return (
                                    <div
                                        key={player.id}
                                        className={[
                                            styles.playerCard,
                                            isAssigned ? styles.assigned : "",
                                            isDragging ? styles.dragging : "",
                                        ].join(" ")}
                                        draggable={!isAssigned}
                                        onDragStart={(e) => !isAssigned && onDragStart(e, player.id)}
                                    >
                                        <span className={styles.dragHandle}>{isAssigned ? "✓" : "⠿"}</span>
                                        <div>
                                            <div className={styles.playerCardName}>{player.name}</div>
                                            <div className={styles.playerCardSub}>{player.level}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: match slot assignment (first round only) */}
                    <div className={styles.bracketArea}>
                        <div className={styles.bracketHint}>
                            💡 Arrastrá los equipos a los slots. Los slots sin par quedan como BYE automático.
                            <strong style={{ marginLeft: "auto", color: filledCount >= playerCount ? "var(--primary)" : "var(--text-muted)" }}>
                                {filledCount}/{playerCount} asignados
                            </strong>
                        </div>

                        <div className={styles.matchGrid}>
                            {Array.from({ length: firstRoundMatches }).map((_, matchIdx) => {
                                const slot1 = matchIdx * 2;
                                const slot2 = matchIdx * 2 + 1;
                                const hasBye = slot2 >= playerCount;
                                return (
                                    <div key={matchIdx} className={styles.matchCard}>
                                        <div className={styles.matchCardHeader}>
                                            Partido {matchIdx + 1}
                                            {hasBye && <span className={styles.byePill}>BYE</span>}
                                        </div>
                                        {[slot1, slot2].map((slotIdx) => {
                                            const isBye = slotIdx >= playerCount;
                                            const playerId = slots[slotIdx];
                                            const slotKey = `${activeCategory}-${slotIdx}`;
                                            if (isBye) {
                                                return (
                                                    <div key={slotIdx} className={`${styles.dropSlot} ${styles.byeSlotRow}`}>
                                                        <div className={styles.slotSeed}>—</div>
                                                        <span className={styles.dropSlotLabel}>BYE automático</span>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div
                                                    key={slotIdx}
                                                    className={[
                                                        styles.dropSlot,
                                                        !playerId ? styles.empty : "",
                                                        overSlot === slotKey ? styles.over : "",
                                                    ].join(" ")}
                                                    onDragOver={(e) => onDragOverSlot(e, slotKey)}
                                                    onDragLeave={() => setOverSlot(null)}
                                                    onDrop={(e) => onDropSlot(e, slotIdx)}
                                                >
                                                    <div className={styles.slotSeed}>{slotIdx + 1}</div>
                                                    {playerId ? (
                                                        <>
                                                            <span className={styles.slotName}>{playerName(playerId)}</span>
                                                            <button className={styles.clearSlotBtn} onClick={() => clearSlot(slotIdx)}>✕</button>
                                                        </>
                                                    ) : (
                                                        <span className={styles.dropSlotLabel}>Soltar equipo aquí…</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Bottom bar ── */}
                <div className={styles.bottomBar}>
                    <span className={styles.progressText}>
                        {allFilled
                            ? "✅ Todos los equipos asignados. Podés continuar."
                            : "Arrastrá los equipos a los slots antes de continuar."}
                    </span>
                    <button className={styles.btnSecondary} onClick={() => {
                        setSlotsByCat(Object.fromEntries(CATEGORIES.map((c) => [c, Array(bracketSize(c)).fill(null)])));
                    }}>
                        🔄 Reiniciar
                    </button>
                    <button
                        className={styles.btnSecondary}
                        style={{ borderColor: "rgba(217,249,93,0.4)", color: "var(--primary)" }}
                        onClick={() => {
                            setSlotsByCat(Object.fromEntries(
                                CATEGORIES.map((c) => {
                                    const ids = shuffleArray(REGISTERED[c].map((p) => p.id));
                                    const size = bracketSize(c);
                                    const filledSlots: (string | null)[] = Array(size).fill(null);
                                    ids.forEach((id, i) => { filledSlots[i] = id; });
                                    return [c, filledSlots];
                                })
                            ));
                        }}
                    >
                        🎲 Sorteo Automático
                    </button>
                    <button
                        className={styles.btnPrimary}
                        disabled={!allFilled}
                        onClick={() => setShowConfirm(true)}
                    >
                        Siguiente →
                    </button>
                </div>

                {/* ── Confirmation dialog ── */}
                {showConfirm && (
                    <ConfirmDialog
                        onConfirm={() => { setShowConfirm(false); setSaved(true); }}
                        onCancel={() => setShowConfirm(false)}
                    />
                )}
            </div>
    );
}
