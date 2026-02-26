"use client";

import FeedLayout from "@/app/feed/layout";
import styles from "./tournaments.module.css";
import Link from "next/link";

// Datos simulados (Luego vendrán de Supabase)
const DUMMY_TOURNAMENTS = [
    {
        id: 1,
        name: "Copa Primavera",
        club: "Club Padelazo - Sede Norte",
        date: "12 AL 14 DE OCTUBRE",
        categories: ["5ta", "6ta", "7ma Libre"],
        status: "open", // open, live, finished
        prize: "$500.000 + Paletas",
        organizer: true, // Simulación de si el usuario logueado es el dueño
    },
    {
        id: 2,
        name: "Master Final 2026",
        club: "Premium Padel Center",
        date: "Ahorita (En Juego)",
        categories: ["1ra", "2da Caballeros"],
        status: "live",
        prize: "Viaje a España",
        organizer: false,
    },
    {
        id: 3,
        name: "Americano Express Damas",
        club: "Padel Point",
        date: "SÁBADO 22 DE NOV",
        categories: ["Suma 13 Damas"],
        status: "open",
        prize: "Indumentaria Varlion",
        organizer: false,
    },
];

export default function TournamentsPage() {
    return (
        <FeedLayout>
            <div className={styles.container}>

                <div className={styles.header}>
                    <h1 className={styles.title}>Torneos</h1>
                    <Link href="/tournaments/create">
                        <button className={styles.createButton}>
                            <span>🏆</span> Crear Torneo
                        </button>
                    </Link>
                </div>

                <div className={styles.filters}>
                    <button className={`${styles.filterButton} ${styles.active}`}>Todos</button>
                    <button className={styles.filterButton}>Inscripciones Abiertas</button>
                    <button className={styles.filterButton}>🔴 En Vivo (Live Score)</button>
                    <button className={styles.filterButton}>Mis Torneos / Gestión</button>
                </div>

                <div className={styles.grid}>
                    {DUMMY_TOURNAMENTS.map((t) => (
                        <div key={t.id} className={styles.card}>
                            <div className={styles.cardImage}>
                                <span style={{ fontSize: "3rem" }}>🎾</span>
                                {t.status === 'open' && <span className={`${styles.statusBadge} ${styles.statusOpen}`}>Inscripción Abierta</span>}
                                {t.status === 'live' && <span className={`${styles.statusBadge} ${styles.statusLive}`}>🔴 En Vivo</span>}
                            </div>

                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>{t.name}</h3>
                                <p className={styles.cardClub}>🏟️ {t.club}</p>

                                <div className={styles.cardDetails}>
                                    <div className={styles.detailRow}>
                                        <span className={styles.icon}>📅</span>
                                        <span>{t.date}</span>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <span className={styles.icon}>👥</span>
                                        <span>Categorías: {t.categories.join(", ")}</span>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <span className={styles.icon}>🎁</span>
                                        <span>{t.prize}</span>
                                    </div>
                                </div>

                                {/* Renderizado condicional basado en el rol y estado */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    {/* Botón principal según rol */}
                                    {t.organizer ? (
                                        <Link href="/tournaments/dashboard">
                                            <button className={`${styles.cardAction} ${styles.primary}`} style={{ width: "100%" }}>
                                                ⚙️ Gestionar Torneo
                                            </button>
                                        </Link>
                                    ) : t.status !== 'live' ? (
                                        <Link href={`/tournaments/register?id=${t.id}`}>
                                            <button className={`${styles.cardAction} ${styles.primary}`} style={{ width: "100%" }}>
                                                Anotarse
                                            </button>
                                        </Link>
                                    ) : null}

                                    {/* Botón "Ver en Vivo" para cualquier torneo en vivo */}
                                    {t.status === 'live' && (
                                        <Link href="/tournaments/live">
                                            <button className={styles.cardAction} style={{
                                                width: "100%",
                                                background: "rgba(255,68,68,0.1)",
                                                borderColor: "rgba(255,68,68,0.4)",
                                                color: "#ff6b6b",
                                                fontWeight: 700,
                                            }}>
                                                🔴 Ver Torneo en Vivo
                                            </button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </FeedLayout>
    );
}
