"use client";

import { useState, useMemo } from "react";
import { updatePlayerProfile } from "./actions";
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
    Users
} from "lucide-react";
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



    const myName = dbUser?.firstName || "";

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

    // Estadísticas filtradas por la categoría actual para simular el reseteo
    const stats = useMemo(() => {
        const currentCategoryMatches = allMatchesHistory.filter(m => m.category === dbUser.category);
        const winsSize = currentCategoryMatches.filter(m => m.won).length;

        return {
            matches: currentCategoryMatches.length,
            wins: winsSize,
            losses: currentCategoryMatches.length - winsSize,
            draws: 0,
            winRate: currentCategoryMatches.length > 0 ? Math.round((winsSize / currentCategoryMatches.length) * 100) : 0,
            points: dbUser?.points || 0,
            category: dbUser?.category || "D",
            side: dbUser?.side || "drive"
        };
    }, [allMatchesHistory, dbUser]);

    const trophies = useMemo(() => {
        // Mostrar solo trofeos de la categoría actual en la tarjeta principal
        return allMatchesHistory.filter(m => m.category === dbUser.category && m.match.round === 0 && m.won);
    }, [allMatchesHistory, dbUser.category]);

    const realCategory = useMemo(() => {
        // Source of truth is the category assigned in the DB
        if (dbUser?.category) return dbUser.category;

        // Fallback to calculation if DB category is empty
        if (!availableCategories) return "D";
        const points = dbUser?.points || 0;
        const cat = availableCategories.find(c => points >= c.minPoints && points <= c.maxPoints);
        return cat ? cat.name : "D";
    }, [availableCategories, dbUser?.points, dbUser?.category]);

    const activeTournaments = registrations.filter(r =>
        r.tournament.status === "en_curso" ||
        r.tournament.status === "en_eliminatorias" ||
        r.tournament.status === "published"
    );


    return (

        <div className="min-h-screen bg-background text-foreground pb-20 font-sans selection:bg-indigo-500/30">
            <div className="max-w-4xl mx-auto px-4 pt-4 md:pt-8 flex flex-col gap-6 animate-in fade-in duration-700">

                {/* ââ Specialized Profiles (Club / Centro) â                    {/* ââ Specialized Profiles (Club) ââ */}
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
                        {/* Club Invitations */}
                        {pendingInvites.length > 0 && isOwnProfile && (
                            <div className="flex flex-col gap-4">
                                {pendingInvites.map((invite: any) => (
                                    <div key={invite.id} className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-900/20 border border-indigo-400/30 relative overflow-hidden group">
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
                                                    className="flex-1 md:flex-none px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
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

                        {/* ââ Hero section (Unificada) ââ */}
                        <div className="bg-card backdrop-blur-3xl border border-border rounded-[2rem] overflow-hidden shadow-2xl relative">
                            <div className="h-32 md:h-48 bg-gradient-to-br from-indigo-900/40 via-blue-900/30 to-slate-900/50 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(99,102,241,0.1),transparent)]" />
                            </div>

                            <div className="absolute top-4 right-4 z-10 flex gap-2">
                                {isOwnProfile && dbUser?.role === "superadmin" && (
                                    <Link
                                        href="/admin"
                                        className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all hover:bg-white/20 active:scale-95 shadow-lg"
                                    >
                                        <LayoutDashboard className="h-3.5 w-3.5" /> Panel Admin
                                    </Link>
                                )}
                            </div>

                            <div className="px-6 pb-8 -mt-12 md:-mt-16 relative flex flex-col md:flex-row items-center md:items-end gap-6">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full blur opacity-25 group-hover:opacity-40 transition-opacity" />
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-background overflow-hidden bg-muted shadow-2xl relative flex items-center justify-center">
                                        {dbUser.imageUrl ? (
                                            <Image src={dbUser.imageUrl} alt={dbUser.firstName || ""} fill className="object-cover" priority />
                                        ) : (
                                            <User className="w-12 h-12 text-muted-foreground/40" />
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 text-center md:text-left pt-2 pb-1">
                                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 justify-center md:justify-start">
                                        <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight">{dbUser.firstName} {dbUser.lastName}</h1>
                                        <div className="flex self-center md:self-auto px-3 py-1 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30 rounded-full">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                                {dbUser.role === 'superadmin' ? 'SUPERADMIN' : dbUser.role === 'club' ? 'Club' : 'Jugador'}
                                            </span>
                                        </div>
                                    </div>

                                    {memberClub && (
                                        <div className="flex justify-center md:justify-start items-center gap-2 mb-3">
                                            <div className="w-5 h-5 rounded-full bg-muted relative overflow-hidden border border-border">
                                                {memberClub.logoUrl ? (
                                                    <Image src={memberClub.logoUrl} alt="" fill className="object-cover" />
                                                ) : (
                                                    <ShieldCheck className="w-3 h-3 m-auto" />
                                                )}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                                                Miembro de <span className="text-foreground">{memberClub.name}</span>
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-3.5 w-3.5" /> {dbUser?.location || "Sin ubicación"}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5 text-indigo-500/50" /> {dbUser.createdAt ? `Desde ${new Date(dbUser.createdAt).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}` : "Recientemente"}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Hand className="h-3.5 w-3.5 text-blue-500/50" /> {stats.side === "drive" ? "Drive" : "Revés"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ââ Navigation ââ */}
                        <div className="flex items-center gap-2 bg-card p-1.5 rounded-[1.5rem] border border-border overflow-x-auto no-scrollbar shadow-inner">
                            {[
                                ...(!isSuperAdmin ? [
                                    { id: "tournaments", label: "Profile Card", icon: Trophy },
                                    { id: "stats", label: "Estadísticas", icon: Activity },
                                    { id: "trophies", label: "Trofeos", icon: Award },
                                ] : []),
                                ...(isOwnProfile ? [{ id: "edit", label: "Editar", icon: Edit2 }] : []),
                                { id: "account", label: "Cuenta", icon: Settings },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    className={`flex-1 min-w-[100px] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/40" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <tab.icon className="h-3.5 w-3.5" />
                                        {tab.label}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* ââ Active Content ââ */}
                        <div className="animate-in slide-in-from-bottom-4 duration-500">
                            {activeTab === "tournaments" && (
                                <div className="flex flex-col items-center gap-8">
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

                                    {/* Optional: We could keep some secondary info below if needed, 
                                        but the user said "solo que aparezca la tarjeta" */}
                                </div>
                            )}

                            {activeTab === "stats" && (
                                <div className="bg-card border border-border rounded-[2rem] shadow-xl overflow-hidden">
                                    <div className="px-8 py-6 border-b border-border/50">
                                        <h2 className="text-sm font-black uppercase tracking-widest italic">Historial de Partidos</h2>
                                    </div>
                                    {allMatchesHistory.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-border/50">
                                                        <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Fecha</th>
                                                        <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Torneo / Fase</th>
                                                        <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Oponentes</th>
                                                        <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right">Score</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {allMatchesHistory.map((m, i) => {
                                                        const won = m.won;
                                                        const date = new Date(m.match.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                                                        return (
                                                            <tr key={i} className="hover:bg-muted transition-colors group">
                                                                <td className="px-8 py-6 text-xs font-bold text-muted-foreground group-hover:text-muted-foreground tabular-nums">{date}</td>
                                                                <td className="px-8 py-6">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-black uppercase italic tracking-tight mb-1">{m.tournamentName}</span>
                                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{m.type}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-6 text-xs font-bold text-foreground/80">{m.opponents}</td>
                                                                <td className="px-8 py-6">
                                                                    <div className="flex items-center justify-end gap-3">
                                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[9px] font-black ${won ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
                                                                            {won ? "V" : "D"}
                                                                        </div>
                                                                        <span className="text-sm font-black italic tracking-tighter tabular-nums">{m.match.score1}-{m.match.score2}</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-16 text-center flex flex-col items-center gap-4">
                                            <Activity className="h-10 w-10 text-muted-foreground/40" />
                                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">Aún no has jugado partidos</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === "trophies" && (
                                <div className="space-y-6">


                                    {trophies.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {trophies.map((t, idx) => (
                                                <div key={idx} className="group bg-card border border-border p-6 rounded-[2rem] hover:border-amber-500/50 shadow-xl transition-all relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                        <Trophy className="h-20 w-20 text-amber-500" />
                                                    </div>
                                                    <div className="relative flex flex-col gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                                                <Medal className="h-5 w-5 text-amber-500" />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-black uppercase italic text-lg tracking-tight group-hover:text-amber-500 transition-colors">{t.tournamentName}</h3>
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Campeon de Torneo</p>
                                                            </div>
                                                        </div>

                                                        <div className="h-px bg-border/50" />

                                                        <div className="flex items-center justify-between">
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Resultado Final</span>
                                                                <span className="text-sm font-black italic tabular-nums text-emerald-500">{t.match.score1} - {t.match.score2}</span>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Fecha</span>
                                                                <span className="text-xs font-bold text-foreground/80">{new Date(t.match.createdAt).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</span>
                                                            </div>
                                                        </div>

                                                        <Link href={`/tournaments/${t.match.tournamentId}`} className="w-full bg-white/5 group-hover:bg-amber-500 transition-all py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest group-hover:text-black">
                                                            Ver Torneo <ChevronRight className="h-3 w-3" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-card border border-border rounded-[2rem] p-16 text-center flex flex-col items-center gap-6 shadow-xl relative overflow-hidden">
                                            <div className="absolute inset-0 bg-indigo-500/5 blur-[100px]" />
                                            <Trophy className="h-16 w-16 text-muted-foreground/40 relative" />
                                            <div className="flex flex-col gap-2 relative">
                                                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em]">Aún no hay títulos</p>
                                                <p className="text-muted-foreground/60 text-[9px] font-medium max-w-xs mx-auto">¡Seguí compitiendo! Tus trofeos aparecerán aquí cuando ganes tu primer torneo.</p>
                                                <Link href="/tournaments" className="mt-4 px-8 py-3 bg-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-900/40">Ver Próximos Torneos</Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}


                            {activeTab === "account" && (
                                <div className="max-w-md mx-auto w-full">
                                    <div className="bg-card border border-border p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                        <div className="flex flex-col items-center gap-4 text-center">
                                            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                                                <User className="h-10 w-10 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black uppercase italic tracking-tight">{dbUser.firstName} {dbUser.lastName}</h3>
                                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{dbUser.email}</p>
                                            </div>
                                        </div>

                                        <div className="h-px bg-border" />

                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                                                <div className="flex items-center gap-3">
                                                    <ShieldCheck className="h-4 w-4 text-indigo-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Rol Actual</span>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{dbUser.role}</span>
                                            </div>

                                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                                                <div className="flex items-center gap-3">
                                                    <UserCircle className="h-4 w-4 text-indigo-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">ID de Usuario</span>
                                                </div>
                                                <span className="text-[9px] font-mono text-muted-foreground/60">{dbUser.id.slice(0, 12)}...</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => logoutAction()}
                                            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20 active:scale-95"
                                        >
                                            <LogOut className="h-4 w-4" /> Cerrar Sesión
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === "edit" && isOwnProfile && (
                                <div className="bg-card border border-border rounded-[2rem] shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="px-8 py-6 border-b border-border/50 bg-muted/20">
                                        <h2 className="text-sm font-black uppercase tracking-widest italic">Editar Información del Perfil</h2>
                                    </div>

                                    <div className="p-8 border-b border-border/50">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground mb-4 block tracking-widest">Foto de Perfil</label>
                                        <div className="flex flex-col sm:flex-row items-center gap-6">
                                            <div className="w-24 h-24 rounded-full bg-background border-2 border-dashed border-border flex items-center justify-center relative overflow-hidden group shrink-0">
                                                {imagePreview ? (
                                                    <Image src={imagePreview} alt="Profile preview" fill className="object-cover" unoptimized />
                                                ) : (
                                                    <User className="w-10 h-10 text-muted-foreground/20" />
                                                )}
                                                {isUploading && (
                                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
                                                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-3 flex-1 w-full text-center sm:text-left">
                                                <p className="text-[10px] text-muted-foreground font-medium max-w-xs">Sube una foto cuadrada para que otros jugadores te reconozcan en los torneos.</p>
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
                                                    className="w-full bg-background border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-inner transition-all"
                                                    placeholder="Tu nombre"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Apellido</label>
                                                <input
                                                    type="text"
                                                    value={formData.lastName}
                                                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                                    className="w-full bg-background border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-inner transition-all"
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
                                                        className="w-full bg-background border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-inner transition-all"
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
                                                        className="w-full bg-background border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-inner transition-all"
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
                                                        className="w-full bg-background border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-inner transition-all appearance-none"
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
                                                        className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.side === s ? "bg-indigo-600 border-indigo-500 text-white shadow-lg" : "bg-background border-border text-muted-foreground hover:border-indigo-500/50"}`}
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
                                                className="w-full bg-background border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 resize-none shadow-inner transition-all"
                                                placeholder="Cuenta algo sobre tu estilo de juego..."
                                            />
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="w-full md:w-auto px-10 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit2 className="h-4 w-4" />}
                                                {saving ? "Guardando..." : "Guardar Cambios"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </>
                )}
                {/* MODAL REMOVED */}
            </div>
        </div>
    );
}
