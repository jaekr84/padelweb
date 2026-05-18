"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Trophy, Medal, Crown, Shield, User, Users, X, Activity,
    Calendar as CalendarIcon, Hash, ChevronRight, ChevronLeft, Search,
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
    stats: {
        pj: number;
        pg: number;
        pp: number;
        wr: number;
        trofeos: number;
        subcampeonatos: number;
    };
}

interface TournamentCounts {
    [userId: string]: number;
}

interface RankingClientProps {
    users: RankingUser[];
    tournamentCounts: TournamentCounts;
    availableCategories?: Category[];
    isLoggedIn?: boolean;
    currentUserId?: string;
}

function getUserHandle(email: string) {
    if (!email) return "user";
    return email.split("@")[0].toLowerCase();
}

export default function RankingClient({ users, tournamentCounts, availableCategories, isLoggedIn, currentUserId }: RankingClientProps) {
    const [genderFilter, setGenderFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState<'perfil' | 'mural'>('perfil');
    const [selectedPlayer, setSelectedPlayer] = useState<RankingUser | null>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);

    // Reset page to 1 when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [genderFilter, categoryFilter, searchQuery]);

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

    const ITEMS_PER_PAGE = 18; // 6 columns x 3 rows grid
    const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);

    const paginatedPlayers = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredPlayers.slice(start, end);
    }, [filteredPlayers, currentPage]);

    const currentUserGlobalRank = useMemo(() => {
        if (!isLoggedIn || !currentUserId) return null;
        const sortedAll = [...users].sort((a, b) => (b.points || 0) - (a.points || 0));
        const index = sortedAll.findIndex(u => u.id === currentUserId);
        return index !== -1 ? index + 1 : null;
    }, [users, isLoggedIn, currentUserId]);

    const currentUserFilteredRank = useMemo(() => {
        if (!isLoggedIn || !currentUserId) return null;
        const index = filteredPlayers.findIndex(u => u.id === currentUserId);
        return index !== -1 ? filteredPlayers[index]._rank : null;
    }, [filteredPlayers, isLoggedIn, currentUserId]);

    return (
        <div className="min-h-screen bg-background text-foreground relative font-sans selection:bg-azul-primary/30 overflow-x-hidden pb-32">
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
                .glass-card {
                    background: hsl(var(--card));
                    backdrop-filter: blur(20px);
                    border: 1px solid hsl(var(--border));
                }
            `}</style>

            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-celeste/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-azul-primary/5 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            {/* Public Header */}
            {!isLoggedIn && (
                <div className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-slate-100 shadow-[0_1px_10px_-5px_rgba(0,0,0,0.05)]">
                    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-full border border-celeste/30 overflow-hidden shrink-0 relative">
                                <img src="/img/stickers 1.jpg" alt="Logo" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-black italic tracking-tighter text-sm uppercase">A.C.A.P.</span>
                        </Link>
                        <div className="flex items-center gap-3">
                            <Link href="/login" className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10">Login</Link>
                            <Link href="/" className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm">Volver</Link>
                        </div>
                    </div>
                </div>
            )}

            <div className={`relative z-10 max-w-6xl mx-auto px-4 ${!isLoggedIn ? "pt-6" : "pt-8"}`}>
                {/* Header */}
                <div className="mb-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-celeste mb-1 px-1">Clasificación Oficial</p>
                        <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-tight">
                            <span className="text-gradient-animate">Ranking</span>
                            <span className="text-foreground/90 font-black">General</span>
                        </h1>
                    </motion.div>
                </div>

                {/* User Rank positioning widget */}
                {isLoggedIn && currentUserId && currentUserGlobalRank !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 bg-gradient-to-r from-azul-primary/20 via-celeste/10 to-transparent backdrop-blur-xl border border-azul-primary/20 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_4px_20px_-10px_rgba(14,165,233,0.3)]"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-azul-primary/20 border border-azul-primary/40 flex items-center justify-center relative shrink-0">
                                <Trophy className="w-6 h-6 text-celeste animate-pulse" />
                                <div className="absolute inset-0 bg-celeste/20 rounded-2xl blur-md -z-10" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-wider text-celeste mb-0.5">TU POSICIÓN EN LA ACAP</p>
                                <h4 className="text-sm font-black uppercase italic tracking-tighter text-foreground">
                                    Estás en la posición <span className="text-celeste text-lg font-black italic tracking-tighter ml-1">#{currentUserGlobalRank}</span> del Ranking General
                                </h4>
                                {categoryFilter !== "all" && currentUserFilteredRank !== null && (
                                    <p className="text-[10px] font-bold text-muted-foreground/80 mt-0.5">
                                        Puesto <span className="text-foreground font-black font-mono">#{currentUserFilteredRank}</span> en la categoría <span className="text-azul-primary font-black uppercase">Cat {categoryFilter}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Interactive trigger to scroll to the current user's card */}
                        <button
                            type="button"
                            onClick={() => {
                                // Find player index in filtered list
                                const idx = filteredPlayers.findIndex(u => u.id === currentUserId);
                                if (idx !== -1) {
                                    // Calculate page
                                    const pageOfUser = Math.ceil((idx + 1) / ITEMS_PER_PAGE);
                                    setCurrentPage(pageOfUser);

                                    // Smooth scroll to card
                                    setTimeout(() => {
                                        const userCardEl = document.getElementById(`player-card-${currentUserId}`);
                                        if (userCardEl) {
                                            userCardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            // Trigger minor click highlight
                                            userCardEl.classList.add('ring-4', 'ring-celeste/50');
                                            setTimeout(() => {
                                                userCardEl.classList.remove('ring-4', 'ring-celeste/50');
                                            }, 2000);
                                        }
                                    }, 200);
                                }
                            }}
                            className="px-4 py-2 bg-slate-900 border border-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-1.5"
                        >
                            <User className="w-3 h-3 text-celeste" />
                            Ver mi tarjeta
                        </button>
                    </motion.div>
                )}

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    <div className="relative group md:col-span-1">
                        <input
                            type="text"
                            placeholder="BUSCAR JUGADOR..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-card border border-border rounded-xl h-11 pl-10 pr-4 text-[10px] font-bold placeholder:text-muted-foreground/60 focus:outline-none focus:border-azul-primary/30 transition-all uppercase italic tracking-tight shadow-sm"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-azul-primary transition-colors" />
                    </div>

                    <div className="flex bg-muted p-1 rounded-xl gap-1 md:col-span-1 border border-border shadow-sm h-11">
                        {["all", "masculino", "femenino"].map(g => (
                            <button
                                key={g}
                                onClick={() => setGenderFilter(g)}
                                className={`flex-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${genderFilter === g ? "bg-azul-primary text-white shadow-lg" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
                            >
                                {g === "all" ? "Todos" : g === "masculino" ? "M" : "F"}
                            </button>
                        ))}
                    </div>

                    <div className="relative md:col-span-1">
                        <button
                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                            className="w-full bg-card border border-border rounded-xl h-11 px-4 flex items-center justify-between text-[9px] font-black uppercase tracking-widest transition-all hover:border-celeste/40 shadow-sm"
                        >
                            <span className={categoryFilter === "all" ? "text-muted-foreground" : "text-celeste"}>
                                {categoryFilter === "all" ? "Categoría" : `Cat ${categoryFilter}`}
                            </span>
                            <Filter className={`w-3 h-3 transition-transform duration-300 ${isCategoryDropdownOpen ? "rotate-180 text-celeste" : "text-muted-foreground"}`} />
                        </button>

                        <AnimatePresence>
                            {isCategoryDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsCategoryDropdownOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-xl overflow-hidden shadow-2xl"
                                    >
                                        <div className="max-h-60 overflow-y-auto no-scrollbar py-1">
                                            <button
                                                onClick={() => {
                                                    setCategoryFilter("all");
                                                    setIsCategoryDropdownOpen(false);
                                                }}
                                                className={`w-full px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-widest transition-colors hover:bg-azul-primary/5 flex items-center justify-between ${categoryFilter === "all" ? "text-azul-primary bg-azul-primary/5" : "text-muted-foreground"}`}
                                            >
                                                Todas
                                                {categoryFilter === "all" && <Star className="w-2.5 h-2.5 fill-azul-primary" />}
                                            </button>
                                            <div className="h-px bg-border mx-3 my-0.5" />
                                            {availableCategories?.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                        setCategoryFilter(cat.name);
                                                        setIsCategoryDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-widest transition-colors hover:bg-azul-primary/5 flex items-center justify-between ${categoryFilter === cat.name ? "text-azul-primary bg-azul-primary/5" : "text-muted-foreground"}`}
                                                >
                                                    Cat {cat.name}
                                                    {categoryFilter === cat.name && <Star className="w-2.5 h-2.5 fill-azul-primary" />}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Leaderboard Grid */}
                <div className="mt-8">
                    <AnimatePresence mode="popLayout">
                        {paginatedPlayers.length > 0 ? (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-8 md:gap-x-8 md:gap-y-10 justify-items-center">
                                    {paginatedPlayers.map((player) => {
                                        return (
                                            <motion.div
                                                key={player.id}
                                                id={`player-card-${player.id}`}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                onClick={() => handlePlayerClick(player)}
                                                className="relative cursor-pointer group transition-all duration-300 hover:scale-[1.03] select-none flex justify-center w-full overflow-visible transition-shadow duration-300 rounded-xl"
                                            >
                                                {/* Scaled Responsive Container */}
                                                <div className="w-[156px] h-[254px] min-[380px]:w-[174px] min-[380px]:h-[282px] md:w-[180px] md:h-[292px] relative shrink-0 overflow-visible">
                                                    <div className="absolute top-0 left-0 origin-top-left scale-[0.45] min-[380px]:scale-[0.5] md:scale-[0.52] pointer-events-auto">

                                                        <PlayerCard
                                                            player={{
                                                                firstName: player.firstName || player.name?.split(' ')[0] || "",
                                                                lastName: player.lastName || player.name?.split(' ').slice(1).join(' ') || "",
                                                                imageUrl: player.imageUrl,
                                                                category: player.category || "D",
                                                                side: player.side || "ambos",
                                                                points: player.points || 0,
                                                                clubName: player.club?.name,
                                                                gender: player.gender,
                                                                rank: player._rank
                                                            }}
                                                            stats={player.stats}
                                                            isCurrentUser={player.id === currentUserId}
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Premium HUD Pagination Bar */}
                                {totalPages > 1 && (
                                    <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-border shadow-lg">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                                            Mostrando <span className="text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a <span className="text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredPlayers.length)}</span> de <span className="text-foreground">{filteredPlayers.length}</span> jugadores
                                        </span>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={currentPage === 1}
                                                onClick={() => {
                                                    setCurrentPage(prev => Math.max(1, prev - 1));
                                                    window.scrollTo({ top: 300, behavior: 'smooth' });
                                                }}
                                                className="p-2 rounded-xl bg-background border border-border text-muted-foreground hover:text-foreground hover:border-azul-primary/40 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90 cursor-pointer"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>

                                            {Array.from({ length: totalPages }).map((_, idx) => {
                                                const pageNum = idx + 1;
                                                if (totalPages > 5 && Math.abs(currentPage - pageNum) > 2 && pageNum !== 1 && pageNum !== totalPages) {
                                                    if (pageNum === 2 || pageNum === totalPages - 1) {
                                                        return <span key={pageNum} className="text-muted-foreground/40 px-1 text-xs select-none">...</span>;
                                                    }
                                                    return null;
                                                }

                                                const isActive = currentPage === pageNum;
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        type="button"
                                                        onClick={() => {
                                                            setCurrentPage(pageNum);
                                                            window.scrollTo({ top: 300, behavior: 'smooth' });
                                                        }}
                                                        className={`w-9 h-9 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-90 flex items-center justify-center border cursor-pointer ${isActive
                                                            ? "bg-azul-primary text-white border-azul-primary shadow-[0_0_12px_rgba(0,119,255,0.3)]"
                                                            : "bg-background text-muted-foreground hover:text-foreground hover:border-azul-primary/30 border-border"
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}

                                            <button
                                                type="button"
                                                disabled={currentPage === totalPages}
                                                onClick={() => {
                                                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                                                    window.scrollTo({ top: 300, behavior: 'smooth' });
                                                }}
                                                className="p-2 rounded-xl bg-background border border-border text-muted-foreground hover:text-foreground hover:border-azul-primary/40 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90 cursor-pointer"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
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
                            className="relative w-full max-w-6xl h-full md:h-[90vh] bg-card border border-border rounded-none md:rounded-2xl overflow-hidden flex flex-col shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-card/50 backdrop-blur-md z-20">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center text-azul-primary overflow-hidden relative">
                                        {selectedPlayer.imageUrl ? (
                                            <Image
                                                src={selectedPlayer.imageUrl}
                                                alt={selectedPlayer.name || "Jugador"}
                                                fill
                                                className="object-cover rounded-full"
                                            />
                                        ) : (
                                            <User className="w-7 h-7" />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black uppercase italic tracking-tighter text-foreground leading-none">{selectedPlayer.name}</h2>
                                        <div className="flex gap-2 mt-1.5">
                                            <button onClick={() => setActiveTab('perfil')} className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'perfil' ? 'bg-azul-primary text-white shadow-lg shadow-azul-primary/20' : 'bg-muted text-muted-foreground hover:bg-border'}`}>Ficha Técnica</button>
                                            <button onClick={() => setActiveTab('mural')} className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'mural' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-muted text-muted-foreground hover:bg-border'}`}>Mural</button>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedPlayer(null)} className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-border active:scale-90 transition-all"><X className="w-4 h-4 text-foreground" /></button>
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
                                            <div className="w-full md:w-[320px] p-4 border-b md:border-b-0 md:border-r border-border bg-muted/30 flex flex-col items-center justify-start overflow-hidden">
                                                <div className="scale-[0.7] md:scale-[0.75] origin-top">
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
                                                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 bg-card/50 border border-border rounded-xl">
                                                        {[
                                                            { s: 'PJ', d: 'Jugados' },
                                                            { s: 'PG', d: 'Ganados' },
                                                            { s: 'PP', d: 'Perdidos' },
                                                            { s: 'WR', d: 'Win Rate (%)' },
                                                            { s: 'SC', d: 'Subcampeonatos' },
                                                            { s: 'PTS', d: 'Puntos' },
                                                        ].map(item => (
                                                            <div key={item.s} className="flex items-center gap-1.5">
                                                                <span className="text-[8px] font-black text-azul-primary bg-azul-primary/5 px-1 py-0.5 rounded min-w-[20px] text-center">{item.s}</span>
                                                                <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-wider">{item.d}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Scrollable Main Area for History */}
                                            <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar overscroll-contain">
                                                <div className="max-w-4xl mx-auto space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2.5 text-foreground">
                                                            <Activity className="w-5 h-5 text-azul-primary" />
                                                            Historial
                                                        </h3>
                                                        <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-celeste/10 border border-celeste/20">
                                                            <span className="text-[9px] font-black uppercase text-celeste">{matches.length} PARTIDOS</span>
                                                        </div>
                                                    </div>

                                                    {loadingMatches ? (
                                                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                                                            <Loader2 className="w-8 h-8 text-azul-primary animate-spin" />
                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Sincronizando Base de Datos...</span>
                                                        </div>
                                                    ) : matches.length > 0 ? (
                                                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="bg-muted/50 border-b border-border">
                                                                        <th className="py-2 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-azul-primary">Evento</th>
                                                                        <th className="py-2 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Oponente</th>
                                                                        <th className="py-2 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Score</th>
                                                                        <th className="py-2 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right w-20">Estatus</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-border">
                                                                    {matches.slice(0, 50).map(m => {
                                                                        const rival = m.team1.includes(selectedPlayer.name) ? m.team2 : m.team1;
                                                                        const isFinal = (m.type === 'Playoff' || m.type === 'Eliminación') && Number(m.round) === 0;
                                                                        const isWinner = m.isWinner;
                                                                        const isSC = isFinal && !isWinner;

                                                                        return (
                                                                            <tr key={m.id} className="hover:bg-azul-primary/5 transition-colors group">
                                                                                <td className="py-1.5 px-4">
                                                                                    <div className="flex flex-col">
                                                                                        <div className="text-[9px] font-black uppercase italic tracking-tighter text-foreground group-hover:text-azul-primary transition-colors max-w-[150px] truncate">
                                                                                            {m.tournamentName}
                                                                                        </div>
                                                                                        <div className="flex gap-1 mt-0.5">
                                                                                            <span className="text-[7px] font-black uppercase text-muted-foreground/70">{m.type}</span>
                                                                                            {isFinal && (
                                                                                                <span className="text-[7px] font-black uppercase text-celeste border border-celeste/20 bg-celeste/5 px-1 rounded-sm ml-1">FINAL</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="py-1.5 px-4">
                                                                                    <div className="text-[9px] font-black uppercase italic tracking-tighter text-muted-foreground group-hover:text-foreground transition-colors max-w-[200px] truncate">
                                                                                        {rival}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="py-1.5 px-4 text-center bg-muted/5">
                                                                                    <div className="inline-flex items-center px-1.5 py-0.5 bg-white border border-border rounded shadow-sm">
                                                                                        <span className={`text-xs font-black italic tracking-tighter whitespace-nowrap ${isWinner ? 'text-azul-primary' : 'text-rojo'}`}>
                                                                                            {m.score1} — {m.score2}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="py-1.5 px-4 text-right">
                                                                                    <div className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm inline-block ${isWinner ? 'bg-azul-primary/5 text-azul-primary border border-azul-primary/20' : isSC ? 'bg-celeste/5 text-celeste border border-celeste/20' : 'bg-rojo/5 text-rojo border border-rojo/20'}`}>
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
                                            className="h-full overflow-y-auto p-6 no-scrollbar"
                                        >
                                            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {matches.filter(m => m.type === 'Playoff' && m.round === 0 && m.isWinner).map((m, i) => (
                                                    <div key={i} className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden group shadow-lg hover:border-amber-500/30 transition-all duration-500">
                                                        <Trophy className="absolute top-2 right-2 w-16 h-16 text-amber-500/5 group-hover:scale-110 group-hover:text-amber-500/10 transition-all duration-700" />
                                                        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-4 shadow-lg shadow-amber-500/5">
                                                            <Trophy className="w-6 h-6" />
                                                        </div>
                                                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-amber-600 mb-1">CAMPEÓN</span>
                                                        <h4 className="text-lg font-black italic uppercase tracking-tighter mb-1 text-foreground leading-tight">{m.tournamentName}</h4>
                                                        <div className="flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full bg-muted border border-border">
                                                            <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Cat {m.category}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {matches.filter(m => m.type === 'Playoff' && m.round === 0 && m.isWinner).length === 0 && (
                                                    <div className="col-span-full py-20 flex flex-col items-center opacity-20 border border-dashed border-border rounded-2xl">
                                                        <Zap className="w-10 h-10 mb-2" />
                                                        <p className="text-[9px] font-black uppercase tracking-[0.2em]">Mural vacío</p>
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
