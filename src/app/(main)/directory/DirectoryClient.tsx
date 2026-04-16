"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Search, MapPin, Star, CheckCircle2,
    Building2, XCircle, ChevronRight, MessageCircle,
    Infinity,
    Trophy,
    Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { type Club } from "@/db/schema";

interface DirectoryClientProps {
    initialClubs: Club[];
    isLoggedIn?: boolean;
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function VerifiedBadge() {
    return (
        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full shadow-lg backdrop-blur-md">
            <CheckCircle2 className="w-3 h-3 fill-emerald-500/20" />
            Verificado
        </div>
    );
}

function StarRating({ rating }: { rating: string | null }) {
    const val = rating ? parseFloat(rating) : 0;
    if (val === 0) return null;
    return (
        <div className="flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
            <Star className="w-3 h-3 fill-amber-400" />
            {val.toFixed(1)}
        </div>
    );
}

function Avatar({ url, emoji, name }: { url: string | null; emoji: string; name: string }) {
    if (url) {
        return <Image src={url} alt={name} fill className="object-cover" unoptimized={true} sizes="80px" />;
    }
    return <span className="text-2xl">{emoji}</span>;
}

function EmptyState({ label }: { label: string }) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center opacity-40 select-none"
        >
            <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl">
                <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter">No hay {label}</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2">Intentá con otros términos de búsqueda.</p>
        </motion.div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DirectoryClient({
    initialClubs,
    isLoggedIn
}: DirectoryClientProps) {
    const [search, setSearch] = useState("");

    const q = search.toLowerCase();
    const filteredClubs = initialClubs.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.location ?? "").toLowerCase().includes(q)
    );

    const isEmpty = filteredClubs.length === 0;

    return (
        <div className="min-h-screen bg-background text-foreground relative font-sans selection:bg-emerald-500/30 overflow-x-hidden">
            
            {/* CSS KEYFRAMES & GLOBAL STYLES */}
            <style>{`
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .text-gradient-animate {
                    background: linear-gradient(to right, #10b981, #3b82f6, #06b6d4, #10b981);
                    background-size: 300% 300%;
                    -webkit-background-clip: text;
                    color: transparent;
                    animation: gradient-x 6s ease infinite;
                }
                .glass-card {
                    background-color: color-mix(in srgb, var(--card) 85%, transparent);
                    backdrop-filter: blur(20px);
                    border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
                }
                .glass-card:hover {
                    border-color: rgba(16, 185, 129, 0.4);
                }
                .glow-btn {
                    position: relative;
                }
                .glow-btn::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: inherit;
                    background: linear-gradient(45deg, #10b981, #3b82f6);
                    z-index: -1;
                    filter: blur(8px);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .glow-btn:hover::before {
                    opacity: 1;
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            
            {/* Ambient background glows */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]" />
                <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            {/* Public Header */}
            {!isLoggedIn && (
                <div className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-slate-100 shadow-[0_1px_10px_-5px_rgba(0,0,0,0.05)]">
                    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2.5 transition-transform active:scale-95 group">
                            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                                <span className="text-white font-black text-sm tracking-tighter">AC</span>
                            </div>
                            <div className="flex flex-col -gap-1">
                                <span className="text-[14px] font-black tracking-tight text-slate-900 leading-none">A.C.A.P.</span>
                                <span className="text-[9px] font-bold text-emerald-600/80 uppercase tracking-widest leading-none">Padel App</span>
                            </div>
                        </Link>
                        <div className="flex items-center gap-3">
                            <Link href="/login" className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10">Login</Link>
                            <Link href="/" className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm">Volver</Link>
                        </div>
                    </div>
                </div>
            )}

            <div className={`relative z-10 max-w-7xl mx-auto px-6 pb-32 ${!isLoggedIn ? "pt-8" : "pt-12"}`}>

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-1"
                    >
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/80 mb-2 px-1">Comunidad Padel</p>
                        <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
                            <span className="text-gradient-animate drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">Directorio</span><br/>
                            <span className="text-foreground/90">de Clubes</span>
                        </h1>
                        <p className="text-muted-foreground text-[11px] font-black uppercase tracking-[0.2em] mt-4 opacity-60 px-1">
                            Explorá {initialClubs.length} sedes conectadas a nuestra red
                        </p>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex gap-3"
                    >
                        <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-xl">
                            <Building2 className="w-5 h-5 text-emerald-500" />
                            <div className="flex flex-col">
                                <span className="text-xs font-black leading-none">{initialClubs.length}</span>
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Clubes</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* ── Search ── */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative mb-12 group"
                >
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        inputMode="search"
                        className="w-full pl-14 pr-12 py-5 glass-card rounded-[2rem] text-sm font-bold uppercase italic tracking-tight text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-2xl"
                        placeholder="Buscar por nombre, barrio o ciudad..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <AnimatePresence>
                        {search && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={() => setSearch("")}
                                className="absolute inset-y-4 right-4 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:scale-90"
                            >
                                <XCircle className="h-5 w-5" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ── Content ── */}
                {isEmpty ? (
                    <EmptyState label="clubes registrados" />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {filteredClubs.map((club, idx) => (
                                <motion.div
                                    key={club.id}
                                    layout
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <Link href={`/profiles/club?id=${club.id}`} className="group block h-full">
                                        <div className="glass-card rounded-[2.5rem] overflow-hidden transition-all duration-500 h-full flex flex-col group-hover:shadow-emerald-500/10 group-hover:translate-y-[-4px] relative">
                                            {/* Card Highlight */}
                                            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/5 via-transparent to-transparent pointer-events-none" />
                                            
                                            <div className="p-8 flex flex-col h-full gap-6 relative z-10">
                                                <div className="flex items-start justify-between gap-4">
                                                    {/* Avatar */}
                                                    <div className="w-20 h-20 shrink-0 bg-white/5 border border-white/10 rounded-[1.75rem] overflow-hidden flex items-center justify-center relative shadow-inner group-hover:border-emerald-500/30 transition-colors duration-500">
                                                        <Avatar url={club.logoUrl} emoji="🏟️" name={club.name} />
                                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    
                                                    <div className="flex flex-col items-end gap-2">
                                                        <StarRating rating={club.rating} />
                                                        {club.verified && <VerifiedBadge />}
                                                    </div>
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground leading-none group-hover:text-emerald-400 transition-colors duration-500">
                                                        {club.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground group-hover:text-foreground/80 transition-colors">
                                                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                        <span className="truncate">{club.location || "Sin ubicación"}</span>
                                                    </div>
                                                </div>

                                                {/* Meta Info */}
                                                <div className="flex items-center justify-between pt-6 border-t border-white/5 font-black uppercase text-[8px] tracking-[0.25em] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                                                    <div className="flex gap-4">
                                                        <span className="flex items-center gap-1.5"><Infinity className="w-3 h-3 text-emerald-500/40" /> Abierto</span>
                                                        <span className="flex items-center gap-1.5"><Users className="w-3 h-3 text-blue-500/40" /> +{Math.floor(Math.random() * 50) + 10} Hoy</span>
                                                    </div>
                                                </div>

                                                {/* Action Row */}
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 bg-white/5 group-hover:bg-emerald-500/10 border border-white/5 group-hover:border-emerald-500/20 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-500">
                                                        <span className="text-[9px] font-black uppercase tracking-widest group-hover:text-emerald-400">Ver Perfil</span>
                                                        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                                    </div>
                                                    
                                                    {(club.whatsapp || club.phone) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                const phone = club.whatsapp || club.phone;
                                                                window.open(`https://wa.me/${phone?.replace(/\D/g, '')}`, '_blank');
                                                            }}
                                                            className="w-14 h-14 rounded-2xl bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-500/20 flex items-center justify-center transition-all shrink-0 shadow-lg active:scale-95"
                                                        >
                                                            <MessageCircle className="w-6 h-6 font-bold" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
