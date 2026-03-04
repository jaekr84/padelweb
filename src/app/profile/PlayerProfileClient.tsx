"use client";

import { useState } from "react";
import FeedLayout from "@/app/feed/layout";
import styles from "@/app/profiles/profile.module.css";
import { UserProfile } from "@clerk/nextjs";
import Link from "next/link";
import { updatePlayerProfile, switchRole } from "./actions";
import { useRouter } from "next/navigation";
import ProfeProfileClient from "@/app/profiles/profe/ProfeProfileClient";
import CentroProfileClient from "@/app/profiles/centro/CentroProfileClient";

interface PlayerProfileClientProps {
    user: any;
    dbUser: any;
    registrations: any[];
    matches: any[];
    bracketMatches: any[];
    isOwnProfile: boolean;
    profeProfile?: any;
    clubProfile?: any;
}

export default function PlayerProfileClient({ user, dbUser, registrations, matches, bracketMatches, isOwnProfile, profeProfile, clubProfile }: PlayerProfileClientProps) {
    const defaultTab = (dbUser?.role === "centro_de_padel" || dbUser?.role === "club") ? "club" : "tournaments";
    const [activeTab, setActiveTab] = useState<"tournaments" | "stats" | "trophies" | "account" | "profe" | "club">(defaultTab);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: dbUser?.name || user?.fullName || "",
        location: dbUser?.location || "",
        bio: dbUser?.bio || "",
        side: dbUser?.side || "drive",
    });

    const myName = dbUser?.name || user?.fullName;

    const isMyMatch = (m: any) => {
        const team1 = m.match.team1Name || "";
        const team2 = m.match.team2Name || "";
        return team1.includes(myName) || team2.includes(myName);
    };

    const myGroupMatches = matches.filter(isMyMatch);
    const myBracketMatches = bracketMatches.filter(isMyMatch);

    const allMatchesHistory = [
        ...myGroupMatches.map(m => ({ ...m, type: "Grupo" })),
        ...myBracketMatches.map(m => ({ ...m, type: m.match.round === 1 ? "Final" : m.match.round === 2 ? "Semi" : "Eliminatoria" }))
    ].sort((a, b) => new Date(b.match.createdAt).getTime() - new Date(a.match.createdAt).getTime());

    const wins = allMatchesHistory.filter(m => {
        const isTeam1 = m.match.team1Name?.includes(myName);
        if (isTeam1) return m.match.score1 > m.match.score2;
        return m.match.score2 > m.match.score1;
    }).length;

    const stats = {
        category: dbUser?.category || "5ta",
        matches: allMatchesHistory.length,
        wins: wins,
        points: dbUser?.points ?? 0,
        side: dbUser?.side || "drive"
    };

    const activeTournaments = registrations.filter(r => r.tournament.status !== "finalizado");
    const pastTournaments = registrations.filter(r => r.tournament.status === "finalizado");

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updatePlayerProfile(formData);
            setIsEditing(false);
        } catch (error) {
            alert("Error al actualizar el perfil");
        }
        setSaving(false);
    };

    const handleSwitchRole = async () => {
        if (!confirm("¿Deseas cambiar tu perfil a Profesional (Profe)? Podrás volver a ser Jugador cuando quieras.")) return;
        setSaving(true);
        try {
            await switchRole("profe");
            window.location.reload();
        } catch (error) {
            alert("Error al cambiar de rol");
            setSaving(false);
        }
    };

    return (
        <FeedLayout>
            <div className={styles.page}>
                {/* ── Hero ── */}
                <div className={styles.hero}>
                    <div className={styles.heroBanner} />

                    <div className={styles.headerActionsTop}>
                        {isOwnProfile && (
                            <>
                                {!profeProfile ? (
                                    <button className={styles.roleSwitchButton} onClick={handleSwitchRole}>
                                        🎓 Ser Profe
                                    </button>
                                ) : (
                                    <Link href="/profiles/profe" className={styles.roleSwitchButton}>
                                        🎓 Vista Pública Profe
                                    </Link>
                                )}
                                <button className={styles.editButton} onClick={() => setIsEditing(true)}>
                                    ✏️ Editar
                                </button>
                            </>
                        )}
                    </div>

                    <div className={styles.heroBody}>
                        <div className={styles.heroAvatar}>
                            <img src={user?.imageUrl} alt={user?.fullName} />
                        </div>
                        <div className={styles.heroInfo}>
                            <div className={styles.heroMain}>
                                <h1 className={styles.heroName}>{dbUser?.name || user?.fullName}</h1>
                                <span className={styles.verifiedBadge}>✓</span>
                            </div>
                            <p className={styles.heroBio}>
                                {dbUser?.bio || "Sin biografía aún. ¡Cuéntanos sobre tu juego! 🎾"}
                            </p>
                            <div className={styles.heroMeta}>
                                <div className={styles.heroMetaItem}>
                                    📍 {dbUser?.location || "Argentina"}
                                </div>
                                <div className={styles.heroMetaItem}>
                                    🎾 Lado: <span className={styles.accent}>{stats.side === "drive" ? "Drive" : "Revés"}</span>
                                </div>
                                <div className={styles.heroMetaItem}>
                                    📅 Desde {new Date(user?.createdAt).getFullYear()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>{stats.category}</div>
                        <div className={styles.statLabel}>Categoría</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>{stats.points}</div>
                        <div className={styles.statLabel}>Puntos</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>{activeTournaments.length}</div>
                        <div className={styles.statLabel}>Activos</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>
                            {stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0}%
                        </div>
                        <div className={styles.statLabel}>Win Rate</div>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className={styles.tabWrapper}>
                    <button
                        className={`${styles.tabItem} ${activeTab === "tournaments" ? styles.active : ""}`}
                        onClick={() => setActiveTab("tournaments")}
                    >
                        🎾 Mis Torneos
                    </button>
                    <button
                        className={`${styles.tabItem} ${activeTab === "stats" ? styles.active : ""}`}
                        onClick={() => setActiveTab("stats")}
                    >
                        📈 Estadísticas
                    </button>
                    <button
                        className={`${styles.tabItem} ${activeTab === "trophies" ? styles.active : ""}`}
                        onClick={() => setActiveTab("trophies")}
                    >
                        🏆 Trofeos
                    </button>
                    {profeProfile && (
                        <button
                            className={`${styles.tabItem} ${activeTab === "profe" ? styles.active : ""}`}
                            onClick={() => setActiveTab("profe")}
                        >
                            🎓 Instructor
                        </button>
                    )}
                    {(clubProfile || (isOwnProfile && (dbUser?.role === "centro_de_padel" || dbUser?.role === "club"))) && (
                        <button
                            className={`${styles.tabItem} ${activeTab === "club" ? styles.active : ""}`}
                            onClick={() => setActiveTab("club")}
                        >
                            🏟️ Centro de Pádel
                        </button>
                    )}
                    {isOwnProfile && (
                        <button
                            className={`${styles.tabItem} ${activeTab === "account" ? styles.active : ""}`}
                            onClick={() => setActiveTab("account")}
                        >
                            ⚙️ Cuenta
                        </button>
                    )}
                </div>

                {/* ── Content Grid ── */}
                <div className={styles.contentGrid}>
                    <div className={activeTab === "account" ? styles.fullWidth : ""}>
                        {activeTab === "tournaments" && (
                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>🏆 Competiciones Actuales</div>
                                <div className={styles.sectionBody}>
                                    {activeTournaments.length === 0 ? (
                                        <div className={styles.emptyState}>
                                            <p>No tienes torneos activos ahora.</p>
                                            <Link href="/tournaments" className={styles.tag} style={{ marginTop: '1rem', display: 'inline-block' }}>Explorar 🎾</Link>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                            {activeTournaments.map(reg => (
                                                <div key={reg.id} className={styles.tournamentCard}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <div className={styles.tName}>{reg.tournament.name}</div>
                                                        <span className={`${styles.statusBadge} ${styles['status_' + reg.tournament.status]}`}>
                                                            {reg.tournament.status === "en_curso" ? "🎾 Activo" : "⚡ Cruces"}
                                                        </span>
                                                    </div>
                                                    <div className={styles.memberSub}> partner: {reg.partnerName || "TBD"}</div>
                                                    <Link href={`/tournaments/${reg.tournamentId}/live`} className={styles.btnAction}>
                                                        Ver Live Score ↗
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === "stats" && (
                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>📊 Historial de Partidos</div>
                                <div className={styles.sectionBody}>
                                    {allMatchesHistory.length > 0 ? (
                                        <div className={styles.tableWrapper}>
                                            <table className={styles.historyTable}>
                                                <thead>
                                                    <tr>
                                                        <th>Fecha</th>
                                                        <th>Torneo / Fase</th>
                                                        <th>Oponentes</th>
                                                        <th>Resultado</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {allMatchesHistory.map((m, i) => {
                                                        const isT1 = m.match.team1Name?.includes(myName);
                                                        const opponents = isT1 ? m.match.team2Name : m.match.team1Name;
                                                        const won = isT1 ? m.match.score1 > m.match.score2 : m.match.score2 > m.match.score1;
                                                        const date = new Date(m.match.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                                                        return (
                                                            <tr key={i}>
                                                                <td className={styles.dateCol}>{date}</td>
                                                                <td>
                                                                    <div className={styles.tName}>{m.tournamentName}</div>
                                                                    <div className={styles.tStage}>{m.type}</div>
                                                                </td>
                                                                <td className={styles.opponentCol}>{opponents}</td>
                                                                <td>
                                                                    <div className={styles.resultCol}>
                                                                        <div className={`${styles.resultBadge} ${won ? styles.won : styles.lost}`}>
                                                                            {won ? "V" : "D"}
                                                                        </div>
                                                                        <span className={styles.scoreText}>{m.match.score1}-{m.match.score2}</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className={styles.heroBio}>Aún no has disputado partidos oficiales.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === "trophies" && (
                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>🏆 Muro de Campeones</div>
                                <div className={styles.sectionBody}>
                                    <div className={styles.emptyState}>
                                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🥇</div>
                                        <p>Próximamente verás aquí tus títulos y finales alcanzadas.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "profe" && profeProfile && (
                            <ProfeProfileClient
                                profe={profeProfile}
                                isOwner={isOwnProfile}
                                embedded={true}
                            />
                        )}

                        {activeTab === "club" && (isOwnProfile || clubProfile) && (
                            <CentroProfileClient
                                centro={clubProfile}
                                isOwner={isOwnProfile}
                                embedded={true}
                            />
                        )}

                        {activeTab === "account" && (
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <UserProfile routing="hash" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className={styles.modalOverlay}>
                    <div className={styles.editModal}>
                        <div className={styles.modalHeader}>
                            <h2>Editar Perfil</h2>
                            <button onClick={() => setIsEditing(false)} className={styles.closeBtn}>✕</button>
                        </div>
                        <form onSubmit={handleSave} className={styles.editForm}>
                            <div className={styles.formGroup}>
                                <label>Nombre en Pista</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
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
                                    <label>Lado Preferido</label>
                                    <select
                                        value={formData.side}
                                        onChange={e => setFormData({ ...formData, side: e.target.value })}
                                    >
                                        <option value="drive">Drive</option>
                                        <option value="reves">Revés</option>
                                        <option value="ambos">Ambos</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Bio Personal</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    rows={4}
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setIsEditing(false)} className={styles.cancelBtn}>Cancelar</button>
                                <button type="submit" disabled={saving} className={styles.saveBtn}>
                                    💥 Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </FeedLayout>
    );
}
