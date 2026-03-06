"use client";

import { useState } from "react";
import { InviteModal } from "./InviteModal";
import { UserProfile, useUser } from "@clerk/nextjs";
import { updateClubProfile } from "./actions";
import { deleteTournament } from "@/app/tournaments/fixture/actions";
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
} from "lucide-react";
import { toast } from "sonner";

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
    const [activeTab, setActiveTab] = useState<"info" | "torneos" | "account">("info");
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hideFinished, setHideFinished] = useState(true);
    const router = useRouter();
    const { user: clerkUser } = useUser();

    const [formData, setFormData] = useState({
        name: club?.name || user?.fullName || "",
        bio: club?.bio || "",
        location: club?.location || "",
        phone: club?.phone || "",
        website: club?.website || "",
        amenities: club?.amenities?.join(", ") || "",
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
            setIsEditing(false);
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
        ...(isOwner ? [{ id: "account" as const, label: "Cuenta", icon: Settings }] : []),
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
        <div className="flex flex-col gap-6 animate-in fade-in duration-700 min-h-screen bg-[#090A0F] text-white pb-20 pt-4 px-4">
            <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">

                {/* ── Hero Section ── */}
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative">
                    <div className="h-32 md:h-48 bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-slate-900/50 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.1),transparent)]" />
                    </div>

                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        {isOwner && (
                            <>
                                <button
                                    onClick={() => setShowInvite(true)}
                                    className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all hover:bg-white/20 active:scale-95 shadow-lg"
                                >
                                    <Mail className="h-3.5 w-3.5" /> Invitar
                                </button>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-1.5 bg-indigo-600/90 backdrop-blur-md border border-indigo-500 text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all hover:bg-indigo-500 active:scale-95 shadow-lg"
                                >
                                    <Edit2 className="h-3.5 w-3.5" /> Editar Club
                                </button>
                            </>
                        )}
                    </div>

                    <div className="px-6 pb-8 -mt-12 md:-mt-16 relative flex flex-col md:flex-row items-center md:items-end gap-6">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-[#090A0F] overflow-hidden bg-slate-800 shadow-2xl relative flex items-center justify-center">
                                {clerkUser?.imageUrl || user?.imageUrl ? (
                                    <img
                                        src={clerkUser?.imageUrl || user?.imageUrl}
                                        alt="Club avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Layout className="h-10 w-10 text-white/20" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left pt-2 pb-1">
                            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 justify-center md:justify-start">
                                <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight">{clubName}</h1>
                                <div className="flex self-center md:self-auto px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Club Oficial</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
                                {club?.location && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5" /> {club.location}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Star className="h-3.5 w-3.5 text-yellow-500/50" /> Premium Club
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 text-indigo-500/50" /> {totalMembers} Miembros
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Content Navigation ── */}
                <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-[1.5rem] border border-white/10 overflow-x-auto no-scrollbar shadow-inner">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            className={`flex-1 min-w-[100px] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === id ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/40" : "text-white/40 hover:text-white hover:bg-white/5"}`}
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
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Descripción</h3>
                                    <p className="text-white/70 text-sm leading-relaxed font-medium">
                                        {clubBio}
                                    </p>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Servicios y Amenidades</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {club?.amenities?.map((a: string, i: number) => (
                                            <span key={i} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                                {a}
                                            </span>
                                        )) || <span className="text-white/30 text-[10px]">No hay servicios listados</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-6">
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Contacto</h3>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-3 text-white/80">
                                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10"><Phone className="h-4 w-4" /></div>
                                            <span className="text-sm font-bold tracking-tight">{club?.phone || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-white/80">
                                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10"><Globe className="h-4 w-4" /></div>
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
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Estadísticas</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                                            <span className="text-2xl font-black italic tracking-tighter text-indigo-500">{activeTournamentsCount}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Activos</span>
                                        </div>
                                        <div className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                                            <span className="text-2xl font-black italic tracking-tighter text-emerald-500">{totalTournaments}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Torneos</span>
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
                                            ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-400"
                                            : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                                            }`}
                                    >
                                        <Filter className="h-3 w-3" />
                                        {hideFinished ? "Mostrando Activos" : "Ocultar Finalizados"}
                                    </button>
                                    {isOwner && (
                                        <Link
                                            href="/tournaments/create"
                                            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-900/30"
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
                                                <div key={t.id} className="group bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:border-indigo-500/50 transition-all flex flex-col gap-4 shadow-xl">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex flex-col gap-1">
                                                            <h3 className="font-black uppercase italic tracking-tight text-lg group-hover:text-indigo-400 transition-colors">{t.name}</h3>
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
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm("¿Seguro que quieres eliminar este torneo?")) {
                                                                        await deleteTournament(t.id);
                                                                        router.refresh();
                                                                    }
                                                                }}
                                                                className="w-12 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-2xl transition-all"
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
                                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-16 text-center flex flex-col items-center gap-6 shadow-xl">
                                    < Trophy className="h-12 w-12 text-white/10" />
                                    <div className="flex flex-col gap-2">
                                        <p className="text-white/40 text-sm font-medium">Aún no has organizado torneos.</p>
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500/50">Organize your first event</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "account" && isOwner && (
                        <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl overflow-hidden scale-95 md:scale-100 origin-top">
                            <UserProfile routing="hash" />
                        </div>
                    )}
                </div>

                {/* ── Edit Modal ── */}
                {isEditing && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[1000] flex items-center justify-center p-4">
                        <div className="bg-[#0D0F16] border border-white/10 rounded-[2.5rem] w-full max-w-[600px] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 shadow-2xl">
                            <div className="px-8 pt-8 pb-4 flex justify-between items-center sticky top-0 bg-[#0D0F16]/80 backdrop-blur-lg z-10 border-b border-white/5">
                                <h2 className="text-2xl font-black uppercase italic tracking-tight">Editar Club</h2>
                                <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">✕</button>
                            </div>
                            <form onSubmit={handleSave} className="p-8 flex flex-col gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-white/30 ml-2">Nombre Comercial</label>
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-indigo-500 shadow-inner" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-white/30 ml-2">Ubicación</label>
                                        <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-indigo-500 shadow-inner" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase text-white/30 ml-2">Biografía</label>
                                    <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={4} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-indigo-500 resize-none shadow-inner" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-white/30 ml-2">Teléfono</label>
                                        <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-indigo-500" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-white/30 ml-2">Sitio Web</label>
                                        <input type="text" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-indigo-500" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase text-white/30 ml-2">Servicios (coma)</label>
                                    <input type="text" value={formData.amenities} onChange={e => setFormData({ ...formData, amenities: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-indigo-500" placeholder="Parking, Bar, WiFi..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <button type="button" onClick={() => setIsEditing(false)} className="bg-white/5 text-white/60 border border-white/10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancelar</button>
                                    <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40 disabled:opacity-50">
                                        {saving ? "Guardando..." : "Guardar Cambios"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                )}

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