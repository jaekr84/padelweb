"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, MapPin, Star, CheckCircle2, ShieldCheck, Building2, Map, Users, X, XCircle } from "lucide-react";

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
}

interface DirectoryClientProps {
    initialClubs: Club[];
    initialCentros: Club[];
    initialProfes: Instructor[];
}

// ── Components ────────────────────────────────────────────────────────────────
function VerifiedBadge() {
    return (
        <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-full w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Verificado</span>
        </div>
    );
}

function StarRating({ rating }: { rating: string | null }) {
    const val = rating ? parseFloat(rating) : 0;
    if (val === 0) return null;
    return (
        <div className="flex items-center gap-1 text-[13px] font-bold text-slate-700 dark:text-slate-300">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>{val.toFixed(1)}</span>
        </div>
    );
}

export default function DirectoryClient({
    initialClubs,
    initialCentros,
    initialProfes
}: DirectoryClientProps) {
    const [tab, setTab] = useState<Tab>("clubes");
    const [search, setSearch] = useState("");

    const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
        { key: "clubes", label: "Clubes", icon: <Building2 className="w-4 h-4" />, count: initialClubs.length },
        { key: "centros", label: "Centros de Pádel", icon: <Map className="w-4 h-4" />, count: initialCentros.length },
        { key: "profes", label: "Profesores", icon: <Users className="w-4 h-4" />, count: initialProfes.length },
    ];

    const q = search.toLowerCase();

    // Data Filter Functions
    const filteredClubs = initialClubs.filter((c) => c.name.toLowerCase().includes(q) || (c.location && c.location.toLowerCase().includes(q)));
    const filteredCentros = initialCentros.filter((c) => c.name.toLowerCase().includes(q) || (c.location && c.location.toLowerCase().includes(q)));
    const filteredProfes = initialProfes.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        p.specialities?.some((s) => s.toLowerCase().includes(q))
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#090A0F] text-slate-900 dark:text-slate-100 pb-24 font-sans selection:bg-blue-500/30">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 right-0 h-[30vh] bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-transparent pointer-events-none -z-0" />
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none -z-0" />

            <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col pt-6 md:pt-12 md:px-6">

                {/* Header */}
                <div className="px-5 mb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Map className="w-8 h-8 text-blue-500" />
                        Directorio
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
                        Encontrá clubes, centros de pádel y profesores de toda la red
                    </p>
                </div>

                {/* Search Bar */}
                <div className="px-5 mb-6">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-11 pr-10 py-3.5 bg-white dark:bg-[#13161F] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                            placeholder={`Buscar ${tab === "centros" ? "centros" : tab === "clubes" ? "clubes" : "profesores"}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Controles: Tabs Scrollables (iOS style) */}
                <div className="px-5 mb-6 sticky top-0 z-20 py-2 bg-slate-50/90 dark:bg-[#090A0F]/90 border-b border-transparent dark:border-white/5 backdrop-blur-xl -mx-5 px-5 md:mx-0 md:px-0 md:bg-transparent md:border-none">
                    <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1">
                        {tabs.map((t) => {
                            const isActive = tab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => { setTab(t.key); setSearch(""); }}
                                    className={`px-5 py-2.5 rounded-full text-[13px] font-bold transition-all duration-300 whitespace-nowrap outline-none flex items-center gap-2 ${isActive
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                                        : "bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    {t.icon}
                                    {t.label}
                                    <span className={`ml-1 text-[11px] px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                        {t.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="px-5 md:px-0">
                    {/* Empty search state */}
                    {search && (
                        ((tab === "clubes" && filteredClubs.length === 0) ||
                            (tab === "centros" && filteredCentros.length === 0) ||
                            (tab === "profes" && filteredProfes.length === 0)) && (
                            <div className="py-24 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-slate-800/20 rounded-[2rem] border border-slate-200/50 dark:border-white/5 backdrop-blur-md">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-5">
                                    <Search className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                                </div>
                                <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-200 mb-2">Sin resultados</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-[260px] text-[15px] leading-relaxed">No encontramos resultados para "{search}".</p>
                            </div>
                        )
                    )}

                    {/* ── CLUBES ── */}
                    {tab === "clubes" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredClubs.map((club) => (
                                <div key={club.id} className="bg-white dark:bg-[#13161F] rounded-[24px] overflow-hidden border border-slate-200/50 dark:border-slate-800/60 p-5 flex flex-col shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group">
                                    <div className="flex gap-4 mb-4 items-start">
                                        <div className="w-16 h-16 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl">
                                            {club.logoUrl ? <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" /> : "🏟️"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{club.name}</h3>
                                                <StarRating rating={club.rating} />
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[13px] mb-2">
                                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">{club.location || "Sin ubicación"}</span>
                                            </div>
                                            {club.verified && <VerifiedBadge />}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-6">
                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1">
                                            <Building2 className="w-3 h-3" /> Club
                                        </span>
                                        {club.amenities?.slice(0, 2).map(a => (
                                            <span key={a} className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-md text-[11px] font-semibold">
                                                {a}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="mt-auto grid grid-cols-2 gap-2">
                                        <Link href={`/profiles/club?id=${club.id}`} className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-2.5 rounded-xl transition-colors">
                                            Ver Perfil
                                        </Link>
                                        <button className="flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-bold text-sm py-2.5 rounded-xl transition-colors hover:bg-slate-200 dark:hover:bg-slate-800">
                                            Torneos
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {initialClubs.length === 0 && !search && <p className="text-slate-500 dark:text-slate-400 px-2 py-4">No hay clubes registrados aún.</p>}
                        </div>
                    )}

                    {/* ── CENTROS DE PÁDEL ── */}
                    {tab === "centros" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredCentros.map((centro) => (
                                <div key={centro.id} className="bg-white dark:bg-[#13161F] rounded-[24px] overflow-hidden border border-slate-200/50 dark:border-slate-800/60 p-5 flex flex-col shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group">
                                    <div className="flex gap-4 mb-4 items-start">
                                        <div className="w-16 h-16 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl">
                                            {centro.logoUrl ? <img src={centro.logoUrl} alt={centro.name} className="w-full h-full object-cover" /> : "🎾"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{centro.name}</h3>
                                                <StarRating rating={centro.rating} />
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[13px] mb-2">
                                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">{centro.location || "Sin ubicación"}</span>
                                            </div>
                                            {centro.verified && <VerifiedBadge />}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-6">
                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1">
                                            <Map className="w-3 h-3" /> {centro.courts || 0} canchas
                                        </span>
                                        {centro.surfaces?.map((s) => (
                                            <span key={s} className="bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded-md text-[11px] font-semibold">
                                                {s}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="mt-auto grid grid-cols-2 gap-2">
                                        <Link href={`/profiles/centro?id=${centro.id}`} className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-2.5 rounded-xl transition-colors">
                                            Ver Perfil
                                        </Link>
                                        <button className="flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm py-2.5 rounded-xl transition-colors hover:opacity-90">
                                            Reservar
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {initialCentros.length === 0 && !search && <p className="text-slate-500 dark:text-slate-400 px-2 py-4">No hay centros de pádel registrados aún.</p>}
                        </div>
                    )}

                    {/* ── PROFES ── */}
                    {tab === "profes" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredProfes.map((profe) => (
                                <div key={profe.id} className="bg-white dark:bg-[#13161F] rounded-[24px] overflow-hidden border border-slate-200/50 dark:border-slate-800/60 p-5 flex flex-col shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group">
                                    <div className="flex gap-4 mb-4 items-start">
                                        <div className="w-16 h-16 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl">
                                            {profe.avatarUrl ? <img src={profe.avatarUrl} alt={profe.name} className="w-full h-full object-cover" /> : "🎓"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{profe.name}</h3>
                                                <StarRating rating={profe.rating} />
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[13px] mb-2">
                                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">{profe.location || "Sin ubicación"}</span>
                                            </div>
                                            {profe.verified && <VerifiedBadge />}
                                        </div>
                                    </div>

                                    <div className="text-[13px] text-slate-600 dark:text-slate-300 mb-3 font-medium flex items-center gap-2">
                                        <span>🎓 {profe.level || "Nivel no especificado"}</span>
                                        {profe.experience && <span className="text-slate-400">· {profe.experience}</span>}
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {profe.specialities?.map((s) => (
                                            <span key={s} className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-md text-[11px] font-semibold">
                                                {s}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="mt-auto grid grid-cols-2 gap-2">
                                        <Link href={`/profiles/profe?id=${profe.id}`} className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-2.5 rounded-xl transition-colors">
                                            Ver Perfil
                                        </Link>
                                        <button className="flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm py-2.5 rounded-xl transition-colors">
                                            Contactar
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {initialProfes.length === 0 && !search && <p className="text-slate-500 dark:text-slate-400 px-2 py-4">No hay profesores registrados aún.</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* Utilidad para esconder scrollbar */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
}
