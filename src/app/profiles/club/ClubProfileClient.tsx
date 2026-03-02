"use client";

import { useState } from "react";
import styles from "@/app/profiles/profile.module.css";
import invStyles from "./invite.module.css";
import { InviteModal } from "./InviteModal";
import { UserProfile, useUser } from "@clerk/nextjs";
import { updateClubProfile } from "./actions";
import { startEliminatorias, finishTournament } from "@/app/tournaments/dashboard/actions";
import { useRouter } from "next/navigation";

import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function ClubProfileClient({ user, club, members, userTournaments }: { user: any, club: any, members: any[], userTournaments: any[] }) {
    const [showInvite, setShowInvite] = useState(false);
    const [activeTab, setActiveTab] = useState<"info" | "torneos" | "account">("info");
    const [isEditing, setIsEditing] = useState(false);
    const [lifecycleLoading, setLifecycleLoading] = useState<string | null>(null);
    const router = useRouter();

    // Use Clerk's reactive hook so profile changes show up immediately
    const { user: clerkUser } = useUser();

    const clubName = club?.name || user?.firstName || "Mi Club";
    const clubBio = club?.bio || "Completá la biografía de tu club para que más jugadores te encuentren.";

    async function handleSave(formData: FormData) {
        await updateClubProfile(formData);
        setIsEditing(false);
    }

    return (
        <>
            <div className={styles.page}>
                {/* ── Hero ── */}
                <div className={styles.hero}>
                    <div className={styles.heroBanner} style={{ background: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)" }} />
                    <div className={styles.heroBody}>
                        <div
                            className={styles.heroAvatar}
                            onClick={() => setActiveTab("account")}
                            style={{ cursor: "pointer", position: "relative" }}
                            title="Haz clic para cambiar tu foto de perfil"
                        >
                            {(clerkUser?.imageUrl || user?.imageUrl) ? <img src={clerkUser?.imageUrl || user.imageUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : "🏟️"}
                            <div style={{ position: "absolute", bottom: 0, right: 0, background: "var(--primary)", color: "white", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                                ✏️
                            </div>
                        </div>

                        {isEditing ? (
                            <form action={handleSave} className={styles.heroInfo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '500px' }}>
                                <input type="text" name="name" defaultValue={clubName} placeholder="Nombre del Club" className={styles.inputField} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--foreground)' }} required />
                                <textarea name="bio" defaultValue={club?.bio || ""} placeholder="Biografía corta" className={styles.inputField} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--foreground)' }} />
                                <input type="text" name="location" defaultValue={club?.location || ""} placeholder="Ubicación (ej: Palermo, CABA)" className={styles.inputField} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--foreground)' }} />
                                <input type="text" name="phone" defaultValue={club?.phone || ""} placeholder="Teléfono" className={styles.inputField} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--foreground)' }} />
                                <input type="text" name="website" defaultValue={club?.website || ""} placeholder="Sitio Web o Instagram" className={styles.inputField} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--foreground)' }} />
                                <input type="text" name="amenities" defaultValue={club?.amenities?.join(", ") || ""} placeholder="Servicios separados por coma (ej: WiFi, Vestuarios)" className={styles.inputField} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--foreground)' }} />

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button type="submit" className={styles.btnPrimary}>Guardar Cambios</button>
                                    <button type="button" className={styles.btnSecondary} onClick={() => setIsEditing(false)}>Cancelar</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className={styles.heroInfo}>
                                    <h1 className={styles.heroName}>{clubName}</h1>
                                    <p className={styles.heroBio}>{clubBio}</p>
                                    <div className={styles.heroMeta}>
                                        {club?.location && <span className={styles.heroMetaItem}>📍 {club.location}</span>}
                                        <span className={styles.heroMetaItem}>⭐ 4.8 (312 reseñas)</span>
                                    </div>
                                </div>
                                <div className={styles.heroActions}>
                                    <button className={styles.btnPrimary} onClick={() => setShowInvite(true)}>
                                        ✉️ Invitar Miembros
                                    </button>
                                    <button className={styles.btnSecondary} onClick={() => setIsEditing(true)}>Editar Perfil</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className={styles.statsRow}>
                    <div className={styles.stat}><div className={styles.statValue}>{members?.length || 0}</div><div className={styles.statLabel}>Miembros</div></div>
                    <div className={styles.stat}><div className={styles.statValue}>0</div><div className={styles.statLabel}>Torneos</div></div>
                    <div className={styles.stat}><div className={styles.statValue}>-</div><div className={styles.statLabel}>Rating</div></div>
                </div>

                {/* ── Tabs (Moved to top) ── */}
                <div style={{ display: "flex", gap: "2rem", borderBottom: "1px solid var(--surface-border)", marginBottom: "1.5rem", padding: "0 1rem" }}>
                    <button
                        style={{ background: "transparent", border: "none", color: activeTab === "info" ? "var(--primary)" : "var(--text-muted)", fontWeight: activeTab === "info" ? 700 : 500, padding: "1rem 0", borderBottom: activeTab === "info" ? "2px solid var(--primary)" : "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}
                        onClick={() => setActiveTab("info")}
                    >
                        Información
                    </button>
                    <button
                        style={{ background: "transparent", border: "none", color: activeTab === "torneos" ? "var(--primary)" : "var(--text-muted)", fontWeight: activeTab === "torneos" ? 700 : 500, padding: "1rem 0", borderBottom: activeTab === "torneos" ? "2px solid var(--primary)" : "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}
                        onClick={() => setActiveTab("torneos")}
                    >
                        🏆 Torneos
                    </button>
                    <button
                        style={{ background: "transparent", border: "none", color: activeTab === "account" ? "var(--primary)" : "var(--text-muted)", fontWeight: activeTab === "account" ? 700 : 500, padding: "1rem 0", borderBottom: activeTab === "account" ? "2px solid var(--primary)" : "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}
                        onClick={() => setActiveTab("account")}
                    >
                        ⚙️ Cuenta
                    </button>
                </div>

                {activeTab === "account" ? (
                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                        <UserProfile routing="hash" />
                    </div>
                ) : (
                    <div className={styles.contentGrid}>
                        {/* ── Left ── */}
                        <div>
                            {/* Torneos Tab */}
                            {activeTab === "torneos" && (
                                <div className={styles.section}>
                                    <div className={styles.sectionHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span>🏆 Torneos del Club</span>
                                        <Link
                                            href="/tournaments/create"
                                            style={{ background: "var(--primary)", color: "white", padding: "0.5rem 1rem", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: 700, textDecoration: "none" }}
                                        >
                                            + Crear Torneo
                                        </Link>
                                    </div>
                                    <div className={styles.sectionBody}>
                                        {userTournaments && userTournaments.length > 0 ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                                {userTournaments.map((t: any) => (
                                                    <div key={t.id} style={{ padding: "0.875rem 1rem", borderRadius: "0.75rem", border: "1px solid var(--surface-border)", background: "var(--surface)" }}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                                                            <div>
                                                                <div style={{ fontWeight: 700, marginBottom: "0.2rem" }}>🏆 {t.name}</div>
                                                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                                                    {t.startDate && `📅 ${t.startDate}`}
                                                                    {t.surface && ` · ${t.surface}`}
                                                                </div>
                                                                {t.categories && t.categories.length > 0 && (
                                                                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                                                                        {t.categories[0] === "libre" ? "Libre" : t.categories.join(", ")}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.75rem", borderRadius: "1rem", background: t.status === "published" ? "rgba(217,249,93,0.15)" : "var(--surface-border)", color: t.status === "published" ? "var(--primary)" : "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                                                                {t.status === "published" ? "Publicado" : "Borrador"}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: "flex", gap: "0.5rem" }}>
                                                            <Link
                                                                href={`/tournaments/create?edit=${t.id}`}
                                                                style={{ flex: 1, textAlign: "center", padding: "0.4rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--surface-border)", color: "var(--foreground)", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none", background: "var(--surface)" }}
                                                            >
                                                                ✏️ Editar
                                                            </Link>
                                                            <Link
                                                                href={`/tournaments/${t.id}/fixture`}
                                                                style={{ flex: 1, textAlign: "center", padding: "0.4rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--primary)", color: "var(--primary)", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none", background: "rgba(217,249,93,0.08)" }}
                                                            >
                                                                ⚙️ Gestionar
                                                            </Link>
                                                        </div>

                                                        {/* ── Lifecycle controls ── */}
                                                        <div style={{ borderTop: "1px solid var(--surface-border)", paddingTop: "0.75rem", marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>

                                                            {/* Move to Eliminatorias */}
                                                            {t.status === "en_curso" && (
                                                                <button
                                                                    disabled={lifecycleLoading === t.id}
                                                                    onClick={async () => {
                                                                        setLifecycleLoading(t.id);
                                                                        await startEliminatorias(t.id);
                                                                        setLifecycleLoading(null);
                                                                        router.refresh();
                                                                    }}
                                                                    style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", background: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.35)", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                                                                >
                                                                    {lifecycleLoading === t.id ? "..." : "⚡ Iniciar Eliminatorias"}
                                                                </button>
                                                            )}

                                                            {/* Finish */}
                                                            {(t.status === "en_curso" || t.status === "en_eliminatorias") && (
                                                                <button
                                                                    disabled={lifecycleLoading === t.id}
                                                                    onClick={async () => {
                                                                        if (!confirm("¿Finalizar el torneo? Esta acción no se puede deshacer.")) return;
                                                                        setLifecycleLoading(t.id);
                                                                        await finishTournament(t.id);
                                                                        setLifecycleLoading(null);
                                                                        router.refresh();
                                                                    }}
                                                                    style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.35)", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                                                                >
                                                                    {lifecycleLoading === t.id ? "..." : "🏁 Finalizar Torneo"}
                                                                </button>
                                                            )}

                                                            {/* Live link */}
                                                            {(t.status === "en_curso" || t.status === "en_eliminatorias") && (
                                                                <Link
                                                                    href={`/tournaments/${t.id}/live`}
                                                                    target="_blank"
                                                                    style={{ width: "100%", textAlign: "center", padding: "0.4rem", borderRadius: "0.5rem", background: "transparent", border: "1px solid var(--surface-border)", color: "var(--text-muted)", fontSize: "0.775rem", textDecoration: "none" }}
                                                                >
                                                                    🔗 Ver página en vivo ↗
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>

                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '3rem 0' }}>El club aún no ha publicado torneos.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Info Tab */}
                            {activeTab === "info" && (
                                <>
                                    {/* ── Left ── */}
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
                                            {members && members.length > 0 ? (
                                                members.map((m: any) => (
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
                                                ))
                                            ) : (
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No hay miembros registrados todavía.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.section}>
                                        <div className={styles.sectionHeader}>ℹ️ Información de Contacto</div>
                                        <div className={styles.sectionBody}>
                                            {club?.email && (
                                                <div className={styles.listRow}>
                                                    <span className={styles.listIcon}>📧</span>
                                                    <div><div className={styles.listSub}>Email</div><div className={styles.listMain}>{club.email}</div></div>
                                                </div>
                                            )}
                                            {club?.phone && (
                                                <div className={styles.listRow}>
                                                    <span className={styles.listIcon}>📞</span>
                                                    <div><div className={styles.listSub}>Teléfono</div><div className={styles.listMain}>{club.phone}</div></div>
                                                </div>
                                            )}
                                            {club?.website && (
                                                <div className={styles.listRow}>
                                                    <span className={styles.listIcon}>🌐</span>
                                                    <div><div className={styles.listSub}>Web</div><div className={styles.listMain}>{club.website}</div></div>
                                                </div>
                                            )}
                                            {!club?.phone && !club?.website && (
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay información de contacto adicional configurada.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Right sidebar / Bottom ── */}
                                    {club?.amenities && club.amenities.length > 0 && (
                                        <div className={styles.section}>
                                            <div className={styles.sectionHeader}>🛎️ Servicios</div>
                                            <div className={styles.sectionBody}>
                                                <div className={styles.tags}>
                                                    {club.amenities.map((s: string) => (
                                                        <span key={s} className={styles.tag}>{s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showInvite && (
                <InviteModal clubId={club?.id || user?.id} clubName={clubName} onClose={() => setShowInvite(false)} />
            )}
        </>
    );
}