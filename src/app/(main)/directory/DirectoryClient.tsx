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
        <span className="text-[10px] font-bold text-subtle uppercase tracking-widest italic">Sin calif.</span>
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
        <div className="min-h-screen bg-grid-carbon text-foreground font-sans selection:bg-volt/30 overflow-x-hidden">
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
                <nav className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-xl border-b border-hairline">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-full border border-celeste/30 overflow-hidden shrink-0 relative">
                                <img src="/img/stickers 1.jpg" alt="Logo" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-black italic tracking-tighter text-sm uppercase">A.C.A.P.</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Entrar</Link>
                            <Link href="/register" className="bg-azul-primary text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-azul-dark transition-all shadow-xl shadow-azul-primary/10 active:scale-95">Registrarme</Link>
                        </div>
                    </div>
                </nav>
            )}

            <main className={`relative z-10 max-w-6xl mx-auto px-4 pb-20 ${!isLoggedIn ? "pt-4" : "pt-2"}`}>

                {/* ── Page Header ── */}
                <header className="mb-4">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <p className="label-tech text-[9px] text-celeste-light mb-1 px-1">Clasificación Oficial</p>
                        <h1 className="heading-sport text-2xl md:text-3xl leading-tight pr-10">
                            <span className="text-gradient-animate">Directorio</span> <span className="text-foreground">de Clubes</span>
                        </h1>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-2 text-muted-foreground text-[10px] font-bold uppercase tracking-widest max-w-xl"
                    >
                        Clubes asociados a A.C.A.P.
                    </motion.p>
                </header>

                {/* ── Search & Filter Controls ── */}
                <div className="mb-6 space-y-4">
                    <div className="flex flex-col lg:flex-row gap-2 items-stretch">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-azul-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="BUSCAR CLUB O CIUDAD..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 h-11 bg-surface border border-hairline rounded-xl text-[9px] font-black uppercase tracking-widest focus:outline-none focus:ring-0 transition-all placeholder:text-muted-foreground text-foreground"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setSelectedSurface(null)}
                                className={`px-4 h-11 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${!selectedSurface ? 'bg-azul-primary text-white border-azul-primary shadow-lg shadow-azul-primary/20' : 'bg-surface text-muted-foreground border-hairline hover:border-azul-primary/40'}`}
                            >
                                Todas
                            </button>
                            {availableSurfaces.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSelectedSurface(s === selectedSurface ? null : s)}
                                    className={`px-4 h-11 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${s === selectedSurface ? 'bg-azul-primary text-white border-azul-primary shadow-lg shadow-azul-primary/20' : 'bg-surface text-muted-foreground border-hairline hover:border-azul-primary/40'}`}
                                >
                                    {s.replace("_", " ")}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Club Directory Table ── */}
                <div className="w-full bg-card/50 rounded-2xl border border-hairline overflow-hidden">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-hairline">
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground italic w-12 text-center">#</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">Club</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground italic hidden md:table-cell">Ubicación</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground italic text-center">Miembros</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground italic text-center">Puntos</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground italic text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode="popLayout">
                                    {filteredClubs.map((club, idx) => {
                                        const rank = initialClubs.findIndex(c => c.id === club.id) + 1;

                                        return (
                                            <motion.tr
                                                key={club.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.98 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="group hover:bg-surface transition-colors border-b border-hairline last:border-0"
                                            >
                                                {/* Rank Column */}
                                                <td className="px-4 py-2 text-center">
                                                    <span className="text-[10px] font-black italic text-muted-foreground border-r border-hairline pr-2">#{rank}</span>
                                                </td>

                                                {/* Club Column */}
                                                <td className="px-4 py-2">
                                                    <Link href={`/profiles/club?id=${club.id}`} className="flex items-center gap-3 group/item">
                                                        <div className="w-9 h-9 bg-surface rounded-lg border border-hairline group-hover/item:border-azul-primary/40 transition-all flex items-center justify-center relative shrink-0 overflow-hidden">
                                                            {club.logoUrl ? (
                                                                <Image src={club.logoUrl} alt={club.name} fill className="object-cover" unoptimized />
                                                            ) : (
                                                                <Building2 className="w-4 h-4 text-subtle" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[11px] font-black uppercase italic tracking-tighter text-foreground leading-none group-hover/item:text-azul-primary transition-colors">{club.name}</span>
                                                                {club.verified && <CheckCircle2 className="w-2.5 h-2.5 text-celeste fill-celeste/10" />}
                                                            </div>
                                                            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1 md:hidden">
                                                                {club.location || "Sin ubicación"}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                </td>

                                                {/* Location Column */}
                                                <td className="px-4 py-2 hidden md:table-cell">
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <MapPin className="w-3 h-3 text-celeste/60" />
                                                        <span className="text-[9px] font-bold uppercase tracking-[0.1em]">{club.location || "-"}</span>
                                                    </div>
                                                </td>

                                                {/* Members Column */}
                                                <td className="px-4 py-2 text-center">
                                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface rounded text-[9px] font-black text-subtle border border-hairline">
                                                        <Users className="w-2.5 h-2.5 text-celeste/60" />
                                                        {(club as any).memberCount || 0}
                                                    </div>
                                                </td>

                                                {/* Ranking Points Column */}
                                                <td className="px-4 py-2 text-center">
                                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-azul-primary/5 rounded text-[9px] font-black text-azul-primary border border-azul-primary/10">
                                                        <Trophy className="w-2.5 h-2.5" />
                                                        {((club as any).rankingPoints || 0).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                    </div>
                                                </td>

                                                {/* Actions Column */}
                                                <td className="px-4 py-2 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {(club.whatsapp || club.phone) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    const phone = club.whatsapp || club.phone;
                                                                    window.open(`https://wa.me/${phone?.replace(/\D/g, '')}`, '_blank');
                                                                }}
                                                                className="w-7 h-7 border border-hairline rounded-lg flex items-center justify-center text-muted-foreground hover:bg-azul-primary/5 hover:text-azul-primary hover:border-azul-primary/20 transition-all active:scale-90"
                                                            >
                                                                <MessageCircle className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                        <Link
                                                            href={`/profiles/club?id=${club.id}`}
                                                            className="h-7 px-3 bg-surface-raised hover:bg-azul-primary text-foreground rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                                                        >
                                                            <span className="text-[8px] font-black uppercase tracking-[0.15em]">Ver</span>
                                                            <ChevronRight className="w-2.5 h-2.5" />
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
                            <Search className="w-12 h-12 text-subtle mb-4" />
                            <h3 className="text-sm font-black uppercase italic tracking-widest text-muted-foreground">No hay clubes con estos criterios</h3>
                            <button onClick={() => { setSearch(""); setSelectedSurface(null); }} className="mt-4 text-[9px] font-black uppercase tracking-widest text-azul-primary border-b border-azul-primary/20 hover:border-azul-primary transition-all">Limpiar filtros</button>
                        </div>
                    )}
                </div>

                {/* KPI Bar Footer */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 opacity-40">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-3 h-3 text-azul-primary" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">{initialClubs.length} Clubes ACAP</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-celeste" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Comunidad ACAP</span>
                    </div>
                </div>

            </main>
        </div>
    );
}
