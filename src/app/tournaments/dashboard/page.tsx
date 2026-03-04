"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import styles from "./dashboard.module.css";
import FeedLayout from "@/app/feed/layout";

// ─── Types ────────────────────────────────────────────────────────────────────
const POINT_SEQ = ["0", "15", "30", "40", "AD", "GAME"];

type TeamState = {
    name: string;
    players: string;
    sets: number[];
    pointIdx: number;
    isServing: boolean;
};

type LogEntry = {
    time: string;
    team: 1 | 2;
    description: string;
    color: string;
};

const MATCHES = [
    { id: 1, stage: "CUARTOS", category: "5ta", court: 1, team1: "Perez / García", team2: "Torres / Silva" },
    { id: 2, stage: "CUARTOS", category: "5ta", court: 2, team1: "Gomez / Lopez", team2: "Ruiz / Soto" },
    { id: 3, stage: "SEMIFINAL", category: "1ra", court: 1, team1: "Tapia / Coello", team2: "Galán / Chingotto" },
];

// The dashboard is dedicated to ONE match — no switching allowed.
// (In production this match ID would come from the URL params: /tournaments/dashboard/[matchId])
const ACTIVE_MATCH = MATCHES[0];

function nowTime() {
    return new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function initTeam(players: string, serving: boolean): TeamState {
    return { name: players.split(" / ")[0] + " / " + players.split(" / ")[1], players, sets: [], pointIdx: 0, isServing: serving };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([\w-]{11})/,
        /youtube\.com\/embed\/([\w-]{11})/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function TournamentDashboard() {
    const match = ACTIVE_MATCH;
    const [winner, setWinner] = useState<string | null>(null);
    const [log, setLog] = useState<LogEntry[]>([]);
    const [ytUrl, setYtUrl] = useState("");
    const [ytId, setYtId] = useState<string | null>(null);
    const [showYtPreview, setShowYtPreview] = useState(false);

    const [matchState, setMatchState] = useState<[TeamState, TeamState]>(
        [initTeam(match.team1, true), initTeam(match.team2, false)]
    );

    const handleYtSave = () => {
        const id = extractYouTubeId(ytUrl);
        if (id) {
            setYtId(id);
            setShowYtPreview(true);
        } else {
            alert("Link de YouTube no válido. Usá un link de YouTube Live o un video normal.");
        }
    };

    const [t1, t2] = matchState;

    const addLog = useCallback((team: 1 | 2, description: string) => {
        const color = team === 1 ? "#d9f95d" : "#60a5fa";
        setLog((prev) => [{ time: nowTime(), team, description, color }, ...prev].slice(0, 50));
    }, []);

    // ── Core point logic ──────────────────────────────────────────────────────
    const awardPoint = useCallback((teamNum: 1 | 2) => {
        setMatchState((prev) => {
            const [a, b] = prev.map((t) => ({ ...t, sets: [...t.sets] })) as [TeamState, TeamState];
            const scorer = teamNum === 1 ? a : b;
            const other = teamNum === 1 ? b : a;

            if (scorer.pointIdx === 3 && other.pointIdx === 3) {
                scorer.pointIdx = 4;
                addLog(teamNum, `${scorer.players} → AD`);
                return [a, b];
            }
            if (other.pointIdx === 4) {
                other.pointIdx = 3;
                scorer.pointIdx = 3;
                addLog(teamNum, `${scorer.players} → Deuce`);
                return [a, b];
            }
            scorer.pointIdx += 1;
            if (scorer.pointIdx === 5) {
                const setIdx = scorer.sets.length;
                scorer.sets.push((scorer.sets[setIdx - 1] ?? -1) + 1);
                scorer.pointIdx = 0;
                other.pointIdx = 0;
                scorer.isServing = !scorer.isServing;
                other.isServing = !other.isServing;
                addLog(teamNum, `🎾 GAME ${scorer.players}!`);
            } else {
                addLog(teamNum, `${scorer.players} → ${POINT_SEQ[scorer.pointIdx]}`);
            }
            return [a, b];
        });
    }, [addLog]);

    const undoLastPoint = () => {
        setLog((prev) => prev.slice(1));
        alert("En el sistema real, esto desharía el último punto registrado en la base de datos.");
    };

    const endSet = (teamNum: 1 | 2) => {
        setMatchState((prev) => {
            const [a, b] = prev.map(t => ({ ...t, sets: [...t.sets] })) as [TeamState, TeamState];
            if (teamNum === 1) a.sets.push((a.sets[a.sets.length - 1] ?? -1) + 1);
            else b.sets.push((b.sets[b.sets.length - 1] ?? -1) + 1);
            a.pointIdx = 0; b.pointIdx = 0;
            a.isServing = !a.isServing; b.isServing = !b.isServing;
            addLog(teamNum, `🏆 SET para ${teamNum === 1 ? a.players : b.players}!`);
            return [a, b];
        });
    };

    const finishMatch = (teamNum: 1 | 2) => {
        setWinner(teamNum === 1 ? t1.players : t2.players);
        addLog(teamNum, `🥇 PARTIDO FINALIZADO – Ganador: ${teamNum === 1 ? t1.players : t2.players}`);
    };

    const closeWinner = () => setWinner(null);

    // unused — removed
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _setsWon = (t: TeamState, other: TeamState) => {
        let w = 0;
        t.sets.forEach((s, i) => { if (s > (other.sets[i] ?? 0)) w++; });
        return w;
    };

    return (
        <FeedLayout>
            <div className={styles.page}>
                {/* ── Top Bar ── */}
                <div className={styles.topBar}>
                    <div className={styles.topBarLeft}>
                        <Link href="/tournaments/setup" className={styles.backBtn}>← Lista de Partidos</Link>
                        <div>
                            <div className={styles.tournamentName}>Copa Primavera</div>
                            <div className={styles.tournamentMeta}>
                                {match.stage} · {match.category} · Cancha {match.court} · {match.team1} vs {match.team2}
                            </div>
                        </div>
                    </div>
                    <div className={styles.liveBadge}>🔴 Panel en Vivo</div>
                </div>

                <div className={styles.content}>

                    {/* ── Score Board ── */}
                    <div className={styles.board}>
                        <div className={styles.boardHeader}>
                            <span className={styles.stageBadge}>{match.stage} · {match.category}</span>
                            <span className={styles.courtLabel}>Cancha {match.court}</span>
                        </div>

                        <div className={styles.scoreboard}>
                            {([t1, t2] as [TeamState, TeamState]).map((team, idx) => {
                                const other = idx === 0 ? t2 : t1;
                                const teamNum = (idx + 1) as 1 | 2;
                                return (
                                    <div
                                        key={idx}
                                        className={`${styles.teamSection} ${team.isServing ? styles.serving : ""}`}
                                        onClick={() => awardPoint(teamNum)}
                                        title={`Toca para dar un punto a ${team.players}`}
                                    >
                                        <div className={styles.teamInfo}>
                                            <div className={styles.teamLabel}>Equipo {teamNum}</div>
                                            <div className={styles.teamNames}>{team.players}</div>
                                            {team.isServing && <div className={styles.servingBadge}>● Saque</div>}
                                        </div>

                                        {/* Set scores */}
                                        <div className={styles.setScores}>
                                            {team.sets.map((s, i) => (
                                                <div key={i} className={`${styles.setBox} ${s > (other.sets[i] ?? 0) ? styles.won : ""}`}>
                                                    {s}
                                                </div>
                                            ))}
                                            {/* Current points */}
                                            <div className={`${styles.pointBox} ${!team.isServing && team.pointIdx === 0 ? styles.inactive : ""}`}>
                                                {POINT_SEQ[team.pointIdx]}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Controls ── */}
                    <div className={styles.controls}>
                        <div className={styles.controlsRow}>
                            {/* Equipo 1 */}
                            <div className={styles.pointCard}>
                                <div className={styles.pointCardTitle}>Equipo 1 – {t1.name.split("/")[0].trim()}</div>
                                <button className={`${styles.bigPointBtn} ${styles.t1}`} onClick={() => awardPoint(1)}>
                                    +1 Punto
                                </button>
                            </div>
                            {/* Equipo 2 */}
                            <div className={styles.pointCard}>
                                <div className={styles.pointCardTitle}>Equipo 2 – {t2.name.split("/")[0].trim()}</div>
                                <button className={`${styles.bigPointBtn} ${styles.t2}`} onClick={() => awardPoint(2)}>
                                    +1 Punto
                                </button>
                            </div>
                        </div>

                        <div className={styles.secondaryControls}>
                            <button className={`${styles.secBtn}`} onClick={undoLastPoint}>⟵ Deshacer Punto</button>
                            <button className={`${styles.secBtn} ${styles.success}`} onClick={() => endSet(1)}>Set → Equipo 1</button>
                            <button className={`${styles.secBtn} ${styles.success}`} onClick={() => endSet(2)}>Set → Equipo 2</button>
                            <button className={`${styles.secBtn} ${styles.danger}`} onClick={() => finishMatch(1)}>🏁 Ganó Equipo 1</button>
                            <button className={`${styles.secBtn} ${styles.danger}`} onClick={() => finishMatch(2)}>🏁 Ganó Equipo 2</button>
                        </div>
                    </div>

                    {/* ── YouTube Live Stream ── */}
                    <div className={styles.streamSection}>
                        <div className={styles.streamHeader}>
                            <span style={{ fontWeight: 700 }}>📡 Transmisión en Vivo (YouTube)</span>
                            {ytId && (
                                <button
                                    className={styles.secBtn}
                                    style={{ flex: "unset", padding: "0.4rem 0.875rem", fontSize: "0.8125rem" }}
                                    onClick={() => setShowYtPreview((v) => !v)}
                                >
                                    {showYtPreview ? "Ocultar" : "Mostrar"} Player
                                </button>
                            )}
                        </div>

                        <div className={styles.streamInputRow}>
                            <input
                                className={styles.input}
                                type="url"
                                placeholder="Pegar link de YouTube Live (ej: https://youtu.be/xXXXXX)"
                                value={ytUrl}
                                onChange={(e) => setYtUrl(e.target.value)}
                            />
                            <button className={`${styles.secBtn} ${styles.success}`} onClick={handleYtSave}>
                                Vincular Stream
                            </button>
                        </div>

                        {ytId && showYtPreview && (
                            <div className={styles.iframeWrapper}>
                                <iframe
                                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    style={{ width: "100%", height: "100%", border: "none", borderRadius: "0.75rem" }}
                                    title="YouTube Live Stream"
                                />
                            </div>
                        )}

                        {ytId && (
                            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                                ✅ Stream vinculado · Los espectadores verán este video en la página pública del torneo.
                            </div>
                        )}
                    </div>

                    {/* ── History Log ── */}
                    {log.length > 0 && (
                        <div className={styles.log}>
                            <div className={styles.logTitle}>Historial de puntos del partido</div>
                            <div className={styles.logList}>
                                {log.map((entry, i) => (
                                    <div key={i} className={styles.logEntry}>
                                        <span className={styles.logTime}>{entry.time}</span>
                                        <span className={styles.logDot} style={{ background: entry.color }} />
                                        <span>{entry.description}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Winner Modal ── */}
                {winner && (
                    <div className={styles.overlay}>
                        <div className={styles.winnerCard}>
                            <div className={styles.winnerTrophy}>🏆</div>
                            <div className={styles.winnerLabel}>¡Partido Finalizado!</div>
                            <div className={styles.winnerName}>{winner}</div>
                            <div className={styles.winnerSub}>
                                Los puntos de ranking se asignarán automáticamente al confirmar.
                            </div>
                            <div className={styles.winnerActions}>
                                <button className={`${styles.winnerBtn} ${styles.primary}`} onClick={closeWinner}>
                                    ✅ Confirmar y Asignar Puntos
                                </button>
                                <button className={`${styles.winnerBtn} ${styles.secondary}`} onClick={closeWinner}>
                                    Volver al Panel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </FeedLayout>
    );
}
