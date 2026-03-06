"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Search, MapPin, Star, CheckCircle2,
    Building2, Map, Users, XCircle, GraduationCap,
    ChevronRight, Layers, MessageCircle
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = "clubes" | "centros" | "profes";

interface Club {
    id: string;
    name: string;
    location: string | null;
    type: string;
    rating: string | null;
    verified: boolean | null;
    logoUrl: string | null;
    amenities: string[] | null;
    courts: number | null;
    surfaces: string[] | null;
    phone: string | null;
    whatsapp: string | null;
}

interface Instructor {
    id: string;
    name: string;
    location: string | null;
    level: string | null;
    specialities: string[] | null;
    rating: string | null;
    verified: boolean | null;
    avatarUrl: string | null;
    experience: string | null;
    phone: string | null;
    whatsapp: string | null;
}

interface DirectoryClientProps {
    initialClubs: Club[];
    initialCentros: Club[];
    initialProfes: Instructor[];
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function VerifiedBadge() {
    return (
        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-950 border border-blue-800 px-2 py-0.5 rounded-full w-fit">
            <CheckCircle2 className="w-3 h-3" />
            Verificado
        </div>
    );
}

function StarRating({ rating }: { rating: string | null }) {
    const val = rating ? parseFloat(rating) : 0;
    if (val === 0) return null;
    return (
        <div className="flex items-center gap-1 text-xs font-black text-amber-400">
            <Star className="w-3 h-3 fill-amber-400" />
            {val.toFixed(1)}
        </div>
    );
}

function Avatar({ url, emoji, name }: { url: string | null; emoji: string; name: string }) {
    if (url) {
        return <img src={url} alt={name} className="w-full h-full object-cover" />;
    }
    return <span className="text-2xl">{emoji}</span>;
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm font-bold">No hay {label} aún</p>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DirectoryClient({
    initialClubs,
    initialCentros,
    initialProfes,
}: DirectoryClientProps) {
    const [tab, setTab] = useState<Tab>("clubes");
    const [search, setSearch] = useState("");

    const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
        { key: "clubes", label: "Clubes", icon: <Building2 className="w-3.5 h-3.5" />, count: initialClubs.length },
        { key: "centros", label: "Centros", icon: <Map className="w-3.5 h-3.5" />, count: initialCentros.length },
        { key: "profes", label: "Profesores", icon: <Users className="w-3.5 h-3.5" />, count: initialProfes.length },
    ];

    const q = search.toLowerCase();
    const filteredClubs = initialClubs.filter(c => c.name.toLowerCase().includes(q) || (c.location ?? "").toLowerCase().includes(q));
    const filteredCentros = initialCentros.filter(c => c.name.toLowerCase().includes(q) || (c.location ?? "").toLowerCase().includes(q));
    const filteredProfes = initialProfes.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.location ?? "").toLowerCase().includes(q) ||
        p.specialities?.some(s => s.toLowerCase().includes(q))
    );

    const currentList =
        tab === "clubes" ? filteredClubs :
            tab === "centros" ? filteredCentros :
                filteredProfes;

    const isEmpty = currentList.length === 0;

    return (
        <div className="min-h-screen bg-[#090A0F] text-white pb-24 font-sans selection:bg-blue-500/30">

            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] bg-blue-600/8 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6">

                {/* ── Header ── */}
                <div className="mb-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-1">Red Padel</p>
                    <h1 className="text-3xl font-black uppercase italic tracking-tight text-white">
                        Directorio
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Clubes, centros y profesores de toda la red
                    </p>
                </div>

                {/* ── Search ── */}
                <div className="relative mb-5">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                        type="text"
                        inputMode="search"
                        className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-base text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-700 transition-all"
                        placeholder={`Buscar ${tab === "centros" ? "centros" : tab === "clubes" ? "clubes" : "profesores"}...`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            <XCircle className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-2 overflow-x-auto pb-1 mb-6 no-scrollbar">
                    {tabs.map(t => {
                        const isActive = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => { setTab(t.key); setSearch(""); }}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${isActive
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                                    }`}
                            >
                                {t.icon}
                                {t.label}
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${isActive ? "bg-white/20" : "bg-slate-800"}`}>
                                    {t.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Content ── */}
                {isEmpty ? (
                    <EmptyState label={
                        tab === "clubes" ? "clubes registrados" :
                            tab === "centros" ? "centros registrados" :
                                "profesores registrados"
                    } />
                ) : (
                    <div className="flex flex-col gap-3">

                        {/* CLUBES */}
                        {tab === "clubes" && filteredClubs.map(club => (
                            <Link key={club.id} href={`/profiles/club?id=${club.id}`} className="group block">
                                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden transition-all hover:border-slate-700 active:scale-[0.99]">
                                    <div className="p-4 flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="w-14 h-14 shrink-0 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex items-center justify-center">
                                            <Avatar url={club.logoUrl} emoji="🏟️" name={club.name} />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="text-sm font-black uppercase italic tracking-tight text-white truncate group-hover:text-blue-300 transition-colors">
                                                    {club.name}
                                                </h3>
                                                <StarRating rating={club.rating} />
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-2">
                                                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                                <span className="truncate">{club.location || "Sin ubicación"}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
                                                    <Building2 className="w-2.5 h-2.5" /> Club
                                                </span>
                                                {club.amenities?.slice(0, 2).map(a => (
                                                    <span key={a} className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950 border border-emerald-900 px-2 py-0.5 rounded-full">
                                                        {a}
                                                    </span>
                                                ))}
                                                {club.verified && <VerifiedBadge />}
                                            </div>
                                        </div>

                                        {/* WhatsApp Button */}
                                        {(club.whatsapp || club.phone) && (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const phone = club.whatsapp || club.phone;
                                                    window.open(`https://wa.me/${phone?.replace(/\D/g, '')}`, '_blank');
                                                }}
                                                className="w-10 h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 flex items-center justify-center transition-all shrink-0"
                                            >
                                                <MessageCircle className="w-5 h-5 font-bold" />
                                            </button>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {/* CENTROS */}
                        {tab === "centros" && filteredCentros.map(centro => (
                            <Link key={centro.id} href={`/profiles/centro?id=${centro.id}`} className="group block">
                                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden transition-all hover:border-slate-700 active:scale-[0.99]">
                                    <div className="p-4 flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="w-14 h-14 shrink-0 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex items-center justify-center">
                                            <Avatar url={centro.logoUrl} emoji="🎾" name={centro.name} />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="text-sm font-black uppercase italic tracking-tight text-white truncate group-hover:text-blue-300 transition-colors">
                                                    {centro.name}
                                                </h3>
                                                <StarRating rating={centro.rating} />
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-2">
                                                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                                <span className="truncate">{centro.location || "Sin ubicación"}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
                                                    <Layers className="w-2.5 h-2.5" /> {centro.courts || 0} canchas
                                                </span>
                                                {centro.surfaces?.slice(0, 2).map(s => (
                                                    <span key={s} className="text-[9px] font-black uppercase tracking-widest text-purple-400 bg-purple-950 border border-purple-900 px-2 py-0.5 rounded-full">
                                                        {s}
                                                    </span>
                                                ))}
                                                {centro.verified && <VerifiedBadge />}
                                            </div>
                                        </div>

                                        {/* WhatsApp Button */}
                                        {(centro.whatsapp || centro.phone) && (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const phone = centro.whatsapp || centro.phone;
                                                    window.open(`https://wa.me/${phone?.replace(/\D/g, '')}`, '_blank');
                                                }}
                                                className="w-10 h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 flex items-center justify-center transition-all shrink-0"
                                            >
                                                <MessageCircle className="w-5 h-5 font-bold" />
                                            </button>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {/* PROFES */}
                        {tab === "profes" && filteredProfes.map(profe => (
                            <Link key={profe.id} href={`/profiles/profe?id=${profe.id}`} className="group block">
                                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden transition-all hover:border-slate-700 active:scale-[0.99]">
                                    <div className="p-4 flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="w-14 h-14 shrink-0 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex items-center justify-center">
                                            <Avatar url={profe.avatarUrl} emoji="🎓" name={profe.name} />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="text-sm font-black uppercase italic tracking-tight text-white truncate group-hover:text-blue-300 transition-colors">
                                                    {profe.name}
                                                </h3>
                                                <StarRating rating={profe.rating} />
                                            </div>
                                            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mb-2">
                                                {profe.location && (
                                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                                                        <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                                        <span className="truncate">{profe.location}</span>
                                                    </div>
                                                )}
                                                {profe.level && (
                                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                                                        <GraduationCap className="w-3 h-3 text-amber-500 shrink-0" />
                                                        {profe.level}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {profe.specialities?.slice(0, 3).map(s => (
                                                    <span key={s} className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-950 border border-amber-900 px-2 py-0.5 rounded-full">
                                                        {s}
                                                    </span>
                                                ))}
                                                {profe.verified && <VerifiedBadge />}
                                            </div>
                                        </div>

                                        {/* WhatsApp Button */}
                                        {(profe.whatsapp || profe.phone) && (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const phone = profe.whatsapp || profe.phone;
                                                    window.open(`https://wa.me/${phone?.replace(/\D/g, '')}`, '_blank');
                                                }}
                                                className="w-10 h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 flex items-center justify-center transition-all shrink-0"
                                            >
                                                <MessageCircle className="w-5 h-5 font-bold" />
                                            </button>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </div>
                            </Link>
                        ))}

                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`
            }} />
        </div>
    );
}
