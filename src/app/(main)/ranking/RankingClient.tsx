"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
    Trophy, Medal, Crown, Shield, User, Users, X, Activity, 
    Calendar as CalendarIcon, Hash, ChevronRight, Search, 
    Filter, Star, TrendingUp, Zap, Loader2
} from "lucide-react";
import { type Category } from "@/db/schema";
import { getPlayerMatchHistory } from "./actions";
import { motion, AnimatePresence } from "framer-motion";
import PlayerCard from "@/components/PlayerCard";

interface RankingUser {
    id: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
    email: string;
    category: string | null;
    gender: string | null;
    points: number | null;
    side?: string | null;
    imageUrl?: string | null;
    winsInCurrentCategory?: number;
    club?: {
        name: string;
        logoUrl: string | null;
    } | null;
}

interface TournamentCounts {
    [userId: string]: number;
}

interface RankingClientProps {
    users: RankingUser[];
    tournamentCounts: TournamentCounts;
    availableCategories?: Category[];
    isLoggedIn?: boolean;
}

function getUserHandle(email: string) {
    if (!email) return "user";
    return email.split("@")[0].toLowerCase();
}

export default function RankingClient({ users, tournamentCounts, availableCategories, isLoggedIn }: RankingClientProps) {
    const [genderFilter, setGenderFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<'perfil' | 'mural'>('perfil');
    const [selectedPlayer, setSelectedPlayer] = useState<RankingUser | null>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (selectedPlayer) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [selectedPlayer]);

    const handlePlayerClick = async (player: RankingUser) => {
        setSelectedPlayer(player);
        setActiveTab('perfil');
        setLoadingMatches(true);
        setMatches([]);
        try {
            const history = await getPlayerMatchHistory(player.id);
            setMatches(history);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingMatches(false);
        }
    };

    const playerStats = useMemo(() => {
        if (!selectedPlayer) return null;
        // Calculate stats based on matches
        const pj = matches.length;
        const pg = matches.filter(m => m.isWinner).length;
        const pp = pj - pg;
        const wr = pj > 0 ? Math.round((pg / pj) * 100) : 0;
        
        // Identificar finales: tipo Playoff y round 0
        const finalMatches = matches.filter(m => (m.type === 'Playoff' || m.type === 'Eliminación') && Number(m.round) === 0);
        
        const trofeos = finalMatches.filter(m => m.isWinner).length;
        const subcampeonatos = finalMatches.filter(m => !m.isWinner).length;
        
        return { pj, pg, pp, pe: 0, wr, trofeos, subcampeonatos };
    }, [selectedPlayer, matches]);

    const filteredPlayers = useMemo(() => {
        // Build base list
        let list = [...users];

        // Apply filters (Gender/Category)
        if (genderFilter !== "all") {
            list = list.filter(u => u.gender === genderFilter);
        }
        if (categoryFilter !== "all") {
            list = list.filter(u => u.category === categoryFilter);
        }

        // Sort by points descending
        list.sort((a, b) => (b.points || 0) - (a.points || 0));

        // Assign Rank based on current filters
        const rankedList = list.map((u, i) => ({ ...u, _rank: i + 1 }));

        // Finally filter by search query (preserving pre-calculated _rank)
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            return rankedList.filter(u => 
                (u.name || "").toLowerCase().includes(query) || 
                u.email.toLowerCase().includes(query)
            );
        }
        
        return rankedList;
    }, [users, genderFilter, categoryFilter, searchQuery]);

    return (
        <div className="min-h-screen bg-background text-foreground relative font-sans selection:bg-emerald-500/30 overflow-x-hidden pb-32">
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
                    background: hsl(var(--card));
                    backdrop-filter: blur(20px);
                    border: 1px solid hsl(var(--border));
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            {/* Public Header */}
            {!isLoggedIn && (
                <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border">
                    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-full border border-emerald-500/30 overflow-hidden shrink-0">
                                <Image src="/img/stickers 1.jpg" alt="Logo" width={32} height={32} className="object-cover" />
                            </div>
                            <span className="font-black italic tracking-tighter text-sm uppercase">A.C.A.P.</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Login</Link>
                            <Link href="/" className="px-4 py-2 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Volver</Link>
                        </div>
                    </div>
                </div>
            )}

            <div className={`relative z-10 max-w-7xl mx-auto px-6 ${!isLoggedIn ? "pt-8" : "pt-12"}`}>
                {/* Header */}
                <div className="mb-12">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600 mb-2 px-1">Clasificación Oficial</p>
                        <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
                            <span className="text-gradient-animate">Ranking</span><br/>
                            <span className="text-foreground/90 font-black">General</span>
                        </h1>
                    </motion.div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                    <div className="relative group md:col-span-1">
                        <input
                            type="text"
                            placeholder="BUSCAR JUGADOR..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-muted-foreground/30 focus:outline-none focus:border-emerald-500/30 transition-all uppercase italic tracking-tight shadow-sm"
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                    </div>

                    <div className="flex bg-muted p-1 rounded-2xl gap-1 md:col-span-1 border border-border shadow-sm">
                        {["all", "masculino", "femenino"].map(g => (
                            <button
                                key={g}
                                onClick={() => setGenderFilter(g)}
                                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${genderFilter === g ? "bg-emerald-600 text-white shadow-lg" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
                            >
                                {g === "all" ? "Todos" : g === "masculino" ? "M" : "F"}
                            </button>
                        ))}
                    </div>

                    <div className="relative md:col-span-1">
                        <button
                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                            className="w-full bg-card border border-border rounded-2xl py-4 px-6 flex items-center justify-between text-[10px] font-black uppercase tracking-widest transition-all hover:border-emerald-500/40 shadow-sm"
                        >
                            <span className={categoryFilter === "all" ? "text-muted-foreground" : "text-emerald-500"}>
                                {categoryFilter === "all" ? "Filtro Categoría" : `Categoría ${categoryFilter}`}
                            </span>
                            <Filter className={`w-3.5 h-3.5 transition-transform duration-300 ${isCategoryDropdownOpen ? "rotate-180 text-emerald-500" : "text-muted-foreground"}`} />
                        </button>

                        <AnimatePresence>
                            {isCategoryDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsCategoryDropdownOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border border-border rounded-2xl overflow-hidden shadow-2xl"
                                    >
                                        <div className="max-h-60 overflow-y-auto no-scrollbar py-2">
                                            <button
                                                onClick={() => {
                                                    setCategoryFilter("all");
                                                    setIsCategoryDropdownOpen(false);
                                                }}
                                                className={`w-full px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-emerald-500/5 flex items-center justify-between ${categoryFilter === "all" ? "text-emerald-500 bg-emerald-500/5" : "text-muted-foreground"}`}
                                            >
                                                Todas las Categorías
                                                {categoryFilter === "all" && <Star className="w-3 h-3 fill-emerald-500" />}
                                            </button>
                                            <div className="h-px bg-border mx-4 my-1" />
                                            {availableCategories?.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                        setCategoryFilter(cat.name);
                                                        setIsCategoryDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-emerald-500/5 flex items-center justify-between ${categoryFilter === cat.name ? "text-emerald-500 bg-emerald-500/5" : "text-muted-foreground"}`}
                                                >
                                                    Categoría {cat.name}
                                                    {categoryFilter === cat.name && <Star className="w-3 h-3 fill-emerald-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Leaderboard */}
                <div className="flex flex-col gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredPlayers.length > 0 ? (
                            filteredPlayers.map((player) => {
                                const isTop3 = player._rank <= 3;
                                const points = player.points || 0;
                                return (
                                    <motion.div
                                        key={player.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        onClick={() => handlePlayerClick(player)}
                                        className="group relative bg-card border border-border rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-500 hover:translate-x-1 shadow-sm hover:shadow-md"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="p-5 md:p-6 flex items-center gap-6 relative z-10">
                                            {/* Rank */}
                                            <div className="w-16 flex flex-col items-center justify-center shrink-0 border-r border-border pr-4">
                                                {player._rank === 1 ? <Crown className="w-6 h-6 text-yellow-500 mb-1" /> : 
                                                 player._rank === 2 ? <Medal className="w-6 h-6 text-slate-400 mb-1" /> :
                                                 player._rank === 3 ? <Medal className="w-6 h-6 text-orange-500 mb-1" /> : null}
                                                <span className={`text-xl font-black italic tracking-tighter ${player._rank <= 3 ? "text-foreground" : "text-muted-foreground/30"}`}>
                                                    #{player._rank}
                                                </span>
                                            </div>

                                            {/* Category Avatar */}
                                            <div className="w-16 h-16 shrink-0 bg-muted border border-border rounded-[1.25rem] flex flex-col items-center justify-center shadow-inner group-hover:border-emerald-500/30 transition-colors">
                                                <span className="text-[9px] font-black uppercase text-emerald-600 mb-0.5">Cat</span>
                                                <span className="text-xl font-black tracking-tighter leading-none italic">{player.category || "-"}</span>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-lg font-black uppercase italic tracking-tighter truncate group-hover:text-emerald-600 transition-colors">
                                                        {player.name || "Jugador"}
                                                    </h3>
                                                    {player.club && (
                                                        <span className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest text-emerald-600">
                                                            <Shield className="w-2.5 h-2.5" /> {player.club.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                                    <span>@{getUserHandle(player.email)}</span>
                                                    <span className="w-1 h-1 bg-border rounded-full" />
                                                    <span className="text-emerald-600/80">{tournamentCounts[player.id] || 0} TORNEOS</span>
                                                </div>
                                            </div>

                                            {/* Points */}
                                            <div className="text-right shrink-0 border-l border-border pl-6">
                                                <div className={`text-2xl font-black tracking-tighter italic ${isTop3 ? "text-foreground" : "text-muted-foreground/60"}`}>
                                                    {points.toLocaleString()}
                                                </div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Pts</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 opacity-20 select-none">
                                <Trophy className="w-20 h-20 mb-4" />
                                <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground">Sin Clasificados</h3>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {selectedPlayer && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 overflow-hidden">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPlayer(null)} className="absolute inset-0 bg-background/60 backdrop-blur-xl" />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.95, opacity: 0 }} 
                            className="relative w-full max-w-7xl h-full md:h-[90vh] bg-card border border-border rounded-none md:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-border flex items-center justify-between shrink-0 bg-card/50 backdrop-blur-md z-20">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                                        <User className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-foreground leading-none">{selectedPlayer.name}</h2>
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => setActiveTab('perfil')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'perfil' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-muted text-muted-foreground hover:bg-border'}`}>Ficha Técnica</button>
                                            <button onClick={() => setActiveTab('mural')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'mural' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-muted text-muted-foreground hover:bg-border'}`}>Mural de Logros</button>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedPlayer(null)} className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-border active:scale-90 transition-all"><X className="w-6 h-6 text-foreground" /></button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'perfil' ? (
                                        <motion.div 
                                            key="p" 
                                            initial={{ opacity: 0 }} 
                                            animate={{ opacity: 1 }} 
                                            exit={{ opacity: 0 }} 
                                            className="flex flex-col md:flex-row h-full"
                                        >
                                            {/* Fixed Sidebar for Player Card */}
                                            <div className="w-full md:w-[420px] p-8 border-b md:border-b-0 md:border-r border-border bg-muted/30 flex items-start justify-center overflow-hidden">
                                                <div className="scale-[0.85] md:scale-[0.85] origin-top md:-mt-8">
                                                    {playerStats && <PlayerCard 
                                                        player={{ 
                                                            firstName: selectedPlayer.firstName || selectedPlayer.name?.split(' ')[0] || "",
                                                            lastName: selectedPlayer.lastName || selectedPlayer.name?.split(' ').slice(1).join(' ') || "",
                                                            imageUrl: selectedPlayer.imageUrl,
                                                            category: selectedPlayer.category || "D",
                                                            side: selectedPlayer.side || "ambos",
                                                            points: selectedPlayer.points || 0,
                                                            clubName: selectedPlayer.club?.name
                                                        }} 
                                                        stats={playerStats} 
                                                    />}

                                                    {/* Legend for Acronyms */}
                                                    <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 px-6 py-5 bg-card/50 border border-border rounded-2xl">
                                                        {[
                                                            { s: 'PJ', d: 'Partidos Jugados' },
                                                            { s: 'PG', d: 'Partidos Ganados' },
                                                            { s: 'PP', d: 'Partidos Perdidos' },
                                                            { s: 'WR', d: 'Win Rate (%)' },
                                                            { s: 'SC', d: 'Subcampeonatos' },
                                                            { s: 'PTS', d: 'Puntos de Ranking' },
                                                        ].map(item => (
                                                            <div key={item.s} className="flex items-center gap-2">
                                                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded min-w-[24px] text-center">{item.s}</span>
                                                                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">{item.d}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Scrollable Main Area for History */}
                                            <div className="flex-1 overflow-y-auto p-10 no-scrollbar overscroll-contain">
                                                <div className="max-w-4xl mx-auto space-y-10">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-foreground">
                                                            <Activity className="w-6 h-6 text-emerald-600" /> 
                                                            Historial de Competencia
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                                                            <span className="text-[10px] font-black uppercase text-emerald-700">{matches.length} MATCHES</span>
                                                        </div>
                                                    </div>

                                                    {loadingMatches ? (
                                                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                                                            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Sincronizando Base de Datos...</span>
                                                        </div>
                                                    ) : matches.length > 0 ? (
                                                        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="bg-muted/50 border-b border-border">
                                                                        <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Torneo / Evento</th>
                                                                        <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Oponente / Equipo Rival</th>
                                                                        <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Score</th>
                                                                        <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right w-24">Estatus</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-border">
                                                                    {matches.slice(0, 50).map(m => {
                                                                        const rival = m.team1.includes(selectedPlayer.name) ? m.team2 : m.team1;
                                                                        const isFinal = (m.type === 'Playoff' || m.type === 'Eliminación') && Number(m.round) === 0;
                                                                        const isWinner = m.isWinner;
                                                                        const isSC = isFinal && !isWinner;

                                                                        return (
                                                                            <tr key={m.id} className="hover:bg-emerald-50/30 transition-colors group">
                                                                                <td className="py-5 px-8">
                                                                                    <div className="flex flex-col">
                                                                                        <div className="text-[10px] font-black uppercase italic tracking-tighter text-foreground group-hover:text-emerald-600 transition-colors max-w-[200px] truncate">
                                                                                            {m.tournamentName}
                                                                                        </div>
                                                                                        <div className="flex gap-1 mt-1">
                                                                                            <span className="text-[8px] font-black uppercase text-muted-foreground/40">{m.type}</span>
                                                                                            {isFinal && (
                                                                                                <span className="text-[8px] font-black uppercase text-emerald-600 border border-emerald-500/20 bg-emerald-500/5 px-1 rounded-sm ml-2">FINAL</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="py-5 px-8">
                                                                                    <div className="text-xs font-black uppercase italic tracking-tighter text-muted-foreground group-hover:text-foreground transition-colors max-w-[280px] truncate">
                                                                                        {rival}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="py-5 px-8 text-center bg-muted/10">
                                                                                    <div className="inline-flex items-center px-3 py-1 bg-white border border-border rounded-lg shadow-sm">
                                                                                        <span className={`text-base font-black italic tracking-tighter whitespace-nowrap ${isWinner ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                                            {m.score1} — {m.score2}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="py-5 px-8 text-right">
                                                                                    <div className={`text-[9px] font-black uppercase px-2 py-1 rounded-md inline-block ${isWinner ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isSC ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                                                                        {isWinner ? 'VICTORIA' : isSC ? 'SUBCAMPEÓN' : 'DERROTA'}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <div className="py-40 text-center bg-muted/20 border border-dashed border-border rounded-[3rem]">
                                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                                < Zap className="w-12 h-12" />
                                                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sin registros tácticos en el historial</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div 
                                            key="m" 
                                            initial={{ opacity: 0 }} 
                                            animate={{ opacity: 1 }} 
                                            exit={{ opacity: 0 }}
                                            className="h-full overflow-y-auto p-12 no-scrollbar"
                                        >
                                            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                                {matches.filter(m => m.type === 'Playoff' && m.round === 0 && m.isWinner).map((m, i) => (
                                                    <div key={i} className="bg-card border border-border rounded-[3rem] p-12 flex flex-col items-center text-center relative overflow-hidden group shadow-xl hover:border-amber-500/30 transition-all duration-500">
                                                        <Trophy className="absolute top-4 right-4 w-24 h-24 text-amber-500/5 group-hover:scale-110 group-hover:text-amber-500/10 transition-all duration-700" />
                                                        <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-8 shadow-lg shadow-amber-500/5">
                                                            <Trophy className="w-10 h-10" />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600 mb-2">CAMPEÓN OFICIAL</span>
                                                        <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-2 text-foreground leading-tight">{m.tournamentName}</h4>
                                                        <div className="flex items-center gap-2 mt-2 px-4 py-1.5 rounded-full bg-muted border border-border">
                                                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Cat {m.category}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {matches.filter(m => m.type === 'Playoff' && m.round === 0 && m.isWinner).length === 0 && (
                                                    <div className="col-span-full py-40 flex flex-col items-center opacity-20 border border-dashed border-border rounded-[3rem]">
                                                        <Zap className="w-16 h-16 mb-4" />
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Mural de trofeos actualmente vacío</p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
