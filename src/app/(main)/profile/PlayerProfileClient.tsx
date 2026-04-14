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
    ChevronRight,
    Award,
    Medal,
    Star,
    Hand,
    UserCircle,
    X,
    LayoutDashboard,
    ShieldCheck,
    Send,
    Copy,
    Filter,
    MessageCircle,
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
    registrations: any[];
    matchHistory: any[];
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
    registrations,
    matchHistory,
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
    const [activeTab, setActiveTab] = useState(isSuperAdmin ? "account" : "tournaments");
    const [saving, setSaving] = useState(false);

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

    const myRegistrationIds = useMemo(() => {
        return new Set(registrations.map(r => r.id));
    }, [registrations]);

    const allMatchesHistory = useMemo(() => {
        return matchHistory.map(m => {
            const t1Id = m.match.team1Id;
            const t2Id = m.match.team2Id;
            const isT1 = myRegistrationIds.has(t1Id);
            const isT2 = myRegistrationIds.has(t2Id);

            let won = false;
            if (m.match.winnerId) {
                won = myRegistrationIds.has(m.match.winnerId);
            } else {
                const s1 = Number(m.match.score1) || 0;
                const s2 = Number(m.match.score2) || 0;
                if (isT1) won = s1 > s2;
                else if (isT2) won = s2 > s1;
            }

            const reg = registrations.find(r => r.id === t1Id || r.id === t2Id);

            return {
                ...m,
                type: m.match.round !== undefined ? (m.match.round === 0 ? "Final" : "Eliminatorias") : "Fase de Grupos",
                tournamentName: m.tournamentName,
                isParticipant: isT1 || isT2,
                isT1,
                opponents: isT1 ? m.match.team2Name : m.match.team1Name,
                won,
                category: reg?.category
            };
        })
            .filter(m => m.isParticipant)
            .sort((a, b) => new Date(b.match.createdAt).getTime() - new Date(a.match.createdAt).getTime());
    }, [matchHistory, myRegistrationIds, registrations]);

    const stats = useMemo(() => {
        const totalMatches = allMatchesHistory;
        const winsSize = totalMatches.filter(m => m.won).length;

        return {
            matches: totalMatches.length,
            wins: winsSize,
            losses: totalMatches.length - winsSize,
            draws: 0,
            winRate: totalMatches.length > 0 ? Math.round((winsSize / totalMatches.length) * 100) : 0,
            points: dbUser?.points || 0,
            category: dbUser?.category || "D",
            side: dbUser?.side || "drive"
        };
    }, [allMatchesHistory, dbUser]);

    const trophies = useMemo(() => {
        return allMatchesHistory.filter(m => m.category === dbUser.category && m.match.round === 0 && m.won);
    }, [allMatchesHistory, dbUser.category]);

    const realCategory = useMemo(() => {
        if (dbUser?.category) return dbUser.category;
        if (!availableCategories) return "D";
        const points = dbUser?.points || 0;
        const cat = availableCategories.find(c => points >= c.minPoints && points <= c.maxPoints);
        return cat ? cat.name : "D";
    }, [availableCategories, dbUser?.points, dbUser?.category]);

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 font-sans selection:bg-blue-500/30 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
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
                                <div key={invite.id} className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-900/10 border border-indigo-400/30 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <ShieldCheck className="h-24 w-24" />
                                    </div>
                                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
                                                <Trophy className="h-8 w-8 text-white" />
                                            </div>
                                            <div className="text-center md:text-left">
                                                <h3 className="text-xl font-black uppercase italic tracking-tight">Invitación de Club</h3>
                                                <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mt-1">
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
                                                className="flex-1 md:flex-none px-8 py-3 bg-white text-indigo-600 hover:bg-indigo-50 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
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
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-blue-500/5 to-emerald-500/5" />
                                    <div className="absolute inset-0 bg-grid-black/[0.02]" />
                                </div>

                                <div className="absolute top-4 right-4 z-10 flex gap-2">
                                    {isOwnProfile && dbUser?.role === "superadmin" && (
                                        <Link
                                            href="/admin"
                                            className="flex items-center gap-1.5 bg-background border border-border text-foreground px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all hover:bg-muted active:scale-95 shadow-sm group/btn"
                                        >
                                            <LayoutDashboard className="h-3.5 w-3.5 text-indigo-600 group-hover/btn:rotate-12 transition-transform" /> Panel Admin
                                        </Link>
                                    )}
                                </div>

                                <div className="px-8 pb-10 -mt-12 md:-mt-16 relative flex flex-col md:flex-row items-center md:items-end gap-8 text-center md:text-left">
                                    <div className="relative group">
                                        <div className="absolute -inset-1.5 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity" />
                                        <div className="w-24 h-24 md:w-40 md:h-40 rounded-full border-4 border-background overflow-hidden bg-muted shadow-xl relative flex items-center justify-center">
                                            {dbUser.imageUrl ? (
                                                <Image src={dbUser.imageUrl} alt={dbUser.firstName || ""} fill className="object-cover group-hover:scale-105 transition-transform duration-500" priority unoptimized sizes="(max-width: 768px) 96px, 160px" />
                                            ) : (
                                                <User className="w-12 h-12 text-muted-foreground/60" />
                                            )}
                                        </div>
                                        {isOwnProfile && (
                                            <button 
                                                onClick={() => setActiveTab("edit")}
                                                className="absolute bottom-1 right-1 bg-indigo-600 p-2 rounded-full border-4 border-background shadow-xl hover:bg-indigo-500 transition-colors active:scale-90"
                                            >
                                                <Edit2 className="h-4 w-4 text-white" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex-1 pt-2 pb-1">
                                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3 justify-center md:justify-start">
                                            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-foreground leading-none">
                                                {dbUser.firstName} {dbUser.lastName}
                                            </h1>
                                            <div className="flex self-center md:self-auto px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                                    {dbUser.role === 'superadmin' ? 'SYSTEM ARCHITECT' : dbUser.role === 'club' ? 'CLUB MANAGER' : 'COMPETITOR'}
                                                </span>
                                            </div>
                                        </div>

                                        {memberClub && (
                                            <div className="flex justify-center md:justify-start items-center gap-2.5 mb-4 px-4 py-2 bg-muted rounded-2xl w-fit border border-border mx-auto md:mx-0">
                                                <div className="w-6 h-6 rounded-lg bg-background relative overflow-hidden border border-border">
                                                    {memberClub.logoUrl ? (
                                                        <Image src={memberClub.logoUrl} alt="" fill className="object-cover" sizes="24px" />
                                                    ) : (
                                                        <ShieldCheck className="w-3 h-3 m-auto text-indigo-600" />
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                                                    Active Unit: <span className="text-indigo-600">{memberClub.name}</span>
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-[10px] font-black uppercase tracking-widest">
                                            <div className="flex items-center gap-2.5 bg-muted px-3 py-1.5 rounded-xl border border-border text-muted-foreground">
                                                <MapPin className="h-3.5 w-3.5 text-emerald-600" /> {dbUser?.location || "Sector Desconocido"}
                                            </div>
                                            <div className="flex items-center gap-2.5 bg-muted px-3 py-1.5 rounded-xl border border-border text-muted-foreground">
                                                <Calendar className="h-3.5 w-3.5 text-indigo-600" /> {dbUser.createdAt ? `Activo desde ${new Date(dbUser.createdAt).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}` : "Nuevos Datos"}
                                            </div>
                                            <div className="flex items-center gap-2.5 bg-muted px-3 py-1.5 rounded-xl border border-border text-muted-foreground">
                                                <Zap className="h-3.5 w-3.5 text-amber-500" /> {stats.side === "drive" ? "Drive Specialist" : stats.side === "reves" ? "Backhand Elite" : "Standard Neutral"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center gap-2 bg-card p-2 rounded-[2rem] border border-border overflow-x-auto no-scrollbar shadow-sm transition-colors">
                                {[
                                    ...(!isSuperAdmin ? [
                                        { id: "tournaments", label: "Player ID", icon: Trophy },
                                        { id: "stats", label: "Analytics", icon: Activity },
                                        { id: "trophies", label: "Hall of Fame", icon: Award },
                                    ] : []),
                                    ...(isOwnProfile ? [{ id: "edit", label: "Modify Data", icon: Edit2 }] : []),
                                    { id: "account", label: "System Config", icon: Settings },
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
                                                className="absolute inset-0 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20"
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
                                        className="flex flex-col items-center gap-8 py-10"
                                    >
                                        <div className="relative group/card-wrapper flex justify-center w-full">
                                            <div className="absolute -inset-10 bg-indigo-600/5 blur-[100px] rounded-full opacity-0 group-hover/card-wrapper:opacity-100 transition-opacity pointer-events-none" />
                                            <PlayerCard
                                                player={{
                                                    firstName: dbUser.firstName,
                                                    lastName: dbUser.lastName,
                                                    imageUrl: dbUser.imageUrl,
                                                    category: realCategory,
                                                    side: dbUser.side,
                                                    points: dbUser.points,
                                                    clubName: memberClub?.name
                                                }}
                                                stats={{
                                                    pj: stats.matches,
                                                    pg: stats.wins,
                                                    pp: stats.losses,
                                                    pe: stats.draws,
                                                    wr: stats.winRate,
                                                    trofeos: trophies.length
                                                }}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
                                            {[
                                                { label: "Analytic Score", value: dbUser.points, icon: Star, color: "text-amber-500" },
                                                { label: "Global Rank", value: `#${rankingPosition}`, icon: Award, color: "text-blue-600" },
                                                { label: "Category Rank", value: `#${categoryRanking}`, icon: Medal, color: "text-emerald-600" },
                                                { label: "Active Tier", value: realCategory, icon: ShieldCheck, color: "text-indigo-600" },
                                            ].map((item, i) => (
                                                <div key={i} className="bg-card border border-border p-4 rounded-2xl flex flex-col items-center gap-1 group/item hover:border-indigo-500/30 transition-colors shadow-sm">
                                                    <item.icon className={`h-4 w-4 ${item.color} mb-1 group-hover/item:scale-110 transition-transform`} />
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</span>
                                                    <span className="text-lg font-black italic tracking-tighter text-foreground">{item.value}</span>
                                                </div>
                                            ))}
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
                                                <h2 className="text-xl font-black uppercase tracking-tighter italic text-foreground">Performance Intelligence</h2>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mt-1">Full Match Log & Neural Stats</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="text-right">
                                                    <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Win Rate</div>
                                                    <div className="text-xl font-black italic tabular-nums text-emerald-600">{stats.winRate}%</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Combat Load</div>
                                                    <div className="text-xl font-black italic tabular-nums text-indigo-600">{stats.matches} Matches</div>
                                                </div>
                                            </div>
                                        </div>
                                        {allMatchesHistory.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b border-border bg-muted/30">
                                                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Timestamp</th>
                                                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Simulation Data</th>
                                                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Adversaries</th>
                                                            <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right">Simulation Result</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {allMatchesHistory.map((m, i) => {
                                                            const won = m.won;
                                                            const date = new Date(m.match.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                                                            return (
                                                                <tr key={i} className="hover:bg-muted/30 transition-all group">
                                                                    <td className="px-8 py-6 text-xs font-black text-muted-foreground group-hover:text-foreground tabular-nums uppercase">{date}</td>
                                                                    <td className="px-8 py-6">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-black uppercase italic tracking-tighter mb-1 text-foreground group-hover:text-indigo-600 transition-colors">{m.tournamentName}</span>
                                                                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full w-fit ${m.type === 'Final' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-muted text-muted-foreground border border-border'}`}>{m.type}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-6 text-xs font-bold text-muted-foreground group-hover:text-foreground">{m.opponents}</td>
                                                                    <td className="px-8 py-6">
                                                                        <div className="flex items-center justify-end gap-5">
                                                                            <div className="flex flex-col items-end">
                                                                                <span className={`text-[10px] font-black italic ${won ? "text-emerald-600" : "text-rose-600"}`}>
                                                                                    {won ? "SUCCESSFUL" : "DEFEATED"}
                                                                                </span>
                                                                                <span className="text-xl font-black italic tracking-tighter tabular-nums text-foreground">{m.match.score1}<span className="text-muted-foreground px-1.5">-</span>{m.match.score2}</span>
                                                                            </div>
                                                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black ${won ? "bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm" : "bg-rose-100 text-rose-700 border border-rose-200"}`}>
                                                                                {won ? "W" : "L"}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="p-20 text-center flex flex-col items-center gap-6 bg-muted/10">
                                                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border border-border">
                                                    <Activity className="h-8 w-8 text-muted-foreground/60" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-foreground text-sm font-black uppercase tracking-widest italic">Awaiting Telemetry</p>
                                                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">No match data detected in current records</p>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {activeTab === "trophies" && (
                                    <motion.div 
                                        key="tab-trophies-profile"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="space-y-8"
                                    >
                                        <div className="flex items-center justify-between px-4">
                                            <div>
                                                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">Hall of Fame</h2>
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mt-1">Verified Championship Wins</p>
                                            </div>
                                        </div>

                                        {trophies.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {trophies.map((t, idx) => (
                                                    <div key={idx} className="group bg-card border border-border p-8 rounded-[2.5rem] hover:border-amber-500/40 shadow-sm transition-all relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity rotate-12 group-hover:rotate-0 duration-700">
                                                            <Trophy className="h-32 w-32 text-amber-500" />
                                                        </div>
                                                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        
                                                        <div className="relative flex flex-col gap-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-200 shadow-sm">
                                                                    <Medal className="h-7 w-7 text-amber-600" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-black uppercase italic text-2xl tracking-tighter group-hover:text-amber-600 transition-colors text-foreground">{t.tournamentName}</h3>
                                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Simulation Victory Verified</span>
                                                                </div>
                                                            </div>

                                                            <div className="h-px bg-border/50" />

                                                            <div className="flex items-center justify-between">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Final Result</span>
                                                                    <span className="text-2xl font-black italic tabular-nums text-emerald-600">{t.match.score1} <span className="text-muted-foreground mx-1">-</span> {t.match.score2}</span>
                                                                </div>
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Date Logged</span>
                                                                    <span className="text-xs font-black uppercase italic tracking-tighter text-foreground">{new Date(t.match.createdAt).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</span>
                                                                </div>
                                                            </div>

                                                            <Link href={`/tournaments/${t.match.tournamentId}`} className="w-full bg-muted group-hover:bg-amber-500 transition-all py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest group-hover:text-white group-hover:shadow-lg group-hover:shadow-amber-500/20 border border-border group-hover:border-amber-400">
                                                                Review Details <ChevronRight className="h-4 w-4" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-card border border-border rounded-[2.5rem] p-24 text-center flex flex-col items-center gap-8 shadow-sm relative overflow-hidden group transition-colors">
                                                <div className="absolute inset-0 bg-indigo-500/5 blur-[120px]" />
                                                <div className="relative">
                                                    <Trophy className="h-24 w-24 text-muted/20 relative z-10" />
                                                    <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-full" />
                                                </div>
                                                <div className="flex flex-col gap-4 relative">
                                                    <h4 className="text-foreground text-lg font-black uppercase tracking-[0.2em] italic">Legacy: Empty</h4>
                                                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest max-w-xs mx-auto leading-relaxed">System scan reveals 0 championship titles. Initiate your first objective to populate this log.</p>
                                                    <Link href="/tournaments" className="mt-4 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95 text-center">Engage Competition</Link>
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
                                                        <ShieldCheck className="h-4 w-4 text-indigo-600" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rol Actual</span>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{dbUser.role}</span>
                                                </div>

                                                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border">
                                                    <div className="flex items-center gap-3">
                                                        <UserCircle className="h-4 w-4 text-indigo-600" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">ID de Usuario</span>
                                                    </div>
                                                    <span className="text-[9px] font-mono text-muted-foreground/70">{dbUser.id.slice(0, 12)}...</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => logoutAction()}
                                                className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-100 active:scale-95"
                                            >
                                                <LogOut className="h-4 w-4" /> Cerrar Sesión
                                            </button>
                                        </div>

                                        {/* Change Password Section */}
                                        <div className="bg-card border border-border p-8 rounded-[2rem] shadow-sm flex flex-col gap-6">
                                            <div>
                                                <h3 className="text-xl font-black uppercase italic tracking-tight text-foreground flex items-center gap-2">
                                                    <Lock className="h-5 w-5 text-indigo-600" /> Seguridad
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
                                                        className="w-full bg-muted/30 border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                                                        placeholder="••••••••"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Nueva Contraseña</label>
                                                    <input
                                                        type="password"
                                                        value={passwords.newPass}
                                                        onChange={e => setPasswords({ ...passwords, newPass: e.target.value })}
                                                        className="w-full bg-muted/30 border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                                                        placeholder="Mínimo 6 caracteres"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Confirmar Nueva Contraseña</label>
                                                    <input
                                                        type="password"
                                                        value={passwords.confirmPass}
                                                        onChange={e => setPasswords({ ...passwords, confirmPass: e.target.value })}
                                                        className="w-full bg-muted/30 border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                                                        placeholder="Repetí la contraseña"
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
                                                                toast.success("Contraseña actualizada. Por favor, volvé a ingresar.");
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
                                                    className="w-full bg-foreground text-background py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-foreground/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
                                                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-3 flex-1 w-full text-center sm:text-left">
                                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest max-w-xs leading-relaxed">Sube una foto cuadrada para que otros jugadores te reconozcan en los torneos.</p>
                                                    <label className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer w-full sm:w-auto shadow-lg shadow-indigo-600/20 active:scale-95">
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
                                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                                        className="w-full bg-muted/30 border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-sm transition-all"
                                                        placeholder="Tu nombre"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Apellido</label>
                                                    <input
                                                        type="text"
                                                        value={formData.lastName}
                                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                                        className="w-full bg-muted/30 border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-sm transition-all"
                                                        placeholder="Tu apellido"
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
                                                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                                                            className="w-full bg-muted/30 border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-sm transition-all"
                                                            placeholder="Ciudad, País"
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
                                                            className="w-full bg-muted/30 border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-sm transition-all"
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
                                                            className="w-full bg-muted/30 border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-sm transition-all appearance-none"
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
                                                            className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.side === s ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20" : "bg-muted/30 border-border text-muted-foreground hover:border-indigo-500/50"}`}
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
                                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                                    rows={4}
                                                    className="w-full bg-muted/30 border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 resize-none shadow-sm transition-all"
                                                    placeholder="Cuenta algo sobre tu estilo de juego..."
                                                />
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button
                                                    type="submit"
                                                    disabled={saving}
                                                    className="w-full md:w-auto px-10 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
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
