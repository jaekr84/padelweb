"use client";

import { useState } from "react";

import styles from "./notifications.module.css";

type NotifType = "like" | "comment" | "follow" | "tournament" | "partner_invite" | "result";

interface Notification {
    id: number;
    type: NotifType;
    read: boolean;
    user: { name: string; avatar: string };
    text: string;
    timeAgo: string;
    hasActions?: boolean;
}

const TYPE_ICONS: Record<NotifType, string> = {
    like: "🎾",
    comment: "💬",
    follow: "👤",
    tournament: "🏆",
    partner_invite: "🤝",
    result: "📊",
};

const ALL_NOTIFICATIONS: Notification[] = [
    {
        id: 1,
        type: "partner_invite",
        read: false,
        user: { name: "Marcos García", avatar: "👤" },
        text: "<strong>Marcos García</strong> te invitó a ser su pareja en el <strong>Torneo Copa Primavera</strong> (5ta Libre).",
        timeAgo: "Hace 10 minutos",
        hasActions: true,
    },
    {
        id: 2,
        type: "tournament",
        read: false,
        user: { name: "Club Padelazo", avatar: "🏟️" },
        text: "<strong>Club Padelazo</strong> abrió las inscripciones para el <strong>Americano del Verano</strong>. ¡Cupo limitado!",
        timeAgo: "Hace 1 hora",
    },
    {
        id: 3,
        type: "like",
        read: false,
        user: { name: "Lucas Gomez", avatar: "👤" },
        text: "<strong>Lucas Gomez</strong> y otras 4 personas le dieron 🎾 a tu publicación sobre el partido de ayer.",
        timeAgo: "Hace 2 horas",
    },
    {
        id: 4,
        type: "follow",
        read: true,
        user: { name: "Martín Rodriguez", avatar: "👤" },
        text: "<strong>Martín Rodriguez</strong> comenzó a seguirte.",
        timeAgo: "Hace 5 horas",
    },
    {
        id: 5,
        type: "comment",
        read: true,
        user: { name: "Carla Ruiz", avatar: "👤" },
        text: "<strong>Carla Ruiz</strong> comentó en tu post: <em>\"¡Que viva el pádel! A ver si jugamos juntos un día 😄\"</em>",
        timeAgo: "Hace 8 horas",
    },
    {
        id: 6,
        type: "result",
        read: true,
        user: { name: "Torneo Copa Primavera", avatar: "🏆" },
        text: "¡Felicitaciones! El resultado de la <strong>Copa Primavera (Semifinal)</strong> fue actualizado. <strong>Ganaste</strong> y pasaste a la final. Se te sumaron <strong>360 puntos</strong> de ranking.",
        timeAgo: "Ayer",
    },
];

export default function NotificationsPage() {
    const [tab, setTab] = useState<"todas" | "menciones">("todas");
    const [notifications, setNotifications] = useState(ALL_NOTIFICATIONS);

    const markAllRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const shown = tab === "todas"
        ? notifications
        : notifications.filter((n) => n.type === "comment" || n.type === "like");

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (

            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Notificaciones {unreadCount > 0 && `(${unreadCount})`}</h2>
                    {unreadCount > 0 && (
                        <button className={styles.markAllBtn} onClick={markAllRead}>
                            Marcar todas como leídas
                        </button>
                    )}
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${tab === "todas" ? styles.active : ""}`}
                        onClick={() => setTab("todas")}
                    >
                        Todas
                    </button>
                    <button
                        className={`${styles.tab} ${tab === "menciones" ? styles.active : ""}`}
                        onClick={() => setTab("menciones")}
                    >
                        Menciones & Likes
                    </button>
                </div>

                {shown.length === 0 ? (
                    <div className={styles.empty}>
                        <p>🔔</p>
                        <p>No tenés notificaciones en esta sección</p>
                    </div>
                ) : (
                    shown.map((notif) => (
                        <div
                            key={notif.id}
                            className={`${styles.notifRow} ${!notif.read ? styles.unread : ""}`}
                            onClick={() =>
                                setNotifications((prev) =>
                                    prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
                                )
                            }
                        >
                            <div className={styles.iconWrapper}>
                                <div className={styles.avatar}>{notif.user.avatar}</div>
                                <div className={styles.typeIcon}>{TYPE_ICONS[notif.type]}</div>
                            </div>

                            <div className={styles.notifContent}>
                                <div
                                    className={styles.notifText}
                                    dangerouslySetInnerHTML={{ __html: notif.text }}
                                />
                                <div className={styles.notifTime}>{notif.timeAgo}</div>

                                {notif.hasActions && (
                                    <div className={styles.actionButtons}>
                                        <button className={styles.acceptBtn}>✔ Aceptar</button>
                                        <button className={styles.rejectBtn}>Rechazar</button>
                                    </div>
                                )}
                            </div>

                            {!notif.read && <div className={styles.unreadDot} />}
                        </div>
                    ))
                )}
            </div>
    );
}
