import FeedLayout from "@/app/feed/layout";
import styles from "@/app/profiles/profile.module.css";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Perfil Profesor | Padel Social" };

const DAYS = ["L", "M", "X", "J", "V", "S", "D"];
// 1 = free, 0 = busy
const AVAIL = [
    [0, 0, 0, 0, 1, 1, 1], // Mañana
    [1, 0, 1, 0, 0, 1, 1], // Tarde
    [1, 1, 0, 1, 0, 1, 0], // Noche
];
const SLOT_LABELS = ["Mañana", "Tarde", "Noche"];

export default function ProfesorProfilePage() {
    return (
        <FeedLayout>
            <div className={styles.page}>

                {/* ── Hero ── */}
                <div className={styles.hero}>
                    <div className={styles.heroBanner} style={{ background: "linear-gradient(135deg,#0d324d,#7f5a83,#0d324d)" }} />
                    <div className={styles.heroBody}>
                        <div className={`${styles.heroAvatar} ${styles.heroAvatarRound}`}>🎓</div>
                        <div className={styles.heroInfo}>
                            <h1 className={styles.heroName}>Juan Carlos Méndez</h1>
                            <p className={styles.heroBio}>Profesor APF certificado con 12 años de experiencia. Especialista en técnica avanzada y preparación para competición.</p>
                            <div className={styles.heroMeta}>
                                <span className={styles.heroMetaItem}>📍 Palermo, CABA</span>
                                <span className={styles.heroMetaItem}>🎓 APF Certificado</span>
                                <span className={styles.heroMetaItem}>⭐ 4.9 (64 valoraciones)</span>
                            </div>
                        </div>
                        <div className={styles.heroActions}>
                            <span className={styles.verifiedBadge}>✓ Verificado</span>
                            <button className={styles.btnPrimary}>Reservar Clase</button>
                            <button className={styles.btnSecondary}>Seguir</button>
                        </div>
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className={styles.statsRow}>
                    <div className={styles.stat}><div className={styles.statValue}>12</div><div className={styles.statLabel}>Años exp.</div></div>
                    <div className={styles.stat}><div className={styles.statValue}>280</div><div className={styles.statLabel}>Alumnos</div></div>
                    <div className={styles.stat}><div className={styles.statValue}>3</div><div className={styles.statLabel}>Clubes</div></div>
                    <div className={styles.stat}><div className={styles.statValue}>4.9</div><div className={styles.statLabel}>Rating</div></div>
                </div>

                <div className={styles.contentGrid}>
                    {/* ── Left ── */}
                    <div>
                        {/* Clases y Modalidades */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>📚 Clases y Modalidades</div>
                            <div className={styles.sectionBody}>
                                {[
                                    { tipo: "Clase Particular (1-a-1)", dur: "60 min", precio: "$12.000", icon: "👤" },
                                    { tipo: "Clase en Pareja", dur: "60 min", precio: "$8.000 c/u", icon: "👥" },
                                    { tipo: "Clase Grupal (3–4 pers.)", dur: "90 min", precio: "$6.000 c/u", icon: "👨‍👩‍👧" },
                                    { tipo: "Análisis de Video", dur: "45 min", precio: "$9.000", icon: "📹" },
                                    { tipo: "Preparación para Torneo", dur: "90 min", precio: "$14.000", icon: "🏆" },
                                ].map((c) => (
                                    <div key={c.tipo} className={styles.listRow}>
                                        <div className={styles.listIcon}>{c.icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <div className={styles.listMain}>{c.tipo}</div>
                                            <div className={styles.listSub}>{c.dur}</div>
                                        </div>
                                        <span className={styles.listBadge} style={{ color: "var(--primary)", borderColor: "rgba(217,249,93,0.4)", background: "rgba(217,249,93,0.08)", fontSize: "0.8125rem", padding: "0.3rem 0.625rem" }}>
                                            {c.precio}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Donde da clases */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>🏟️ Sedes Habituales</div>
                            <div className={styles.sectionBody}>
                                {[
                                    { club: "Club Padelazo", zone: "Palermo, CABA", days: "Lun, Mié, Vie" },
                                    { club: "Premium Padel Center", zone: "Belgrano, CABA", days: "Mar, Jue" },
                                    { club: "Urban Padel Club", zone: "Puerto Madero, CABA", days: "Sáb, Dom" },
                                ].map((s) => (
                                    <div key={s.club} className={styles.listRow}>
                                        <div className={styles.listIcon}>📍</div>
                                        <div>
                                            <div className={styles.listMain}>{s.club}</div>
                                            <div className={styles.listSub}>{s.zone} · {s.days}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Reseñas */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>⭐ Reseñas de Alumnos</div>
                            <div className={styles.sectionBody}>
                                {[
                                    { author: "Ana L.", stars: 5, text: "Juan Carlos transformó completamente mi juego. En 3 meses mejoré el revés y empecé a competir. Altamente recomendado." },
                                    { author: "Ricardo M.", stars: 5, text: "Muy buen profe, explica todo bien y tiene mucha paciencia. El análisis de video es genial." },
                                    { author: "Verónica S.", stars: 5, text: "Excelente para principiantes y avanzados. Los grupos son dinámicos y divertidos." },
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

                    {/* ── Right ── */}
                    <div>
                        {/* Especialidades */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>🎯 Especialidades</div>
                            <div className={styles.sectionBody}>
                                <div className={styles.tags}>
                                    {["Técnica", "Competición", "Volea", "Análisis Táctico", "Iniciación", "Adultos Mayores", "Preparación Física", "Análisis de Video"].map(s => (
                                        <span key={s} className={`${styles.tag} ${["Técnica", "Competición"].includes(s) ? styles.tagPrimary : ""}`}>{s}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Credenciales */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>📜 Credenciales</div>
                            <div className={styles.sectionBody}>
                                {[
                                    { icon: "🎓", label: "APF Nivel 3", val: "Asociación de Pádel FP" },
                                    { icon: "🏅", label: "FPA Habilitado", val: "Federación Pádel Arg." },
                                    { icon: "💪", label: "Prof. Ed. Física", val: "IUSEDF · 2010" },
                                    { icon: "📅", label: "Experiencia", val: "12 años" },
                                ].map((c) => (
                                    <div key={c.label} className={styles.listRow}>
                                        <span className={styles.listIcon}>{c.icon}</span>
                                        <div>
                                            <div className={styles.listMain}>{c.label}</div>
                                            <div className={styles.listSub}>{c.val}</div>
                                        </div>
                                    </div>
                                ))}
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
        </FeedLayout>
    );
}
