"use client";

import { useState } from "react";
import styles from "@/app/profiles/profile.module.css";
import { UserProfile } from "@clerk/nextjs";

const DAYS = ["L", "M", "X", "J", "V", "S", "D"];
const AVAIL = [
    [0, 0, 0, 0, 1, 1, 1], // Mañana
    [1, 0, 1, 0, 0, 1, 1], // Tarde
    [1, 1, 0, 1, 0, 1, 0], // Noche
];
const SLOT_LABELS = ["Mañana", "Tarde", "Noche"];

interface ProfeProfileClientProps {
    profe: any;
    isOwner: boolean;
}

export default function ProfeProfileClient({ profe, isOwner }: ProfeProfileClientProps) {
    const [activeTab, setActiveTab] = useState<"info" | "account">("info");

    if (!profe) return <div>Instructor no encontrado</div>;

    return (
        <div className={styles.page}>
            {/* ── Hero ── */}
            <div className={styles.hero}>
                <div className={styles.heroBanner} style={{ background: "linear-gradient(135deg,#0d324d,#7f5a83,#0d324d)" }} />
                <div className={styles.heroBody}>
                    <div className={`${styles.heroAvatar} ${styles.heroAvatarRound}`}>
                        {profe.avatarUrl ? <img src={profe.avatarUrl} alt={profe.name} style={{ width: '100%', borderRadius: '50%' }} /> : "🎓"}
                    </div>
                    <div className={styles.heroInfo}>
                        <h1 className={styles.heroName}>{profe.name}</h1>
                        <p className={styles.heroBio}>{profe.bio || "Sin biografía disponible."}</p>
                        <div className={styles.heroMeta}>
                            <span className={styles.heroMetaItem}>📍 {profe.location || "Ubicación no especificada"}</span>
                            <span className={styles.heroMetaItem}>🎓 {profe.level}</span>
                            <span className={styles.heroMetaItem}>⭐ {profe.rating}</span>
                        </div>
                    </div>
                    <div className={styles.heroActions}>
                        {profe.verified && <span className={styles.verifiedBadge}>✓ Verificado</span>}
                        <button className={styles.btnPrimary}>Reservar Clase</button>
                        <button className={styles.btnSecondary}>Seguir</button>
                    </div>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className={styles.statsRow}>
                <div className={styles.stat}><div className={styles.statValue}>{profe.experience || "N/A"}</div><div className={styles.statLabel}>Experiencia</div></div>
                <div className={styles.stat}><div className={styles.statValue}>280</div><div className={styles.statLabel}>Alumnos</div></div>
                <div className={styles.stat}><div className={styles.statValue}>3</div><div className={styles.statLabel}>Clubes</div></div>
                <div className={styles.stat}><div className={styles.statValue}>{profe.rating}</div><div className={styles.statLabel}>Rating</div></div>
            </div>

            <div className={styles.contentGrid}>
                {/* ── Left ── */}
                <div>
                    <div className={styles.tabs} style={{ padding: "0" }}>
                        <button
                            className={`${styles.tab} ${activeTab === "info" ? styles.active : ""}`}
                            onClick={() => setActiveTab("info")}
                        >
                            Información
                        </button>
                        {isOwner && (
                            <button
                                className={`${styles.tab} ${activeTab === "account" ? styles.active : ""}`}
                                onClick={() => setActiveTab("account")}
                            >
                                ⚙️ Cuenta
                            </button>
                        )}
                    </div>

                    {activeTab === "info" && (
                        <>
                            {/* Clases y Modalidades */}
                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>📚 Clases y Modalidades</div>
                                <div className={styles.sectionBody}>
                                    {[
                                        { tipo: "Clase Particular (1-a-1)", dur: "60 min", precio: "$12.000", icon: "👤" },
                                        { tipo: "Clase en Pareja", dur: "60 min", precio: "$8.000 c/u", icon: "👥" },
                                        { tipo: "Clase Grupal (3–4 pers.)", dur: "90 min", precio: "$6.000 c/u", icon: "👨‍👩‍👧" },
                                    ].map((c) => (
                                        <div key={c.tipo} className={styles.listRow}>
                                            <div className={styles.listIcon}>{c.icon}</div>
                                            <div style={{ flex: 1 }}>
                                                <div className={styles.listMain}>{c.tipo}</div>
                                                <div className={styles.listSub}>{c.dur}</div>
                                            </div>
                                            <span className={styles.listBadge} style={{ color: "var(--primary-label)", borderColor: "rgba(217,249,93,0.4)", background: "rgba(217,249,93,0.08)", fontSize: "0.8125rem", padding: "0.3rem 0.625rem" }}>
                                                {c.precio}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === "account" && isOwner && (
                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                            <UserProfile routing="hash" />
                        </div>
                    )}
                </div>

                {/* ── Right ── */}
                <div>
                    {/* Especialidades */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>🎯 Especialidades</div>
                        <div className={styles.sectionBody}>
                            <div className={styles.tags}>
                                {profe.specialities?.map((s: string) => (
                                    <span key={s} className={styles.tag}>{s}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Disponibilidad */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>📅 Disponibilidad Semanal</div>
                        <div className={styles.sectionBody}>
                            <div style={{ marginBottom: "0.75rem" }}>
                                <div className={styles.availGrid}>
                                    {DAYS.map((d) => (
                                        <div key={d} className={styles.availDay}>{d}</div>
                                    ))}
                                </div>
                                {AVAIL.map((row, ri) => (
                                    <div key={ri} style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.375rem" }}>
                                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", width: 45, flexShrink: 0 }}>{SLOT_LABELS[ri]}</div>
                                        <div className={styles.availGrid} style={{ flex: 1 }}>
                                            {row.map((v, di) => (
                                                <div key={di} className={`${styles.availSlot} ${v ? styles.slotFree : styles.slotBusy}`}>
                                                    {v ? "✓" : ""}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className={styles.btnPrimary} style={{ width: "100%", marginTop: "0.5rem" }}>
                                Ver Agenda Completa
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
