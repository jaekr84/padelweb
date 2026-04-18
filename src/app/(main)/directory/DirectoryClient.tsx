"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Search, MapPin, Star, CheckCircle2,
    Building2, XCircle, ChevronRight, MessageCircle,
    Trophy, Users, Coffee, Utensils,
    Waves, Car, GraduationCap, Wifi, Filter,
    Grid, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type Club } from "@/db/schema";

interface DirectoryClientProps {
    initialClubs: (Club & { memberCount?: number; rankingPoints?: number })[];
    isLoggedIn?: boolean;
}

// ── Constants & Helpers ──────────────────────────────────────────────────────

const AMENITIES_MAP: Record<string, { icon: any; label: string }> = {
    bar: { icon: Utensils, label: "Bar" },
    cafe: { icon: Coffee, label: "Café" },
    vestuarios: { icon: Waves, label: "Vestuarios" },
    parking: { icon: Car, label: "Parking" },
    wifi: { icon: Wifi, label: "Wi-Fi" },
    clases: { icon: GraduationCap, label: "Clases" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: string | null }) {
    const val = rating ? parseFloat(rating) : 0;
    if (val === 0) return (
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Sin calif.</span>
    );
    return (
        <div className="flex items-center gap-1 text-[11px] font-black text-azul-primary">
            <Star className="w-3 h-3 fill-azul-primary" />
            {val.toFixed(1)}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DirectoryClient({
    initialClubs,
    isLoggedIn
}: DirectoryClientProps) {
    const [search, setSearch] = useState("");
    const [selectedSurface, setSelectedSurface] = useState<string | null>(null);

    const filteredClubs = useMemo(() => {
        const q = search.toLowerCase();
        return initialClubs.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(q) || (c.location ?? "").toLowerCase().includes(q);

            let matchesSurface = true;
            if (selectedSurface) {
                const surfacesArr = typeof c.surfaces === 'string' ? JSON.parse(c.surfaces) : (c.surfaces || []);
                matchesSurface = Array.isArray(surfacesArr) && surfacesArr.includes(selectedSurface);
            }

            return matchesSearch && matchesSurface;
        });
    }, [search, selectedSurface, initialClubs]);

    const availableSurfaces = useMemo(() => {
        const surfaces = new Set<string>();
        initialClubs.forEach(c => {
            const arr = typeof c.surfaces === 'string' ? JSON.parse(c.surfaces) : (c.surfaces || []);
            if (Array.isArray(arr)) arr.forEach(s => surfaces.add(s));
        });
        return Array.from(surfaces);
    }, [initialClubs]);

    return (
        <div className="min-h-screen bg-[#FAFAFB] text-slate-900 font-sans selection:bg-azul-primary/10 overflow-x-hidden">
            <style>{`
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .text-gradient-animate {
                    background: linear-gradient(to right, #1e40af, #0ea5e9, #1e40af);
                    background-size: 300% 300%;
                    -webkit-background-clip: text;
                    color: transparent;
                    animation: gradient-x 6s ease infinite;
                }
            `}</style>

            {/* Ambient Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-azul-primary/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-[5%] left-[-5%] w-[600px] h-[600px] bg-celeste/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay" />
            </div>

            {/* Public Navbar (If not logged in) */}
            {!isLoggedIn && (
                <nav className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-slate-100">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-full border border-celeste/30 overflow-hidden shrink-0 relative">
                                <img src="/img/stickers 1.jpg" alt="Logo" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-black italic tracking-tighter text-sm uppercase">A.C.A.P.</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-azul-primary transition-colors">Entrar</Link>
                            <Link href="/register" className="bg-azul-primary text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-azul-dark transition-all shadow-xl shadow-azul-primary/10 active:scale-95">Registrarme</Link>
                        </div>
                    </div>
                </nav>
            )}

            <main className={`relative z-10 max-w-7xl mx-auto px-6 pb-40 ${!isLoggedIn ? "pt-8" : "pt-4"}`}>

                {/* ── Page Header ── */}
                <header className="mb-8">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-celeste mb-2 px-1">Clasificación Oficial</p>
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase italic tracking-tighter leading-[0.9] pr-10">
                            <span className="text-gradient-animate">Directorio</span><br />
                            <span className="text-slate-900">de Clubes</span>
                        </h1>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-8 text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest max-w-xl"
                    >
                        Clubes asociados a A.C.A.P.
                    </motion.p>
                </header>

                {/* ── Search & Filter Controls ── */}
                <div className="mb-12 space-y-6">
                    <div className="flex flex-col lg:flex-row gap-4 items-stretch">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-azul-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="BUSCAR CLUB O CIUDAD..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-16 pr-6 py-6 bg-white border border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200/50 focus:outline-none focus:ring-0 transition-all placeholder:text-slate-300"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                            <button
                                onClick={() => setSelectedSurface(null)}
                                className={`px-6 py-4 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${!selectedSurface ? 'bg-azul-primary text-white border-azul-primary shadow-lg shadow-azul-primary/20' : 'bg-white text-slate-400 border-slate-100 hover:border-azul-primary/30'}`}
                            >
                                Todas
                            </button>
                            {availableSurfaces.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSelectedSurface(s === selectedSurface ? null : s)}
                                    className={`px-6 py-4 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${s === selectedSurface ? 'bg-azul-primary text-white border-azul-primary shadow-lg shadow-azul-primary/20' : 'bg-white text-slate-400 border-slate-100 hover:border-azul-primary/30'}`}
                                >
                                    {s.replace("_", " ")}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Club Directory Table ── */}
                <div className="w-full bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] overflow-hidden">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic w-16 text-center">#</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Club</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic hidden md:table-cell">Ubicación</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic text-center">Miembros</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic text-center">Promedio</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode="popLayout">
                                    {filteredClubs.map((club, idx) => {
                                        const amenitiesArr = typeof club.amenities === 'string' ? JSON.parse(club.amenities) : (club.amenities || []);
                                        const amenities = Array.isArray(amenitiesArr) ? amenitiesArr : [];
                                        const rank = initialClubs.findIndex(c => c.id === club.id) + 1;

                                        return (
                                            <motion.tr
                                                key={club.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.98 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0"
                                            >
                                                {/* Rank Column */}
                                                <td className="px-8 py-5 text-center">
                                                    <span className="text-xs font-black italic text-slate-400 border-r border-slate-100 pr-4">#{rank}</span>
                                                </td>

                                                {/* Club Column */}
                                                <td className="px-8 py-5">
                                                    <Link href={`/profiles/club?id=${club.id}`} className="flex items-center gap-4 group/item">
                                                        <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 shadow-sm group-hover/item:border-azul-primary/30 transition-all flex items-center justify-center relative shrink-0 overflow-hidden">
                                                            {club.logoUrl ? (
                                                                <Image src={club.logoUrl} alt={club.name} fill className="object-cover" unoptimized />
                                                            ) : (
                                                                <Building2 className="w-5 h-5 text-slate-300" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[13px] font-black uppercase italic tracking-tighter text-slate-900 leading-none group-hover/item:text-azul-primary transition-colors">{club.name}</span>
                                                                {club.verified && <CheckCircle2 className="w-3 h-3 text-celeste fill-celeste/10" />}
                                                            </div>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 md:hidden">
                                                                {club.location || "Sin ubicación"}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                </td>

                                                {/* Location Column */}
                                                <td className="px-8 py-5 hidden md:table-cell">
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <MapPin className="w-3.5 h-3.5 text-celeste/60" />
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.1em]">{club.location || "-"}</span>
                                                    </div>
                                                </td>

                                                {/* Members Column */}
                                                <td className="px-8 py-5 text-center">
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-600 border border-slate-100">
                                                        <Users className="w-3 h-3 text-celeste/60" />
                                                        {(club as any).memberCount || 0}
                                                    </div>
                                                </td>

                                                {/* Ranking Points Column */}
                                                <td className="px-8 py-5 text-center">
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-azul-primary/5 rounded-lg text-[10px] font-black text-azul-primary border border-azul-primary/10">
                                                        <Trophy className="w-3 h-3" />
                                                        {((club as any).rankingPoints || 0).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                    </div>
                                                </td>

                                                {/* Actions Column */}
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {(club.whatsapp || club.phone) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    const phone = club.whatsapp || club.phone;
                                                                    window.open(`https://wa.me/${phone?.replace(/\D/g, '')}`, '_blank');
                                                                }}
                                                                className="w-9 h-9 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-azul-primary/5 hover:text-azul-primary hover:border-azul-primary/20 transition-all active:scale-90"
                                                            >
                                                                <MessageCircle className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <Link
                                                            href={`/profiles/club?id=${club.id}`}
                                                            className="h-9 px-4 bg-slate-900 hover:bg-azul-primary text-white rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                                                        >
                                                            <span className="text-[9px] font-black uppercase tracking-[0.15em]">Ver</span>
                                                            <ChevronRight className="w-3 h-3" />
                                                        </Link>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State Table Body */}
                    {filteredClubs.length === 0 && (
                        <div className="py-32 flex flex-col items-center justify-center text-center">
                            <Search className="w-12 h-12 text-slate-100 mb-4" />
                            <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-400">No hay clubes con estos criterios</h3>
                            <button onClick={() => { setSearch(""); setSelectedSurface(null); }} className="mt-4 text-[9px] font-black uppercase tracking-widest text-azul-primary border-b border-azul-primary/20 hover:border-azul-primary transition-all">Limpiar filtros</button>
                        </div>
                    )}
                </div>

                {/* KPI Bar Footer */}
                <div className="mt-12 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-40">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-4 h-4 text-azul-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{initialClubs.length} Clubes ACAP</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-celeste" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Comunidad ACAP</span>
                    </div>
                </div>

            </main>
        </div>
    );
}
