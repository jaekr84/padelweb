"use client";

import { useState } from "react";
import FeedLayout from "@/app/feed/layout";
import styles from "./fixture.module.css";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────
type MatchStatus = "scheduled" | "live" | "finished";

interface Team {
    name: string;
    seed?: number;
    score?: number;
    isWinner?: boolean;
}

interface Match {
    id: number;
    team1: Team;
    team2?: Team; // undefined = BYE
    status: MatchStatus;
}

interface Round {
    name: string;
    matches: Match[];
}

// ─── Datos simulados ──────────────────────────────────────────────────────────
const FIXTURES: Record<string, Round[]> = {
    "5ta": [
        {
            name: "Cuartos de Final",
            matches: [
                { id: 1, team1: { name: "Perez / García", seed: 1 }, team2: { name: "Torres / Silva", seed: 8 }, status: "finished" },
                { id: 2, team1: { name: "Gomez / Lopez", seed: 4 }, team2: { name: "Ruiz / Soto", seed: 5 }, status: "finished" },
                { id: 3, team1: { name: "Fernandez / Díaz", seed: 3 }, team2: { name: "Ríos / Mora", seed: 6 }, status: "live" },
                { id: 4, team1: { name: "Muñoz / Herrera", seed: 2 }, team2: { name: "Vega / Castro", seed: 7 }, status: "scheduled" },
            ],
        },
        {
            name: "Semifinales",
            matches: [
                {
                    id: 5,
                    team1: { name: "Perez / García", seed: 1, score: 7, isWinner: true },
                    team2: { name: "Gomez / Lopez", seed: 4, score: 5 },
                    status: "finished",
                },
                {
                    id: 6,
                    team1: { name: "Fernandez / Díaz", seed: 3 },
                    team2: { name: "Muñoz / Herrera", seed: 2 },
                    status: "scheduled",
                },
            ],
        },
        {
            name: "Final",
            matches: [
                {
                    id: 7,
                    team1: { name: "Perez / García", seed: 1 },
                    team2: undefined,
                    status: "scheduled",
                },
            ],
        },
    ],
    "1ra": [
        {
            name: "Semifinales",
            matches: [
                {
                    id: 10,
                    team1: { name: "Tapia / Coello", seed: 1, score: 6, isWinner: true },
                    team2: { name: "Galán / Chingotto", seed: 2, score: 4 },
                    status: "finished",
                },
                {
                    id: 11,
                    team1: { name: "Lebron / Paquito", seed: 3, score: 2 },
                    team2: { name: "Stupaczuk / Di Nenno", seed: 4, score: 6, isWinner: true },
                    status: "finished",
                },
            ],
        },
        {
            name: "Final",
            matches: [
                {
                    id: 12,
                    team1: { name: "Tapia / Coello", seed: 1, score: 6, isWinner: true },
                    team2: { name: "Stupaczuk / Di Nenno", seed: 4, score: 3 },
                    status: "finished",
                },
            ],
        },
    ],
};

// ─── Sub-component: MatchCard ─────────────────────────────────────────────────
function MatchCard({ match }: { match: Match }) {
    const statusClass =
        match.status === "live" ? styles.live :
            match.status === "finished" ? styles.finished : "";

    return (
        <div className={`${styles.matchCard} ${statusClass}`}>
            {/* Team 1 */}
            <div className={`${styles.teamRow} ${match.team1.isWinner ? styles.winner : ""}`}>
                <div className={styles.seedBadge}>{match.team1.seed ?? "?"}</div>
                <span className={styles.teamName}>{match.team1.name}</span>
                {match.status !== "scheduled" && (
                    <span className={styles.score}>{match.team1.score ?? ""}</span>
                )}
            </div>

            {/* Team 2 or BYE */}
            {match.team2 ? (
                <div className={`${styles.teamRow} ${match.team2.isWinner ? styles.winner : ""}`}>
                    <div className={styles.seedBadge}>{match.team2.seed ?? "?"}</div>
                    <span className={styles.teamName}>{match.team2.name}</span>
                    {match.status !== "scheduled" && (
                        <span className={styles.score}>{match.team2.score ?? ""}</span>
                    )}
                </div>
            ) : (
                <div className={styles.byeRow}>BYE – Pasa automáticamente</div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FixturePage() {
    const [activeCategory, setActiveCategory] = useState<string>("5ta");
    const rounds = FIXTURES[activeCategory] ?? [];

    // Detectar campeón: ganador del último match de la última ronda
    const lastRound = rounds[rounds.length - 1];
    const finalMatch = lastRound?.matches[0];
    const champion =
        finalMatch?.status === "finished"
            ? finalMatch.team1.isWinner ? finalMatch.team1 : finalMatch.team2
            : null;

    return (
        <FeedLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <Link href="/tournaments" className={styles.backLink}>
                        ← Volver a Torneos
                    </Link>
                    <div className={styles.titleRow}>
                        <div>
                            <h1 className={styles.title}>Copa Primavera</h1>
                            <p className={styles.subtitle}>🏟️ Club Padelazo · 12–14 Octubre 2025</p>
                        </div>
                        <span className={`${styles.statusBadge} ${styles.badgeLive}`}>🔴 En Vivo</span>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className={styles.catTabs}>
                    {Object.keys(FIXTURES).map((cat) => (
                        <button
                            key={cat}
                            className={`${styles.catTab} ${activeCategory === cat ? styles.active : ""}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat} Categoría
                        </button>
                    ))}
                </div>

                {/* Bracket */}
                <div className={styles.bracket}>
                    {rounds.map((round, roundIdx) => (
                        <>
                            <div key={round.name} className={styles.round}
                                style={{ justifyContent: "space-around" }}
                            >
                                <div className={styles.roundHeader}>{round.name}</div>
                                {round.matches.map((match) => (
                                    <MatchCard key={match.id} match={match} />
                                ))}
                            </div>

                            {/* Connector line between rounds */}
                            {roundIdx < rounds.length - 1 && (
                                <div key={`conn-${roundIdx}`} className={styles.connector}>
                                    <div className={styles.connectorLine} />
                                </div>
                            )}
                        </>
                    ))}

                    {/* Champion display */}
                    {champion && (
                        <>
                            <div className={styles.connector}>
                                <div className={styles.connectorLine} />
                            </div>
                            <div className={styles.championCard}>
                                <div className={styles.championTrophy}>🏆</div>
                                <div className={styles.championLabel}>Campeón</div>
                                <div className={styles.championName}>{champion.name}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                                    {activeCategory} Categoría
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </FeedLayout>
    );
}
