"use client";

import { useState } from "react";
import FeedLayout from "@/app/feed/layout";
import styles from "./ranking.module.css";

const CATEGORIES = ["1ra", "2da", "3ra", "4ta", "5ta", "6ta", "7ma", "8va", "9na"];

// Datos simulados (Luego vendrán de Supabase)
const DUMMY_PLAYERS = {
    "1ra": [
        { id: 1, name: "Agustín Tapia", user: "agus_tapia", points: 15400, tournaments: 14, avatar: "🎾" },
        { id: 2, name: "Arturo Coello", user: "arturocoello", points: 15400, tournaments: 14, avatar: "🎾" },
        { id: 3, name: "Alejandro Galán", user: "alegalan", points: 12100, tournaments: 13, avatar: "🎾" },
        { id: 4, name: "Fede Chingotto", user: "chingotto", points: 12100, tournaments: 13, avatar: "🎾" },
        { id: 5, name: "Franco Stupaczuk", user: "stupa", points: 9800, tournaments: 15, avatar: "🎾" },
    ],
    "5ta": [
        { id: 6, name: "Juan Perez", user: "juanperez", points: 4500, tournaments: 8, avatar: "👤" },
        { id: 7, name: "Marcos García", user: "marcospadel", points: 4120, tournaments: 9, avatar: "👤" },
        { id: 8, name: "Lucas Gonzalez", user: "lucasg", points: 3800, tournaments: 6, avatar: "👤" },
        { id: 9, name: "Matias Sanchez", user: "matisanch", points: 3100, tournaments: 10, avatar: "👤" },
    ]
};

export default function RankingPage() {
    const [activeCategory, setActiveCategory] = useState("5ta");

    // Si no hay datos falsos para esa categoría, mostramos array vacío
    const players = DUMMY_PLAYERS[activeCategory as keyof typeof DUMMY_PLAYERS] || [];

    return (
        <FeedLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Ranking Oficial</h1>

                    <div className={styles.categoriesScroll}>
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                className={`${styles.catButton} ${activeCategory === cat ? styles.active : ""}`}
                                onClick={() => setActiveCategory(cat)}
                            >
                                {cat} Categoría
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.rankingTable}>
                    <div className={styles.tableHeader}>
                        <span>#</span>
                        <span>Jugador</span>
                        <span className={styles.hideMobile}>Torneos</span>
                        <span>Puntos</span>
                    </div>

                    {players.length > 0 ? (
                        players.map((player, index) => (
                            <div key={player.id} className={`${styles.tableRow} ${index < 3 ? styles.topThree : ''}`}>
                                <div className={styles.rankPos}>{index + 1}</div>
                                <div className={styles.playerInfo}>
                                    <div className={styles.avatar}>{player.avatar}</div>
                                    <div>
                                        <div className={styles.playerName}>{player.name}</div>
                                        <div className={styles.playerUser}>@{player.user}</div>
                                    </div>
                                </div>
                                <div className={`${styles.tournaments} ${styles.hideMobile}`}>{player.tournaments}</div>
                                <div className={styles.points}>{player.points}</div>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                            No hay jugadores clasificados en esta categoría aún.
                        </div>
                    )}
                </div>
            </div>
        </FeedLayout>
    );
}
