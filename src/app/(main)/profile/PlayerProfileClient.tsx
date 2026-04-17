"use client";

import { useState, useMemo, useEffect } from "react";
import { updatePlayerProfile, updatePasswordAction } from "./actions";
import { logoutAction } from "@/app/login/actions";
import { useRouter } from "next/navigation";
import { acceptClubInviteAction, rejectClubInviteAction } from "../profiles/club/actions";
import { toast } from "sonner";
import {
    Edit2,
    MapPin,
    Calendar,
    Trophy,
    Activity,
    Settings,
    Award,
    UserCircle,
    LayoutDashboard,
    ShieldCheck,
    Target,
    Loader2,
    LogOut,
    User,
    Phone,
    Users,
    Zap,
    Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

import ClubProfileClient from "../profiles/club/ClubProfileClient";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { Image as ImageIcon } from "lucide-react";
import PlayerCard from "@/components/PlayerCard";

interface PlayerProfileClientProps {
    dbUser: any;
    profileData: {
        player: any;
        stats: any;
        history: any[];
    };
    isOwnProfile: boolean;
    clubProfile?: any;
    createdTournaments?: any[];
    members?: any[];
    availableCategories?: any[];
    rankingPosition?: number;
    categoryRanking?: number;
    pendingInvites?: any[];
    memberClub?: any;
}

export default function PlayerProfileClient({
    dbUser,
    profileData,
    isOwnProfile,
    clubProfile,
    createdTournaments,
    members,
    availableCategories,
    rankingPosition,
    categoryRanking,
    pendingInvites = [],
    memberClub
}: PlayerProfileClientProps) {
    const router = useRouter();
    const isSuperAdmin = dbUser.role === 'superadmin';
    const [activeTab, setActiveTab] = useState("tournaments");
    const [saving, setSaving] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [formData, setFormData] = useState({
        firstName: dbUser?.firstName || "",
        lastName: dbUser?.lastName || "",
        phone: dbUser?.phone || "",
        location: dbUser?.location || "",
        side: dbUser?.side || "drive",
        bio: dbUser?.bio || "",
        imageUrl: dbUser?.imageUrl || "",
        gender: dbUser?.gender || "masculino"
    });
    const [imagePreview, setImagePreview] = useState<string | null>(dbUser?.imageUrl || null);
    const [isUploading, setIsUploading] = useState(false);
    const [passwords, setPasswords] = useState({ currentPass: "", newPass: "", confirmPass: "" });
    const [isChangingPass, setIsChangingPass] = useState(false);

    const pageSize = 20;
    const history = profileData.history || [];
    const stats = profileData.stats || { pj: 0, pg: 0, pp: 0, wr: 0, trofeos: 0 };
    const player = profileData.player || dbUser;

    // Theme depends on formData gender for instant feedback if it's the own profile
    const currentGender = isOwnProfile ? formData.gender : player.gender;
    const isFemale = currentGender === 'femenino';

    const theme = {
        primary: isFemale ? 'rojo' : 'azul-primary',
        accent: isFemale ? 'rosa' : 'celeste',
        accentDark: isFemale ? 'rojo-dark' : 'azul-dark',
        glow: isFemale ? 'bg-rojo/5' : 'bg-azul-primary/5',
        glowAccent: isFemale ? 'bg-rosa/5' : 'bg-celeste/5',
        border: isFemale ? 'border-rosa/30' : 'border-celeste/30',
        shadow: isFemale ? 'shadow-rojo/20' : 'shadow-azul-primary/20',
        selection: isFemale ? 'selection:bg-rojo/30' : 'selection:bg-celeste/30',
        gradient: isFemale ? 'from-rojo/5 via-rosa/5 to-rojo/5' : 'from-azul-primary/5 via-celeste/5 to-azul-primary/5',
        cardBg: isFemale ? 'bg-[#0c0204]' : 'bg-slate-950'
    };

    const totalPages = Math.ceil(history.length / pageSize);
    const paginatedHistory = history.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updatePlayerProfile(formData);
            setActiveTab("stats");
            toast.success("Perfil actualizado");
            router.refresh();
        } catch (error) {
            toast.error("Error al actualizar");
        } finally {
            setSaving(false);
        }
    };

    const realCategory = player.category || "4TA";

    return (
        <div className={`min-h-screen bg-background text-foreground pb-20 font-sans ${theme.selection} relative overflow-hidden`}>
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full ${theme.glow} blur-[120px] animate-pulse`} />
                <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full ${theme.glowAccent} blur-[120px] animate-pulse`} style={{ animationDelay: '2s' }} />
            </div>

            <div className="max-w-7xl mx-auto px-4 pt-4 md:pt-8 flex flex-col gap-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col gap-6"
                >
                    {/* Club Invitations */}
                    {pendingInvites.length > 0 && isOwnProfile && (
                        <div className="flex flex-col gap-4">
                            {pendingInvites.map((invite: any) => (
                                <div key={invite.id} className={`bg-${theme.primary} rounded-[2rem] p-6 text-white shadow-xl ${theme.shadow} border ${theme.border} relative overflow-hidden group`}>
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <ShieldCheck className="h-24 w-24" />
                                    </div>
                                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
                                                <Trophy className="h-8 w-8 text-white" />
                                            </div>
                                            <div className="text-center md:text-left">
                                                <h3 className={`text-xl font-black uppercase italic tracking-tight underline decoration-${theme.accent} decoration-4 underline-offset-4`}>Invitación de Club</h3>
                                                <p className={`text-[10px] font-bold text-${theme.accent} uppercase tracking-widest mt-1`}>
                                                    El club <span className="text-white underline decoration-2 underline-offset-4">{invite.club?.name}</span> te ha invitado a unirte.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 w-full md:w-auto">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await rejectClubInviteAction(invite.id);
                                                        toast.success("Invitación rechazada");
                                                        router.refresh();
                                                    } catch (err) {
                                                        toast.error("Error al rechazar");
                                                    }
                                                }}
                                                className="flex-1 md:flex-none px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest transition-all text-white"
                                            >
                                                Rechazar
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await acceptClubInviteAction(invite.id);
                                                        toast.success("¡Te has unido al club!");
                                                        router.refresh();
                                                    } catch (err) {
                                                        toast.error("Error al aceptar");
                                                    }
                                                }}
                                                className={`flex-1 md:flex-none px-8 py-3 bg-white text-${theme.primary} hover:bg-${theme.accent} hover:text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg`}
                                            >
                                                Aceptar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Specialized Profiles (Club) */}
                    {dbUser?.role === "club" && (
                        <div className="col-span-full">
                            <ClubProfileClient
                                user={dbUser}
                                club={clubProfile}
                                members={members || []}
                                userTournaments={createdTournaments || []}
                            />
                        </div>
                    )}

                    {dbUser?.role !== "club" && (
                        <>
                            {/* Hero section */}
                            <div className="bg-card backdrop-blur-xl border border-border rounded-[2.5rem] overflow-hidden shadow-sm relative transition-colors">
                                <div className="h-32 md:h-48 bg-muted/30 relative overflow-hidden">
                                    <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`} />
                                    <div className="absolute inset-0 bg-grid-black/[0.02]" />
                                </div>

                                <div className="absolute top-4 right-4 z-10 flex gap-2">
                                    {isOwnProfile && dbUser?.role === "superadmin" && (
                                        <Link
                                            href="/admin"
                                            className={`flex items-center gap-1.5 bg-card/40 backdrop-blur-xl border border-border text-foreground px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all hover:bg-${theme.primary} hover:text-white active:scale-95 shadow-sm group/btn`}
                                        >
                                            <LayoutDashboard className={`h-3.5 w-3.5 text-${theme.accent} group-hover/btn:rotate-12 group-hover/btn:text-white transition-all`} /> Panel Admin
                                        </Link>
                                    )}
                                </div>

                                <div className="px-8 pb-10 -mt-12 md:-mt-16 relative flex flex-col md:flex-row items-center md:items-end gap-8 text-center md:text-left">
                                    <div className="relative group">
                                        <div className={`absolute -inset-1.5 bg-gradient-to-br from-${theme.primary} to-${theme.accent} rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity`} />
                                        <div className="w-24 h-24 md:w-40 md:h-40 rounded-full border-4 border-background overflow-hidden bg-card shadow-xl relative flex items-center justify-center">
                                            {dbUser.imageUrl ? (
                                                <Image src={dbUser.imageUrl} alt={dbUser.firstName || ""} fill className="object-cover group-hover:scale-105 transition-transform duration-500" priority unoptimized sizes="(max-width: 768px) 96px, 160px" />
                                            ) : (
                                                <User className="w-12 h-12 text-muted-foreground/60" />
                                            )}
                                        </div>
                                        {isOwnProfile && (
                                            <button
                                                onClick={() => setActiveTab("edit")}
                                                className={`absolute bottom-1 right-1 bg-${theme.primary} p-2 rounded-full border-4 border-background shadow-xl hover:bg-${theme.accent} transition-colors active:scale-90`}
                                            >
                                                <Edit2 className="h-4 w-4 text-white" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex-1 pt-2 pb-1">
                                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3 justify-center md:justify-start">
                                            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-foreground leading-none">
                                                {dbUser.firstName} <span className={`text-${theme.primary}`}>{dbUser.lastName}</span>
                                            </h1>
                                            <div className={`flex self-center md:self-auto px-4 py-1.5 bg-${theme.primary}/10 border border-${theme.primary}/20 rounded-full`}>
                                                <span className={`text-[10px] font-black uppercase tracking-widest text-${theme.primary}`}>
                                                    {dbUser.role === 'superadmin' ? 'SYSTEM ARCHITECT' : dbUser.role === 'club' ? 'CLUB MANAGER' : 'COMPETITOR'}
                                                </span>
                                            </div>
                                        </div>

                                        {memberClub && (
                                            <div className="flex justify-center md:justify-start items-center gap-2.5 mb-4 px-4 py-2 bg-muted rounded-2xl w-fit border border-border mx-auto md:mx-0">
                                                <div className="w-6 h-6 rounded-lg bg-card relative overflow-hidden border border-border">
                                                    {memberClub.logoUrl ? (
                                                        <Image src={memberClub.logoUrl} alt="" fill className="object-cover" sizes="24px" />
                                                    ) : (
                                                        <ShieldCheck className={`w-3 h-3 m-auto text-${theme.primary}`} />
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                                                    Unit: <span className={`text-${theme.primary}`}>{memberClub.name}</span>
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-[10px] font-black uppercase tracking-widest">
                                            <div className="flex items-center gap-2.5 bg-muted px-3 py-1.5 rounded-xl border border-border text-muted-foreground">
                                                <MapPin className={`h-3.5 w-3.5 text-${theme.accent}`} /> {dbUser?.location || "Sector Desconocido"}
                                            </div>
                                            <div className="flex items-center gap-2.5 bg-muted px-3 py-1.5 rounded-xl border border-border text-muted-foreground">
                                                <Calendar className={`h-3.5 w-3.5 text-${theme.primary}`} /> {dbUser.createdAt ? `Activo desde ${new Date(dbUser.createdAt).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}` : "Nuevos Datos"}
                                            </div>
                                            <div className="flex items-center gap-2.5 bg-muted px-3 py-1.5 rounded-xl border border-border text-muted-foreground">
                                                <Zap className={`h-3.5 w-3.5 text-${theme.accent}`} /> {stats.side === "drive" ? "Drive Specialist" : stats.side === "reves" ? "Backhand Elite" : "Standard Neutral"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center gap-2 bg-card p-2 rounded-[2rem] border border-border overflow-x-auto no-scrollbar shadow-sm transition-colors">
                                {[
                                    { id: "tournaments", label: "MI PERFIL", icon: Trophy },
                                    { id: "stats", label: "HISTORIAL", icon: Activity },
                                    ...(isOwnProfile ? [{ id: "edit", label: "EDITAR PERFIL", icon: Edit2 }] : []),
                                    { id: "account", label: "CONFIGURACIÓN", icon: Settings },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        className={`flex-1 min-w-[120px] px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative group/tab ${activeTab === tab.id ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        <div className="flex items-center justify-center gap-2.5 relative z-10 px-2">
                                            <tab.icon className={`h-4 w-4 transition-transform group-hover/tab:scale-110 ${activeTab === tab.id ? "text-white" : "text-muted-foreground"}`} />
                                            {tab.label}
                                        </div>
                                        {activeTab === tab.id && (
                                            <motion.div
                                                layoutId="activeTabProfile"
                                                className={`absolute inset-0 bg-${theme.primary} rounded-2xl shadow-lg ${theme.shadow}`}
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <AnimatePresence mode="wait">
                                {activeTab === "tournaments" && (
                                    <motion.div
                                        key="tab-tournaments"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="py-10"
                                    >
                                        <div className="flex flex-col lg:flex-row items-stretch justify-center gap-10 lg:gap-12 w-full max-w-7xl mx-auto px-4">

                                            {/* LEFT WING: PLAYER CARD */}
                                            <div className="relative group/card-wrapper flex justify-center lg:block">
                                                <div className={`absolute -inset-20 bg-${theme.accent}/10 blur-[120px] rounded-full opacity-0 group-hover/card-wrapper:opacity-100 transition-opacity pointer-events-none`} />
                                                <PlayerCard
                                                    player={{
                                                        firstName: player.firstName,
                                                        lastName: player.lastName,
                                                        imageUrl: player.imageUrl,
                                                        category: player.category,
                                                        side: player.side,
                                                        points: player.points,
                                                        clubName: player.clubName,
                                                        gender: currentGender
                                                    }}
                                                    stats={{
                                                        pj: stats.pj,
                                                        pg: stats.pg,
                                                        pp: stats.pp,
                                                        wr: stats.wr,
                                                        trofeos: stats.trofeos
                                                    }}
                                                />
                                            </div>

                                            {/* RIGHT WING: NEURO-DASHBOARD */}
                                            <div className="flex-1 flex flex-col gap-6 relative">


                                                {/* STATS CONTENT */}
                                                <div className="flex flex-col gap-10 px-2 lg:px-6 py-6">

                                                    {/* TIER 1: FOCUS STATS */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="relative group">
                                                            <div className={`absolute inset-0 bg-${theme.accent} blur-2xl opacity-0 group-hover:opacity-10 transition-opacity`} />
                                                            <div className={`bg-${theme.primary} p-8 rounded-[1.5rem] transform -skew-x-6 shadow-[0_15px_30px_rgba(30,64,175,0.2)] border-r-4 border-${theme.accent}`}>
                                                                <div className="flex items-center justify-between transform skew-x-6">
                                                                    <div className="space-y-1">
                                                                        <p className={`text-[10px] font-black uppercase text-${theme.accent}/70 tracking-[0.2em]`}>Global Rank</p>
                                                                        <p className="text-5xl font-black text-white italic">#{rankingPosition}</p>
                                                                    </div>
                                                                    <Zap size={40} className={`text-white fill-${theme.accent}/20`} />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="relative group">
                                                            <div className={`${isFemale ? `bg-${theme.accent}` : theme.cardBg} border border-border p-8 rounded-[1.5rem] transform -skew-x-6 hover:border-${theme.accent}/50 transition-all shadow-xl shadow-${theme.primary}/5`}>
                                                                <div className="flex items-center justify-between transform skew-x-6">
                                                                    <div className="space-y-1">
                                                                        <p className={`text-[10px] font-black uppercase ${isFemale ? 'text-slate-950/60' : 'text-muted-foreground'} tracking-[0.2em]`}>Puntos Totales</p>
                                                                        <p className={`text-5xl font-black ${isFemale ? 'text-slate-950' : 'text-white'} italic`}>{player.points}</p>
                                                                    </div>
                                                                    <Target size={40} className={isFemale ? 'text-slate-950/20' : `text-${theme.primary}/30`} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* TIER 2: PERFORMANCE LAYER */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-2">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <Activity size={14} className={`text-${theme.primary}`} />
                                                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Efectividad General</p>
                                                            </div>
                                                            <div className="flex items-end gap-3">
                                                                <p className={`text-4xl font-extrabold text-${theme.primary} italic tabular-nums leading-none`}>{stats.wr}%</p>
                                                                <div className="h-6 w-px bg-border mb-1" />
                                                                <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Win Rate</p>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${stats.wr}%` }}
                                                                    className={`h-full bg-${theme.primary} shadow-[0_0_10px_rgba(30,64,175,0.5)]`}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <Award size={14} className={`text-${theme.accent}`} />
                                                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Posición en Categoría</p>
                                                            </div>
                                                            <div className="flex items-end gap-3">
                                                                <p className="text-4xl font-extrabold text-foreground italic tabular-nums leading-none">#{categoryRanking}</p>
                                                                <div className="h-6 w-px bg-border mb-1" />
                                                                <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Tier: {player.category}</p>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                                                                <div className={`h-full bg-${theme.accent} w-[15%] shadow-[0_0_10px_rgba(14,165,233,0.3)]`} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* TIER 3: ACTIVITY FEEDBACK */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/40 p-6 rounded-[2rem] border border-border shadow-sm backdrop-blur-xl">
                                                        <div className="text-center">
                                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Jugados</p>
                                                            <p className="text-2xl font-black text-foreground italic">{stats.pj}</p>
                                                        </div>
                                                        <div className="text-center border-l border-border">
                                                            <p className={`text-[8px] font-black text-${theme.primary} uppercase tracking-widest mb-1`}>Ganados</p>
                                                            <p className={`text-2xl font-black text-${theme.primary} italic`}>{stats.pg}</p>
                                                        </div>
                                                        <div className="text-center border-l border-border">
                                                            <p className="text-[8px] font-black text-rojo uppercase tracking-widest mb-1">Perdidos</p>
                                                            <p className="text-2xl font-black text-rojo italic">{stats.pp}</p>
                                                        </div>
                                                        <div className="text-center border-l border-border">
                                                            <p className={`text-[8px] font-black text-${theme.accent} uppercase tracking-widest mb-1`}>Logros</p>
                                                            <p className={`text-2xl font-black text-${theme.accent} italic`}>{stats.trofeos}</p>
                                                        </div>
                                                    </div>

                                                    {/* RECENT FORM: GEOMETRIC GRID */}
                                                    <div className="flex flex-col gap-4">
                                                        <div className="flex items-center justify-between px-2">
                                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em]">Historial Reciente</p>
                                                            <p className={`text-[10px] font-black text-${theme.accent}/70 italic uppercase`}>ÚLTIMOS 5 ENCUENTROS</p>
                                                        </div>
                                                        <div className="flex items-center justify-between md:justify-start md:gap-4">
                                                            {history.slice(0, 5).reverse().map((m, i) => (
                                                                <div key={i} className="flex-1 md:flex-none">
                                                                    <div className={`relative h-12 w-full md:w-16 flex items-center justify-center rounded-xl transform -skew-x-12 border transition-all group/cell ${m.isWin === true ? `bg-${theme.primary} text-white border-${theme.accent}/40 shadow-lg ${theme.shadow}` :
                                                                        m.isWin === false ? "bg-rojo text-white border-rojo shadow-lg shadow-rojo/20" :
                                                                            "bg-muted border-border text-muted-foreground"
                                                                        }`}>
                                                                        <span className="text-xl font-black italic transform skew-x-12">{m.isWin === true ? "V" : m.isWin === false ? "D" : "-"}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {history.length === 0 && (
                                                                <div className="w-full bg-slate-50 border border-slate-100 py-4 rounded-xl text-center italic text-[10px] font-bold text-slate-300 uppercase tracking-widest">Iniciando historial...</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === "stats" && (
                                    <motion.div
                                        key="tab-stats-profile"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="bg-card border border-border rounded-[2.5rem] shadow-sm overflow-hidden transition-colors"
                                    >
                                        <div className="px-8 py-8 border-b border-border bg-muted/20 flex items-center justify-between">
                                            <div>
                                                <h2 className="text-xl font-black uppercase tracking-tighter italic text-foreground">Bitácora de Encuentros</h2>
                                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] text-${theme.accent} mt-1`}>Sincronización total de resultados</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="text-right">
                                                    <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Efectividad</div>
                                                    <div className={`text-xl font-black italic tabular-nums text-${theme.primary}`}>{stats.wr}%</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Total</div>
                                                    <div className={`text-xl font-black italic tabular-nums text-${theme.accent}`}>{history.length} Partidos</div>
                                                </div>
                                            </div>
                                        </div>

                                        {paginatedHistory.length > 0 ? (
                                            <div className="flex flex-col">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="border-b border-border bg-muted/30">
                                                                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Fecha</th>
                                                                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Evento / Tipo</th>
                                                                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Oponente/Sede</th>
                                                                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right">Resultado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border">
                                                            {paginatedHistory.map((m, i) => {
                                                                const date = new Date(m.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
                                                                return (
                                                                    <tr key={i} className="hover:bg-muted/30 transition-all group">
                                                                        <td className="px-8 py-6 text-xs font-black text-muted-foreground group-hover:text-foreground tabular-nums uppercase">{date}</td>
                                                                        <td className="px-8 py-6">
                                                                            <div className="flex flex-col">
                                                                                <span className={`text-sm font-black uppercase italic tracking-tighter mb-1 text-foreground group-hover:text-${theme.primary} transition-colors`}>{m.tournament}</span>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full w-fit bg-muted text-muted-foreground border border-border`}>{m.type}</span>
                                                                                    <span className="text-[8px] font-black uppercase text-muted-foreground/50 tracking-widest">{m.subType}</span>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-8 py-6 text-xs font-bold text-muted-foreground group-hover:text-foreground">{m.opponent}</td>
                                                                        <td className="px-8 py-6">
                                                                            <div className="flex items-center justify-end gap-5">
                                                                                <div className="flex flex-col items-end">
                                                                                    {m.isWin !== null ? (
                                                                                        <span className={`text-[10px] font-black italic ${m.isWin ? `text-${theme.primary}` : "text-rojo"}`}>
                                                                                            {m.isWin ? "VICTORIA" : "DERROTA"}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] font-black italic text-muted-foreground">FINALIZADO</span>
                                                                                    )}
                                                                                    <span className="text-xl font-black italic tracking-tighter tabular-nums text-foreground">{m.score}</span>
                                                                                </div>
                                                                                {m.isWin !== null && (
                                                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black ${m.isWin ? `bg-${theme.accent}/10 text-${theme.accent} border border-${theme.accent}/20` : "bg-rojo/10 text-rojo border border-rojo/20"}`}>
                                                                                        {m.isWin ? "G" : "P"}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Pagination Controls */}
                                                {totalPages > 1 && (
                                                    <div className="px-8 py-6 border-t border-border bg-muted/10 flex items-center justify-between">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                            Página {currentPage} de {totalPages} <span className="mx-2 opacity-20">|</span> {history.length} Resultados
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <button
                                                                disabled={currentPage === 1}
                                                                onClick={() => setCurrentPage(prev => prev - 1)}
                                                                className="px-4 py-2 rounded-xl bg-background border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted disabled:opacity-30 transition-all"
                                                            >
                                                                Anterior
                                                            </button>
                                                            <button
                                                                disabled={currentPage === totalPages}
                                                                onClick={() => setCurrentPage(prev => prev + 1)}
                                                                className="px-4 py-2 rounded-xl bg-background border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted disabled:opacity-30 transition-all"
                                                            >
                                                                Siguiente
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-20 text-center flex flex-col items-center gap-6 bg-muted/10">
                                                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border border-border">
                                                    <Activity className="h-8 w-8 text-muted-foreground/60" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-foreground text-sm font-black uppercase tracking-widest italic">Sin Actividad</p>
                                                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest italic opacity-50">No se detectaron registros en el sistema</p>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}


                                {activeTab === "account" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto w-full">
                                        <div className="bg-card border border-border p-8 rounded-[2rem] shadow-sm flex flex-col gap-6 h-fit">
                                            <div className="flex flex-col items-center gap-4 text-center">
                                                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                                                    <User className="h-10 w-10 text-muted-foreground/60" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black uppercase italic tracking-tight text-foreground">{dbUser.firstName} {dbUser.lastName}</h3>
                                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{dbUser.email}</p>
                                                </div>
                                            </div>

                                            <div className="h-px bg-border" />

                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border">
                                                    <div className="flex items-center gap-3">
                                                        <ShieldCheck className={`h-4 w-4 text-${theme.primary}`} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rol Actual</span>
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest text-${theme.primary}`}>{dbUser.role}</span>
                                                </div>

                                                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border">
                                                    <div className="flex items-center gap-3">
                                                        <UserCircle className={`h-4 w-4 text-${theme.accent}`} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">ID de Usuario</span>
                                                    </div>
                                                    <span className="text-[9px] font-mono text-muted-foreground/70">{dbUser.id.slice(0, 12)}...</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => logoutAction()}
                                                className="w-full flex items-center justify-center gap-2 bg-rojo/10 text-rojo hover:bg-rojo hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-rojo/20 active:scale-95"
                                            >
                                                <LogOut className="h-4 w-4" /> Cerrar Sesión
                                            </button>
                                        </div>

                                        {/* Change Password Section */}
                                        <div className="bg-card border border-border p-8 rounded-[2rem] shadow-sm flex flex-col gap-6">
                                            <div>
                                                <h3 className="text-xl font-black uppercase italic tracking-tight text-foreground flex items-center gap-2">
                                                    <Lock className={`h-5 w-5 text-${theme.primary}`} /> Seguridad
                                                </h3>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Actualiza tu contraseña de acceso</p>
                                            </div>

                                            <div className="flex flex-col gap-4">
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Contraseña Actual</label>
                                                    <input
                                                        type="password"
                                                        value={passwords.currentPass}
                                                        onChange={e => setPasswords({ ...passwords, currentPass: e.target.value })}
                                                        className={`w-full bg-muted/30 border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-${theme.primary} transition-all`}
                                                        placeholder="••••••••"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Nueva Contraseña</label>
                                                    <input
                                                        type="password"
                                                        value={passwords.newPass}
                                                        onChange={e => setPasswords({ ...passwords, newPass: e.target.value })}
                                                        className={`w-full bg-muted/30 border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-${theme.primary} transition-all`}
                                                        placeholder="Mínimo 6 caracteres"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Confirmar Nueva Contraseña</label>
                                                    <input
                                                        type="password"
                                                        value={passwords.confirmPass}
                                                        onChange={e => setPasswords({ ...passwords, confirmPass: e.target.value })}
                                                        className={`w-full bg-muted/30 border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-${theme.primary} transition-all`}
                                                        placeholder="Repetir la contraseña"
                                                    />
                                                </div>

                                                <button
                                                    onClick={async () => {
                                                        if (!passwords.currentPass || !passwords.newPass || !passwords.confirmPass) {
                                                            return toast.error("Completa todos los campos");
                                                        }
                                                        if (passwords.newPass !== passwords.confirmPass) {
                                                            return toast.error("Las contraseñas no coinciden");
                                                        }
                                                        if (passwords.newPass.length < 6) {
                                                            return toast.error("La contraseña debe tener al menos 6 caracteres");
                                                        }

                                                        setIsChangingPass(true);
                                                        try {
                                                            const res = await updatePasswordAction({
                                                                currentPass: passwords.currentPass,
                                                                newPass: passwords.newPass
                                                            });
                                                            if (res.success) {
                                                                toast.success("Contraseña actualizada. Por favor, reingresa.");
                                                                setPasswords({ currentPass: "", newPass: "", confirmPass: "" });
                                                                // Logout automatically so they have to use the new one
                                                                await logoutAction();
                                                            }
                                                        } catch (err: any) {
                                                            toast.error(err.message || "Error al actualizar contraseña");
                                                        } finally {
                                                            setIsChangingPass(false);
                                                        }
                                                    }}
                                                    disabled={isChangingPass}
                                                    className={`w-full bg-${theme.primary} hover:bg-${theme.accent} text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg ${theme.shadow}`}
                                                >
                                                    {isChangingPass ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                                                    Actualizar Contraseña
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "edit" && isOwnProfile && (
                                    <div className="bg-card border border-border rounded-[2rem] shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                                        <div className="px-8 py-6 border-b border-border bg-muted/30">
                                            <h2 className="text-[10px] font-black uppercase tracking-widest italic text-foreground">Editar Información del Perfil</h2>
                                        </div>

                                        <div className="p-8 border-b border-border">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground mb-4 block tracking-widest">Foto de Perfil</label>
                                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                                <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center relative overflow-hidden group shrink-0">
                                                    {imagePreview ? (
                                                        <Image src={imagePreview} alt="Profile preview" fill className="object-cover" unoptimized sizes="96px" />
                                                    ) : (
                                                        <User className="w-10 h-10 text-muted-foreground/20" />
                                                    )}
                                                    {isUploading && (
                                                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
                                                            <Loader2 className={`w-5 h-5 animate-spin text-${theme.primary}`} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-3 flex-1 w-full text-center sm:text-left">
                                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest max-w-xs leading-relaxed">Sube una foto cuadrada para que otros jugadores te reconozcan en los torneos.</p>
                                                    <label className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-${theme.primary} hover:bg-${theme.accent} text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer w-full sm:w-auto shadow-lg ${theme.shadow} active:scale-95`}>
                                                        <ImageIcon className="w-4 h-4" />
                                                        {isUploading ? "Subiendo..." : "Cambiar Foto"}
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            disabled={isUploading}
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;

                                                                setIsUploading(true);
                                                                try {
                                                                    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 600, useWebWorker: true };
                                                                    const compressedBlob = await imageCompression(file, options);
                                                                    const compressedFile = new File([compressedBlob], "profile.jpg", { type: "image/jpeg" });

                                                                    const uploadFormData = new FormData();
                                                                    uploadFormData.append("file", compressedFile);

                                                                    const res = await fetch("/api/upload", { method: "POST", body: uploadFormData });
                                                                    if (!res.ok) throw new Error("Error al subir");

                                                                    const data = await res.json();
                                                                    setFormData(prev => ({ ...prev, imageUrl: data.url }));
                                                                    setImagePreview(data.url);
                                                                    toast.success("Foto cargada correctamente");
                                                                } catch (err) {
                                                                    toast.error("Error al procesar la imagen");
                                                                } finally {
                                                                    setIsUploading(false);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <form onSubmit={handleSave} className="p-8 flex flex-col gap-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Nombre</label>
                                                    <input
                                                        type="text"
                                                        value={formData.firstName}
                                                        onChange={e => setFormData({ ...formData, firstName: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                                        className={`w-full bg-muted/30 border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-${theme.primary} shadow-sm transition-all`}
                                                        placeholder="Tu nombre"
                                                        autoCapitalize="words"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Apellido</label>
                                                    <input
                                                        type="text"
                                                        value={formData.lastName}
                                                        onChange={e => setFormData({ ...formData, lastName: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                                        className={`w-full bg-muted/30 border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-${theme.primary} shadow-sm transition-all`}
                                                        placeholder="Tu apellido"
                                                        autoCapitalize="words"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Ubicación</label>
                                                    <div className="relative">
                                                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <input
                                                            type="text"
                                                            value={formData.location}
                                                            onChange={e => setFormData({ ...formData, location: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                                            className={`w-full bg-muted/30 border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-sm font-bold outline-none focus:border-${theme.primary} shadow-sm transition-all`}
                                                            placeholder="Ciudad, País"
                                                            autoCapitalize="sentences"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">WhatsApp / Cel</label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <input
                                                            type="text"
                                                            value={formData.phone}
                                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                            className={`w-full bg-muted/30 border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-sm font-bold outline-none focus:border-${theme.primary} shadow-sm transition-all`}
                                                            placeholder="Ej: 1122334455"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Género</label>
                                                    <div className="relative">
                                                        <Users className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <select
                                                            value={formData.gender}
                                                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                                            className={`w-full bg-muted/30 border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-sm font-bold outline-none focus:border-${theme.primary} shadow-sm transition-all appearance-none`}
                                                        >
                                                            <option value="masculino">Masculino</option>
                                                            <option value="femenino">Femenino</option>
                                                            <option value="otro">Otro</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Lado de Juego</label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {["drive", "reves", "ambos"].map((s) => (
                                                        <button
                                                            key={s}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, side: s })}
                                                            className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.side === s ? `bg-${theme.primary} border-${theme.accent}/40 text-white shadow-lg ${theme.shadow}` : "bg-muted/30 border-border text-muted-foreground hover:border-celeste/50"}`}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Bio / Sobre mí</label>
                                                <textarea
                                                    value={formData.bio}
                                                    onChange={e => setFormData({ ...formData, bio: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                                    rows={4}
                                                    className={`w-full bg-muted/30 border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-${theme.primary} resize-none shadow-sm transition-all`}
                                                    placeholder="Cuenta algo sobre tu estilo de juego..."
                                                    autoCapitalize="sentences"
                                                />
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button
                                                    type="submit"
                                                    disabled={saving}
                                                    className={`w-full md:w-auto px-10 bg-${theme.primary} hover:bg-${theme.accent} text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl ${theme.shadow} disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95`}
                                                >
                                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit2 className="h-4 w-4" />}
                                                    {saving ? "Guardando..." : "Guardar Cambios"}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
