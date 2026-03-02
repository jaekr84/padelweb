"use client";

import CreatePost from "@/components/social/CreatePost";
import PostCard from "@/components/social/PostCard";
import styles from "./feed.module.css";

const DUMMY_POSTS = [
    {
        id: 1,
        author: { name: "Juan Pérez", username: "juanperez", role: "jugador" as const },
        content: "¡Qué partidazo el de ayer! Gracias @marcos por la invitación. Buscando profe por zona norte para mejorar esa bandeja que me quedó en la red 😅",
        timeAgo: "2h", likes: 12, comments: 3,
    },
    {
        id: 2,
        author: { name: "Club Padelazo", username: "padelazo_ok", role: "club" as const },
        content: "🎾 ¡Últimos lugares para el Torneo Americano de este fin de semana!\nCategorías: 5ta y 6ta Libre.\nPremios en efectivo e indumentaria. Link en bio para anotarse.",
        timeAgo: "5h", likes: 45, comments: 18,
    },
    {
        id: 3,
        author: { name: "Martín Coach", username: "martinprof", role: "profesor" as const },
        content: "Tip rápido: El armado del globo tiene que ser corto y por debajo de la pelota. Si levantás mucho la paleta perdés control.\nMañana subo video 🎓",
        timeAgo: "1 día", likes: 89, comments: 5,
    },
    {
        id: 4,
        author: { name: "Padel Norte Center", username: "padelnorte", role: "centro_de_padel" as const },
        content: "🏗️ ¡Apertura de nuestra nueva cancha indoor! Equipada con iluminación LED, piso de última generación y transmisión live disponible. Reservas ya habilitadas en la app.",
        timeAgo: "3h", likes: 67, comments: 14,
    },
    {
        id: 5,
        author: { name: "Valentina Torres", username: "valepadel", role: "profesor" as const },
        content: "Clínica de volea este sábado a las 10hs en Club Social del Norte. Cupos limitados a 8 personas. Nivel requerido: 5ta en adelante. DM para inscribirse 🎾",
        timeAgo: "6h", likes: 33, comments: 7,
    },
];

const LIVE_MATCHES = [
    { id: 1, t1: "Perez / García", t2: "Torres / Silva", score: "6-4 · 3-2", cancha: "Cancha 1", status: "live" },
    { id: 2, t1: "Martínez / Sosa", t2: "López / Ruiz", score: "4-6 · 1-1", cancha: "Cancha 3", status: "live" },
    { id: 3, t1: "Fernández / Díaz", t2: "Benítez / Ríos", score: "7-5", cancha: "Cancha 2", status: "done" },
];

const UPCOMING = [
    { name: "Copa Primavera", club: "Club Padelazo", date: "12–14 Oct", cats: "5ta, 6ta" },
    { name: "Americano Damas", club: "Padel Norte", date: "19 Oct", cats: "Libre Damas" },
    { name: "Master Final", club: "Premium Center", date: "26 Oct", cats: "1ra, 2da" },
];

export default function FeedPage() {
    return (
        <div className={styles.feedPage}>
            {/* ── Sticky header ── */}
            <header className={styles.feedHeader}>
                <h2>Inicio</h2>
            </header>

            {/* ── Main grid: posts + right panel ── */}
            <div className={styles.feedGrid}>

                {/* ── Posts column ── */}
                <div className={styles.postsCol}>
                    <CreatePost />
                    {DUMMY_POSTS.map((post) => (
                        <PostCard
                            key={post.id}
                            author={post.author}
                            content={post.content}
                            timeAgo={post.timeAgo}
                            likes={post.likes}
                            comments={post.comments}
                        />
                    ))}
                </div>

                {/* ── Right panel ── */}
                <aside className={styles.rightPanel}>

                    {/* Live matches */}
                    <div className={styles.widget}>
                        <div className={styles.widgetHeader}>
                            <span className={styles.liveDot} />
                            En vivo ahora
                        </div>
                        <div className={styles.liveList}>
                            {LIVE_MATCHES.map(m => (
                                <div key={m.id} className={`${styles.liveItem} ${m.status === "done" ? styles.liveItemDone : ""}`}>
                                    <div className={styles.liveTeams}>
                                        <span>{m.t1}</span>
                                        <span className={styles.liveScore}>{m.score}</span>
                                        <span>{m.t2}</span>
                                    </div>
                                    <div className={styles.liveCancha}>{m.cancha} {m.status === "done" && "· Finalizado"}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upcoming tournaments */}
                    <div className={styles.widget}>
                        <div className={styles.widgetHeader}>📅 Próximos Torneos</div>
                        <div>
                            {UPCOMING.map(t => (
                                <div key={t.name} className={styles.upcomingItem}>
                                    <div className={styles.upcomingName}>{t.name}</div>
                                    <div className={styles.upcomingSub}>{t.club} · {t.cats}</div>
                                    <div className={styles.upcomingDate}>{t.date}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick stats */}
                    <div className={styles.widget}>
                        <div className={styles.widgetHeader}>📊 Tu actividad</div>
                        <div className={styles.statsGrid}>
                            {[
                                { label: "Partidos", value: "24" },
                                { label: "Victorias", value: "15" },
                                { label: "Torneos", value: "4" },
                                { label: "Ranking", value: "#38" },
                            ].map(s => (
                                <div key={s.label} className={styles.statCell}>
                                    <div className={styles.statCellValue}>{s.value}</div>
                                    <div className={styles.statCellLabel}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* A quién seguir */}
                    <div className={styles.widget}>
                        <div className={styles.widgetHeader}>👥 A quién seguir</div>
                        {[
                            { name: "Martín Coach", handle: "@martinprof", role: "Profesor APF" },
                            { name: "Club Padelazo", handle: "@padelazo_ok", role: "Club" },
                        ].map(u => (
                            <div key={u.handle} className={styles.followItem}>
                                <div className={styles.followAvatar}>👤</div>
                                <div className={styles.followInfo}>
                                    <div className={styles.followName}>{u.name}</div>
                                    <div className={styles.followRole}>{u.role}</div>
                                </div>
                                <button className={styles.followBtn}>Seguir</button>
                            </div>
                        ))}
                    </div>

                </aside>
            </div>
        </div>
    );
}
