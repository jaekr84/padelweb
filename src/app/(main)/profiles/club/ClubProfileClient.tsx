"use client";

import { useState } from "react";
import { InviteModal } from "./InviteModal";
import { updateClubProfile } from "./actions";
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
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

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
    });

    const clubName = club?.name || user?.fullName || "Mi Club";
    const clubBio =
        club?.bio ||
        "Completá la biografía de tu club para que más jugadores te encuentren.";
    const isOwner = isOwnerProp ?? user?.id === club?.ownerId;

    const activeTournamentsCount =
        userTournaments?.filter((t: any) => t.status === "en_curso").length || 0;
    const totalTournaments = userTournaments?.length || 0;
    const totalMembers = members?.length || 0;

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
        { id: "torneos" as const, label: "Torneos", icon: Trophy },
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
            textColor: "text-slate-400",
            bg: "bg-slate-700/50",
            border: "border-slate-600",
        },
        en_curso: {
            label: "En Curso",
            textColor: "text-blue-300",
            bg: "bg-blue-900/60",
            border: "border-blue-700",
        },
        abierto: {
            label: "Abierto",
            textColor: "text-emerald-300",
            bg: "bg-emerald-900/60",
            border: "border-emerald-700",
        },
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-700 min-h-screen bg-background text-foreground pb-20 pt-4 px-4">
            <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">

                {/* ── Hero Section ── */}
                <div className="bg-card backdrop-blur-3xl border border-border rounded-[2rem] overflow-hidden shadow-2xl relative">
                    <div className="h-32 md:h-48 bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-slate-900/50 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.1),transparent)]" />
                    </div>

                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                    </div>

                    <div className="px-6 pb-8 -mt-12 md:-mt-16 relative flex flex-col md:flex-row items-center md:items-end gap-6">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-background overflow-hidden bg-muted shadow-2xl relative flex items-center justify-center">
                                {user?.image_url ? (
                                    <Image
                                        src={user.image_url}
                                        alt="Club avatar"
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Layout className="h-10 w-10 text-muted-foreground/60" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left pt-2 pb-1">
                            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 justify-center md:justify-start">
                                <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight">{clubName}</h1>
                                <div className="flex self-center md:self-auto px-3 py-1 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30 rounded-full">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Club Oficial</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                                {club?.location && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5" /> {club.location}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 text-indigo-500/50" /> {totalMembers} Miembros
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Content Navigation ── */}
                <div className="flex items-center gap-2 bg-card p-1.5 rounded-[1.5rem] border border-border overflow-x-auto no-scrollbar shadow-inner">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            className={`flex-1 min-w-[100px] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === id ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/40" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                            onClick={() => setActiveTab(id)}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </div>
                        </button>
                    ))}
                </div>

                {/* ── Content ── */}
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    {activeTab === "info" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 flex flex-col gap-6">
                                <div className="bg-card border border-border p-8 rounded-[2rem] shadow-xl">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Descripción</h3>
                                    <p className="text-foreground/80 text-sm leading-relaxed font-medium">
                                        {clubBio}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-6">
                                <div className="bg-card border border-border p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Contacto</h3>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-3 text-foreground/80">
                                            <div className="w-10 h-10 rounded-2xl bg-card flex items-center justify-center border border-border"><Phone className="h-4 w-4" /></div>
                                            <span className="text-sm font-bold tracking-tight">{club?.phone || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-foreground/80">
                                            <div className="w-10 h-10 rounded-2xl bg-card flex items-center justify-center border border-border"><Globe className="h-4 w-4" /></div>
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
                                        className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40 active:scale-95"
                                    >
                                        <MessageCircle className="h-4 w-4 fill-current" /> Contactar por WhatsApp
                                    </button>
                                )}
                                <div className="bg-card border border-border p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estadísticas</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col items-center p-4 bg-card rounded-2xl border border-border">
                                            <span className="text-2xl font-black italic tracking-tighter text-indigo-500">{activeTournamentsCount}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Activos</span>
                                        </div>
                                        <div className="flex flex-col items-center p-4 bg-card rounded-2xl border border-border">
                                            <span className="text-2xl font-black italic tracking-tighter text-emerald-500">{totalTournaments}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Torneos</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "torneos" && (
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4">
                                <h2 className="text-lg font-black uppercase tracking-widest italic">Torneos Organizados</h2>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setHideFinished(!hideFinished)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase tracking-widest ${hideFinished
                                            ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-600 dark:text-indigo-400"
                                            : "bg-card border-border text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        <Filter className="h-3 w-3" />
                                        {hideFinished ? "Mostrando Activos" : "Ocultar Finalizados"}
                                    </button>
                                    {isOwner && (
                                        <Link
                                            href="/tournaments/create"
                                            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-foreground shadow-lg shadow-indigo-900/30"
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Crear
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {userTournaments && userTournaments.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {userTournaments
                                        .filter((t: any) => !hideFinished || t.status !== "finalizado")
                                        .map((t: any) => {
                                            const status = statusConfig[t.status] ?? statusConfig.abierto;
                                            return (
                                                <div key={t.id} className="group bg-card border border-border rounded-[2rem] p-6 hover:border-indigo-500/50 transition-all flex flex-col gap-4 shadow-xl">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex flex-col gap-1">
                                                            <h3 className="font-black uppercase italic tracking-tight text-lg group-hover:text-indigo-600 dark:text-indigo-400 transition-colors">{t.name}</h3>
                                                            <div className="flex items-center gap-1.5 opacity-30">
                                                                <Clock className="h-2.5 w-2.5" />
                                                                <span className="text-[9px] font-mono">{t.id.slice(0, 8)}</span>
                                                            </div>
                                                        </div>
                                                        <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${status.bg} ${status.textColor} ${status.border}`}>
                                                            {status.label}
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Link href={`/tournaments/${t.id}/manage`} className="flex-1 flex items-center justify-center gap-2 bg-white/10 group-hover:bg-indigo-600 transition-all py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                                                            Gestionar <ChevronRight className="h-3 w-3" />
                                                        </Link>
                                                        {isOwner && (
                                                            <Link href={`/tournaments/${t.id}/edit`} className="w-12 flex items-center justify-center bg-card hover:bg-white/5 border border-border text-white/40 hover:text-white rounded-2xl transition-all">
                                                                <Edit2 className="h-4 w-4" />
                                                            </Link>
                                                        )}
                                                        {isOwner && (
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm("¿Seguro que quieres eliminar este torneo?")) {
                                                                        await deleteTournament(t.id);
                                                                        router.refresh();
                                                                    }
                                                                }}
                                                                className="w-12 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-foreground border border-red-500/20 rounded-2xl transition-all"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : (
                                <div className="bg-card border border-border rounded-[2rem] p-16 text-center flex flex-col items-center gap-6 shadow-xl">
                                    < Trophy className="h-12 w-12 text-muted-foreground/40" />
                                    <div className="flex flex-col gap-2">
                                        <p className="text-muted-foreground text-sm font-medium">Aún no has organizado torneos.</p>
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500/50">Organize your first event</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === "miembros" && (
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4">
                                <h2 className="text-lg font-black uppercase tracking-widest italic">Miembros y Ranking</h2>
                                <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{totalMembers} Jugadores</span>
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-[2rem] shadow-xl overflow-hidden">
                                {members && members.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-border/50 bg-muted/30">
                                                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground w-16 text-center">Pos</th>
                                                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Jugador</th>
                                                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Nivel</th>
                                                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right">Puntos</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/50">
                                                {[...members]
                                                    .sort((a, b) => (b.points || 0) - (a.points || 0))
                                                    .map((member, index) => {
                                                        const isTop3 = index < 3;
                                                        const colors = [
                                                            "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
                                                            "text-slate-300 bg-slate-300/10 border-slate-300/20",
                                                            "text-amber-600 bg-amber-600/10 border-amber-600/20"
                                                        ];

                                                        return (
                                                            <tr key={member.id} className="hover:bg-muted/50 transition-colors group">
                                                                <td className="px-8 py-6">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black italic border ${isTop3 ? colors[index] : "text-muted-foreground bg-muted/50 border-border"}`}>
                                                                        {index + 1}
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-6">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0 border border-border">
                                                                            {member.imageUrl ? (
                                                                                <Image src={member.imageUrl} alt={member.name || ""} fill className="object-cover" />
                                                                            ) : (
                                                                                <div className="flex items-center justify-center h-full"><Users className="w-5 h-5 text-muted-foreground/40" /></div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-bold tracking-tight group-hover:text-indigo-400 transition-colors uppercase italic">{member.name || member.fullName || "Jugador"}</span>
                                                                            <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">{member.side === 'reves' ? 'Revés' : member.side === 'drive' ? 'Drive' : 'Polivalente'}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-6 text-center">
                                                                    <span className="px-3 py-1 bg-muted/50 border border-border rounded-full text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                                        {member.category || "5ta"}
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
                                            <Users className="h-8 w-8 text-muted-foreground/40" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <p className="text-muted-foreground text-sm font-medium italic">Aún no hay miembros registrados en este club.</p>
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500/50">Invite players to join</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    {activeTab === "account" && isOwner && (
                        <div className="max-w-md mx-auto w-full">
                            <div className="bg-card border border-border p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                <div className="flex flex-col items-center gap-4 text-center">
                                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                                        <Settings className="h-10 w-10 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase italic tracking-tight">{clubName}</h3>
                                        {user?.email && <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{user?.email}</p>}
                                    </div>
                                </div>

                                <div className="h-px bg-border" />

                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                                        <div className="flex items-center gap-3">
                                            <Shield className="h-4 w-4 text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Rol Administrador</span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{user?.role}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => logoutAction()}
                                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20 active:scale-95"
                                >
                                    Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "invitar" && isOwner && (
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-card border border-border rounded-[2rem] p-8 md:p-12 shadow-2xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                                        <MessageCircle className="h-6 w-6" />
                                    </div>
                                    <h2 className="text-2xl font-black uppercase italic tracking-tight">Invitar Jugadores</h2>
                                </div>

                                <p className="text-foreground/50 text-xs font-medium mb-8 leading-relaxed uppercase tracking-widest">
                                    Compartí este link con tus jugadores. Cuando se registren usando este enlace, quedarán asociados a <span className="text-indigo-600 dark:text-indigo-400 font-black">{clubName}</span> automáticamente.
                                </p>

                                <div className="flex flex-col gap-6">
                                    <div className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-emerald-500/5 blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <h3 className="text-[10px] font-black uppercase text-muted-foreground mb-4 flex items-center gap-2">
                                            Link para WhatsApp
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-black/40 border border-border/50 rounded-xl px-4 py-3 text-[10px] text-muted-foreground font-mono truncate select-all">
                                                {typeof window !== 'undefined' ? `${window.location.origin}/sign-up?invite=${club?.id}` : '...'}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const link = `${window.location.origin}/sign-up?invite=${club?.id}`;
                                                    navigator.clipboard.writeText(link);
                                                    toast.success("Link de invitación copiado");
                                                }}
                                                className="px-4 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest uppercase"
                                            >
                                                Copiar
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            const inviteLink = `${window.location.origin}/sign-up?invite=${club?.id}`;
                                            const message = `¡Hola! Sumate a mi club "${clubName}" en PadelWeb: ${inviteLink}`;
                                            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
                                        }}
                                        className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20bd5c] text-foreground py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-green-900/40 active:scale-95"
                                    >
                                        <MessageCircle className="h-4 w-4 fill-current" /> Compartir en WhatsApp
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "edit" && isOwner && (
                        <div className="bg-card border border-border rounded-[2rem] shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                            <div className="px-8 py-6 border-b border-border/50 bg-muted/20">
                                <h2 className="text-sm font-black uppercase tracking-widest italic">Editar Información del Club</h2>
                            </div>
                            <form onSubmit={handleSave} className="p-8 flex flex-col gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Nombre Comercial</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-background border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-inner transition-all"
                                            placeholder="Nombre del club"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Ubicación</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                value={formData.location}
                                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                                className="w-full bg-background border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-inner transition-all"
                                                placeholder="Ciudad, Provincia"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Teléfono de Contacto</label>
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
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Sitio Web / Redes</label>
                                        <div className="relative">
                                            <Globe className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                value={formData.website}
                                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                className="w-full bg-background border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-inner transition-all"
                                                placeholder="www.tuclub.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 tracking-widest">Biografía del Club</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                        rows={4}
                                        className="w-full bg-background border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 resize-none shadow-inner transition-all"
                                        placeholder="Cuenta a los jugadores qué ofrece tu club..."
                                    />
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full md:w-auto px-10 bg-indigo-600 hover:bg-indigo-500 text-foreground py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Zap className="h-4 w-4 animate-spin" /> : <Edit2 className="h-4 w-4" />}
                                        {saving ? "Guardando..." : "Guardar Cambios"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* MODAL REMOVED */}

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