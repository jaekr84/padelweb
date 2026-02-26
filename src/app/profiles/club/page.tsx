"use client";

import { useState } from "react";
import FeedLayout from "@/app/feed/layout";
import styles from "@/app/profiles/profile.module.css";
import invStyles from "./invite.module.css";
import { InviteModal } from "./InviteModal";
import Link from "next/link";

const MEMBERS = [
    { id: "m1", name: "Laura Rodríguez", avatar: "👩", level: "3ra Cat.", role: "admin", joined: "Socio desde 2023" },
    { id: "m2", name: "Roberto Paz", avatar: "👤", level: "2da Cat.", role: "admin", joined: "Socio desde 2022" },
    { id: "m3", name: "Carlos Vega", avatar: "👤", level: "6ta Cat.", role: "member", joined: "Socio desde 2024" },
    { id: "m4", name: "Martina Flores", avatar: "👩", level: "7ma Damas", role: "member", joined: "Socio desde 2024" },
    { id: "m5", name: "Diego Sánchez", avatar: "👤", level: "5ta Cat.", role: "member", joined: "Socio desde 2025" },
];

export default function ClubProfilePage() {
    const [showInvite, setShowInvite] = useState(false);

    return (
        <FeedLayout>
            <div className={styles.page}>

                {/* ── Hero ── */}
                <div className={styles.hero}>
                    <div className={styles.heroBanner} style={{ background: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)" }} />
                    <div className={styles.heroBody}>
                        <div className={styles.heroAvatar}>🏟️</div>
                        <div className={styles.heroInfo}>
                            <h1 className={styles.heroName}>Club Padelazo</h1>
                            <p className={styles.heroBio}>El club de pádel líder de Palermo. 8 canchas, torneos semanales y la mejor comunidad.</p>
                            <div className={styles.heroMeta}>
                                <span className={styles.heroMetaItem}>📍 Palermo, CABA</span>
                                <span className={styles.heroMetaItem}>🕐 Lun–Dom 7:00–24:00</span>
                                <span className={styles.heroMetaItem}>⭐ 4.8 (312 reseñas)</span>
                            </div>
                        </div>
                        <div className={styles.heroActions}>
                            <span className={styles.verifiedBadge}>✓ Verificado</span>
                            <button className={styles.btnPrimary} onClick={() => setShowInvite(true)}>
                                ✉️ Invitar Miembros
                            </button>
                            <button className={styles.btnSecondary}>Seguir</button>
                        </div>
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className={styles.statsRow}>
                    <div className={styles.stat}><div className={styles.statValue}>340</div><div className={styles.statLabel}>Miembros</div></div>
                    <div className={styles.stat}><div className={styles.statValue}>47</div><div className={styles.statLabel}>Torneos</div></div>
                    <div className={styles.stat}><div className={styles.statValue}>4.8</div><div className={styles.statLabel}>Rating</div></div>
                    <div className={styles.stat}><div className={styles.statValue}>2019</div><div className={styles.statLabel}>Fundado</div></div>
                </div>

                <div className={styles.contentGrid}>
                    {/* ── Left ── */}
                    <div>
                        {/* Torneos */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>🏆 Torneos del Club</div>
                            <div className={styles.sectionBody}>
                                {[
                                    { name: "Copa Primavera 2025", cats: "5ta, 6ta, 7ma", date: "12–14 Oct", status: "open" },
                                    { name: "Master Final Invierno", cats: "1ra, 2da", date: "En juego", status: "live" },
                                    { name: "Americano Especial Damas", cats: "Sum. 13 Damas", date: "5 Oct", status: "finished" },
                                ].map((t) => (
                                    <div key={t.name} className={styles.tourneyRow}>
                                        <div className={styles.tourneyIcon}>🏅</div>
                                        <div className={styles.tourneyInfo}>
                                            <div className={styles.tourneyName}>{t.name}</div>
                                            <div className={styles.tourneySub}>{t.cats} · {t.date}</div>
                                        </div>
                                        <span className={`${styles.statusBadge} ${t.status === "open" ? styles.statusOpen : t.status === "live" ? styles.statusLive : styles.statusFinished
                                            }`}>
                                            {t.status === "open" ? "Inscripción" : t.status === "live" ? "🔴 Vivo" : "Finalizado"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Members */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span>👥 Miembros del Club</span>
                                <button
                                    onClick={() => setShowInvite(true)}
                                    style={{ background: "transparent", border: "1px solid var(--surface-border)", color: "var(--primary)", padding: "0.3rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer" }}
                                >
                                    + Invitar
                                </button>
                            </div>
                            <div className={styles.sectionBody}>
                                {MEMBERS.map(m => (
                                    <div key={m.id} className={invStyles.memberItem}>
                                        <div className={invStyles.memberAvatar}>{m.avatar}</div>
                                        <div style={{ flex: 1 }}>
                                            <div className={invStyles.memberName}>{m.name}</div>
                                            <div className={invStyles.memberSub}>{m.level} · {m.joined}</div>
                                        </div>
                                        <span className={`${invStyles.memberRole} ${m.role === "admin" ? invStyles.roleAdmin : invStyles.roleMember}`}>
                                            {m.role === "admin" ? "Admin" : "Socio"}
                                        </span>
                                    </div>
                                ))}
                                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", marginTop: "0.75rem" }}>
                                    Mostrando 5 de 340 miembros
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Right sidebar ── */}
                    <div>
                        {/* Info */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>ℹ️ Información</div>
                            <div className={styles.sectionBody}>
                                {[
                                    { icon: "📧", label: "Email", value: "info@clubpadelazo.com.ar" },
                                    { icon: "📱", label: "Instagram", value: "@clubpadelazo" },
                                    { icon: "🌐", label: "Web", value: "clubpadelazo.com.ar" },
                                    { icon: "📞", label: "Teléfono", value: "+54 11 4234-5678" },
                                    { icon: "💳", label: "Membresía", value: "Desde $15.000/mes" },
                                    { icon: "🅿️", label: "Estacionamiento", value: "Propio · 40 lugares" },
                                ].map((item) => (
                                    <div key={item.label} className={styles.listRow}>
                                        <span className={styles.listIcon}>{item.icon}</span>
                                        <div>
                                            <div className={styles.listSub}>{item.label}</div>
                                            <div className={styles.listMain}>{item.value}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Servicios */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>🛎️ Servicios</div>
                            <div className={styles.sectionBody}>
                                <div className={styles.tags}>
                                    {["Vestuarios", "Cafetería", "Pro Shop", "Clases Grupales", "Clases Particulares", "Torneos", "Alquiler de Palas", "WiFi"].map(s => (
                                        <span key={s} className={styles.tag}>{s}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Reseñas */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>⭐ Reseñas Recientes</div>
                            <div className={styles.sectionBody}>
                                {[
                                    { author: "Pablo G.", stars: 5, text: "Las canchas siempre impecables y la atención es excelente." },
                                    { author: "Marina R.", stars: 5, text: "El mejor club de la zona, los torneos son muy bien organizados." },
                                    { author: "Tomás V.", stars: 4, text: "Muy buenas instalaciones. A veces las canchas están todas ocupadas." },
                                ].map((r) => (
                                    <div key={r.author} className={styles.review}>
                                        <div className={styles.reviewHeader}>
                                            <span className={styles.reviewAuthor}>{r.author}</span>
                                            <span className={styles.reviewStars}>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
                                        </div>
                                        <p className={styles.reviewText}>{r.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Invite Modal ── */}
            {showInvite && (
                <InviteModal clubName="Club Padelazo" onClose={() => setShowInvite(false)} />
            )}
        </FeedLayout>
    );
}
