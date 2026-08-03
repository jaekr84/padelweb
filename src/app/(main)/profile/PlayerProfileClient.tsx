"use client";

import { useState, useMemo } from "react";
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
    Lock,
    Globe,
    Check,
    ChevronRight,
    TrendingUp,
    ShieldAlert
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
        advanced?: any;
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
    rankingPosition = 1,
    categoryRanking = 1,
    pendingInvites = [],
    memberClub
}: PlayerProfileClientProps) {
    const router = useRouter();
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

    const pageSize = 12; // Denser display
    const history = profileData.history || [];
    const stats = profileData.stats || { pj: 0, pg: 0, pp: 0, wr: 0, trofeos: 0 };
    const advanced = profileData.advanced || null;
    const player = profileData.player || dbUser;

    // "1h 23m" / "23m 4s" / "45s"
    const fmtDur = (ms: number | null | undefined) => {
        if (ms == null || ms < 0) return "—";
        const s = Math.round(ms / 1000);
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${sec}s`;
        return `${sec}s`;
    };
    // Always "Xh Ym" (total horas jugadas)
    const fmtHM = (ms: number | null | undefined) => {
        const total = (ms == null || ms < 0) ? 0 : ms;
        const min = Math.round(total / 60000);
        return `${Math.floor(min / 60)}h ${min % 60}m`;
    };

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
        cardBg: isFemale ? 'bg-[#0a0203]' : 'bg-[#02050f]'
    };

    // --- ADVANCED TACTICAL CALCULATIONS ---
    const winStreak = useMemo(() => {
        let currentStreak = 0;
        for (const match of history) {
            if (match.isWin === true) {
                currentStreak++;
            } else if (match.isWin === false) {
                break;
            }
        }
        return currentStreak;
    }, [history]);

    const tacticalStats = useMemo(() => {
        const data = {
            playoffs: { pj: 0, pg: 0, pp: 0, wr: 0 },
            groups: { pj: 0, pg: 0, pp: 0, wr: 0 },
            openCourts: { pj: 0, pg: 0, pp: 0, wr: 0 }
        };

        for (const match of history) {
            if (match.type === "Torneo") {
                if (match.subType === "Eliminatoria") {
                    data.playoffs.pj++;
                    if (match.isWin === true) data.playoffs.pg++;
                    else if (match.isWin === false) data.playoffs.pp++;
                } else {
                    data.groups.pj++;
                    if (match.isWin === true) data.groups.pg++;
                    else if (match.isWin === false) data.groups.pp++;
                }
            } else if (match.type === "Cancha Abierta") {
                data.openCourts.pj++;
                if (match.isWin === true) data.openCourts.pg++;
                else if (match.isWin === false) data.openCourts.pp++;
            }
        }

        data.playoffs.wr = data.playoffs.pj > 0 ? Math.round((data.playoffs.pg / data.playoffs.pj) * 100) : 0;
        data.groups.wr = data.groups.pj > 0 ? Math.round((data.groups.pg / data.groups.pj) * 100) : 0;
        data.openCourts.wr = data.openCourts.pj > 0 ? Math.round((data.openCourts.pg / data.openCourts.pj) * 100) : 0;

        return data;
    }, [history]);

    const totalPages = Math.ceil(history.length / pageSize);
    const paginatedHistory = history.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updatePlayerProfile(formData);
            setActiveTab("tournaments");
            toast.success("Perfil actualizado correctamente");
            router.refresh();
        } catch (error) {
            toast.error("Error al actualizar perfil");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`min-h-screen bg-grid-carbon text-foreground pb-24 font-sans ${theme.selection} relative overflow-hidden`}>

            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[40%] rounded-full ${theme.glow} blur-[130px] opacity-60 animate-pulse`} />
                <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] rounded-full ${theme.glowAccent} blur-[130px] opacity-50 animate-pulse`} style={{ animationDelay: '3.5s' }} />
            </div>

            <div className="max-w-7xl mx-auto px-4 pt-3 flex flex-col gap-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col gap-4"
                >
                    {/* Club Invitations */}
                    {pendingInvites.length > 0 && isOwnProfile && (
                        <div className="flex flex-col gap-3">
                            {pendingInvites.map((invite: any) => (
                                <div key={invite.id} className={`bg-background rounded-2xl p-4 text-foreground border border-${theme.accent}/40 relative overflow-hidden group shadow-2xl shadow-${theme.primary}/10`}>
                                    <div className={`absolute inset-0 bg-gradient-to-r from-${theme.primary}/20 via-transparent to-transparent opacity-80`} />
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <ShieldAlert className="h-16 w-16" />
                                    </div>
                                    <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-12 h-12 rounded-xl bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center shrink-0">
                                                <Trophy className={`h-6 w-6 text-${theme.accent}`} />
                                            </div>
                                            <div className="text-center sm:text-left">
                                                <h3 className="text-xs font-black uppercase italic tracking-[0.15em] text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                                                    Invitación del Club
                                                </h3>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                                    El club <span className={`text-${theme.accent} font-black`}>{invite.club?.name}</span> te ha invitado a unirte a sus filas.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto">
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
                                                className="flex-1 sm:flex-none px-5 py-2.5 bg-surface-raised hover:bg-surface-raised border border-hairline rounded-xl text-[8px] font-black uppercase tracking-widest transition-all text-foreground active:scale-95"
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
                                                className={`flex-1 sm:flex-none px-6 py-2.5 bg-${theme.primary} text-white hover:bg-${theme.accent} rounded-xl text-[8px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95`}
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
                            {/* PREMIUM HIGH-DENSITY COCKPIT HERO HEADER */}
                            <div className="bg-card/80 backdrop-blur-xl border border-hairline rounded-[1.5rem] overflow-hidden shadow-2xl relative transition-colors group/hero">
                                {/* Cyber lines on header background */}
                                <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff),linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff)] bg-[size:10px_10px]" />
                                
                                <div className="h-20 md:h-24 bg-surface relative overflow-hidden">
                                    <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-80`} />
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-carbon-900 to-transparent" />
                                    
                                    {/* Tech corners decoration */}
                                    <div className="absolute top-3 left-4 text-[7px] font-mono text-subtle select-none tracking-[0.2em]">
                                        SECURE_SYS_METRICS // STATUS_OK
                                    </div>
                                </div>

                                <div className="absolute top-3 right-3 z-10 flex gap-2">
                                    {isOwnProfile && dbUser?.role === "superadmin" && (
                                        <Link
                                            href="/admin"
                                            className={`flex items-center gap-1.5 bg-background/70 backdrop-blur-md border border-hairline hover:border-${theme.accent}/40 text-foreground px-3.5 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest cursor-pointer transition-all hover:bg-${theme.primary} hover:text-white active:scale-95 shadow-lg group/btn`}
                                        >
                                            <LayoutDashboard className={`h-3 w-3 text-${theme.accent} group-hover/btn:rotate-6 group-hover/btn:text-foreground transition-all`} /> Panel Admin
                                        </Link>
                                    )}
                                </div>

                                <div className="px-6 pb-5 -mt-8 md:-mt-10 relative flex flex-col md:flex-row items-center md:items-end gap-5 text-center md:text-left z-20">
                                    {/* Futuristic Framed Hexagonal Avatar */}
                                    <div className="relative group/avatar shrink-0">
                                        <div className={`absolute -inset-1.5 bg-gradient-to-br from-${theme.primary} to-${theme.accent} rounded-2xl blur-md opacity-25 group-hover/avatar:opacity-40 transition-opacity`} />
                                        <div 
                                            className={`w-[90px] h-[90px] md:w-[110px] md:h-[110px] bg-background p-[3px] border-r-2 border-b-2 border-${theme.primary}/40 shadow-2xl relative flex items-center justify-center overflow-hidden`}
                                            style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)' }}
                                        >
                                            <div 
                                                className="w-full h-full relative overflow-hidden bg-background flex items-center justify-center"
                                                style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)' }}
                                            >
                                                {dbUser.imageUrl ? (
                                                    <Image 
                                                        src={dbUser.imageUrl} 
                                                        alt={dbUser.firstName || ""} 
                                                        fill 
                                                        className="object-cover group-hover/avatar:scale-105 transition-transform duration-500" 
                                                        priority 
                                                        unoptimized 
                                                        sizes="110px" 
                                                    />
                                                ) : (
                                                    <User className="w-10 h-10 text-subtle" />
                                                )}
                                            </div>

                                            {/* Micro-online Dot indicator */}
                                            <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] border border-hairline-strong" />
                                        </div>
                                    </div>

                                    {/* Player Identity Block */}
                                    <div className="flex-1 pt-1 pb-0.5">
                                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 justify-center md:justify-start">
                                            <h1 className="heading-sport text-2xl md:text-3xl text-foreground leading-none">
                                                {dbUser.firstName} <span className={isFemale ? "text-rosa" : "text-celeste-light"}>{dbUser.lastName}</span>
                                            </h1>
                                            
                                            {/* Technical Class Badge */}
                                            <div className={`flex self-center md:self-auto px-3 py-1 bg-${theme.primary}/10 border border-${theme.primary}/20 rounded-lg transform -skew-x-6`}>
                                                <span className={`text-[7.5px] font-black uppercase tracking-[0.15em] text-${theme.primary} transform skew-x-6`}>
                                                    {dbUser.role === 'superadmin' ? 'SYSTEM ARCHITECT' : dbUser.role === 'club' ? 'CLUB DIRECTOR' : `CLASS-${dbUser.category || "4TA"} COMPETITOR`}
                                                </span>
                                            </div>
                                        </div>

                                        {memberClub && (
                                            <div className="flex justify-center md:justify-start items-center gap-2 mb-3.5 px-3 py-1 bg-surface-raised backdrop-blur-md rounded-xl w-fit border border-hairline mx-auto md:mx-0">
                                                <div className="w-4 h-4 rounded-md bg-background relative overflow-hidden border border-hairline">
                                                    {memberClub.logoUrl ? (
                                                        <Image src={memberClub.logoUrl} alt="" fill className="object-cover" sizes="16px" />
                                                    ) : (
                                                        <ShieldCheck className={`w-2.5 h-2.5 m-auto text-${theme.primary}`} />
                                                    )}
                                                </div>
                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground italic leading-none">
                                                    Unidad: <span className={`text-${theme.primary}`}>{memberClub.name}</span>
                                                </span>
                                            </div>
                                        )}

                                        {/* HUD Telemetry Details Pill Row */}
                                        <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2 text-[8px] font-black uppercase tracking-widest">
                                            <div className="flex items-center gap-2 bg-surface-raised px-2.5 py-1.5 rounded-lg border border-hairline text-muted-foreground hover:text-foreground hover:border-hairline transition-colors">
                                                <MapPin className={`h-3 w-3 text-${theme.accent}`} /> {dbUser?.location || "Sector General"}
                                            </div>
                                            <div className="flex items-center gap-2 bg-surface-raised px-2.5 py-1.5 rounded-lg border border-hairline text-muted-foreground hover:text-foreground hover:border-hairline transition-colors">
                                                <Calendar className={`h-3 w-3 text-${theme.primary}`} /> Registro: {dbUser.createdAt ? `${new Date(dbUser.createdAt).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}` : "Hoy"}
                                            </div>
                                            <div className="flex items-center gap-2 bg-surface-raised px-2.5 py-1.5 rounded-lg border border-hairline text-muted-foreground hover:text-foreground hover:border-hairline transition-colors">
                                                <Zap className={`h-3 w-3 text-${theme.accent}`} /> Perfil: {formData.side === "drive" ? "Drive" : formData.side === "reves" ? "Revés" : "Ambidextro"}
                                            </div>
                                            <div className="flex items-center gap-2 bg-volt/10 px-2.5 py-1.5 rounded-lg border border-volt/25 text-volt-ink">
                                                <Globe className="h-3 w-3 animate-spin" style={{ animationDuration: '8s' }} /> Racha: {winStreak} Victorias
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CYBERNETIC TAB NAVIGATION (ANGLED & HIGH DENSITY) */}
                            <div className="flex items-center gap-1.5 bg-background/70 backdrop-blur-md p-1 rounded-xl border border-hairline shadow-md">
                                {[
                                    { id: "tournaments", label: "Mi Panel", icon: Trophy },
                                    { id: "stats", label: "Historial Completo", icon: Activity },
                                    ...(isOwnProfile ? [{ id: "edit", label: "Editar Perfil", icon: Edit2 }] : []),
                                    { id: "account", label: "Configuración", icon: Settings },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        className={`flex-1 px-3 py-2 rounded-lg text-[8.5px] font-black uppercase tracking-widest transition-all relative group/tab h-9 ${activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setCurrentPage(1); // Reset page on tab shift
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-2 relative z-10 transform -skew-x-6">
                                            <tab.icon className={`h-3.5 w-3.5 transition-transform group-hover/tab:scale-110 ${activeTab === tab.id ? "text-foreground" : "text-muted-foreground"}`} />
                                            <span className="hidden sm:inline">{tab.label}</span>
                                            <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                                        </div>
                                        {activeTab === tab.id && (
                                            <motion.div
                                                layoutId="activeTabProfile"
                                                className={`absolute inset-0 bg-gradient-to-r from-${theme.primary} to-${theme.accent} rounded-lg shadow-lg ${theme.shadow}`}
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <AnimatePresence mode="wait">
                                {activeTab === "tournaments" && (
                                    <motion.div
                                        key="tab-tournaments"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.25 }}
                                        className="py-2 flex flex-col lg:flex-row items-stretch gap-6 w-full"
                                    >
                                        {/* LEFT COLUMN: THE GLOWING 3D PLAYER CARD CARD CONTAINER */}
                                        <div className="w-full lg:w-[350px] shrink-0 flex justify-center items-start relative">
                                            <div className="sticky top-4">
                                                <div className={`absolute -inset-10 bg-${theme.accent}/10 blur-[90px] rounded-full opacity-30 pointer-events-none`} />
                                                <PlayerCard
                                                    player={{
                                                        firstName: player.firstName,
                                                        lastName: player.lastName,
                                                        imageUrl: player.imageUrl,
                                                        category: player.category,
                                                        side: player.side,
                                                        points: player.points,
                                                        clubName: memberClub?.name || player.clubName || "Socio Independiente",
                                                        gender: currentGender
                                                    }}
                                                    stats={{
                                                        pj: stats.pj,
                                                        pg: stats.pg,
                                                        pp: stats.pp,
                                                        wr: stats.wr,
                                                        trofeos: stats.trofeos
                                                    }}
                                                    isCurrentUser={isOwnProfile}
                                                />
                                            </div>
                                        </div>

                                        {/* RIGHT COLUMN: HIGH DENSITY TACTICAL COCKPIT DASHBOARD */}
                                        <div className="flex-1 flex flex-col gap-4">
                                            
                                            {/* SUBGRID 1: DENSE KPI TELEMETRY GRID */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {/* Metric 1: Rank */}
                                                <div className="bg-card/80 border border-hairline rounded-xl p-4 relative overflow-hidden group hover:border-hairline-strong transition-colors">
                                                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-${theme.primary} to-transparent`} />
                                                    <div className="flex flex-col">
                                                        <span className="text-[7.5px] font-black uppercase text-subtle tracking-widest">Rango General</span>
                                                        <span className="text-scoreboard text-2xl text-foreground leading-none mt-1.5">#{rankingPosition}</span>
                                                        <span className={`text-[7px] font-bold text-${theme.accent} mt-1 uppercase`}>Clase {dbUser.category || "4TA"}</span>
                                                    </div>
                                                    <Zap size={18} className="absolute right-3.5 bottom-3 text-foreground/10 group-hover:text-azul-primary/20 group-hover:scale-110 transition-all duration-300" />
                                                </div>

                                                {/* Metric 2: Points */}
                                                <div className="bg-card/80 border border-hairline rounded-xl p-4 relative overflow-hidden group hover:border-hairline-strong transition-colors">
                                                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-${theme.primary} to-transparent`} />
                                                    <div className="flex flex-col">
                                                        <span className="text-[7.5px] font-black uppercase text-subtle tracking-widest">Puntos de Liga</span>
                                                        <span className="text-scoreboard text-2xl text-foreground leading-none mt-1.5">{player.points} PTS</span>
                                                        <span className="text-[7px] font-bold text-emerald-400 mt-1 uppercase flex items-center gap-0.5"><TrendingUp size={8} /> Activo</span>
                                                    </div>
                                                    <Target size={18} className="absolute right-3.5 bottom-3 text-foreground/10 group-hover:text-azul-primary/20 group-hover:scale-110 transition-all duration-300" />
                                                </div>

                                                {/* Metric 3: Win Rate */}
                                                <div className="bg-card/80 border border-hairline rounded-xl p-4 relative overflow-hidden group hover:border-hairline-strong transition-colors">
                                                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-${theme.accent} to-transparent`} />
                                                    <div className="flex flex-col">
                                                        <span className="text-[7.5px] font-black uppercase text-subtle tracking-widest">Rendimiento (Win Rate)</span>
                                                        <span className="text-scoreboard text-2xl text-volt-ink leading-none mt-1.5">{stats.wr}%</span>
                                                        <span className="text-[7px] font-bold text-muted-foreground mt-1 uppercase">{stats.pg} Victorial / {stats.pp} Derrotas</span>
                                                    </div>
                                                    <Activity size={18} className="absolute right-3.5 bottom-3 text-foreground/10 group-hover:text-azul-primary/20 group-hover:scale-110 transition-all duration-300" />
                                                </div>

                                                {/* Metric 4: Trophies */}
                                                <div className="bg-card/80 border border-hairline rounded-xl p-4 relative overflow-hidden group hover:border-hairline-strong transition-colors">
                                                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-${theme.accent} to-transparent`} />
                                                    <div className="flex flex-col">
                                                        <span className="text-[7.5px] font-black uppercase text-subtle tracking-widest">Logros Obtenidos</span>
                                                        <span className="text-scoreboard text-2xl text-foreground leading-none mt-1.5">{stats.trofeos} Trofeos</span>
                                                        <span className="text-[7px] font-bold text-amber-400 mt-1 uppercase">★ {stats.trofeos > 0 ? "Podio Registrado" : "Buscando podio"}</span>
                                                    </div>
                                                    <Trophy size={18} className="absolute right-3.5 bottom-3 text-foreground/10 group-hover:text-azul-primary/20 group-hover:scale-110 transition-all duration-300" />
                                                </div>
                                            </div>

                                            {/* SUBGRID 2: DETAILED MATCH BREAKDOWN METER TELEMETRY PANEL */}
                                            <div className="bg-card/80 border border-hairline rounded-xl p-5 relative overflow-hidden">
                                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-hairline">
                                                    <div className="flex items-center gap-1.5">
                                                        <Activity size={12} className={`text-${theme.accent}`} />
                                                        <span className="text-[8.5px] font-black uppercase tracking-widest text-muted-foreground">Desglose de Efectividad Tactica</span>
                                                    </div>
                                                    <span className="text-[7px] font-mono text-muted-foreground">REAL_TIME_COMPUTATION: OK</span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
                                                    {/* Meter 1: Playoffs */}
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest">
                                                            <span className="text-muted-foreground">Torneo - Playoffs (Eliminatoria)</span>
                                                            <span className={`text-${theme.primary}`}>{tacticalStats.playoffs.wr}%</span>
                                                        </div>
                                                        <div className="flex items-end gap-1.5 leading-none">
                                                            <span className="text-base font-black italic">{tacticalStats.playoffs.pg}G</span>
                                                            <span className="text-[9px] text-muted-foreground uppercase mb-0.5">/ {tacticalStats.playoffs.pj} partidos</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-surface-raised rounded-full overflow-hidden mt-1 relative">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${tacticalStats.playoffs.wr}%` }}
                                                                className={`h-full bg-gradient-to-r from-${theme.primary} to-${theme.accent} rounded-full`}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Meter 2: Groups */}
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest">
                                                            <span className="text-muted-foreground">Torneo - Fase de Grupos</span>
                                                            <span className={`text-${theme.accent}`}>{tacticalStats.groups.wr}%</span>
                                                        </div>
                                                        <div className="flex items-end gap-1.5 leading-none">
                                                            <span className="text-base font-black italic">{tacticalStats.groups.pg}G</span>
                                                            <span className="text-[9px] text-muted-foreground uppercase mb-0.5">/ {tacticalStats.groups.pj} partidos</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-surface-raised rounded-full overflow-hidden mt-1 relative">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${tacticalStats.groups.wr}%` }}
                                                                className={`h-full bg-gradient-to-r from-${theme.primary} to-${theme.accent} rounded-full`}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Meter 3: Open Courts */}
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest">
                                                            <span className="text-muted-foreground">Cancha Abierta</span>
                                                            <span className="text-foreground">{tacticalStats.openCourts.wr}%</span>
                                                        </div>
                                                        <div className="flex items-end gap-1.5 leading-none">
                                                            <span className="text-base font-black italic">{tacticalStats.openCourts.pg}G</span>
                                                            <span className="text-[9px] text-muted-foreground uppercase mb-0.5">/ {tacticalStats.openCourts.pj} partidos</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-surface-raised rounded-full overflow-hidden mt-1 relative">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${tacticalStats.openCourts.wr}%` }}
                                                                className={`h-full bg-gradient-to-r from-${theme.primary} to-${theme.accent} rounded-full`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SUBGRID 3: COMPACT HUD RECENT MATCH FEED */}
                                            <div className="bg-card/80 border border-hairline rounded-xl p-5 relative overflow-hidden flex-1 flex flex-col">
                                                <div className="flex justify-between items-center mb-3.5 pb-2 border-b border-hairline shrink-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <Trophy size={12} className={`text-${theme.primary}`} />
                                                        <span className="text-[8.5px] font-black uppercase tracking-widest text-muted-foreground">Desafíos Recientes (Últimos 5)</span>
                                                    </div>
                                                    <span className={`text-[8px] font-black uppercase italic text-${theme.accent}`}>Historial Rápido</span>
                                                </div>

                                                <div className="flex-1 flex flex-col justify-center gap-2">
                                                    {history.slice(0, 5).map((match, i) => {
                                                        const matchDate = match.date ? new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : "---";
                                                        return (
                                                            <div 
                                                                key={i} 
                                                                className="flex items-center justify-between p-2 rounded-lg bg-surface hover:bg-surface-raised border border-hairline hover:border-hairline transition-colors group"
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    {/* Victory/Defeat Indicator strip */}
                                                                    <div className={`w-1.5 h-6 rounded-full shrink-0 ${match.isWin === true ? `bg-${theme.primary} shadow-[0_0_8px_rgba(0,119,255,0.6)]` : match.isWin === false ? "bg-rojo shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "bg-surface-raised-foreground/30"}`} />
                                                                    
                                                                    <div className="min-w-0 flex flex-col">
                                                                        <span className="text-[10px] font-black uppercase truncate text-foreground group-hover:text-azul-primary transition-colors leading-normal">{match.tournament}</span>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <span className="text-[7.5px] font-black uppercase px-1 py-0.2 bg-background border border-hairline text-muted-foreground tracking-widest leading-none">{match.type}</span>
                                                                            <span className="text-[7.5px] font-medium text-muted-foreground leading-none truncate">{match.opponent}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3 shrink-0 ml-2">
                                                                    <div className="flex flex-col items-end">
                                                                        <span className={`text-[8.5px] font-black italic ${match.isWin === true ? `text-${theme.accent}` : match.isWin === false ? "text-rojo" : "text-muted-foreground"}`}>
                                                                            {match.isWin === true ? "VICTORIA" : match.isWin === false ? "DERROTA" : "COMPLETO"}
                                                                        </span>
                                                                        <span className="text-[11px] font-black italic tracking-tighter text-foreground leading-none tabular-nums mt-0.5">{match.score}</span>
                                                                    </div>
                                                                    
                                                                    <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground tabular-nums bg-background border border-hairline px-1.5 py-1.5 rounded-md leading-none">
                                                                        {matchDate}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {history.length === 0 && (
                                                        <div className="py-8 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground italic border border-dashed border-hairline rounded-xl">
                                                            <Trophy className="w-6 h-6 opacity-25" />
                                                            <span className="text-[8px] font-black uppercase tracking-widest">Sin partidos en el historial</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === "stats" && (
                                    <motion.div
                                        key="tab-stats-profile"
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        transition={{ duration: 0.25 }}
                                        className="bg-background border border-hairline rounded-2xl shadow-xl overflow-hidden"
                                    >
                                        {isOwnProfile && advanced && (
                                            <div className="p-5 space-y-5 border-b border-hairline">
                                                {/* Horas jugadas — total en todos los torneos */}
                                                <div className="flex items-center justify-between gap-3 rounded-2xl border border-celeste/25 bg-celeste/10 px-5 py-4">
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-celeste/80">Horas jugadas en torneos</div>
                                                        <div className="text-3xl md:text-4xl font-black italic tabular-nums text-celeste leading-none mt-1">{fmtHM(advanced.durations?.totalMs)}</div>
                                                    </div>
                                                    <Activity className="w-8 h-8 text-celeste/40" />
                                                </div>

                                                {/* KPIs de rendimiento */}
                                                <div>
                                                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Rendimiento</h3>
                                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                                        {[
                                                            { label: "Partidos", value: stats.pj, color: "text-foreground" },
                                                            { label: "Ganados", value: stats.pg, color: "text-emerald-500" },
                                                            { label: "Perdidos", value: stats.pp, color: "text-rojo" },
                                                            { label: "Efectividad", value: `${stats.wr}%`, color: "text-celeste" },
                                                            { label: "Torneos", value: advanced.torneosJugados, color: "text-foreground" },
                                                            { label: "Títulos", value: advanced.titulos, color: "text-amber-500" },
                                                        ].map((k, i) => (
                                                            <div key={i} className="bg-surface border border-hairline rounded-xl p-2.5 text-center">
                                                                <div className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">{k.label}</div>
                                                                <div className={`text-lg font-black italic tabular-nums leading-none mt-1 ${k.color}`}>{k.value}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-2 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                        <span>Games</span>
                                                        <span className="text-emerald-500 tabular-nums">{advanced.gamesFor}</span>
                                                        <span className="opacity-40">/</span>
                                                        <span className="text-rojo tabular-nums">{advanced.gamesAgainst}</span>
                                                        <span className="opacity-40">·</span>
                                                        <span className={`tabular-nums ${advanced.gamesDiff >= 0 ? "text-emerald-500" : "text-rojo"}`}>
                                                            {advanced.gamesDiff > 0 ? "+" : ""}{advanced.gamesDiff} dif
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Tiempos de partido */}
                                                {advanced.durations && (
                                                    <div>
                                                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Tiempos de partido</h3>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {[
                                                                { label: "Promedio", value: fmtDur(advanced.durations.avgMs) },
                                                                { label: "Más largo", value: fmtDur(advanced.durations.maxMs) },
                                                                { label: "Más corto", value: fmtDur(advanced.durations.minMs) },
                                                            ].map((k, i) => (
                                                                <div key={i} className="bg-surface border border-hairline rounded-xl p-2.5 text-center">
                                                                    <div className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">{k.label}</div>
                                                                    <div className="text-base font-black italic tabular-nums leading-none mt-1 text-celeste">{k.value}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <p className="text-[8px] text-subtle font-bold mt-1.5">Sobre {advanced.durations.count} partido{advanced.durations.count === 1 ? "" : "s"} con tiempo registrado.</p>
                                                    </div>
                                                )}

                                                {/* Mejores parejas */}
                                                {advanced.partners && advanced.partners.length > 0 && (
                                                    <div>
                                                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Mejores parejas</h3>
                                                        <div className="rounded-xl border border-hairline overflow-hidden">
                                                            <table className="w-full text-left">
                                                                <thead className="bg-surface text-[7.5px] font-black uppercase tracking-widest text-muted-foreground">
                                                                    <tr>
                                                                        <th className="px-3 py-2">Compañero</th>
                                                                        <th className="px-3 py-2 text-center">Jugados</th>
                                                                        <th className="px-3 py-2 text-center">Ganados</th>
                                                                        <th className="px-3 py-2 text-right">Efectividad</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-hairline">
                                                                    {advanced.partners.slice(0, 8).map((p: any, i: number) => (
                                                                        <tr key={i} className="hover:bg-surface">
                                                                            <td className="px-3 py-2 text-[11px] font-black uppercase italic truncate">{p.name}</td>
                                                                            <td className="px-3 py-2 text-center text-[11px] font-bold tabular-nums">{p.played}</td>
                                                                            <td className="px-3 py-2 text-center text-[11px] font-bold tabular-nums text-emerald-500">{p.won}</td>
                                                                            <td className="px-3 py-2 text-right text-[11px] font-black tabular-nums text-celeste">{p.wr}%</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="px-5 py-4 border-b border-hairline bg-surface flex items-center justify-between">
                                            <div>
                                                <h2 className="text-sm font-black uppercase tracking-tighter italic text-foreground leading-none">Bitácora Oficial de Encuentros</h2>
                                                <p className={`text-[8px] font-black uppercase tracking-[0.15em] text-${theme.accent} mt-1`}>Desglose detallado de partidos en la base de datos</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="text-right">
                                                    <div className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">Efectividad</div>
                                                    <div className={`text-base font-black italic tabular-nums text-${theme.primary} leading-none mt-0.5`}>{stats.wr}%</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">Total Juegos</div>
                                                    <div className={`text-base font-black italic tabular-nums text-${theme.accent} leading-none mt-0.5`}>{history.length} P</div>
                                                </div>
                                            </div>
                                        </div>

                                        {paginatedHistory.length > 0 ? (
                                            <div className="flex flex-col">
                                                <div className="overflow-x-auto no-scrollbar">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="border-b border-hairline bg-surface">
                                                                <th className="px-5 py-3 text-[7.5px] font-black uppercase tracking-widest text-muted-foreground">Fecha</th>
                                                                <th className="px-5 py-3 text-[7.5px] font-black uppercase tracking-widest text-muted-foreground">Torneo / Evento</th>
                                                                <th className="px-5 py-3 text-[7.5px] font-black uppercase tracking-widest text-muted-foreground">Modalidad</th>
                                                                <th className="px-5 py-3 text-[7.5px] font-black uppercase tracking-widest text-muted-foreground">Encuentro / Adversarios</th>
                                                                <th className="px-5 py-3 text-[7.5px] font-black uppercase tracking-widest text-muted-foreground text-right">Marcador / Resultado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-hairline">
                                                            {paginatedHistory.map((m, i) => {
                                                                const matchDate = m.date ? new Date(m.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : "TBD";
                                                                return (
                                                                    <tr key={i} className="hover:bg-surface transition-all group">
                                                                        <td className="px-5 py-3.5 text-[9px] font-black text-muted-foreground group-hover:text-foreground tabular-nums uppercase">{matchDate}</td>
                                                                        <td className="px-5 py-3.5">
                                                                            <span className={`text-xs font-black uppercase italic tracking-tighter text-foreground group-hover:text-${theme.accent} transition-colors`}>{m.tournament}</span>
                                                                        </td>
                                                                        <td className="px-5 py-3.5">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-surface-raised border border-hairline text-muted-foreground`}>{m.type}</span>
                                                                                <span className="text-[7px] font-black uppercase text-subtle tracking-widest">{m.subType}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-5 py-3.5 text-[9.5px] font-bold text-muted-foreground group-hover:text-foreground">{m.opponent}</td>
                                                                        <td className="px-5 py-3.5">
                                                                            <div className="flex items-center justify-end gap-3">
                                                                                <div className="flex flex-col items-end">
                                                                                    {m.isWin !== null ? (
                                                                                        <span className={`text-[8px] font-black italic ${m.isWin ? `text-${theme.primary}` : "text-rojo"}`}>
                                                                                            {m.isWin ? "VICTORIA" : "DERROTA"}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-[8px] font-black italic text-muted-foreground">COMPARTIDO</span>
                                                                                    )}
                                                                                    <span className="text-[13px] font-black italic tracking-tighter tabular-nums text-foreground leading-none mt-0.5">{m.score}</span>
                                                                                </div>
                                                                                {m.isWin !== null && (
                                                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${m.isWin ? `bg-${theme.accent}/10 text-${theme.accent} border border-${theme.accent}/20` : "bg-rojo/10 text-rojo border border-rojo/20"}`}>
                                                                                        {m.isWin ? "V" : "D"}
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

                                                {/* Compact Pagination Controls */}
                                                {totalPages > 1 && (
                                                    <div className="px-5 py-3 border-t border-hairline bg-surface flex items-center justify-between shrink-0">
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                                                            Página {currentPage} / {totalPages} <span className="mx-2 opacity-25">|</span> {history.length} Partidos
                                                        </p>
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                disabled={currentPage === 1}
                                                                onClick={() => {
                                                                    setCurrentPage(prev => prev - 1);
                                                                    window.scrollTo({ top: 300, behavior: 'smooth' });
                                                                }}
                                                                className="px-3.5 py-2 rounded-lg bg-surface border border-hairline text-[8px] font-black uppercase tracking-widest hover:bg-surface-raised disabled:opacity-30 transition-all active:scale-95 flex items-center gap-1"
                                                            >
                                                                Anterior
                                                            </button>
                                                            <button
                                                                disabled={currentPage === totalPages}
                                                                onClick={() => {
                                                                    setCurrentPage(prev => prev + 1);
                                                                    window.scrollTo({ top: 300, behavior: 'smooth' });
                                                                }}
                                                                className="px-3.5 py-2 rounded-lg bg-surface border border-hairline text-[8px] font-black uppercase tracking-widest hover:bg-surface-raised disabled:opacity-30 transition-all active:scale-95 flex items-center gap-1"
                                                            >
                                                                Siguiente <ChevronRight size={10} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-20 text-center flex flex-col items-center gap-4 bg-surface">
                                                <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center border border-hairline">
                                                    <Activity className="h-6 w-6 text-subtle" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-foreground text-xs font-black uppercase tracking-widest italic">Sin Actividad Confirmada</p>
                                                    <p className="text-muted-foreground text-[8px] font-black uppercase tracking-widest italic opacity-50">No hay partidos cargados en la base de datos</p>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {activeTab === "account" && (
                                    <motion.div
                                        key="tab-account"
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        transition={{ duration: 0.25 }}
                                        className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto w-full py-2"
                                    >
                                        {/* Status & Session Card */}
                                        <div className="bg-background border border-hairline p-5 rounded-xl shadow-xl flex flex-col gap-4 h-fit relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-rojo to-transparent" />
                                            <div className="flex flex-col items-center gap-3 text-center">
                                                <div className="w-14 h-14 rounded-full bg-surface-raised flex items-center justify-center border border-hairline relative">
                                                    <User className="h-6 w-6 text-subtle" />
                                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-carbon-900" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black uppercase italic tracking-tight text-foreground leading-none">{dbUser.firstName} {dbUser.lastName}</h3>
                                                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-1.5">{dbUser.email}</p>
                                                </div>
                                            </div>

                                            <div className="h-px bg-surface-raised" />

                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-hairline">
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheck className={`h-4.5 w-4.5 text-${theme.primary}`} />
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Acceso de Seguridad</span>
                                                    </div>
                                                    <span className={`text-[8.5px] font-black uppercase tracking-widest text-${theme.primary}`}>{dbUser.role}</span>
                                                </div>

                                                <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-hairline">
                                                    <div className="flex items-center gap-2">
                                                        <UserCircle className={`h-4.5 w-4.5 text-${theme.accent}`} />
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">ID de Jugador</span>
                                                    </div>
                                                    <span className="text-[7.5px] font-mono text-subtle">{dbUser.id}</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => logoutAction()}
                                                className="w-full flex items-center justify-center gap-2 bg-rojo/10 text-rojo hover:bg-rojo hover:text-white py-3.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border border-rojo/20 active:scale-95"
                                            >
                                                <LogOut className="h-3.5 w-3.5" /> Cerrar Sesión Activa
                                            </button>
                                        </div>

                                        {/* Security & Password panel */}
                                        <div className="bg-background border border-hairline p-5 rounded-xl shadow-xl flex flex-col gap-4 relative overflow-hidden">
                                            <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-${theme.primary} to-transparent`} />
                                            <div>
                                                <h3 className="text-sm font-black uppercase italic tracking-tight text-foreground flex items-center gap-2 leading-none">
                                                    <Lock className={`h-4 w-4 text-${theme.primary}`} /> Seguridad del Panel
                                                </h3>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">Actualizar credenciales de inicio</p>
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[8px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Contraseña Actual</label>
                                                    <input
                                                        type="password"
                                                        value={passwords.currentPass}
                                                        onChange={e => setPasswords({ ...passwords, currentPass: e.target.value })}
                                                        className={`w-full h-10 bg-surface border border-hairline rounded-xl px-4 text-foreground text-xs font-bold outline-none focus:border-${theme.primary} transition-all`}
                                                        placeholder="••••••••"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[8px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Nueva Contraseña</label>
                                                    <input
                                                        type="password"
                                                        value={passwords.newPass}
                                                        onChange={e => setPasswords({ ...passwords, newPass: e.target.value })}
                                                        className={`w-full h-10 bg-surface border border-hairline rounded-xl px-4 text-foreground text-xs font-bold outline-none focus:border-${theme.primary} transition-all`}
                                                        placeholder="Mínimo 6 caracteres"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[8px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Confirmar Contraseña</label>
                                                    <input
                                                        type="password"
                                                        value={passwords.confirmPass}
                                                        onChange={e => setPasswords({ ...passwords, confirmPass: e.target.value })}
                                                        className={`w-full h-10 bg-surface border border-hairline rounded-xl px-4 text-foreground text-xs font-bold outline-none focus:border-${theme.primary} transition-all`}
                                                        placeholder="Mínimo 6 caracteres"
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
                                                                toast.success("Contraseña actualizada con éxito");
                                                                setPasswords({ currentPass: "", newPass: "", confirmPass: "" });
                                                                await logoutAction();
                                                            }
                                                        } catch (err: any) {
                                                            toast.error(err.message || "Error al actualizar contraseña");
                                                        } finally {
                                                            setIsChangingPass(false);
                                                        }
                                                    }}
                                                    disabled={isChangingPass}
                                                    className={`w-full bg-${theme.primary} hover:bg-${theme.accent} text-white h-11 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg ${theme.shadow}`}
                                                >
                                                    {isChangingPass ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                                                    Confirmar Contraseña
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === "edit" && isOwnProfile && (
                                    <motion.div
                                        key="tab-edit"
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        transition={{ duration: 0.25 }}
                                        className="bg-background border border-hairline rounded-xl shadow-xl overflow-hidden max-w-3xl mx-auto w-full py-2"
                                    >
                                        <div className="px-6 py-4 border-b border-hairline bg-surface">
                                            <h2 className="text-[8.5px] font-black uppercase tracking-widest italic text-foreground leading-none">Editar Detalles de Cuenta</h2>
                                        </div>

                                        <div className="p-6 border-b border-hairline">
                                            <label className="text-[8px] font-black uppercase text-muted-foreground mb-3 block tracking-widest">Avatar del Jugador</label>
                                            <div className="flex flex-col sm:flex-row items-center gap-5">
                                                <div 
                                                    className="w-20 h-20 bg-background p-[2px] border border-dashed border-hairline flex items-center justify-center relative overflow-hidden group shrink-0"
                                                    style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)' }}
                                                >
                                                    <div 
                                                        className="w-full h-full relative overflow-hidden bg-background flex items-center justify-center"
                                                        style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)' }}
                                                    >
                                                        {imagePreview ? (
                                                            <Image src={imagePreview} alt="Preview" fill className="object-cover" unoptimized sizes="80px" />
                                                        ) : (
                                                            <User className="w-6 h-6 text-subtle" />
                                                        )}
                                                    </div>
                                                    {isUploading && (
                                                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
                                                            <Loader2 className={`w-4 h-4 animate-spin text-${theme.primary}`} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-2 flex-1 w-full text-center sm:text-left">
                                                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest leading-relaxed max-w-xs">Formatos aceptados: JPG, PNG. La imagen debe ser cuadrada.</p>
                                                    <label className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-${theme.primary} hover:bg-${theme.accent} text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer w-full sm:w-auto shadow-lg ${theme.shadow} active:scale-95`}>
                                                        <ImageIcon className="w-3.5 h-3.5" />
                                                        {isUploading ? "Cargando..." : "Subir Foto"}
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
                                                                    const options = { maxSizeMB: 0.4, maxWidthOrHeight: 500, useWebWorker: true };
                                                                    const compressedBlob = await imageCompression(file, options);
                                                                    const compressedFile = new File([compressedBlob], "profile.jpg", { type: "image/jpeg" });

                                                                    const uploadFormData = new FormData();
                                                                    uploadFormData.append("file", compressedFile);

                                                                    const res = await fetch("/api/upload", { method: "POST", body: uploadFormData });
                                                                    if (!res.ok) throw new Error("Error upload");

                                                                    const data = await res.json();
                                                                    setFormData(prev => ({ ...prev, imageUrl: data.url }));
                                                                    setImagePreview(data.url);
                                                                    toast.success("Foto cargada correctamente");
                                                                } catch (err) {
                                                                    toast.error("Error al subir imagen");
                                                                } finally {
                                                                    setIsUploading(false);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[8px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Nombre</label>
                                                    <input
                                                        type="text"
                                                        value={formData.firstName}
                                                        onChange={e => setFormData({ ...formData, firstName: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                                        className={`w-full h-10 bg-surface border border-hairline rounded-xl px-4 text-foreground text-xs font-bold outline-none focus:border-${theme.primary} transition-all`}
                                                        placeholder="Ingresa tu nombre"
                                                        autoCapitalize="words"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[8px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Apellido</label>
                                                    <input
                                                        type="text"
                                                        value={formData.lastName}
                                                        onChange={e => setFormData({ ...formData, lastName: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                                        className={`w-full h-10 bg-surface border border-hairline rounded-xl px-4 text-foreground text-xs font-bold outline-none focus:border-${theme.primary} transition-all`}
                                                        placeholder="Ingresa tu apellido"
                                                        autoCapitalize="words"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[8px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Localidad</label>
                                                    <div className="relative">
                                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle" />
                                                        <input
                                                            type="text"
                                                            value={formData.location}
                                                            onChange={e => setFormData({ ...formData, location: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                                            className={`w-full h-10 bg-surface border border-hairline rounded-xl pl-10 pr-4 text-foreground text-xs font-bold outline-none focus:border-${theme.primary} transition-all`}
                                                            placeholder="Ciudad, Provincia"
                                                            autoCapitalize="sentences"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[8px] font-black uppercase text-muted-foreground ml-1 tracking-widest">WhatsApp</label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle" />
                                                        <input
                                                            type="text"
                                                            value={formData.phone}
                                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                            className={`w-full h-10 bg-surface border border-hairline rounded-xl pl-10 pr-4 text-foreground text-xs font-bold outline-none focus:border-${theme.primary} transition-all`}
                                                            placeholder="Ej: 1122334455"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[8px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Género</label>
                                                    <div className="relative">
                                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle" />
                                                        <select
                                                            value={formData.gender}
                                                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                                            className={`w-full h-10 bg-surface border border-hairline rounded-xl pl-10 pr-4 text-foreground text-xs font-bold outline-none focus:border-${theme.primary} transition-all appearance-none`}
                                                        >
                                                            <option value="masculino">Masculino</option>
                                                            <option value="femenino">Femenino</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[8px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Posición Preferida de Juego</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {["drive", "reves", "ambos"].map((s) => (
                                                        <button
                                                            key={s}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, side: s })}
                                                            className={`h-10 rounded-xl text-[8.5px] font-black uppercase tracking-widest border transition-all ${formData.side === s ? `bg-${theme.primary} border-${theme.accent}/30 text-white shadow-lg ${theme.shadow}` : "bg-surface border-hairline text-muted-foreground hover:border-celeste/40"}`}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[8px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Biografía / Estilo de Juego</label>
                                                <textarea
                                                    value={formData.bio}
                                                    onChange={e => setFormData({ ...formData, bio: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                                    rows={3}
                                                    className={`w-full bg-surface border border-hairline rounded-xl py-3 px-4 text-foreground text-xs font-bold outline-none focus:border-${theme.primary} resize-none transition-all`}
                                                    placeholder="Contá detalles de tu pala, tu racha y cómo jugás..."
                                                    autoCapitalize="sentences"
                                                />
                                            </div>

                                            <div className="flex justify-end pt-2">
                                                <button
                                                    type="submit"
                                                    disabled={saving}
                                                    className={`w-full md:w-auto h-11 px-8 bg-${theme.primary} hover:bg-${theme.accent} text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition-all shadow-lg ${theme.shadow} disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95`}
                                                >
                                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                    {saving ? "Procesando..." : "Guardar Cambios"}
                                                </button>
                                            </div>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
