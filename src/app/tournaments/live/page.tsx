"use client";

import FeedLayout from "@/app/feed/layout";
import styles from "./live.module.css";
import { useState } from "react";

// ── Data ──────────────────────────────────────────────────────────────────────
type PointEntry = { team: 1 | 2; label: string; p1: string; p2: string };

interface Match {
    id: number;
    stage: string;
    category: string;
    cancha: string;
    tournament: string;
    ytId?: string;
    team1: { name: string; sets: number[]; points: string; isServing: boolean };
    team2: { name: string; sets: number[]; points: string; isServing: boolean };
    history: PointEntry[];
}

const MATCHES: Match[] = [
    {
        id: 1, stage: "FINAL", category: "1ra Caballeros",
        cancha: "Cancha Central", tournament: "Master Final 2026",
        ytId: "dQw4w9WgXcQ",
        team1: { name: "Tapia / Coello", sets: [6, 4], points: "40", isServing: false },
        team2: { name: "Galán / Chingotto", sets: [4, 5], points: "15", isServing: true },
        history: [
            { team: 1, label: "Winner derecho", p1: "15", p2: "0" },
            { team: 2, label: "Doble falta", p1: "15", p2: "15" },
            { team: 2, label: "Ganador de volea", p1: "15", p2: "30" },
            { team: 1, label: "Globo ganador", p1: "30", p2: "30" },
            { team: 1, label: "Error de red", p1: "40", p2: "30" },
            { team: 2, label: "Ace", p1: "40", p2: "40" },
            { team: 1, label: "Winner revés", p1: "AD", p2: "40" },
            { team: 1, label: "Punto de quiebre", p1: "G", p2: "40" },
        ],
    },
    {
        id: 2, stage: "SEMIFINAL", category: "5ta Libre",
        cancha: "Cancha 1", tournament: "Copa Primavera 2025",
        team1: { name: "Perez / García", sets: [7, 1], points: "0", isServing: true },
        team2: { name: "Gomez / Lopez", sets: [6, 4], points: "0", isServing: false },
        history: [
            { team: 1, label: "Winner derecho", p1: "15", p2: "0" },
            { team: 1, label: "Error directo T2", p1: "30", p2: "0" },
            { team: 2, label: "Globo ganador", p1: "30", p2: "15" },
            { team: 1, label: "Smash ganador", p1: "40", p2: "15" },
            { team: 1, label: "Punto de set", p1: "G", p2: "15" },
        ],
    },
    {
        id: 3, stage: "CUARTOS", category: "7ma Damas",
        cancha: "Cancha 2", tournament: "Copa Primavera 2025",
        team1: { name: "Rodríguez / Vega", sets: [6, 3], points: "30", isServing: false },
        team2: { name: "Flores / Méndez", sets: [4, 6], points: "15", isServing: true },
        history: [
            { team: 2, label: "Winner drive", p1: "0", p2: "15" },
            { team: 1, label: "Volea de revés", p1: "15", p2: "15" },
            { team: 1, label: "Winner cruzado", p1: "30", p2: "15" },
        ],
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function SetBox({ score, isWin }: { score: number; isWin: boolean }) {
    return (
        <div className={`${styles.setBox} ${isWin ? styles.setWon : ""}`}>
            {score}
        </div>
    );
}

// ── Match Selection Card ───────────────────────────────────────────────────────
function MatchSelectionCard({ match, onSelect }: { match: Match; onSelect: () => void }) {
    return (
        <div className={styles.selCard} onClick={onSelect}>
            <div className={styles.selCardTop}>
                <div className={styles.selBadges}>
                    <span className={styles.livePill}>🔴 EN VIVO</span>
                    <span className={styles.stagePill}>{match.stage}</span>
                    <span className={styles.catPill}>{match.category}</span>
                </div>
                <span className={styles.cancha}>{match.cancha}</span>
            </div>
            <div className={styles.selTournament}>{match.tournament}</div>
            <div className={styles.selScoreboard}>
                {/* Team 1 */}
                <div className={styles.selTeamRow}>
                    <div className={styles.selServe}>{match.team1.isServing && "🟡"}</div>
                    <span className={styles.selTeamName}>{match.team1.name}</span>
                    <div className={styles.selSets}>
                        {match.team1.sets.map((s, i) => (
                            <SetBox key={i} score={s} isWin={s > match.team2.sets[i]} />
                        ))}
                    </div>
                    <div className={styles.selPoints}>{match.team1.points}</div>
                </div>
                <div className={styles.selDivider} />
                {/* Team 2 */}
                <div className={styles.selTeamRow}>
                    <div className={styles.selServe}>{match.team2.isServing && "🟡"}</div>
                    <span className={styles.selTeamName}>{match.team2.name}</span>
                    <div className={styles.selSets}>
                        {match.team2.sets.map((s, i) => (
                            <SetBox key={i} score={s} isWin={s > match.team1.sets[i]} />
                        ))}
                    </div>
                    <div className={styles.selPoints}>{match.team2.points}</div>
                </div>
            </div>
            <div className={styles.selCta}>Ver partido en detalle →</div>
        </div>
    );
}

// ── Match Detail View ─────────────────────────────────────────────────────────
function MatchDetail({ match, onBack }: { match: Match; onBack: () => void }) {
    const [showStream, setShowStream] = useState(true);

    return (
        <div className={styles.detail}>
            {/* Back */}
            <button className={styles.backBtn} onClick={onBack}>← Volver a partidos</button>

            {/* Header */}
            <div className={styles.detailHeader}>
                <div className={styles.selBadges}>
                    <span className={styles.livePill}>🔴 EN VIVO</span>
                    <span className={styles.stagePill}>{match.stage}</span>
                    <span className={styles.catPill}>{match.category}</span>
                </div>
                <h1 className={styles.detailTitle}>{match.tournament}</h1>
                <p className={styles.detailSub}>{match.cancha}</p>
            </div>

            <div className={styles.detailGrid}>
                {/* Left: scoreboard + history */}
                <div>
                    {/* Big scoreboard */}
                    <div className={styles.bigScoreboard}>
                        <div className={styles.bigTeamRow}>
                            <div className={styles.bigServe}>{match.team1.isServing ? "🟡" : ""}</div>
                            <span className={styles.bigTeamName}>{match.team1.name}</span>
                            <div className={styles.bigSets}>
                                {match.team1.sets.map((s, i) => (
                                    <SetBox key={i} score={s} isWin={s > match.team2.sets[i]} />
                                ))}
                            </div>
                            <div className={styles.bigPoints}>{match.team1.points}</div>
                        </div>
                        <div className={styles.bigDivider} />
                        <div className={styles.bigTeamRow}>
                            <div className={styles.bigServe}>{match.team2.isServing ? "🟡" : ""}</div>
                            <span className={styles.bigTeamName}>{match.team2.name}</span>
                            <div className={styles.bigSets}>
                                {match.team2.sets.map((s, i) => (
                                    <SetBox key={i} score={s} isWin={s > match.team1.sets[i]} />
                                ))}
                            </div>
                            <div className={styles.bigPoints}>{match.team2.points}</div>
                        </div>
                    </div>

                    {/* Point History */}
                    <div className={styles.historySection}>
                        <div className={styles.historyTitle}>📋 Historial de Puntos</div>
                        <div className={styles.historyHeader}>
                            <span>{match.team1.name.split(" / ")[0]}</span>
                            <span>{match.team2.name.split(" / ")[0]}</span>
                        </div>
                        <div className={styles.historyList}>
                            {[...match.history].reverse().map((entry, i) => (
                                <div
                                    key={i}
                                    className={`${styles.historyRow} ${entry.team === 1 ? styles.historyLeft : styles.historyRight}`}
                                >
                                    <div className={styles.historyScore}>{entry.p1}</div>
                                    <div className={styles.historyScore}>{entry.p2}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mini stats */}
                    <div className={styles.miniStats}>
                        <div className={styles.miniStatTitle}>Estadísticas del partido</div>
                        {[
                            { label: "Puntos jugados", v1: match.history.length, v2: match.history.length },
                            {
                                label: "Puntos ganados",
                                v1: match.history.filter(h => h.team === 1).length,
                                v2: match.history.filter(h => h.team === 2).length
                            },
                            {
                                label: "Sets ganados",
                                v1: match.team1.sets.filter((s, i) => s > match.team2.sets[i]).length,
                                v2: match.team2.sets.filter((s, i) => s > match.team1.sets[i]).length
                            },
                        ].map(stat => {
                            const total = stat.v1 + stat.v2 || 1;
                            const pct1 = (stat.v1 / total) * 100;
                            return (
                                <div key={stat.label} className={styles.statBar}>
                                    <div className={styles.statBarLabels}>
                                        <span>{stat.v1}</span>
                                        <span className={styles.statBarName}>{stat.label}</span>
                                        <span>{stat.v2}</span>
                                    </div>
                                    <div className={styles.statBarTrack}>
                                        <div className={styles.statBarFill} style={{ width: `${pct1}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: YouTube stream */}
                <div>
                    {match.ytId ? (
                        <div className={styles.streamBox}>
                            <div className={styles.streamHeader}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span className={styles.livePill}>▶ EN VIVO</span>
                                    <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Transmisión YouTube</span>
                                </div>
                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                    <a
                                        href={`https://www.youtube.com/watch?v=${match.ytId}`}
                                        target="_blank" rel="noreferrer"
                                        className={styles.ytLink}
                                    >
                                        Abrir en YouTube ↗
                                    </a>
                                    <button className={styles.toggleStream} onClick={() => setShowStream(v => !v)}>
                                        {showStream ? "Ocultar" : "Mostrar"}
                                    </button>
                                </div>
                            </div>
                            {showStream && (
                                <div style={{ position: "relative", aspectRatio: "16/9", background: "#000" }}>
                                    <iframe
                                        src={`https://www.youtube.com/embed/${match.ytId}?autoplay=1&mute=1`}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                                        title="Transmisión en Vivo"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={styles.noStream}>
                            <span style={{ fontSize: "2rem" }}>📺</span>
                            <p>Sin transmisión disponible para este partido</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LiveScorePage() {
    const [selected, setSelected] = useState<Match | null>(null);

    return (
        <FeedLayout>
            {selected ? (
                <MatchDetail match={selected} onBack={() => setSelected(null)} />
            ) : (
                <div className={styles.selection}>
                    <div className={styles.selHeader}>
                        <div className={styles.selHeadLeft}>
                            <span className={styles.livePill}>🔴 EN VIVO</span>
                            <h1 className={styles.selTitle}>Partidos en curso</h1>
                            <p className={styles.selSub}>Seleccioná un partido para ver el marcador en detalle</p>
                        </div>
                        <div className={styles.selCount}>{MATCHES.length} partidos activos</div>
                    </div>
                    <div className={styles.selGrid}>
                        {MATCHES.map(m => (
                            <MatchSelectionCard key={m.id} match={m} onSelect={() => setSelected(m)} />
                        ))}
                    </div>
                </div>
            )}
        </FeedLayout>
    );
}
