"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
    Trophy, Medal, Crown, Shield, User, Users, X, Activity, 
    Calendar as CalendarIcon, Hash, ChevronRight, Search, 
    Filter, Star, TrendingUp, Zap
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

    useEffect(() => {
        if (selectedPlayer || isCategoryDropdownOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [selectedPlayer, isCategoryDropdownOpen]);

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
        const categoryMatches = categoryFilter === "all" 
            ? matches 
            : matches.filter(m => m.category === categoryFilter);
        
        const pj = categoryMatches.length;
        const pg = categoryMatches.filter(m => m.isWinner).length;
        const pp = pj - pg;
        const wr = pj > 0 ? Math.round((pg / pj) * 100) : 0;
        const trofeos = categoryMatches.filter(m => m.type === 'Playoff' && m.round === 0 && m.isWinner).length;

        return { pj, pg, pp, pe: 0, wr, trofeos };
    }, [selectedPlayer, matches, categoryFilter]);

    const filteredPlayers = useMemo(() => {
        let list = [...users];
        if (genderFilter !== "all") list = list.filter(u => u.gender === genderFilter);
        if (categoryFilter !== "all") list = list.filter(u => u.category === categoryFilter);
        list.sort((a, b) => (b.points || 0) - (a.points || 0));
        
        const rankedList = list.map((u, i) => ({ ...u, _rank: i + 1 }));

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            return rankedList.filter(u => (u.name || "").toLowerCase().includes(query) || u.email.toLowerCase().includes(query));
        }
        
        return rankedList;
    }, [users, genderFilter, categoryFilter, searchQuery]);

    return (
        <div className="min-h-screen bg-background text-foreground relative font-sans selection:bg-emerald-500/30 overflow-x-hidden pb-32">
            {/* STYLES */}
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
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            {/* Public Header */}
            {!isLoggedIn && (
                <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-white/5">
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
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 mb-2 px-1">Clasificación Oficial</p>
                        <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
                            <span className="text-gradient-animate drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">Ranking</span><br/>
                            <span className="text-foreground/90">General</span>
                        </h1>
                    </motion.div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                    <div className="relative group md:col-span-1">
                        <input
                            type="text"
                            placeholder="Buscar jugador..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full glass-card rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all uppercase italic tracking-tight"
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                    </div>

                    <div className="flex glass-card p-1 rounded-2xl gap-1 md:col-span-1">
                        {["all", "masculino", "femenino"].map(g => (
                            <button
                                key={g}
                                onClick={() => setGenderFilter(g)}
                                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${genderFilter === g ? "bg-emerald-600 text-white shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                {g === "all" ? "Todos" : g === "masculino" ? "M" : "F"}
                            </button>
                        ))}
                    </div>

                    <div className="relative md:col-span-1" id="category-filter-container">
                        <button
                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                            className="w-full glass-card rounded-2xl py-4 px-6 flex items-center justify-between text-[10px] font-black uppercase tracking-widest transition-all hover:border-emerald-500/40"
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
                                        className="absolute top-full left-0 right-0 mt-2 z-50 glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                                    >
                                        <div className="max-h-60 overflow-y-auto no-scrollbar py-2">
                                            <button
                                                onClick={() => {
                                                    setCategoryFilter("all");
                                                    setIsCategoryDropdownOpen(false);
                                                }}
                                                className={`w-full px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-emerald-500/10 flex items-center justify-between ${categoryFilter === "all" ? "text-emerald-500 bg-emerald-500/5" : "text-muted-foreground"}`}
                                            >
                                                Todas las Categorías
                                                {categoryFilter === "all" && <Star className="w-3 h-3 fill-emerald-500" />}
                                            </button>
                                            <div className="h-px bg-white/5 mx-4 my-1" />
                                            {availableCategories?.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                        setCategoryFilter(cat.name);
                                                        setIsCategoryDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-emerald-500/10 flex items-center justify-between ${categoryFilter === cat.name ? "text-emerald-500 bg-emerald-500/5" : "text-muted-foreground"}`}
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
                            filteredPlayers.map((player, index) => {
                                const isTop3 = index < 3;
                                const points = player.points || 0;
                                return (
                                    <motion.div
                                        key={player.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        onClick={() => handlePlayerClick(player)}
                                        className="group relative glass-card rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-500 hover:translate-x-1"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="p-5 md:p-6 flex items-center gap-6 relative z-10">
                                            {/* Rank */}
                                            <div className="w-14 flex flex-col items-center justify-center shrink-0 border-r border-white/5 pr-2">
                                                {player._rank === 1 ? <Crown className="w-6 h-6 text-yellow-400 mb-1" /> : 
                                                 player._rank === 2 ? <Medal className="w-6 h-6 text-slate-300 mb-1" /> :
                                                 player._rank === 3 ? <Medal className="w-6 h-6 text-orange-400 mb-1" /> : null}
                                                <span className={`text-xl font-black italic ${player._rank <= 3 ? "text-foreground" : "text-muted-foreground/30"}`}>
                                                    #{player._rank}
                                                </span>
                                            </div>

                                            {/* Category Avatar */}
                                            <div className="w-16 h-16 shrink-0 glass-card rounded-[1.25rem] flex flex-col items-center justify-center shadow-inner group-hover:border-emerald-500/50 transition-colors">
                                                <span className="text-[9px] font-black uppercase text-emerald-500 mb-0.5">Cat</span>
                                                <span className="text-xl font-black tracking-tighter leading-none italic">{player.category || "-"}</span>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-lg font-black uppercase italic tracking-tighter truncate group-hover:text-emerald-400 transition-colors">
                                                        {player.name || "Jugador"}
                                                    </h3>
                                                    {player.club && (
                                                        <span className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest text-emerald-500">
                                                            <Shield className="w-2.5 h-2.5" /> {player.club.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                                    <span>@{getUserHandle(player.email)}</span>
                                                    <span className="w-1 h-1 bg-white/10 rounded-full" />
                                                    <span className="text-emerald-500/80">{tournamentCounts[player.id] || 0} TORNEOS</span>
                                                </div>
                                            </div>

                                            {/* Points */}
                                            <div className="text-right shrink-0 border-l border-white/5 pl-6">
                                                <div className={`text-2xl font-black tracking-tighter italic ${isTop3 ? "text-foreground" : "text-muted-foreground/80"}`}>
                                                    {points.toLocaleString()}
                                                </div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Pts</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 opacity-20 select-none">
                                <Trophy className="w-20 h-20 mb-4" />
                                <h3 className="text-xl font-black uppercase italic tracking-tighter">Sin Clasificados</h3>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {selectedPlayer && (
                    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPlayer(null)} className="absolute inset-0 bg-background/60 backdrop-blur-xl" />
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-6xl glass-card rounded-t-[3rem] md:rounded-[3rem] overflow-hidden flex flex-col max-h-[92vh] shadow-2xl">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                        <User className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">{selectedPlayer.name}</h2>
                                        <div className="flex gap-2 mt-1">
                                            <button onClick={() => setActiveTab('perfil')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'perfil' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-muted-foreground'}`}>Perfil</button>
                                            <button onClick={() => setActiveTab('mural')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'mural' ? 'bg-amber-500 text-white' : 'bg-white/5 text-muted-foreground'}`}>Logros</button>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedPlayer(null)} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all"><X className="w-6 h-6" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-8">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'perfil' ? (
                                        <motion.div key="p" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col md:flex-row gap-12 md:items-start relative">
                                            <div className="w-full md:w-[350px] shrink-0 md:sticky md:top-0 md:z-10 flex items-start justify-center">
                                                <div 
                                                    className="w-full"
                                                    style={{ transform: 'scale(min(1, calc((100vh - 280px) / 550)))', transformOrigin: 'top center' }}
                                                >
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
                                                </div>
                                            </div>
                                            <div className="flex-1 w-full">
                                                <h3 className="text-xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-3"><Activity className="w-6 h-6 text-emerald-500" /> Rendimiento Reciente</h3>
                                                {loadingMatches ? (
                                                    <div className="flex flex-col items-center justify-center py-20 animate-pulse"><Activity className="w-8 h-8 text-emerald-500 animate-spin mb-4" /><span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span></div>
                                                ) : matches.length > 0 ? (
                                                    <div className="w-full overflow-hidden glass-card rounded-3xl">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                                <tr className="border-b border-white/5 bg-white/5">
                                                                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-emerald-500/50">Fecha / Torneo</th>
                                                                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Rival</th>
                                                                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right w-28 whitespace-nowrap">Res</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/5">
                                                                {matches.slice(0, 30).map(m => {
                                                                    const rival = m.team1.includes(selectedPlayer.name) ? m.team2 : m.team1;
                                                                    return (
                                                                        <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                                                                            <td className="py-4 px-6 align-middle">
                                                                                <div className="flex flex-col">
                                                                                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80 group-hover:text-emerald-400 transition-colors truncate max-w-[140px]">
                                                                                        {m.tournamentName}
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                            <td className="py-4 px-6 align-middle">
                                                                                <div className="text-xs font-black uppercase italic tracking-tighter truncate max-w-[180px] text-foreground/80 group-hover:text-foreground transition-colors">
                                                                                    {rival}
                                                                                </div>
                                                                            </td>
                                                                            <td className="py-4 px-6 align-middle text-right">
                                                                                <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                                                                                    <span className={`text-sm font-black italic tracking-tighter ${m.isWinner ? 'text-emerald-500' : 'text-rose-500/80'}`}>
                                                                                        {m.score1} - {m.score2}
                                                                                    </span>
                                                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${m.isWinner ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500/50'}`} />
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : <div className="py-20 text-center opacity-20 font-black uppercase text-xs italic">Sin partidos registrados</div>}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="m" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {matches.filter(m => m.type === 'Playoff' && m.round === 0 && m.isWinner).map((m, i) => (
                                                    <div key={i} className="glass-card rounded-[2.5rem] p-10 flex flex-col items-center text-center relative overflow-hidden group">
                                                        <Trophy className="absolute top-2 right-2 w-24 h-24 text-amber-500/5 group-hover:scale-110 transition-transform" />
                                                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4"><Trophy className="w-7 h-7" /></div>
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Campeón</span>
                                                        <h4 className="text-xl font-black italic italic uppercase tracking-tighter mb-2">{m.tournamentName}</h4>
                                                        <span className="text-[10px] font-black uppercase text-amber-500/80 tracking-widest">Cat {m.category}</span>
                                                    </div>
                                                ))}
                                                {matches.filter(m => m.type === 'Playoff' && m.round === 0 && m.isWinner).length === 0 && (
                                                    <div className="col-span-full py-32 flex flex-col items-center opacity-20"><Zap className="w-16 h-16 mb-4" /><p className="text-xs font-black uppercase tracking-widest">Mural de trofeos vacío</p></div>
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
