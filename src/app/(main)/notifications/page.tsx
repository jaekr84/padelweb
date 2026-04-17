"use client";

import { useState } from "react";
import { 
    Bell, Heart, MessageSquare, UserPlus, 
    Trophy, Handshake, Activity, Check, 
    CheckCircle2, X, ChevronRight, Search,
    Clock, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type NotifType = "like" | "comment" | "follow" | "tournament" | "partner_invite" | "result";

interface Notification {
    id: number;
    type: NotifType;
    read: boolean;
    user: { name: string; avatar: string; emoji?: string };
    text: string;
    timeAgo: string;
    hasActions?: boolean;
}

const TYPE_CONFIG: Record<NotifType, { icon: any, color: string, bg: string }> = {
    like: { icon: Heart, color: "text-rojo", bg: "bg-rojo/10" },
    comment: { icon: MessageSquare, color: "text-azul-primary", bg: "bg-azul-primary/10" },
    follow: { icon: UserPlus, color: "text-celeste", bg: "bg-celeste/10" },
    tournament: { icon: Trophy, color: "text-azul-primary", bg: "bg-azul-primary/20" },
    partner_invite: { icon: Handshake, color: "text-celeste", bg: "bg-celeste/20" },
    result: { icon: Activity, color: "text-azul-primary", bg: "bg-azul-primary/10" },
};

const ALL_NOTIFICATIONS: Notification[] = [
    {
        id: 1,
        type: "partner_invite",
        read: false,
        user: { name: "Marcos García", avatar: "👤", emoji: "👤" },
        text: "<strong>Marcos García</strong> te invitó a ser su pareja en el <strong>Torneo Copa Primavera</strong> (5ta Libre).",
        timeAgo: "Hace 10 minutos",
        hasActions: true,
    },
    {
        id: 2,
        type: "tournament",
        read: false,
        user: { name: "Club Padelazo", avatar: "🏟️", emoji: "🏟️" },
        text: "<strong>Club Padelazo</strong> abrió las inscripciones para el <strong>Americano del Verano</strong>. ¡Cupo limitado!",
        timeAgo: "Hace 1 hora",
    },
    {
        id: 3,
        type: "like",
        read: false,
        user: { name: "Lucas Gomez", avatar: "👤", emoji: "👤" },
        text: "<strong>Lucas Gomez</strong> y otras 4 personas le dieron 🎾 a tu publicación sobre el partido de ayer.",
        timeAgo: "Hace 2 horas",
    },
    {
        id: 4,
        type: "follow",
        read: true,
        user: { name: "Martín Rodriguez", avatar: "👤", emoji: "👤" },
        text: "<strong>Martín Rodriguez</strong> comenzó a seguirte.",
        timeAgo: "Hace 5 horas",
    },
    {
        id: 5,
        type: "comment",
        read: true,
        user: { name: "Carla Ruiz", avatar: "👤", emoji: "👤" },
        text: "<strong>Carla Ruiz</strong> comentó en tu post: <em>\"¡Que viva el pádel! A ver si jugamos juntos un día 😄\"</em>",
        timeAgo: "Hace 8 horas",
    },
    {
        id: 6,
        type: "result",
        read: true,
        user: { name: "Torneo Copa Primavera", avatar: "🏆", emoji: "🏆" },
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
        <div className="min-h-screen bg-background relative font-sans selection:bg-azul-primary/30 py-8 px-4 md:px-8 lg:px-12">
            <div className="max-w-4xl mx-auto space-y-12">
                
                {/* ── Header Section ── */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-4 border-b border-border/50">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-azul-primary/10 flex items-center justify-center border border-azul-primary/20 shadow-xl shadow-azul-primary/5">
                            <Bell className="w-7 h-7 text-azul-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-foreground decoration-azul-primary/30 decoration-4 underline-offset-4">
                                Notificaciones {unreadCount > 0 && <span className="text-azul-primary">({unreadCount})</span>}
                            </h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-azul-primary/60 transition-colors">Centro de actividad ACAP</p>
                        </div>
                    </div>

                    {unreadCount > 0 && (
                        <button 
                            onClick={markAllRead}
                            className="group flex items-center gap-2 px-6 py-3 bg-azul-primary/10 hover:bg-azul-primary text-azul-primary hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest border border-azul-primary/20 transition-all shadow-lg shadow-azul-primary/5 active:scale-95"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Marcar todas como leídas
                        </button>
                    )}
                </div>

                {/* ── Corporate Tabs ── */}
                <div className="flex p-1.5 bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] w-full max-w-md mx-auto relative z-10">
                    <button
                        onClick={() => setTab("todas")}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-[1.5rem] transition-all duration-500 text-[10px] font-black uppercase tracking-widest relative z-10 ${tab === "todas" ? "text-white" : "text-foreground/50 hover:text-foreground"}`}
                    >
                        {tab === "todas" && (
                            <motion.div layoutId="notif-tab-bg" className="absolute inset-0 bg-azul-primary rounded-[1.5rem] shadow-xl shadow-azul-primary/30 z-[-1]" />
                        )}
                        Todas
                    </button>
                    <button
                        onClick={() => setTab("menciones")}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-[1.5rem] transition-all duration-500 text-[10px] font-black uppercase tracking-widest relative z-10 ${tab === "menciones" ? "text-white" : "text-foreground/50 hover:text-foreground"}`}
                    >
                        {tab === "menciones" && (
                            <motion.div layoutId="notif-tab-bg" className="absolute inset-0 bg-celeste rounded-[1.5rem] shadow-xl shadow-celeste/30 z-[-1]" />
                        )}
                        Likes & Chats
                    </button>
                </div>

                {/* ── Notifications List ── */}
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {shown.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex flex-col items-center justify-center py-32 text-center opacity-40 select-none bg-card/20 rounded-[3rem] border-2 border-dashed border-border/50"
                            >
                                <div className="w-24 h-24 bg-muted/20 border border-border rounded-full flex items-center justify-center mb-8 shadow-inner">
                                    <Bell className="w-10 h-10 text-muted-foreground" />
                                </div>
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Historial Limpio</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-3">No tenés notificaciones en esta sección por ahora.</p>
                            </motion.div>
                        ) : (
                            shown.map((notif, idx) => {
                                const cfg = TYPE_CONFIG[notif.type];
                                const Icon = cfg.icon;
                                
                                return (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, x: -20, y: 10 }}
                                        animate={{ opacity: 1, x: 0, y: 0 }}
                                        transition={{ delay: idx * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                        className={`group relative flex items-start gap-6 p-6 md:p-8 rounded-[2.5rem] border transition-all duration-500 cursor-pointer overflow-hidden ${
                                            !notif.read 
                                            ? "bg-card/80 border-azul-primary/30 shadow-2xl shadow-azul-primary/10 ring-1 ring-azul-primary/5" 
                                            : "bg-card/40 border-border/50 hover:border-azul-primary/30"
                                        }`}
                                        onClick={() =>
                                            setNotifications((prev) =>
                                                prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
                                            )
                                        }
                                    >
                                        {/* Activity Icon & Avatar */}
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center text-3xl shadow-inner relative z-10 group-hover:scale-105 transition-transform duration-500">
                                                {notif.user.emoji || "👤"}
                                            </div>
                                            <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-xl ${cfg.bg} ${cfg.color} border-2 border-card flex items-center justify-center z-20 shadow-lg group-hover:rotate-12 transition-transform`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            {!notif.read && (
                                                <div className="absolute -top-1 -left-1 w-4 h-4 bg-azul-primary rounded-full border-4 border-card z-30 animate-pulse shadow-[0_0_15px_rgba(0,119,255,0.5)]" />
                                            )}
                                        </div>

                                        {/* Content Area */}
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-start justify-between gap-4">
                                                <div
                                                    className={`text-sm md:text-base leading-relaxed ${!notif.read ? "text-foreground font-medium" : "text-foreground/60"}`}
                                                    dangerouslySetInnerHTML={{ __html: notif.text }}
                                                />
                                                <ChevronRight className="w-5 h-5 text-foreground/10 group-hover:text-azul-primary/30 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                <Clock className="w-3.5 h-3.5 text-foreground/20" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">{notif.timeAgo}</span>
                                            </div>

                                            {/* Corporate Action Buttons */}
                                            {notif.hasActions && (
                                                <div className="flex items-center gap-3 pt-3">
                                                    <button className="px-6 py-3 bg-azul-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 hover:bg-azul-dark active:scale-95 transition-all shadow-lg shadow-azul-primary/20 flex items-center gap-2">
                                                        <Check className="w-3.5 h-3.5" />
                                                        Aceptar
                                                    </button>
                                                    <button className="px-6 py-3 bg-muted/50 text-foreground/40 hover:text-rojo hover:bg-rojo/5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-rojo/10">
                                                        Rechazar
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Ambient Glow */}
                                        {!notif.read && (
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-azul-primary/5 rounded-full blur-[60px] -mr-16 -mt-16 pointer-events-none" />
                                        )}
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Background Decorative Elements */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[-1] opacity-20">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-azul-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-celeste/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>
        </div>
    );
}
