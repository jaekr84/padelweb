"use client";

import { useState, useMemo } from "react";
import { Trophy, Medal, Crown, Shield, User, Users, X, Activity, Calendar as CalendarIcon, Hash, ChevronRight } from "lucide-react";
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
}

function getAvatarPlaceholder(name: string | null) {
    if (!name) return "👤";
    return name.charAt(0).toUpperCase();
}

function getUserHandle(email: string) {
    if (!email) return "user";
    return email.split("@")[0].toLowerCase();
}

export default function RankingClient({ users, tournamentCounts, availableCategories }: RankingClientProps) {
    const [genderFilter, setGenderFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<'perfil' | 'mural'>('perfil');
    const [selectedPlayer, setSelectedPlayer] = useState<RankingUser | null>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);

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
        const pj = matches.length;
        const pg = matches.filter(m => m.isWinner).length;
        const pp = pj - pg;
        const pe = 0;
        const wr = pj > 0 ? Math.round((pg / pj) * 100) : 0;
        const trofeos = matches.filter(m => m.type === 'Playoff' && m.round === 0 && m.isWinner).length;

        return { pj, pg, pp, pe, wr, trofeos };
    }, [selectedPlayer, matches]);

    const filteredPlayers = useMemo(() => {
        let list = [...users];

        // Filter by gender
        if (genderFilter !== "all") {
            list = list.filter(u => u.gender === genderFilter);
        }

        // Filter by category
        if (categoryFilter !== "all") {
            list = list.filter(u => u.category === categoryFilter);
        }

        // Search by name
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            list = list.filter(u =>
                (u.name || "").toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query)
            );
        }

        return list.sort((a, b) => (b.points || 0) - (a.points || 0));
    }, [users, genderFilter, categoryFilter, searchQuery]);

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 font-sans selection:bg-blue-500/30">
            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6">

                {/* ── Header ── */}
                <div className="mb-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-1">
                        Clasificación Oficial
                    </p>
                    <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground flex items-center gap-3">
                        Ranking General
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium mt-1">
                        Las mejores posiciones en la red
                    </p>
                </div>

                {/* ── Search & Filters ── */}
                <div className="space-y-4 mb-8">
                    {/* Search Input */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Activity className="w-4 h-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar jugador por nombre..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center"
                            >
                                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Gender Switch */}
                        <div className="flex bg-card border border-border rounded-2xl p-1 gap-1">
                            {[
                                { id: "all", label: "Todos" },
                                { id: "masculino", label: "M" },
                                { id: "femenino", label: "F" },
                            ].map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => setGenderFilter(g.id)}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${genderFilter === g.id ? "bg-indigo-600 text-white shadow-md scale-[1.02]" : "text-muted-foreground hover:bg-muted/50"}`}
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>

                        {/* Category Select */}
                        <div className="relative">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-full bg-card border border-border rounded-2xl py-2.5 px-4 text-[10px] font-black uppercase tracking-widest appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer text-muted-foreground"
                            >
                                <option value="all">Todas las Categorías</option>
                                {availableCategories?.map(cat => (
                                    <option key={cat.id} value={cat.name}>
                                        Categoría {cat.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <ChevronRight className="w-3 h-3 text-muted-foreground rotate-90" />
                            </div>
                        </div>
                    </div>
                </div>



                {/* ── Ranking List ── */}
                <div className="flex flex-col gap-3">
                    {filteredPlayers.length > 0 ? (
                        filteredPlayers.map((player, index) => {
                            const isFirst = index === 0;
                            const isSecond = index === 1;
                            const isThird = index === 2;
                            const isTop3 = isFirst || isSecond || isThird;

                            const tournamentsPlayed = tournamentCounts[player.id] || 0;
                            const points = player.points || 0;

                            return (
                                <div
                                    key={player.id}
                                    onClick={() => handlePlayerClick(player)}
                                    className="group block bg-card border border-border rounded-3xl overflow-hidden transition-all duration-300 hover:border-indigo-500/30 shadow-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    <div className="p-4 flex items-center gap-4">

                                        {/* Posición */}
                                        <div className="w-10 flex flex-col items-center justify-center shrink-0">
                                            {isFirst ? (
                                                <Crown className="w-5 h-5 text-yellow-500 dark:text-yellow-400/90 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)] mb-1" />
                                            ) : isSecond ? (
                                                <Medal className="w-5 h-5 text-slate-400 dark:text-slate-300/90 drop-shadow-[0_0_10px_rgba(148,163,184,0.2)] mb-1" />
                                            ) : isThird ? (
                                                <Medal className="w-5 h-5 text-orange-600 dark:text-orange-400/80 drop-shadow-[0_0_10px_rgba(194,120,57,0.2)] mb-1" />
                                            ) : null}
                                            <span className={`text-base font-black italic ${isTop3 ? "text-foreground" : "text-muted-foreground opacity-40"}`}>
                                                #{index + 1}
                                            </span>
                                        </div>

                                        {/* Categoria In-Avatar */}
                                        <div className="w-12 h-12 shrink-0 bg-muted border border-border rounded-2xl flex flex-col items-center justify-center shadow-inner text-muted-foreground">
                                            {(() => {
                                                const catObj = availableCategories?.find(c => player.category === c.name);
                                                const label = catObj ? catObj.name.toUpperCase() : (player.category || "-");
                                                return (
                                                    <>
                                                        <span className="text-[10px] font-black uppercase opacity-60 leading-none mb-0.5">Cat</span>
                                                        <span className="text-sm font-black tracking-tighter leading-none text-foreground">{label}</span>
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        {/* Jugador Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="text-base font-black uppercase italic tracking-tight truncate text-foreground group-hover:text-indigo-500 transition-colors">
                                                    {player.name || "Jugador"}
                                                </h3>
                                                {player.club && (
                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-indigo-500/60 flex items-center gap-1 shrink-0 bg-indigo-500/5 px-2 py-0.5 rounded-full border border-indigo-500/10">
                                                        <Shield className="w-2.5 h-2.5" />
                                                        {player.club.name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground truncate tracking-wide">
                                                <span className="opacity-50">@{getUserHandle(player.email)}</span>
                                                <span className="w-1 h-1 bg-border rounded-full" />
                                                <span className="text-indigo-500/80">{tournamentsPlayed}T</span>
                                                {player.gender && (
                                                    <>
                                                        <span className="w-1 h-1 bg-border rounded-full" />
                                                        <span className="capitalize opacity-80">{player.gender === "masculino" ? "M" : "F"}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex flex-col items-end justify-center shrink-0 pl-3 border-l border-border">
                                            <div className={`text-lg font-black tracking-tighter ${isTop3 ? "text-foreground" : "text-muted-foreground"}`}>
                                                {points.toLocaleString()}
                                            </div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                                                Pts
                                            </div>
                                        </div>
                                    </div>

                                    {/* Promotion Merit Section */}
                                    <div className="px-5 py-2.5 border-t border-border/5 bg-muted/20 flex items-center gap-5 overflow-x-auto no-scrollbar">
                                        {(() => {
                                            const currentCat = availableCategories?.find(c => player.category === c.name);
                                            const catMax = currentCat?.maxPoints || 0;
                                            const pointsForNextCat = points > catMax;
                                            const pointsExceedBonus = points >= catMax * 1.15;
                                            const winsMet = (player as any).winsInCurrentCategory >= 2;

                                            let status = "En Competencia";
                                            if (pointsExceedBonus || (pointsForNextCat && winsMet)) {
                                                status = "Aprobado para Ascenso";
                                            } else if (pointsForNextCat && !winsMet) {
                                                status = "Pendiente de Títulos (2)";
                                            }

                                            return (
                                                <>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-[8px] font-black uppercase tracking-[0.15em] text-muted-foreground opacity-50">Puntos</span>
                                                        <span className={`text-[10px] font-bold ${pointsForNextCat ? 'text-emerald-500' : 'text-foreground'}`}>
                                                            {points}
                                                        </span>
                                                    </div>

                                                    <div className="w-px h-3 bg-border/40 shrink-0" />

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-[8px] font-black uppercase tracking-[0.15em] text-muted-foreground opacity-50">Títulos</span>
                                                        <span className={`text-[10px] font-bold ${winsMet ? 'text-emerald-500' : 'text-foreground'}`}>
                                                            {(player as any).winsInCurrentCategory}
                                                        </span>
                                                    </div>

                                                    <div className="w-px h-3 bg-border/40 shrink-0 ml-auto" />

                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-14 h-14 bg-card border border-border rounded-3xl flex items-center justify-center mb-4">
                                <Trophy className="w-6 h-6 text-muted-foreground opacity-30" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-1">Sin jugadores</h3>
                            <p className="text-muted-foreground opacity-60 text-xs font-bold max-w-xs">Aún no hay puntos registrados en esta plataforma.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Match History Modal ── */}
            <AnimatePresence>
                {selectedPlayer && (
                    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedPlayer(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-5xl bg-card border-t md:border border-border rounded-t-[2.5rem] md:rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-6 md:p-8 bg-muted/50 border-b border-border">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                                            {activeTab === 'perfil' ? <User className="w-6 h-6" /> : <Trophy className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-foreground leading-none">
                                                {activeTab === 'perfil' ? 'Ficha Técnica' : 'Mural de Logros'}
                                            </h2>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-1">{selectedPlayer.name}</p>
                                        </div>
                                    </div>

                                    {/* Tab Switcher - Premium Capsule */}
                                    <div className="flex items-center bg-card border border-border p-1 rounded-2xl self-center sm:self-auto">
                                        <button
                                            onClick={() => setActiveTab('perfil')}
                                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'perfil' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            <Activity className="w-3.5 h-3.5" />
                                            <span>Perfil</span>
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('mural')}
                                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'mural' ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/40' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            <Trophy className="w-3.5 h-3.5" />
                                            <span>Logros</span>
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setSelectedPlayer(null)}
                                        className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-all active:scale-90 absolute top-4 right-4 sm:static"
                                    >
                                        <X className="w-5 h-5 text-muted-foreground" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content - Scrollable Body */}
                            <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'perfil' ? (
                                        <motion.div 
                                            key="perfil"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="max-w-5xl mx-auto"
                                        >
                                            {/* Section 1: Hero & Performance (Flex Layout) */}
                                            <div className="flex flex-col md:flex-row gap-10 md:gap-12 lg:gap-16 items-start">
                                                
                                                {/* Left: Player Visual Card */}
                                                <div className="w-full md:w-[340px] shrink-0 flex justify-center md:justify-start">
                                                    {!loadingMatches && selectedPlayer && playerStats && (
                                                        <div className="w-full">
                                                            <PlayerCard
                                                                player={{
                                                                    firstName: selectedPlayer.firstName || selectedPlayer.name?.split(' ')[0] || "Jugador",
                                                                    lastName: selectedPlayer.lastName || selectedPlayer.name?.split(' ').slice(1).join(' ') || "",
                                                                    imageUrl: selectedPlayer.imageUrl,
                                                                    category: selectedPlayer.category || "D",
                                                                    side: selectedPlayer.side || "ambos",
                                                                    points: selectedPlayer.points || 0,
                                                                    clubName: selectedPlayer.club?.name
                                                                }}
                                                                stats={playerStats}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Recent Performance Table */}
                                                <div className="flex-1 w-full flex flex-col pt-2">
                                                    <div className="flex items-center gap-3 mb-8">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                                                            <Activity className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black uppercase italic tracking-tighter">Rendimiento <span className="text-indigo-500">Reciente</span></h3>
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Últimos partidos computados</p>
                                                        </div>
                                                    </div>

                                                    {loadingMatches ? (
                                                        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 bg-muted/20 rounded-[2rem] border border-border/50">
                                                            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Sincronizando Actas...</p>
                                                        </div>
                                                    ) : matches.length > 0 ? (
                                                        <div className="bg-card border border-border/50 rounded-[2rem] overflow-hidden shadow-sm">
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full border-collapse">
                                                                    <thead>
                                                                        <tr className="bg-muted/30">
                                                                            <th className="text-left py-4 px-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Fecha</th>
                                                                            <th className="text-left py-4 px-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Torneo / Fase</th>
                                                                            <th className="text-left py-4 px-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Oponente</th>
                                                                            <th className="text-center py-4 px-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Resultado</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-border/30">
                                                                        {matches.slice(0, 10).map((match) => {
                                                                            const isTeam1 = match.team1.includes(selectedPlayer.name);
                                                                            const opponent = isTeam1 ? match.team2 : match.team1;

                                                                            return (
                                                                                <tr key={match.id} className="hover:bg-muted/20 transition-colors group">
                                                                                    <td className="py-4 px-5">
                                                                                        <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                                                                                            {new Date(match.date).toLocaleDateString()}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="py-4 px-5">
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[11px] font-black uppercase italic text-foreground leading-none mb-1">{match.tournamentName}</span>
                                                                                            <span className="text-[8px] font-bold tracking-widest text-indigo-500 uppercase">
                                                                                                {match.type === 'Playoff' ? `Eliminatoria R${match.round}` : 'Fase de Grupos'}
                                                                                            </span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="py-4 px-5">
                                                                                        <span className="text-[11px] font-black uppercase italic text-muted-foreground group-hover:text-foreground transition-colors truncate block max-w-[150px]">
                                                                                            {opponent}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="py-4 px-5">
                                                                                        <div className="flex items-center justify-center gap-2">
                                                                                            <div className="flex items-center gap-1 bg-background border border-border px-2 py-1 rounded-lg font-black italic text-[11px]">
                                                                                                <span className={match.isWinner ? "text-emerald-500" : "text-muted-foreground opacity-50"}>{match.score1}</span>
                                                                                                <span className="opacity-20">-</span>
                                                                                                <span className={!match.isWinner ? "text-rose-500" : "text-muted-foreground opacity-50"}>{match.score2}</span>
                                                                                            </div>
                                                                                            <span className={`w-2 h-2 rounded-full ${match.isWinner ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-[2rem] border border-dashed border-border group">
                                                            <Activity className="w-10 h-10 text-muted-foreground opacity-20 group-hover:scale-110 transition-transform" />
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 mt-4">Sin actividad computada</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div 
                                            key="mural"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="max-w-5xl mx-auto pb-10"
                                        >
                                            {/* Section 2: Career Roadmap & Achievements (Full Width) */}
                                            <div className="space-y-12">
                                                <div className="flex flex-col items-center text-center">
                                                    <div className="w-16 h-16 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                                                        <Trophy className="w-8 h-8" />
                                                    </div>
                                                    <h3 className="text-3xl font-black uppercase italic tracking-tighter italic">Mural de <span className="text-amber-500">Logros Oro</span></h3>
                                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-2 max-w-sm">Títulos oficiales conquistados a lo largo de todas las categorías competitivas</p>
                                                </div>

                                                {(() => {
                                                    const achievementsByCategory: Record<string, number> = {};
                                                    matches.forEach(m => {
                                                        if (m.type === 'Playoff' && m.round === 0 && m.isWinner) {
                                                            const cat = m.category || "D";
                                                            achievementsByCategory[cat] = (achievementsByCategory[cat] || 0) + 1;
                                                        }
                                                    });

                                                    const categoriesWithLogros = Object.keys(achievementsByCategory).sort();

                                                    if (categoriesWithLogros.length === 0) {
                                                        return (
                                                            <div className="bg-muted/10 border border-dashed border-border rounded-[3rem] p-24 flex flex-col items-center justify-center text-center grayscale opacity-50">
                                                                <Trophy className="w-16 h-16 text-muted-foreground mb-6 opacity-20" />
                                                                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground opacity-60">Aún no se registran victorias en finales oficiales</p>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                                            {categoriesWithLogros.map(cat => (
                                                                <motion.div 
                                                                    key={cat}
                                                                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                                                                    className="bg-card border border-border/80 rounded-[2.5rem] p-10 flex flex-col items-center text-center relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-2xl"
                                                                >
                                                                    {/* Background Decor */}
                                                                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                                                        <Trophy className="w-32 h-32 text-amber-500" />
                                                                    </div>
                                                                    
                                                                    <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center mb-6 text-muted-foreground font-black italic text-xl leading-none">
                                                                        {cat}
                                                                    </div>

                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 mb-1">Categoría</span>
                                                                    <h4 className="text-3xl font-black italic tracking-tighter text-foreground mb-6">{cat}</h4>
                                                                    
                                                                    <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

                                                                    <div className="flex items-center gap-3 text-amber-500 bg-amber-500/5 px-6 py-2 rounded-full border border-amber-500/10">
                                                                        <Trophy className="w-5 h-5 fill-amber-500" />
                                                                        <span className="text-lg font-black italic">{achievementsByCategory[cat]} Título{achievementsByCategory[cat] > 1 ? 's' : ''}</span>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
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
