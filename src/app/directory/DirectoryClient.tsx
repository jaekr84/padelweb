"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./directory.module.css";

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = "clubes" | "centros" | "profes";

interface Club {
    id: string;
    name: string;
    location: string | null;
    type: string;
    rating: string | null;
    verified: boolean | null;
    logoUrl: string | null;
    amenities: string[] | null;
    courts: number | null;
    surfaces: string[] | null;
}

interface Instructor {
    id: string;
    name: string;
    location: string | null;
    level: string | null;
    specialities: string[] | null;
    rating: string | null;
    verified: boolean | null;
    avatarUrl: string | null;
    experience: string | null;
}

interface DirectoryClientProps {
    initialClubs: Club[];
    initialCentros: Club[];
    initialProfes: Instructor[];
}

// ── Components ────────────────────────────────────────────────────────────────
function VerifiedBadge() {
    return <span className={styles.verifiedBadge} title="Verificado">✓ Verificado</span>;
}

function StarRating({ rating }: { rating: string | null }) {
    const val = rating ? parseFloat(rating) : 0;
    return <span className={styles.rating}>⭐ {val.toFixed(1)}</span>;
}

export default function DirectoryClient({
    initialClubs,
    initialCentros,
    initialProfes
}: DirectoryClientProps) {
    const [tab, setTab] = useState<Tab>("clubes");
    const [search, setSearch] = useState("");

    const tabs: { key: Tab; label: string; emoji: string; count: number }[] = [
        { key: "clubes", label: "Clubes", emoji: "🏟️", count: initialClubs.length },
        { key: "centros", label: "Centros de Pádel", emoji: "🎾", count: initialCentros.length },
        { key: "profes", label: "Profesores", emoji: "🎓", count: initialProfes.length },
    ];

    const q = search.toLowerCase();

    return (
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
                    placeholder={`Buscar ${tab === "centros" ? "centros" : tab === "clubes" ? "clubes" : "profesores"}...`}
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
                    {initialClubs
                        .filter((c) => c.name.toLowerCase().includes(q) || (c.location && c.location.toLowerCase().includes(q)))
                        .map((club) => (
                            <div key={club.id} className={styles.card}>
                                <div className={styles.cardTop}>
                                    <div className={styles.cardAvatar}>
                                        {club.logoUrl ? <img src={club.logoUrl} alt={club.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : "🏟️"}
                                    </div>
                                    <div className={styles.cardMeta}>
                                        <div className={styles.cardName}>{club.name}</div>
                                        <div className={styles.cardZone}>📍 {club.location || "Sin ubicación"}</div>
                                    </div>
                                    <StarRating rating={club.rating} />
                                </div>
                                {club.verified && <VerifiedBadge />}
                                <div className={styles.tags}>
                                    <span className={styles.tag}>🏟️ Club</span>
                                    {club.amenities?.slice(0, 2).map(a => <span key={a} className={styles.tag}>✨ {a}</span>)}
                                </div>
                                <div className={styles.cardActions}>
                                    <Link href={`/profiles/club?id=${club.id}`}><button className={styles.btnPrimary}>Ver Perfil</button></Link>
                                    <button className={styles.btnSecondary}>Ver Torneos</button>
                                </div>
                            </div>
                        ))}
                    {initialClubs.length === 0 && <p className={styles.noData}>No hay clubes registrados aún.</p>}
                </div>
            )}

            {/* ── CENTROS DE PÁDEL ── */}
            {tab === "centros" && (
                <div className={styles.grid}>
                    {initialCentros
                        .filter((c) => c.name.toLowerCase().includes(q) || (c.location && c.location.toLowerCase().includes(q)))
                        .map((centro) => (
                            <div key={centro.id} className={styles.card}>
                                <div className={styles.cardTop}>
                                    <div className={styles.cardAvatar}>
                                        {centro.logoUrl ? <img src={centro.logoUrl} alt={centro.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : "🎾"}
                                    </div>
                                    <div className={styles.cardMeta}>
                                        <div className={styles.cardName}>{centro.name}</div>
                                        <div className={styles.cardZone}>📍 {centro.location || "Sin ubicación"}</div>
                                    </div>
                                    <StarRating rating={centro.rating} />
                                </div>
                                {centro.verified && <VerifiedBadge />}
                                <div className={styles.tags}>
                                    <span className={styles.tag}>🎾 {centro.courts || 0} canchas</span>
                                    {centro.surfaces?.map((s) => (
                                        <span key={s} className={styles.tag}>{s}</span>
                                    ))}
                                </div>
                                <div className={styles.cardActions}>
                                    <Link href={`/profiles/centro?id=${centro.id}`}><button className={styles.btnPrimary}>Ver Perfil</button></Link>
                                    <button className={styles.btnSecondary}>Reservar</button>
                                </div>
                            </div>
                        ))}
                    {initialCentros.length === 0 && <p className={styles.noData}>No hay centros de pádel registrados aún.</p>}
                </div>
            )}

            {/* ── PROFES ── */}
            {tab === "profes" && (
                <div className={styles.grid}>
                    {initialProfes
                        .filter((p) =>
                            p.name.toLowerCase().includes(q) ||
                            (p.location && p.location.toLowerCase().includes(q)) ||
                            p.specialities?.some((s) => s.toLowerCase().includes(q))
                        ).map((profe) => (
                            <div key={profe.id} className={styles.card}>
                                <div className={styles.cardTop}>
                                    <div className={styles.cardAvatar}>
                                        {profe.avatarUrl ? <img src={profe.avatarUrl} alt={profe.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : "🎓"}
                                    </div>
                                    <div className={styles.cardMeta}>
                                        <div className={styles.cardName}>{profe.name}</div>
                                        <div className={styles.cardZone}>📍 {profe.location || "Sin ubicación"}</div>
                                    </div>
                                    <StarRating rating={profe.rating} />
                                </div>
                                {profe.verified && <VerifiedBadge />}
                                <div className={styles.cardSubline}>
                                    <span>🎓 {profe.level || "Nivel no especificado"}</span>
                                    {profe.experience && <span style={{ color: "var(--text-muted)" }}>· {profe.experience}</span>}
                                </div>
                                <div className={styles.tags}>
                                    {profe.specialities?.map((s) => (
                                        <span key={s} className={styles.tag}>{s}</span>
                                    ))}
                                </div>
                                <div className={styles.cardActions}>
                                    <Link href={`/profiles/profe?id=${profe.id}`}><button className={styles.btnPrimary}>Ver Perfil</button></Link>
                                    <button className={styles.btnSecondary}>Contactar</button>
                                </div>
                            </div>
                        ))}
                    {initialProfes.length === 0 && <p className={styles.noData}>No hay profesores registrados aún.</p>}
                </div>
            )}

            {/* Empty search state */}
            {search && (
                ((tab === "clubes" && initialClubs.filter(c => c.name.toLowerCase().includes(q)).length === 0) ||
                    (tab === "centros" && initialCentros.filter(c => c.name.toLowerCase().includes(q)).length === 0) ||
                    (tab === "profes" && initialProfes.filter(p => p.name.toLowerCase().includes(q)).length === 0)) && (
                    <div className={styles.emptyState}>
                        <div style={{ fontSize: "3rem" }}>🔍</div>
                        <p>No se encontraron resultados para <strong>"{search}"</strong></p>
                    </div>
                )
            )}
        </div>
    );
}
