"use client";

import { useState } from "react";
import Link from "next/link";
import FeedLayout from "@/app/feed/layout";
import styles from "./directory.module.css";

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = "clubes" | "centros" | "profes";

// ── Mock data ─────────────────────────────────────────────────────────────────
const CLUBES = [
    { id: 1, name: "Club Padelazo", zone: "Palermo, CABA", members: 340, tournaments: 47, rating: 4.8, verified: true, logo: "🏟️" },
    { id: 2, name: "Club Social Del Norte", zone: "Belgrano, CABA", members: 280, tournaments: 31, rating: 4.9, verified: true, logo: "⭐" },
    { id: 3, name: "Club Atlético Padel", zone: "Vicente López, GBA", members: 195, tournaments: 18, rating: 4.5, verified: true, logo: "🏅" },
    { id: 4, name: "La Pista Society", zone: "San Isidro, GBA", members: 220, tournaments: 24, rating: 4.7, verified: false, logo: "🎾" },
    { id: 5, name: "Sumatoria Padel Club", zone: "Tigre, GBA", members: 410, tournaments: 62, rating: 4.4, verified: true, logo: "🏆" },
];

const CENTROS = [
    { id: 1, name: "Padel Norte Center", zone: "CABA", courts: 6, surfaces: ["Cancha Azul", "Cemento"], rating: 4.9, verified: true, avatar: "🎯" },
    { id: 2, name: "Premium Padel Tigre", zone: "GBA Norte", courts: 12, surfaces: ["Cemento", "Indoor"], rating: 4.7, verified: true, avatar: "🏗️" },
    { id: 3, name: "Padelero Belgrano", zone: "CABA", courts: 4, surfaces: ["Cancha Azul"], rating: 4.6, verified: true, avatar: "📍" },
    { id: 4, name: "Sur Padel Park", zone: "GBA Sur", courts: 10, surfaces: ["Cemento", "Indoor"], rating: 4.8, verified: true, avatar: "🏢" },
    { id: 5, name: "Palermo Pista Center", zone: "CABA", courts: 3, surfaces: ["Hormigón"], rating: 4.5, verified: false, avatar: "🔵" },
];

const PROFES = [
    { id: 1, name: "Juan Carlos Méndez", zone: "CABA", level: "APF Certificado", speciality: ["Técnica", "Competición"], rating: 4.9, verified: true, avatar: "🎓", experience: "12 años" },
    { id: 2, name: "Valentina Torres", zone: "CABA", level: "APF Certificado", speciality: ["Iniciación", "Damas"], rating: 4.8, verified: true, avatar: "🎽", experience: "8 años" },
    { id: 3, name: "Roberto Paz", zone: "GBA Norte", level: "FPA Habilitado", speciality: ["Física", "Táctica"], rating: 4.7, verified: true, avatar: "💪", experience: "15 años" },
    { id: 4, name: "Sofía Ibáñez", zone: "GBA Sur", level: "APF Certificado", speciality: ["Infantil", "Iniciación"], rating: 4.8, verified: false, avatar: "⭐", experience: "5 años" },
    { id: 5, name: "Mauro Castillo", zone: "Rosario", level: "FPA Habilitado", speciality: ["Competición", "Vídeo"], rating: 4.6, verified: true, avatar: "📹", experience: "10 años" },
];

// ── Components ────────────────────────────────────────────────────────────────
function VerifiedBadge() {
    return <span className={styles.verifiedBadge} title="Verificado">✓ Verificado</span>;
}

function StarRating({ rating }: { rating: number }) {
    return <span className={styles.rating}>⭐ {rating.toFixed(1)}</span>;
}

export default function DirectoryPage() {
    const [tab, setTab] = useState<Tab>("clubes");
    const [search, setSearch] = useState("");

    const tabs: { key: Tab; label: string; emoji: string; count: number }[] = [
        { key: "clubes", label: "Clubes", emoji: "🏟️", count: CLUBES.length },
        { key: "centros", label: "Centros de Pádel", emoji: "🎾", count: CENTROS.length },
        { key: "profes", label: "Profesores", emoji: "🎓", count: PROFES.length },
    ];

    const q = search.toLowerCase();

    return (
        <FeedLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Directorio</h1>
                        <p className={styles.subtitle}>Encontrá clubes, centros de pádel y profesores de toda la red</p>
                    </div>
                </div>

                {/* Search */}
                <div className={styles.searchBar}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        className={styles.searchInput}
                        type="text"
                        placeholder={`Buscar ${tab === "centros" ? "centros" : tab}...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className={styles.clearSearch} onClick={() => setSearch("")}>✕</button>
                    )}
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            className={`${styles.tab} ${tab === t.key ? styles.activeTab : ""}`}
                            onClick={() => { setTab(t.key); setSearch(""); }}
                        >
                            {t.emoji} {t.label}
                            <span className={styles.tabCount}>{t.count}</span>
                        </button>
                    ))}
                </div>

                {/* ── CLUBES ── */}
                {tab === "clubes" && (
                    <div className={styles.grid}>
                        {CLUBES.filter((c) => c.name.toLowerCase().includes(q) || c.zone.toLowerCase().includes(q)).map((club) => (
                            <div key={club.id} className={styles.card}>
                                <div className={styles.cardTop}>
                                    <div className={styles.cardAvatar}>{club.logo}</div>
                                    <div className={styles.cardMeta}>
                                        <div className={styles.cardName}>{club.name}</div>
                                        <div className={styles.cardZone}>📍 {club.zone}</div>
                                    </div>
                                    <StarRating rating={club.rating} />
                                </div>
                                {club.verified && <VerifiedBadge />}
                                <div className={styles.tags}>
                                    <span className={styles.tag}>👥 {club.members} miembros</span>
                                    <span className={styles.tag}>🏆 {club.tournaments} torneos</span>
                                </div>
                                <div className={styles.cardActions}>
                                    <Link href="/profiles/club"><button className={styles.btnPrimary}>Ver Perfil</button></Link>
                                    <button className={styles.btnSecondary}>Ver Torneos</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── CENTROS DE PÁDEL ── */}
                {tab === "centros" && (
                    <div className={styles.grid}>
                        {CENTROS.filter((c) => c.name.toLowerCase().includes(q) || c.zone.toLowerCase().includes(q)).map((centro) => (
                            <div key={centro.id} className={styles.card}>
                                <div className={styles.cardTop}>
                                    <div className={styles.cardAvatar}>{centro.avatar}</div>
                                    <div className={styles.cardMeta}>
                                        <div className={styles.cardName}>{centro.name}</div>
                                        <div className={styles.cardZone}>📍 {centro.zone}</div>
                                    </div>
                                    <StarRating rating={centro.rating} />
                                </div>
                                {centro.verified && <VerifiedBadge />}
                                <div className={styles.tags}>
                                    <span className={styles.tag}>🎾 {centro.courts} canchas</span>
                                    {centro.surfaces.map((s) => (
                                        <span key={s} className={styles.tag}>{s}</span>
                                    ))}
                                </div>
                                <div className={styles.cardActions}>
                                    <Link href="/profiles/centro"><button className={styles.btnPrimary}>Ver Perfil</button></Link>
                                    <button className={styles.btnSecondary}>Reservar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── PROFES ── */}
                {tab === "profes" && (
                    <div className={styles.grid}>
                        {PROFES.filter((p) =>
                            p.name.toLowerCase().includes(q) ||
                            p.zone.toLowerCase().includes(q) ||
                            p.speciality.some((s) => s.toLowerCase().includes(q))
                        ).map((profe) => (
                            <div key={profe.id} className={styles.card}>
                                <div className={styles.cardTop}>
                                    <div className={styles.cardAvatar}>{profe.avatar}</div>
                                    <div className={styles.cardMeta}>
                                        <div className={styles.cardName}>{profe.name}</div>
                                        <div className={styles.cardZone}>📍 {profe.zone}</div>
                                    </div>
                                    <StarRating rating={profe.rating} />
                                </div>
                                {profe.verified && <VerifiedBadge />}
                                <div className={styles.cardSubline}>
                                    <span>🎓 {profe.level}</span>
                                    <span style={{ color: "var(--text-muted)" }}>· {profe.experience}</span>
                                </div>
                                <div className={styles.tags}>
                                    {profe.speciality.map((s) => (
                                        <span key={s} className={styles.tag}>{s}</span>
                                    ))}
                                </div>
                                <div className={styles.cardActions}>
                                    <Link href="/profiles/profe"><button className={styles.btnPrimary}>Ver Perfil</button></Link>
                                    <button className={styles.btnSecondary}>Contactar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {((tab === "clubes" && CLUBES.filter(c => c.name.toLowerCase().includes(q)).length === 0) ||
                    (tab === "centros" && CENTROS.filter(c => c.name.toLowerCase().includes(q)).length === 0) ||
                    (tab === "profes" && PROFES.filter(p => p.name.toLowerCase().includes(q)).length === 0)) && (
                        <div className={styles.emptyState}>
                            <div style={{ fontSize: "3rem" }}>🔍</div>
                            <p>No se encontraron resultados para <strong>"{search}"</strong></p>
                        </div>
                    )}
            </div>
        </FeedLayout>
    );
}
