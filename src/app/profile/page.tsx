"use client";

import { useState } from "react";
import FeedLayout from "@/app/feed/layout";
import PostCard from "@/components/social/PostCard";
import styles from "./profile.module.css";
import { UserProfile } from "@clerk/nextjs";

// Simulamos que vemos nuestro propio perfil (puede ser dinámico con params)
const IS_OWN_PROFILE = true;

const PROFILE = {
    name: "Juan Perez",
    username: "juanperez",
    role: "jugador" as const,
    bio: "🎾 Jugador de 5ta categoría - Zona Norte. Buscando siempre partidos competitivos. Partner: @marcos 🏆",
    city: "Buenos Aires",
    memberSince: "Marzo 2026",
    followers: 142,
    following: 98,
    stats: {
        points: 4500,
        category: "5ta",
        matches: 24,
        wins: 18,
        side: "drive",
    },
    trophies: [
        { id: 1, icon: "🥇", name: "Copa Primavera", category: "5ta Caballeros", date: "Oct 2025" },
        { id: 2, icon: "🥈", name: "American Open", category: "5ta Libre", date: "Sep 2025" },
        { id: 3, icon: "🥇", name: "Torneo Local Club Padelazo", category: "5ta", date: "Jul 2025" },
    ],
};

const PROFILE_POSTS = [
    {
        id: 1,
        author: { name: PROFILE.name, username: PROFILE.username, role: PROFILE.role },
        content: "¡Qué partidazo el de ayer! Gracias @marcos por la invitación. Buscando profe por zona norte 🎾",
        timeAgo: "2h",
        likes: 12,
        comments: 3,
    },
    {
        id: 2,
        author: { name: PROFILE.name, username: PROFILE.username, role: PROFILE.role },
        content: "#FaltaUno para este sábado a las 18hs. 5ta categoría. Zona Palermo.",
        timeAgo: "1 día",
        likes: 7,
        comments: 5,
    },
];

type TabType = "posts" | "trophies" | "stats" | "account";

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState<TabType>("posts");

    const getRoleInfo = (role: string) => {
        const map: Record<string, { icon: string; label: string }> = {
            jugador: { icon: "🎾", label: "Jugador" },
            club: { icon: "🏟️", label: "Club" },
            profesor: { icon: "🎓", label: "Profesor" },
            centro_de_padel: { icon: "🏟️", label: "Centro de Pádel" },
        };
        return map[role] || { icon: "👤", label: "Usuario" };
    };

    const roleInfo = getRoleInfo(PROFILE.role);

    return (
        <FeedLayout>
            {/* Cover banner */}
            <div className={styles.cover} />

            {/* Sección principal del perfil */}
            <div className={styles.profileHeader}>
                <div className={styles.headerActions}>
                    {IS_OWN_PROFILE ? (
                        <button className={styles.editButton}>Editar Perfil</button>
                    ) : (
                        <button className={styles.followButton}>Seguir</button>
                    )}
                </div>

                <div className={styles.avatarWrapper}>
                    <div className={styles.avatar}>🎾</div>
                    <div className={styles.roleBadge}>{roleInfo.icon}</div>
                </div>

                <h1 className={styles.profileName}>{PROFILE.name}</h1>
                <div className={styles.profileUsername}>
                    @{PROFILE.username}
                    <span className={styles.verifiedBadge}>{roleInfo.label}</span>
                </div>

                <p className={styles.profileBio}>{PROFILE.bio}</p>

                <div className={styles.profileMeta}>
                    <span className={styles.metaItem}>📍 {PROFILE.city}</span>
                    <span className={styles.metaItem}>📅 Se unió en {PROFILE.memberSince}</span>
                </div>

                <div className={styles.followStats}>
                    <div className={styles.followStatItem}>
                        <span>{PROFILE.following}</span> Siguiendo
                    </div>
                    <div className={styles.followStatItem}>
                        <span>{PROFILE.followers}</span> Seguidores
                    </div>
                </div>
            </div>

            {/* Barra de estadísticas del jugador */}
            {PROFILE.role === "jugador" && (
                <div className={styles.statsBar}>
                    <div className={styles.statItem}>
                        <div className={styles.statValue}>{PROFILE.stats.category}</div>
                        <div className={styles.statLabel}>Categoría</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statValue}>{PROFILE.stats.points}</div>
                        <div className={styles.statLabel}>Puntos</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statValue}>{PROFILE.stats.wins}/{PROFILE.stats.matches}</div>
                        <div className={styles.statLabel}>Victorias</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statValue}>{PROFILE.stats.side === "drive" ? "Drive" : "Revés"}</div>
                        <div className={styles.statLabel}>Lado Preferido</div>
                    </div>
                </div>
            )}

            {/* Pestañas */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === "posts" ? styles.active : ""}`}
                    onClick={() => setActiveTab("posts")}
                >
                    Publicaciones
                </button>
                <button
                    className={`${styles.tab} ${activeTab === "trophies" ? styles.active : ""}`}
                    onClick={() => setActiveTab("trophies")}
                >
                    🏆 Copas & Torneos
                </button>
                <button
                    className={`${styles.tab} ${activeTab === "stats" ? styles.active : ""}`}
                    onClick={() => setActiveTab("stats")}
                >
                    Estadísticas
                </button>
                {IS_OWN_PROFILE && (
                    <button
                        className={`${styles.tab} ${activeTab === "account" ? styles.active : ""}`}
                        onClick={() => setActiveTab("account")}
                    >
                        ⚙️ Cuenta
                    </button>
                )}
            </div>

            {/* Contenido de la pestaña activa */}
            {activeTab === "posts" && (
                <div>
                    {PROFILE_POSTS.map((post) => (
                        <PostCard key={post.id} {...post} />
                    ))}
                </div>
            )}

            {activeTab === "trophies" && (
                <div className={styles.trophiesSection}>
                    <h2 className={styles.sectionTitle}>Palmarés</h2>
                    <div className={styles.trophiesGrid}>
                        {PROFILE.trophies.map((t) => (
                            <div key={t.id} className={styles.trophyCard}>
                                <div className={styles.trophyIcon}>{t.icon}</div>
                                <div className={styles.trophyName}>{t.name}</div>
                                <div className={styles.trophyCategory}>{t.category}</div>
                                <div className={styles.trophyDate}>{t.date}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === "stats" && (
                <div className={styles.trophiesSection}>
                    <h2 className={styles.sectionTitle}>Historial de Rendimiento</h2>
                    <p style={{ color: "var(--text-muted)" }}>
                        Partidos: <strong style={{ color: "var(--foreground)" }}>{PROFILE.stats.matches}</strong> jugados,
                        <strong style={{ color: "var(--primary)" }}> {PROFILE.stats.wins} ganados</strong> —
                        Efectividad: <strong style={{ color: "var(--primary)" }}>
                            {Math.round((PROFILE.stats.wins / PROFILE.stats.matches) * 100)}%
                        </strong>
                    </p>
                </div>
            )}

            {activeTab === "account" && (
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                    <UserProfile routing="hash" />
                </div>
            )}
        </FeedLayout>
    );
}
