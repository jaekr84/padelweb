"use client";

import { useState, useEffect } from "react";
import { InviteModal } from "./InviteModal";
import { updateClubProfile, generateClubInviteLink, sendClubInviteAction } from "./actions";
import { searchPlayersAction } from "@/lib/actions/search";
import { logoutAction } from "@/app/login/actions";
import { deleteTournament } from "@/app/(main)/tournaments/fixture/actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Edit2,
    Trophy,
    Settings,
    Mail,
    Phone,
    Globe,
    Plus,
    Users,
    Layout,
    Building2,
    X,
    ChevronRight,
    Zap,
    Shield,
    Star,
    Clock,
    MapPin,
    Copy,
    Filter,
    MessageCircle,
    Loader2,
    LogOut,
    User,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { Image as ImageIcon } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function ClubProfileClient({
    user,
    club,
    members,
    userTournaments,
    isOwner: isOwnerProp,
}: {
    user: any;
    club: any;
    members: any[];
    userTournaments: any[];
    isOwner?: boolean;
}) {
    const [showInvite, setShowInvite] = useState(false);
    const [activeTab, setActiveTab] = useState<"info" | "torneos" | "miembros" | "invitar" | "account" | "edit">("info");
    const [saving, setSaving] = useState(false);
    const [hideFinished, setHideFinished] = useState(true);
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: club?.name || user?.fullName || "",
        bio: club?.bio || "",
        location: club?.location || "",
        phone: club?.phone || "",
        website: club?.website || "",
        logoUrl: club?.logoUrl || "",
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(club?.logoUrl || null);
    const [isUploading, setIsUploading] = useState(false);

    const [generatedInviteLink, setGeneratedInviteLink] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [invitingId, setInvitingId] = useState<string | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const clubName = club?.name || user?.fullName || "Mi Club";
    const clubBio =
        club?.bio ||
        "Completá la biografía de tu club para que más jugadores te encuentren.";
    const isSuperadmin = user?.publicMetadata?.role === "superadmin";
    const isOwner = isOwnerProp ?? user?.id === club?.ownerId;

    const activeTournamentsCount =
        userTournaments?.filter((t: any) => t.status === "en_curso").length || 0;
    const totalTournaments = userTournaments?.length || 0;
    const totalMembers = members?.length || 0;
    const memberOfThisClub = user?.clubId === club?.id;

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(formData).forEach(([key, value]) => fd.append(key, value));
            await updateClubProfile(fd);
            setActiveTab("info");
            toast.success("Perfil de club actualizado");
            router.refresh();
        } catch {
            toast.error("Error al actualizar el perfil");
        }
        setSaving(false);
    }

    const tabs = [
        { id: "info" as const, label: "Información", icon: Shield },
        { id: "miembros" as const, label: "Miembros", icon: Users },
        ...(isOwner ? [
            { id: "edit" as const, label: "Editar", icon: Edit2 },
            { id: "invitar" as const, label: "Invitar", icon: MessageCircle },
            { id: "account" as const, label: "Cuenta", icon: Settings }
        ] : []),
    ];

    const statusConfig: Record<string, { label: string; textColor: string; bg: string; border: string }> = {
        finalizado: {
            label: "Finalizado",
            textColor: "text-muted-foreground",
            bg: "bg-muted",
            border: "border-border",
        },
        en_curso: {
            label: "En Curso",
            textColor: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
        },
        abierto: {
            label: "Abierto",
            textColor: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
        },
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 font-sans selection:bg-blue-500/30 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="max-w-4xl mx-auto px-4 pt-4 md:pt-8 flex flex-col gap-6 relative z-10">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col gap-6"
                >
                    {/* ── Hero Section ── */}
                    <div className="bg-card backdrop-blur-xl border border-border rounded-[2.5rem] overflow-hidden shadow-sm relative transition-colors">
                        <div className="h-32 md:h-48 bg-gradient-to-br from-indigo-500/5 via-blue-500/5 to-emerald-500/5 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(79,70,229,0.05),transparent)]" />
                            <div className="absolute inset-0 bg-grid-black/[0.01]" />
                        </div>

                        <div className="px-8 pb-10 -mt-12 md:-mt-16 relative flex flex-col md:flex-row items-center md:items-end gap-8">
                            <div className="relative group">
                                <div className="absolute -inset-1.5 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl blur opacity-10 group-hover:opacity-20 transition-opacity" />
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-card overflow-hidden bg-muted shadow-xl relative flex items-center justify-center transition-colors">
                                    {club?.logoUrl ? (
                                        <Image src={club.logoUrl} alt="Club logo" fill className="object-cover group-hover:scale-105 transition-transform duration-500" priority sizes="(max-width: 768px) 96px, 128px" />
                                    ) : user?.imageUrl ? (
                                        <Image src={user.imageUrl} alt="Club avatar" fill className="object-cover group-hover:scale-105 transition-transform duration-500" priority sizes="(max-width: 768px) 96px, 128px" />
                                    ) : (
                                        <Building2 className="h-10 w-10 text-muted-foreground/30" />
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 text-center md:text-left pt-2 pb-1">
                                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3 justify-center md:justify-start">
                                    <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-foreground">
                                        {clubName}
                                    </h1>
                                    <div className="flex self-center md:self-auto px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full backdrop-blur-md">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Club Oficial</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap justify-center md:justify-start gap-5 mt-2 text-[10px] font-black uppercase tracking-widest">
                                    {club?.location && (
                                        <div className="flex items-center gap-2.5 bg-muted px-3 py-1.5 rounded-xl border border-border text-muted-foreground">
                                            <MapPin className="h-3.5 w-3.5 text-indigo-600" /> {club.location}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2.5 bg-muted px-3 py-1.5 rounded-xl border border-border text-muted-foreground">
                                        <Users className="h-3.5 w-3.5 text-emerald-600" /> {totalMembers} Miembros
                                    </div>
                                    <div className="flex items-center gap-2.5 bg-muted px-3 py-1.5 rounded-xl border border-border text-muted-foreground">
                                        <Trophy className="h-3.5 w-3.5 text-amber-500" /> {totalTournaments} Torneos
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Content Navigation ── */}
                    <div className="flex items-center gap-2 bg-card p-2 rounded-[2rem] border border-border overflow-x-auto no-scrollbar shadow-sm transition-colors">
                        {tabs.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                className={`flex-1 min-w-[120px] px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative group/tab ${activeTab === id ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
                                onClick={() => setActiveTab(id)}
                            >
                                <div className="flex items-center justify-center gap-2.5 relative z-10">
                                    <Icon className={`h-4 w-4 transition-transform group-hover/tab:scale-110 ${activeTab === id ? "text-white" : ""}`} />
                                    {label}
                                </div>
                                {activeTab === id && (
                                    <motion.div 
                                        layoutId="clubActiveTab"
                                        className="absolute inset-0 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20"
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === "info" && (
                            <motion.div
                                key="tab-info"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="grid grid-cols-1 md:grid-cols-3 gap-6"
                            >
                                <div className="md:col-span-2 flex flex-col gap-6">
                                    <div className="bg-card border border-border p-8 rounded-[2rem] shadow-sm">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Descripción</h3>
                                        <p className="text-foreground text-sm leading-relaxed font-medium">
                                            {clubBio}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-6">
                                    <div className="bg-card border border-border p-8 rounded-[2rem] shadow-sm flex flex-col gap-6">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Contacto</h3>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-3 text-foreground">
                                                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center border border-border"><Phone className="h-4 w-4" /></div>
                                                <span className="text-sm font-bold tracking-tight">{club?.phone || "-"}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-foreground">
                                                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center border border-border"><Globe className="h-4 w-4" /></div>
                                                <span className="text-sm font-bold tracking-tight truncate">{club?.website || "-"}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {(club?.whatsapp || club?.phone) && (
                                        <button
                                            onClick={() => {
                                                const phone = club.whatsapp || club.phone;
                                                window.open(`https://wa.me/${phone?.replace(/\D/g, '')}`, '_blank');
                                            }}
                                            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                        >
                                            <MessageCircle className="h-4 w-4 fill-current" /> Contactar por WhatsApp
                                        </button>
                                    )}

                                    {!isOwner && user?.role === "jugador" && memberOfThisClub === false && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await sendClubInviteAction(user.id, club.id);
                                                    toast.success("Solicitud enviada al club");
                                                } catch (err: any) {
                                                    toast.error(err.message || "Error al solicitar unión");
                                                }
                                            }}
                                            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                                        >
                                            <Plus className="h-4 w-4" /> Solicitar Unirse al Club
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "miembros" && (
                            <motion.div
                                key="tab-miembros"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="flex flex-col gap-6"
                            >
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4">
                                    <h2 className="text-lg font-black uppercase tracking-widest italic">Miembros y Ranking</h2>
                                    <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{totalMembers} Jugadores</span>
                                    </div>
                                </div>

                                <div className="bg-card border border-border rounded-[2rem] shadow-sm overflow-hidden">
                                    {members && members.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-border bg-muted/30">
                                                        <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground w-16 text-center">Pos</th>
                                                        <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Jugador</th>
                                                        <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Nivel</th>
                                                        <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right">Puntos</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {[...members]
                                                        .sort((a, b) => (b.points || 0) - (a.points || 0))
                                                        .map((member, index) => {
                                                            const isTop3 = index < 3;
                                                            const colors = [
                                                                "text-yellow-600 bg-yellow-50 border-yellow-100",
                                                                "text-slate-500 bg-slate-50 border-slate-100",
                                                                "text-amber-700 bg-amber-50 border-amber-100"
                                                            ];

                                                            return (
                                                                <tr key={member.id} className="hover:bg-muted/30 transition-colors group">
                                                                    <td className="px-8 py-6">
                                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black italic border ${isTop3 ? colors[index] : "text-muted-foreground bg-muted border-border"}`}>
                                                                            {index + 1}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-6">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0 border border-border">
                                                                                {member.imageUrl ? (
                                                                                    <Image src={member.imageUrl} alt={member.name || ""} fill className="object-cover" sizes="40px" />
                                                                                ) : (
                                                                                    <div className="flex items-center justify-center h-full"><Users className="w-5 h-5 text-muted-foreground/30" /></div>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <span className="text-sm font-bold tracking-tight group-hover:text-indigo-600 transition-colors uppercase italic text-foreground">{member.name || member.fullName || "Jugador"}</span>
                                                                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{member.side === 'reves' ? 'Revés' : member.side === 'drive' ? 'Drive' : 'Polivalente'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-6 text-center">
                                                                        <span className="px-3 py-1 bg-muted border border-border rounded-full text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                                            {member.category || "D"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-8 py-6">
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <Star className={`w-3.5 h-3.5 ${isTop3 ? "text-yellow-500 fill-yellow-500" : "text-indigo-500"}`} />
                                                                            <span className="text-sm font-black italic tabular-nums">{member.points || 0}</span>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-16 text-center flex flex-col items-center gap-6">
                                            <div className="w-16 h-16 rounded-[2rem] bg-muted flex items-center justify-center">
                                                <Users className="h-8 w-8 text-muted-foreground/30" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <p className="text-muted-foreground text-sm font-medium italic">Aún no hay miembros registrados en este club.</p>
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500/50">Invite players to join</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "account" && isOwner && (
                            <motion.div
                                key="tab-account"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="max-w-md mx-auto w-full"
                            >
                                <div className="bg-card border border-border p-8 rounded-[2rem] shadow-sm flex flex-col gap-6">
                                    <div className="flex flex-col items-center gap-4 text-center">
                                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                                            <Settings className="h-10 w-10 text-muted-foreground/30" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase italic tracking-tight text-foreground">{clubName}</h3>
                                            {user?.email && <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{user?.email}</p>}
                                        </div>
                                    </div>

                                    <div className="h-px bg-border" />

                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border">
                                            <div className="flex items-center gap-3">
                                                <Shield className="h-4 w-4 text-indigo-600" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rol Administrador</span>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 font-bold">{user?.role}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => logoutAction()}
                                        className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-100 active:scale-95"
                                    >
                                        <LogOut className="h-4 w-4" /> Cerrar Sesión
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "invitar" && isOwner && (
                            <motion.div
                                key="tab-invitar"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="max-w-2xl mx-auto flex flex-col gap-6 w-full"
                            >
                                <div className="bg-card border border-border rounded-[2rem] p-8 md:p-12 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-600">
                                            <User className="h-6 w-6" />
                                        </div>
                                        <h2 className="text-2xl font-black uppercase italic tracking-tight text-foreground">Buscar y Vincular Jugador</h2>
                                    </div>

                                    <p className="text-muted-foreground text-[10px] font-bold mb-6 leading-relaxed uppercase tracking-widest">
                                        Si el jugador ya tiene una cuenta, podés buscarlo por <span className="text-foreground">Nombre, Email o DNI</span> para enviarle una invitación.
                                    </p>

                                    <div className="flex flex-col gap-4">
                                        <div className="relative">
                                            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <input 
                                                type="text"
                                                placeholder="Buscar jugador..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter' && searchQuery.length >= 3) {
                                                        setIsSearching(true);
                                                        const res = await searchPlayersAction(searchQuery);
                                                        setSearchResults(res);
                                                        setIsSearching(false);
                                                    }
                                                }}
                                                className="w-full bg-muted/30 border border-border rounded-2xl py-4 pl-12 pr-5 text-sm font-bold outline-none focus:border-indigo-600 transition-all text-foreground"
                                            />
                                            <button 
                                                onClick={async () => {
                                                    if (searchQuery.length < 3) return;
                                                    setIsSearching(true);
                                                    const res = await searchPlayersAction(searchQuery);
                                                    setSearchResults(res);
                                                    setIsSearching(false);
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 py-2 px-6 bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all outline-none"
                                            >
                                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                                            </button>
                                        </div>

                                        {searchResults.length > 0 && (
                                            <div className="bg-muted border border-border rounded-[1.5rem] overflow-hidden mt-4 shadow-sm">
                                                {searchResults.map(player => (
                                                    <div key={player.id} className="p-4 border-b border-border flex items-center justify-between gap-4 last:border-0 hover:bg-muted/50 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-muted shrink-0 relative overflow-hidden border border-border">
                                                                {player.imageUrl && <Image src={player.imageUrl} alt="" fill className="object-cover" sizes="40px" />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black uppercase italic text-foreground">{player.firstName} {player.lastName}</span>
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase">{player.email}</span>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            disabled={invitingId === player.id || player.clubId === club?.id}
                                                            onClick={async () => {
                                                                setInvitingId(player.id);
                                                                try {
                                                                    await sendClubInviteAction(player.id, club?.id);
                                                                    toast.success("Invitación enviada");
                                                                } catch (err: any) {
                                                                    toast.error(err.message || "Error al invitar");
                                                                } finally {
                                                                    setInvitingId(null);
                                                                }
                                                            }}
                                                            className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                                        >
                                                            {player.clubId === club?.id ? "Ya es miembro" : invitingId === player.id ? "Enviando..." : "Invitar"}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-card border border-border rounded-[2rem] p-8 md:p-12 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600">
                                            <MessageCircle className="h-6 w-6" />
                                        </div>
                                        <h2 className="text-2xl font-black uppercase italic tracking-tight text-foreground">Invitar Nuevos Jugadores</h2>
                                    </div>

                                    <p className="text-muted-foreground text-xs font-medium mb-8 leading-relaxed uppercase tracking-widest">
                                        Compartí este link con jugadores que aún no estén registrados.
                                    </p>

                                    <div className="flex flex-col gap-6">
                                        <div className="bg-muted border border-border rounded-3xl p-6 relative overflow-hidden group shadow-sm">
                                            <div className="absolute inset-0 bg-emerald-500/5 blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <h3 className="text-[10px] font-black uppercase text-muted-foreground mb-4 flex items-center gap-2">
                                                Link de Invitación (Vence en 24hs)
                                            </h3>
                                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                                <div className="flex-1 w-full bg-background border border-border rounded-xl px-4 py-3 text-[10px] text-foreground font-mono truncate select-all shadow-sm">
                                                    {generatedInviteLink || 'Presioná "Generar Link" para obtener uno'}
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <button
                                                        disabled={!generatedInviteLink}
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(generatedInviteLink);
                                                            toast.success("Link de invitación copiado");
                                                        }}
                                                        className="flex-1 sm:flex-none px-4 py-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-100 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                        Copiar
                                                    </button>
                                                    <button
                                                        disabled={isRegenerating || !club?.id}
                                                        onClick={async () => {
                                                            setIsRegenerating(true);
                                                            try {
                                                                const newLink = await generateClubInviteLink(club.id);
                                                                setGeneratedInviteLink(newLink);
                                                                toast.success(generatedInviteLink ? "Nuevo link generado" : "Link generado correctamente");
                                                            } catch (err) {
                                                                toast.error("Error al generar link");
                                                            } finally {
                                                                setIsRegenerating(false);
                                                            }
                                                        }}
                                                        className="flex-1 sm:flex-none px-4 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-100 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                                    >
                                                        {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                        {generatedInviteLink ? "Generar Nuevo" : "Generar Link"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            disabled={!generatedInviteLink}
                                            onClick={() => {
                                                const message = `¡Hola! Sumate a mi club "${clubName}" en PadelWeb: ${generatedInviteLink}`;
                                                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
                                            }}
                                            className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20bd5c] text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-green-500/20 active:scale-95 disabled:opacity-50"
                                        >
                                            <MessageCircle className="h-4 w-4 fill-current" /> Compartir en WhatsApp
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "edit" && isOwner && (
                            <motion.div 
                                key="tab-edit"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-card border border-border rounded-[2.5rem] shadow-sm overflow-hidden"
                            >
                        <div className="px-10 py-8 border-b border-border bg-muted/30">
                            <h2 className="text-xl font-black uppercase tracking-tighter italic text-foreground flex items-center gap-3">
                                <Edit2 className="h-5 w-5 text-indigo-600" /> Database Override
                            </h2>
                        </div>
                        
                        <div className="p-10 border-b border-border">
                            <label className="text-[10px] font-black uppercase text-muted-foreground mb-6 block tracking-[0.2em]">Institutional Identity Logo</label>
                            <div className="flex flex-col sm:flex-row items-center gap-10">
                                <div className="w-40 h-40 rounded-[2.5rem] bg-muted/30 border-2 border-dashed border-border flex items-center justify-center relative overflow-hidden group shadow-sm">
                                    {logoPreview ? (
                                        <Image src={logoPreview} alt="Logo preview" fill className="object-cover" unoptimized sizes="160px" />
                                    ) : (
                                        <Building2 className="w-12 h-12 text-muted-foreground/20" />
                                    )}
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
                                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-5 flex-1 w-full text-center sm:text-left">
                                    <p className="text-[11px] text-muted-foreground font-bold max-w-sm uppercase tracking-wide leading-relaxed italic">Upload high-fidelity institutional icon for visual identification in the neural network.</p>
                                            <label className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer w-full sm:w-auto shadow-lg shadow-indigo-600/20 active:scale-95">
                                                <ImageIcon className="w-4 h-4" />
                                                {isUploading ? "Uploading Data..." : "Modify Logo"}
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
                                                            const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
                                                            const compressedBlob = await imageCompression(file, options);
                                                            const compressedFile = new File([compressedBlob], "logo.jpg", { type: "image/jpeg" });
                                                            
                                                            const uploadFormData = new FormData();
                                                            uploadFormData.append("file", compressedFile);
                                                            
                                                            const res = await fetch("/api/upload", { method: "POST", body: uploadFormData });
                                                            if (!res.ok) throw new Error("Error al subir");
                                                            
                                                            const data = await res.json();
                                                            setFormData(prev => ({ ...prev, logoUrl: data.url }));
                                                            setLogoPreview(data.url);
                                                            toast.success("Logo subido correctamente");
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

                                <form onSubmit={handleSave} className="p-10 flex flex-col gap-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="flex flex-col gap-3">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Trade Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-muted/30 border border-border rounded-2xl py-5 px-6 text-foreground text-sm font-black italic outline-none focus:border-indigo-600 shadow-sm transition-all uppercase tracking-wide"
                                                placeholder="Unit Name"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Deploy Location</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    value={formData.location}
                                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                                    className="w-full bg-muted/30 border border-border rounded-2xl py-5 pl-14 pr-6 text-foreground text-sm font-black italic outline-none focus:border-indigo-600 shadow-sm transition-all uppercase tracking-wide"
                                                    placeholder="City, State"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="flex flex-col gap-3">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Comm Channel</label>
                                            <div className="relative">
                                                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    className="w-full bg-muted/30 border border-border rounded-2xl py-5 pl-14 pr-6 text-foreground text-sm font-black italic outline-none focus:border-indigo-600 shadow-sm transition-all uppercase tracking-wide"
                                                    placeholder="Dial Code"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Web / Digital HQ</label>
                                            <div className="relative">
                                                <Globe className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    value={formData.website}
                                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                    className="w-full bg-muted/30 border border-border rounded-2xl py-5 pl-14 pr-6 text-foreground text-sm font-black italic outline-none focus:border-indigo-600 shadow-sm transition-all uppercase tracking-wide"
                                                    placeholder="www.hq.com"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Institutional Intel</label>
                                        <textarea
                                            value={formData.bio}
                                            onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                            rows={4}
                                            className="w-full bg-muted/30 border border-border rounded-2xl py-5 px-6 text-foreground text-sm font-black italic outline-none focus:border-indigo-600 resize-none shadow-sm transition-all uppercase tracking-wide"
                                            placeholder="Brief of unit operations and objectives..."
                                        />
                                    </div>

                                    <div className="flex justify-end pt-5">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="w-full md:w-auto px-12 bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                                        >
                                            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
                                            {saving ? "Transmitting..." : "Save Configuration"}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ── Invite Modal ── */}
                {showInvite && (
                    <InviteModal
                        clubName={clubName}
                        clubId={club?.id}
                        onClose={() => setShowInvite(false)}
                    />
                )}
            </div>
        </div>
    );
}