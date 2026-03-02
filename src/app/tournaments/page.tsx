import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { desc } from "drizzle-orm";
import FeedLayout from "@/app/feed/layout";
import styles from "./tournaments.module.css";
import Link from "next/link";

function formatDate(dateStr: string | null) {
    if (!dateStr) return "Fecha por confirmar";
    return dateStr;
}

function getSurfaceLabel(surface: string | null) {
    const map: Record<string, string> = {
        cesped: "Césped Verde", cesped_azul: "Césped Azul",
        cemento: "Hormigón", indoor: "Indoor",
    };
    return surface ? (map[surface] || surface) : "";
}

export default async function TournamentsPage() {
    const allTournaments = await db
        .select()
        .from(tournaments)
        .orderBy(desc(tournaments.createdAt));

    return (
        <FeedLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Torneos</h1>
                </div>

                <div className={styles.filters}>
                    <button className={`${styles.filterButton} ${styles.active}`}>Todos</button>
                    <button className={styles.filterButton}>Inscripciones Abiertas</button>
                    <button className={styles.filterButton}>🔴 En Vivo</button>
                    <button className={styles.filterButton}>Mis Torneos</button>
                </div>

                {allTournaments.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-muted)" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏆</div>
                        <h3 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>No hay torneos publicados aún</h3>
                        <p style={{ fontSize: "0.9rem" }}>Sé el primero en crear un torneo para tu club.</p>
                        <Link href="/tournaments/create">
                            <button className={styles.createButton} style={{ marginTop: "1.5rem" }}>
                                + Crear el primer torneo
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {allTournaments.map((t) => {
                            const cats = t.categories ?? [];
                            return (
                                <div key={t.id} className={styles.card}>
                                    <div className={styles.cardImage} style={{ position: "relative", overflow: "hidden" }}>
                                        {t.imageUrl ? (
                                            <img
                                                src={t.imageUrl}
                                                alt={t.name}
                                                style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: "3rem" }}>🎾</span>
                                        )}
                                    </div>

                                    <div className={styles.cardContent}>
                                        <h3 className={styles.cardTitle}>{t.name}</h3>
                                        {t.surface && <p className={styles.cardClub}>🏟️ {getSurfaceLabel(t.surface)}</p>}

                                        <div className={styles.cardDetails}>
                                            <div className={styles.detailRow}>
                                                <span className={styles.icon}>📅</span>
                                                <span>{formatDate(t.startDate)} {t.endDate && t.endDate !== t.startDate ? `→ ${formatDate(t.endDate)}` : ""}</span>
                                            </div>
                                            {cats.length > 0 && (
                                                <div className={styles.detailRow}>
                                                    <span className={styles.icon}>👥</span>
                                                    <span>{cats[0] === "libre" ? "Libre (sin categoría)" : `Cats: ${cats.join(", ")}`}</span>
                                                </div>
                                            )}
                                            {t.description && (
                                                <div className={styles.detailRow}>
                                                    <span className={styles.icon}>📝</span>
                                                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px" }}>{t.description}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            <span className={`${styles.statusBadge} ${t.status === "published" ? styles.statusOpen : ""}`} style={{ alignSelf: "flex-start" }}>
                                                {t.status === "published" ? "Inscripción Abierta" : t.status}
                                            </span>
                                            <Link href={`/tournaments/register?id=${t.id}`}>
                                                <button className={`${styles.cardAction} ${styles.primary}`} style={{ width: "100%" }}>
                                                    Inscribirse
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </FeedLayout>
    );
}
