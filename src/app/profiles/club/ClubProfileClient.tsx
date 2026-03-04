"use client";

import { useState } from "react";
import styles from "@/app/profiles/profile.module.css";
import invStyles from "./invite.module.css";
import { InviteModal } from "./InviteModal";
import { UserProfile, useUser } from "@clerk/nextjs";
import { updateClubProfile } from "./actions";
import { startEliminatorias, finishTournament } from "@/app/tournaments/dashboard/actions";
import { deleteTournament } from "@/app/tournaments/fixture/actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function ClubProfileClient({ user, club, members, userTournaments }: { user: any, club: any, members: any[], userTournaments: any[] }) {
    const [showInvite, setShowInvite] = useState(false);
    const [activeTab, setActiveTab] = useState<"info" | "torneos" | "account">("info");
    const [isEditing, setIsEditing] = useState(false);
    const [lifecycleLoading, setLifecycleLoading] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    // Use Clerk's reactive hook so profile changes show up immediately
    const { user: clerkUser } = useUser();

    // Form state
    const [formData, setFormData] = useState({
        name: club?.name || user?.fullName || "",
        bio: club?.bio || "",
        location: club?.location || "",
        phone: club?.phone || "",
        website: club?.website || "",
        amenities: club?.amenities?.join(", ") || "",
    });

    const clubName = club?.name || user?.fullName || "Mi Club";
    const clubBio = club?.bio || "Completá la biografía de tu club para que más jugadores te encuentren. 🏟️";
    const isOwner = user?.id === club?.ownerId;

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(formData).forEach(([key, value]) => fd.append(key, value));
            await updateClubProfile(fd);
            setIsEditing(false);
            router.refresh();
        } catch (error) {
            alert("Error al actualizar el perfil");
        }
        setSaving(false);
    }

    return (
        <div className={styles.page}>
            {/* ── Hero ── */}
            <div className={styles.hero}>
                <div className={styles.heroBanner} style={{ background: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)" }} />

                <div className={styles.headerActionsTop}>
                    {isOwner && (
                        <>
                            <button className={styles.roleSwitchButton} onClick={() => setShowInvite(true)}>
                                ✉️ Invitar
                            </button>
                            <button className={styles.editButton} onClick={() => setIsEditing(true)}>
                                ✏️ Editar
                            </button>
                        </>
                    )}
                </div>

                <div className={styles.heroBody}>
                    <div className={styles.heroAvatar} onClick={() => isOwner && setActiveTab("account")} style={{ cursor: isOwner ? "pointer" : "default" }}>
                        {(clerkUser?.imageUrl || user?.imageUrl) ? (
                            <img src={clerkUser?.imageUrl || user.imageUrl} alt="Avatar" />
                        ) : (
                            <span style={{ fontSize: '3rem' }}>🏟️</span>
                        )}
                    </div>

                    <div className={styles.heroInfo}>
                        <div className={styles.heroMain}>
                            <h1 className={styles.heroName}>{clubName}</h1>
                            <span className={styles.verifiedBadge} title="Club Verificado">✓</span>
                        </div>
                        <p className={styles.heroBio}>{clubBio}</p>

                        <div className={styles.heroMeta}>
                            {club?.location && (
                                <div className={styles.heroMetaItem}>📍 {club.location}</div>
                            )}
                            <div className={styles.heroMetaItem}>
                                ⭐ <span className={styles.accent}>4.8</span> (312 reseñas)
                            </div>
                            <div className={styles.heroMetaItem}>
                                🎾 <span className={styles.accent}>{userTournaments?.length || 0}</span> Torneos
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>{members?.length || 0}</div>
                    <div className={styles.statLabel}>Semanales</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>{userTournaments?.filter(t => t.status === 'en_curso').length || 0}</div>
                    <div className={styles.statLabel}>Activos</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>{club?.phone ? "SI" : "NO"}</div>
                    <div className={styles.statLabel}>Contacto</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>-</div>
                    <div className={styles.statLabel}>Karma</div>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className={styles.tabWrapper}>
                <button
                    className={`${styles.tabItem} ${activeTab === "info" ? styles.active : ""}`}
                    onClick={() => setActiveTab("info")}
                >
                    🏟️ Mi Club
                </button>
                <button
                    className={`${styles.tabItem} ${activeTab === "torneos" ? styles.active : ""}`}
                    onClick={() => setActiveTab("torneos")}
                >
                    🏆 Nuestros Torneos
                </button>
                {isOwner && (
                    <button
                        className={`${styles.tabItem} ${activeTab === "account" ? styles.active : ""}`}
                        onClick={() => setActiveTab("account")}
                    >
                        ⚙️ Cuenta
                    </button>
                )}
            </div>

            {/* ── Content ── */}
            <div className={styles.contentGrid}>
                {activeTab === "account" ? (
                    <div className={styles.fullWidth} style={{ display: 'flex', justifyContent: 'center' }}>
                        <UserProfile routing="hash" />
                    </div>
                ) : (
                    <>
                        {/* Main Content (Left) */}
                        <div className={styles.mainCol}>
                            {activeTab === "torneos" && (
                                <div className={styles.section}>
                                    <div className={styles.sectionHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span>Proezas y Competiciones</span>
                                        {isOwner && (
                                            <Link href="/tournaments/create" className={styles.tag}>
                                                + Crear Torneo
                                            </Link>
                                        )}
                                    </div>
                                    <div className={styles.sectionBody}>
                                        {userTournaments && userTournaments.length > 0 ? (
                                            <div style={{ display: "grid", gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: "1.5rem" }}>
                                                {userTournaments.map((t: any) => (
                                                    <div key={t.id} className={styles.tournamentCard}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div className={styles.tName}>🏆 {t.name}</div>
                                                            <span className={`${styles.statusBadge} ${styles['status_' + t.status]}`}>
                                                                {t.status === "finalizado" ? "🏁 Cerrado" :
                                                                    t.status === "en_eliminatorias" ? "⚡ Cruces" :
                                                                        t.status === "en_curso" ? "🎾 En Curso" :
                                                                            t.status === "published" ? "✅ Abierto" : "📝 Borrador"}
                                                            </span>
                                                        </div>
                                                        <div className={styles.heroMetaItem} style={{ border: 'none', background: 'none', padding: 0 }}>
                                                            {t.startDate && `📅 ${t.startDate}`} {t.surface && ` · ${t.surface}`}
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                                                            {isOwner && t.status !== "finalizado" && (
                                                                <Link href={`/tournaments/create?edit=${t.id}`} className={styles.tag} style={{ flex: 1, textAlign: 'center' }}>
                                                                    ✏️ Editar
                                                                </Link>
                                                            )}
                                                            <Link href={`/tournaments/${t.id}/fixture`} className={styles.btnAction} style={{ flex: 2 }}>
                                                                {t.status === "finalizado" ? "Ver Podio" : "Gestionar"}
                                                            </Link>
                                                            {isOwner && (
                                                                <button
                                                                    className={styles.tag}
                                                                    style={{ border: '1px solid #ef4444', color: '#ef4444' }}
                                                                    onClick={async () => {
                                                                        if (!confirm("¿Eliminar torneo?")) return;
                                                                        setLifecycleLoading(t.id);
                                                                        await deleteTournament(t.id);
                                                                        router.refresh();
                                                                        setLifecycleLoading(null);
                                                                    }}
                                                                >
                                                                    🗑️
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className={styles.emptyState}>
                                                <p>Aún no se han organizado torneos oficiales.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === "info" && (
                                <>
                                    <div className={styles.section}>
                                        <div className={styles.sectionHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span>👥 Comunidad del Club</span>
                                            {isOwner && (
                                                <button onClick={() => setShowInvite(true)} className={styles.tag}>
                                                    + Invitar Miembros
                                                </button>
                                            )}
                                        </div>
                                        <div className={styles.sectionBody}>
                                            {members && members.length > 0 ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    {members.map((m: any) => (
                                                        <div key={m.id} className={invStyles.memberItem} style={{ border: '1px solid var(--surface-border)', borderRadius: '1rem', padding: '1rem' }}>
                                                            <div className={invStyles.memberAvatar}>{m.avatar}</div>
                                                            <div style={{ flex: 1 }}>
                                                                <div className={invStyles.memberName}>{m.name}</div>
                                                                <div className={invStyles.memberSub}>{m.level}</div>
                                                            </div>
                                                            <span className={m.role === "admin" ? styles.statusBadge : styles.tag}>
                                                                {m.role === "admin" ? "Staff" : "Socio"}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className={styles.heroBio} style={{ textAlign: 'center', padding: '2rem' }}>Aún no hay una comunidad pública visible.</p>
                                            )}
                                        </div>
                                    </div>

                                    {club?.amenities && club.amenities.length > 0 && (
                                        <div className={styles.section}>
                                            <div className={styles.sectionHeader}>🛎️ Servicios y Comodidades</div>
                                            <div className={styles.sectionBody}>
                                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                    {club.amenities.map((s: string) => (
                                                        <span key={s} className={styles.tag} style={{ fontSize: '1rem', padding: '0.6rem 1rem' }}>
                                                            ✅ {s}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Sidebar (Right) */}
                        <div className={styles.stickyRight}>
                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>📞 Contacto</div>
                                <div className={styles.sectionBody} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {club?.email && (
                                        <div className={styles.heroMetaItem}>📧 {club.email}</div>
                                    )}
                                    {club?.phone && (
                                        <div className={styles.heroMetaItem}>📞 {club.phone}</div>
                                    )}
                                    {club?.website && (
                                        <Link href={club.website.startsWith('http') ? club.website : `https://${club.website}`} target="_blank" className={styles.btnSocial} style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--foreground)' }}>
                                            🌐 Sitio Web
                                        </Link>
                                    )}
                                    {!club?.email && !club?.phone && !club?.website && (
                                        <p className={styles.heroBio}>No hay datos de contacto públicos.</p>
                                    )}
                                </div>
                            </div>

                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>🕒 Horarios</div>
                                <div className={styles.sectionBody}>
                                    <p className={styles.heroBio}>Lun - Dom: 08:00 - 23:00</p>
                                    <button className={styles.btnAction} style={{ marginTop: '1rem' }}>
                                        📅 Reservar Cancha
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className={styles.modalOverlay}>
                    <div className={styles.editModal}>
                        <div className={styles.modalHeader}>
                            <h2>Configurar Club</h2>
                            <button onClick={() => setIsEditing(false)} className={styles.closeBtn}>✕</button>
                        </div>
                        <form onSubmit={handleSave} className={styles.editForm}>
                            <div className={styles.formGroup}>
                                <label>Nombre del Club</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Biografía / Descripción</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Ubicación</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Teléfono</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Sitio Web / Instagram</label>
                                <input
                                    type="text"
                                    value={formData.website}
                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Servicios (Separados por coma)</label>
                                <input
                                    type="text"
                                    value={formData.amenities}
                                    onChange={e => setFormData({ ...formData, amenities: e.target.value })}
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setIsEditing(false)} className={styles.cancelBtn}>Cancelar</button>
                                <button type="submit" disabled={saving} className={styles.saveBtn}>
                                    {saving ? "Guardando..." : "💥 Actualizar Club"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showInvite && (
                <InviteModal clubId={club?.id || user?.id} clubName={clubName} onClose={() => setShowInvite(false)} />
            )}
        </div>
    );
}