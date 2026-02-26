"use client";

import { useState } from "react";
import FeedLayout from "@/app/feed/layout";
import styles from "@/app/profiles/profile.module.css";
import { InviteModal } from "@/app/profiles/club/InviteModal";

export default function CentroPadelProfilePage() {
    const [showInvite, setShowInvite] = useState(false);

    return (
        <FeedLayout>
            <div className={styles.page}>

                {/* ── Hero ── */}
                <div className={styles.hero}>
                    <div className={styles.heroBanner} style={{ background: "linear-gradient(135deg,#0a1628,#1a3a5c,#0d4a2e)" }} />
                    <div className={styles.heroBody}>
                        <div className={styles.heroAvatar}>🎯</div>
                        <div className={styles.heroInfo}>
                            <h1 className={styles.heroName}>Padel Norte Center</h1>
                            <p className={styles.heroBio}>Centro de pádel en CABA con 6 canchas de alta calidad. Reservas online, iluminación LED y estacionamiento propio.</p>
                            <div className={styles.heroMeta}>
                                <span className={styles.heroMetaItem}>📍 Palermo, CABA</span>
                                <span className={styles.heroMetaItem}>🕐 Lun–Dom 7:00–01:00</span>
                                <span className={styles.heroMetaItem}>⭐ 4.9 (218 reseñas)</span>
                            </div>
                        </div>
                        <div className={styles.heroActions}>
                            <span className={styles.verifiedBadge}>✓ Verificado</span>
                            <button className={styles.btnPrimary}>Reservar Cancha</button>
                            <button className={styles.btnSecondary} onClick={() => setShowInvite(true)}>✉️ Invitar</button>
                        </div>
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className={styles.statsRow}>
                    <div className={styles.stat}><div className={styles.statValue}>6</div><div className={styles.statLabel}>Canchas</div></div>
                    <div className={styles.stat}><div className={styles.statValue}>7.00</div><div className={styles.statLabel}>Apertura</div></div>
                    <div className={styles.stat}><div className={styles.statValue}>01:00</div><div className={styles.statLabel}>Cierre</div></div>
                    <div className={styles.stat}><div className={styles.statValue}>4.9</div><div className={styles.statLabel}>Rating</div></div>
                </div>

                <div className={styles.contentGrid}>
                    {/* ── Left ── */}
                    <div>
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
                                    <div key={court.name} className={styles.listRow}>
                                        <div className={styles.listIcon}>🟩</div>
                                        <div style={{ flex: 1 }}>
                                            <div className={styles.listMain}>{court.name} — {court.type}</div>
                                            <div className={styles.listSub}>{court.cover} · {court.price}</div>
                                        </div>
                                        <span className={styles.listBadge} style={{
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
                                {[
                                    { dia: "Lunes a Viernes", horario: "07:00 – 01:00", precio: "Precio normal" },
                                    { dia: "Sábados", horario: "07:00 – 02:00", precio: "+20% fin de semana" },
                                    { dia: "Domingos", horario: "08:00 – 24:00", precio: "+20% fin de semana" },
                                    { dia: "Feriados", horario: "09:00 – 22:00", precio: "+30% feriado" },
                                ].map((h) => (
                                    <div key={h.dia} className={styles.listRow}>
                                        <div className={styles.listIcon}>📅</div>
                                        <div style={{ flex: 1 }}>
                                            <div className={styles.listMain}>{h.dia}</div>
                                            <div className={styles.listSub}>{h.horario}</div>
                                        </div>
                                        <span className={styles.listBadge}>{h.precio}</span>
                                    </div>
                                ))}
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

                    {/* ── Right sidebar ── */}
                    <div>
                        {/* Información de contacto */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>ℹ️ Contacto y Acceso</div>
                            <div className={styles.sectionBody}>
                                {[
                                    { icon: "📧", label: "Email", value: "reservas@padelnorte.com.ar" },
                                    { icon: "📞", label: "Teléfono", value: "+54 11 4567-8901" },
                                    { icon: "📱", label: "WhatsApp", value: "+54 9 11 4567-8901" },
                                    { icon: "🌐", label: "Reservas Online", value: "padelnorte.com.ar/reservas" },
                                    { icon: "📍", label: "Dirección", value: "Av. Libertador 4500, CABA" },
                                    { icon: "🅿️", label: "Estacionamiento", value: "Subsuelo · 30 lugares" },
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
                            <div className={styles.sectionHeader}>🛎️ Amenities</div>
                            <div className={styles.sectionBody}>
                                <div className={styles.tags}>
                                    {["Vestuarios", "Duchas", "Bar/Cafetería", "Pro Shop", "WiFi", "Estacionamiento", "Iluminación LED", "Alquiler de Palas", "Pelotas incluidas", "App de Reservas"].map(s => (
                                        <span key={s} className={styles.tag}>{s}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Superficie */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>🎾 Superficies</div>
                            <div className={styles.sectionBody}>
                                {[
                                    { tipo: "Cancha Azul", cant: "4 canchas", desc: "Césped artificial · Nivel torneo" },
                                    { tipo: "Cemento", cant: "2 canchas", desc: "Indoor con climatización" },
                                ].map(s => (
                                    <div key={s.tipo} className={styles.listRow}>
                                        <span className={styles.listIcon}>🟦</span>
                                        <div>
                                            <div className={styles.listMain}>{s.tipo} — {s.cant}</div>
                                            <div className={styles.listSub}>{s.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showInvite && (
                <InviteModal clubName="Padel Norte Center" onClose={() => setShowInvite(false)} />
            )}
        </FeedLayout>
    );
}
