"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Search, MapPin, Star, CheckCircle2,
    Building2, XCircle, ChevronRight, MessageCircle
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
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

interface DirectoryClientProps {
    initialClubs: Club[];
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function VerifiedBadge() {
    return (
        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 dark:bg-blue-950 dark:border-blue-800 px-2 py-0.5 rounded-full w-fit">
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
        return <Image src={url} alt={name} fill className="object-cover" />;
    }
    return <span className="text-2xl">{emoji}</span>;
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-card border border-border rounded-3xl flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-muted-foreground opacity-30" />
            </div>
            <p className="text-muted-foreground text-sm font-bold opacity-60">No hay {label} aún</p>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DirectoryClient({
    initialClubs,
}: DirectoryClientProps) {
    const [search, setSearch] = useState("");

    const q = search.toLowerCase();
    const filteredClubs = initialClubs.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.location ?? "").toLowerCase().includes(q)
    );

    const isEmpty = filteredClubs.length === 0;

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 font-sans selection:bg-blue-500/30">

            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] bg-blue-600/8 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6">

                {/* ── Header ── */}
                <div className="mb-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-1">Red Padel</p>
                    <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground">
                        Directorio de Clubes
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium mt-1">
                        Explorá los mejores clubes de nuestra red
                    </p>
                </div>

                {/* ── Search ── */}
                <div className="relative mb-8">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                        type="text"
                        inputMode="search"
                        className="w-full pl-10 pr-10 py-3 bg-card border border-border rounded-2xl text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-700 transition-all shadow-inner"
                        placeholder="Buscar clubes por nombre o ubicación..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <XCircle className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* ── Content ── */}
                {isEmpty ? (
                    <EmptyState label="clubes registrados" />
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredClubs.map(club => (
                            <Link key={club.id} href={`/profiles/club?id=${club.id}`} className="group block">
                                <div className="bg-card border border-border rounded-3xl overflow-hidden transition-all hover:border-blue-500/30 active:scale-[0.99] shadow-sm">
                                    <div className="p-4 flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="w-14 h-14 shrink-0 bg-muted border border-border rounded-2xl overflow-hidden flex items-center justify-center relative">
                                            <Avatar url={club.logoUrl} emoji="🏟️" name={club.name} />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="text-sm font-black uppercase italic tracking-tight text-foreground truncate group-hover:text-blue-500 transition-colors">
                                                    {club.name}
                                                </h3>
                                                <StarRating rating={club.rating} />
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground mb-2">
                                                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                                <span className="truncate">{club.location || "Sin ubicación"}</span>
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
                                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
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
