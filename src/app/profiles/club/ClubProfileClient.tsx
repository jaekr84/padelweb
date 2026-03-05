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

    const activeTournaments =
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
        <div className="flex flex-col gap-4 pb-6 bg-[#090A0F] min-h-full p-4">

            {/* ── HERO ── */}
            <div className="relative rounded-3xl overflow-hidden bg-[#0D0F1A] border border-slate-700/50 shadow-2xl">
                {/* Banner */}
                <div className="h-36 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-[#0a0e1a] to-slate-950" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(37,99,235,0.3),transparent_65%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.12),transparent_65%)]" />
                    {/* Grid pattern */}
                    <div
                        className="absolute inset-0 opacity-[0.06]"
                        style={{
                            backgroundImage:
                                "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
                            backgroundSize: "24px 24px",
                        }}
                    />
                    <div className="absolute -top-8 -left-8 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl" />
                </div>

                {/* Action buttons */}
                {isOwner && (
                    <div className="absolute top-3 right-3 flex gap-2 z-10">
                        <button
                            onClick={() => setShowInvite(true)}
                            className="flex items-center gap-1.5 bg-slate-800/90 backdrop-blur-md border border-slate-600 text-slate-200 px-3.5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-slate-700 active:scale-95"
                        >
                            <Mail className="h-3 w-3" />
                            Invitar
                        </button>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-1.5 bg-blue-600/90 backdrop-blur-md border border-blue-500 text-white px-3.5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-blue-500 active:scale-95"
                        >
                            <Edit2 className="h-3 w-3" />
                            Editar
                        </button>
                    </div>
                )}

                {/* Avatar + info */}
                <div className="px-5 pb-5 -mt-12 flex items-end gap-4">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-2xl border-[3px] border-[#0D0F1A] overflow-hidden bg-slate-800 shadow-xl ring-1 ring-slate-600/50">
                            {clerkUser?.imageUrl || user?.imageUrl ? (
                                <img
                                    src={clerkUser?.imageUrl || user?.imageUrl}
                                    alt="Club avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Layout className="h-8 w-8 text-slate-600" />
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-[#0D0F1A] flex items-center justify-center">
                            <Star className="h-2.5 w-2.5 text-white fill-white" />
                        </div>
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0 pt-10">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-black uppercase tracking-tight text-white leading-none truncate">
                                {clubName}
                            </h1>
                            <span className="shrink-0 px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 rounded-full text-[9px] font-black uppercase tracking-widest text-blue-300">
                                Club
                            </span>
                        </div>
                        <p className="text-slate-400 text-xs mt-1.5 leading-relaxed line-clamp-2">
                            {clubBio}
                        </p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {club?.location && (
                                <div className="flex items-center gap-1 text-slate-500 text-[10px] font-semibold">
                                    <MapPin className="h-3 w-3" />
                                    {club.location}
                                </div>
                            )}
                            {club?.website && (
                                <div className="flex items-center gap-1 text-slate-500 text-[10px] font-semibold">
                                    <Globe className="h-3 w-3" />
                                    {club.website.replace(/^https?:\/\//, "")}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── STATS STRIP ── */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { value: totalMembers, label: "Jugadores", icon: Users, accent: "text-blue-400" },
                    { value: activeTournaments, label: "En Curso", icon: Zap, accent: "text-emerald-400" },
                    { value: totalTournaments, label: "Torneos", icon: Trophy, accent: "text-blue-300" },
                ].map(({ value, label, icon: Icon, accent }) => (
                    <div
                        key={label}
                        className="bg-[#0D0F1A] border border-slate-700/60 rounded-2xl p-4 flex flex-col items-center gap-1.5 hover:border-slate-600 transition-colors"
                    >
                        <Icon className={`h-4 w-4 ${accent} opacity-80`} />
                        <div className={`text-2xl font-black tracking-tight ${accent}`}>{value}</div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center">
                            {label}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── TABS ── */}
            <div className="flex gap-1.5 bg-[#0D0F1A] p-1.5 rounded-2xl border border-slate-700/50 overflow-x-auto no-scrollbar">
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 ${activeTab === id
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                            }`}
                    >
                        <Icon className="h-3 w-3" />
                        {label}
                    </button>
                ))}
            </div>

            {/* ── CONTENT ── */}
            <div className="animate-in slide-in-from-bottom-2 duration-300">

                {/* ACCOUNT TAB */}
                {activeTab === "account" && (
                    <div className="bg-white p-2 rounded-3xl shadow-2xl overflow-hidden">
                        <UserProfile routing="hash" />
                    </div>
                )}

                {/* INFO TAB */}
                {activeTab === "info" && (
                    <div className="flex flex-col gap-4">
                        {/* Amenidades */}
                        <div className="bg-[#0D0F1A] border border-slate-700/60 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Zap className="h-3.5 w-3.5 text-blue-400" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Servicios y Amenidades
                                </h3>
                            </div>
                            {club?.amenities && club.amenities.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {club.amenities.map((a: string, i: number) => (
                                        <span
                                            key={i}
                                            className="px-3 py-1.5 bg-blue-900/50 border border-blue-700/60 rounded-full text-[10px] font-bold uppercase tracking-wider text-blue-300"
                                        >
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-xs italic">
                                    No hay servicios especificados aún.
                                </p>
                            )}
                        </div>

                        {/* Contacto */}
                        <div className="bg-[#0D0F1A] border border-slate-700/60 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Phone className="h-3.5 w-3.5 text-emerald-400" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Contacto Directo
                                </h3>
                            </div>
                            <div className="flex flex-col gap-3">
                                {club?.phone ? (
                                    <a href={`tel:${club.phone}`} className="flex items-center gap-3 group">
                                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:border-emerald-600 transition-colors">
                                            <Phone className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                                            {club.phone}
                                        </span>
                                    </a>
                                ) : null}
                                {club?.website ? (
                                    <a
                                        href={club.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 group"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:border-blue-600 transition-colors">
                                            <Globe className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors truncate">
                                            {club.website.replace(/^https?:\/\//, "")}
                                        </span>
                                    </a>
                                ) : null}
                                {!club?.phone && !club?.website && (
                                    <p className="text-slate-500 text-xs italic">
                                        No hay datos de contacto disponibles.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TORNEOS TAB */}
                {activeTab === "torneos" && (
                    <div className="flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-widest text-white">
                                    Mis Torneos
                                </h2>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                    {totalTournaments} evento{totalTournaments !== 1 ? "s" : ""} organizado{totalTournaments !== 1 ? "s" : ""}
                                </p>
                            </div>
                            {isOwner && (
                                <Link
                                    href="/tournaments/create"
                                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-900/30"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Crear
                                </Link>
                            )}
                        </div>

                        {/* Tournament list */}
                        {userTournaments && userTournaments.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                {userTournaments.map((t: any) => {
                                    const status = statusConfig[t.status] ?? statusConfig.abierto;
                                    return (
                                        <div
                                            key={t.id}
                                            className="bg-[#0D0F1A] border border-slate-700/60 rounded-2xl p-4 hover:border-slate-600 transition-all"
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-black uppercase tracking-tight text-sm text-white truncate">
                                                        {t.name}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <Clock className="h-2.5 w-2.5 text-slate-600" />
                                                        <span className="text-[9px] font-mono text-slate-600">
                                                            {t.id.slice(0, 8)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span
                                                    className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.bg} ${status.textColor} ${status.border}`}
                                                >
                                                    {status.label}
                                                </span>
                                            </div>

                                            <div className="flex gap-2">
                                                <Link
                                                    href={`/tournaments/${t.id}/manage`}
                                                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-600/50 hover:text-blue-400 transition-all py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300"
                                                >
                                                    Gestionar
                                                    <ChevronRight className="h-3 w-3" />
                                                </Link>
                                                {isOwner && (
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm("¿Seguro que quieres eliminar este torneo?")) {
                                                                await deleteTournament(t.id);
                                                                router.refresh();
                                                            }
                                                        }}
                                                        className="w-10 flex items-center justify-center bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-800/50 hover:border-red-700 rounded-xl transition-all"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-[#0D0F1A] border border-slate-700/60 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                                    <Trophy className="h-6 w-6 text-slate-600" />
                                </div>
                                <div>
                                    <p className="text-slate-300 text-sm font-semibold">Sin torneos aún</p>
                                    <p className="text-slate-500 text-xs mt-0.5">Creá tu primer torneo</p>
                                </div>
                                {isOwner && (
                                    <Link
                                        href="/tournaments/create"
                                        className="mt-1 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Crear Torneo
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── EDIT MODAL ── */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-lg z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-[#0D0F1A] border border-slate-700 rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-md max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 shadow-2xl">
                        {/* Modal header */}
                        <div className="sticky top-0 px-6 pt-5 pb-4 bg-[#0D0F1A] border-b border-slate-700/60 flex items-center justify-between z-10">
                            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-600 rounded-full sm:hidden" />
                            <h2 className="text-base font-black uppercase tracking-widest text-white">Editar Club</h2>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
                            {[
                                { key: "name", label: "Nombre Comercial", type: "text" },
                                { key: "location", label: "Ubicación", type: "text" },
                                { key: "phone", label: "Teléfono", type: "tel" },
                                { key: "website", label: "Sitio Web", type: "url" },
                            ].map(({ key, label, type }) => (
                                <div key={key} className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                                        {label}
                                    </label>
                                    <input
                                        type={type}
                                        value={(formData as any)[key]}
                                        onChange={(e) =>
                                            setFormData({ ...formData, [key]: e.target.value })
                                        }
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3.5 px-4 text-white text-sm font-medium transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-600"
                                    />
                                </div>
                            ))}

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                                    Descripción del Club
                                </label>
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    rows={3}
                                    placeholder="Contá de qué trata tu club..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3.5 px-4 text-white text-sm font-medium transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none placeholder:text-slate-600"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                                    Servicios (separados por coma)
                                </label>
                                <input
                                    type="text"
                                    value={formData.amenities}
                                    onChange={(e) =>
                                        setFormData({ ...formData, amenities: e.target.value })
                                    }
                                    placeholder="Bar, Vestuarios, Parking..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3.5 px-4 text-white text-sm font-medium transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-600"
                                />
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 bg-slate-800 text-slate-300 border border-slate-700 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── INVITE MODAL ── */}
            {showInvite && (
                <InviteModal
                    clubName={clubName}
                    clubId={club?.id}
                    onClose={() => setShowInvite(false)}
                />
            )}
        </div>
    );
}