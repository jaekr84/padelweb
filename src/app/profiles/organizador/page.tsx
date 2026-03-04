"use client";

import { useState } from "react";
import FeedLayout from "@/app/feed/layout";
import styles from "@/app/profiles/profile.module.css";
import { InviteModal } from "@/app/profiles/club/InviteModal";
import { UserProfile } from "@clerk/nextjs";

export default function CentroPadelProfilePage() {
    const [showInvite, setShowInvite] = useState(false);
    const [activeTab, setActiveTab] = useState<"info" | "account">("info");

    return (
        <FeedLayout>
            <div className={styles.page}>

                {/* ── Hero ── */}
                <div className={styles.hero}>
                    <div className={styles.heroBanner} style={{ background: "linear-gradient(135deg,#0a1628,#1a3a5c,#0d4a2e)" }} />
                    <div className={styles.heroBody}>
                        <div className={styles.heroAvatar}>🏟️</div>
                        <div className={styles.heroInfo}>
                            <div className={styles.heroMain}>
                                <h1 className={styles.heroName}>Padel Norte Center</h1>
                                <span className={styles.verifiedBadge}>✓</span>
                            </div>
                            <p className={styles.heroBio}>Centro de pádel en CABA con 6 canchas de alta calidad. Reservas online, iluminación LED y estacionamiento propio.</p>
                            <div className={styles.heroMeta}>
                                <div className={styles.heroMetaItem}>📍 Palermo, CABA</div>
                                <div className={styles.heroMetaItem}>🕐 Lun–Dom 7:00–01:00</div>
                                <div className={styles.heroMetaItem}>⭐ <span className={styles.accent}>4.9</span> (218 reseñas)</div>
                            </div>
                        </div>
                        <div className={styles.heroActions}>
                            <button className={styles.btnAction}>Reservar Cancha</button>
                            <button className={styles.tag} onClick={() => setShowInvite(true)}>✉️ Invitar</button>
                        </div>
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>6</div>
                        <div className={styles.statLabel}>Canchas</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>7.00</div>
                        <div className={styles.statLabel}>Apertura</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>01:00</div>
                        <div className={styles.statLabel}>Cierre</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>4.9</div>
                        <div className={styles.statLabel}>Rating</div>
                    </div>
                </div>

                <div className={styles.contentGrid}>
                    {/* ── Main Column (Left) ── */}
                    <div className={styles.mainCol}>
                        <div className={styles.tabWrapper}>
                            <button
                                className={`${styles.tabItem} ${activeTab === "info" ? styles.active : ""}`}
                                onClick={() => setActiveTab("info")}
                            >
                                Información
                            </button>
                            <button
                                className={`${styles.tabItem} ${activeTab === "account" ? styles.active : ""}`}
                                onClick={() => setActiveTab("account")}
                            >
                                Mi Cuenta
                            </button>
                        </div>

                        {activeTab === "info" && (
                            <>
                                {/* Canchas y precios */}
                                <div className={styles.section}>
                                    <div className={styles.sectionHeader}>🎾 Canchas y Precios</div>
                                    <div className={styles.sectionBody}>
                                        {[
                                            { name: "Cancha 1 y 2", type: "Cancha Azul", cover: "Descubierta", price: "$8.000/hora", status: "Disponible" },
                                            { name: "Cancha 3 y 4", type: "Cancha Azul", cover: "Semitechada", price: "$9.500/hora", status: "Disponible" },
                                            { name: "Cancha 5", type: "Cemento", cover: "Indoor LED", price: "$12.000/hora", status: "Ocupada" },
                                            { name: "Cancha 6", type: "Cemento", cover: "Indoor LED", price: "$12.000/hora", status: "Disponible" },
                                        ].map((court) => (
                                            <div key={court.name} className={styles.tournamentCard} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '1rem' }}>
                                                <div style={{ fontSize: '1.5rem', marginRight: '1rem' }}>🟩</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '600', color: 'var(--foreground)' }}>{court.name} — {court.type}</div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>{court.cover} · {court.price}</div>
                                                </div>
                                                <span className={styles.statusBadge} style={{
                                                    color: court.status === "Disponible" ? "var(--primary)" : "#ff6b6b",
                                                    borderColor: court.status === "Disponible" ? "rgba(217,249,93,0.4)" : "rgba(255,68,68,0.3)",
                                                    background: court.status === "Disponible" ? "rgba(217,249,93,0.08)" : "rgba(255,68,68,0.08)",
                                                }}>
                                                    {court.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Horarios */}
                                <div className={styles.section}>
                                    <div className={styles.sectionHeader}>🕐 Horarios por Día</div>
                                    <div className={styles.sectionBody}>
                                        <div className={styles.tableWrapper}>
                                            <table className={styles.historyTable}>
                                                <thead>
                                                    <tr>
                                                        <th>Día</th>
                                                        <th>Horario</th>
                                                        <th>Condición</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {[
                                                        { dia: "Lunes a Viernes", horario: "07:00 – 01:00", precio: "Precio normal" },
                                                        { dia: "Sábados", horario: "07:00 – 02:00", precio: "+20% fin de semana" },
                                                        { dia: "Domingos", horario: "08:00 – 24:00", precio: "+20% fin de semana" },
                                                        { dia: "Feriados", horario: "09:00 – 22:00", precio: "+30% feriado" },
                                                    ].map((h) => (
                                                        <tr key={h.dia}>
                                                            <td style={{ fontWeight: '600' }}>{h.dia}</td>
                                                            <td>{h.horario}</td>
                                                            <td><span className={styles.tag}>{h.precio}</span></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Reseñas */}
                                <div className={styles.section}>
                                    <div className={styles.sectionHeader}>⭐ Reseñas Recientes</div>
                                    <div className={styles.sectionBody}>
                                        {[
                                            { author: "Andrés M.", stars: 5, text: "Canchas impecables, iluminación de primera y fácil reserva online. Lo mejor del barrio." },
                                            { author: "Luciana P.", stars: 5, text: "El centro más moderno de CABA. Las canchas indoor están buenísimas en invierno." },
                                            { author: "Gabriel S.", stars: 4, text: "Muy buena calidad. El único contra es que los horarios pico son difíciles de conseguir." },
                                        ].map((r) => (
                                            <div key={r.author} style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', padding: '1.25rem', borderRadius: '1.25rem', marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontWeight: '600' }}>{r.author}</span>
                                                    <span style={{ color: 'var(--primary)' }}>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
                                                </div>
                                                <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>{r.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === "account" && (
                            <div className={styles.accountSection}>
                                <UserProfile routing="hash" />
                            </div>
                        )}
                    </div>

                    {/* ── Sidebar (Right) ── */}
                    <div className={styles.stickyRight}>
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>📞 Contacto</div>
                            <div className={styles.sectionBody}>
                                {[
                                    { icon: "📧", label: "Email", value: "reservas@padelnorte.com.ar" },
                                    { icon: "📞", label: "Teléfono", value: "+54 11 4567-8901" },
                                    { icon: "📱", label: "WhatsApp", value: "+54 9 11 4567-8901" },
                                    { icon: "🌐", label: "Reservas Online", value: "padelnorte.com.ar/reservas" },
                                    { icon: "📍", label: "Dirección", value: "Av. Libertador 4500, CABA" },
                                ].map((item) => (
                                    <div key={item.label} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                        <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>{item.label}</div>
                                            <div style={{ fontWeight: '500' }}>{item.value}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>🛎️ Amenities</div>
                            <div className={styles.sectionBody}>
                                <div className={styles.tags}>
                                    {["Vestuarios", "Duchas", "Bar/Cafetería", "WiFi", "Estacionamiento", "LED", "Alquiler Palas"].map(s => (
                                        <span key={s} className={styles.tag}>{s}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>🎾 Superficies</div>
                            <div className={styles.sectionBody}>
                                {[
                                    { tipo: "Cancha Azul", cant: "4 canchas", desc: "Césped artificial" },
                                    { tipo: "Cemento", cant: "2 canchas", desc: "Indoor climatizado" },
                                ].map(s => (
                                    <div key={s.tipo} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                        <span style={{ fontSize: '1.5rem' }}>🟦</span>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{s.tipo} — {s.cant}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>{s.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showInvite && (
                <InviteModal clubId="org_123" clubName="Padel Norte Center" onClose={() => setShowInvite(false)} />
            )}
        </FeedLayout>
    );
}
