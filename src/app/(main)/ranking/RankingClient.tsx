"use client";

import { useState, useMemo } from "react";
import { Trophy, Medal, Crown, Shield, User, Users, X, Activity, Calendar as CalendarIcon, Hash, ChevronRight } from "lucide-react";
import { type Category } from "@/db/schema";
import { getPlayerMatchHistory } from "./actions";
import { motion, AnimatePresence } from "framer-motion";

interface RankingUser {
    id: string;
    name: string | null;
    email: string;
    category: string | null;
    gender: string | null;
    points: number | null;
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
    const [selectedPlayer, setSelectedPlayer] = useState<RankingUser | null>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);

    const handlePlayerClick = async (player: RankingUser) => {
        setSelectedPlayer(player);
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
                                    <div className="px-4 pb-4 pt-1 border-t border-border/10 bg-muted/20 flex flex-wrap gap-x-6 gap-y-2">
                                        {(() => {
                                            const currentCat = availableCategories?.find(c => player.category === c.name);
                                            const pointsThreshold = currentCat?.maxPoints || 0;
                                            const pointsMet = points > pointsThreshold;
                                            const winsMet = (player as any).winsInCurrentCategory >= 2;
                                            
                                            let status = "Pendiente de Puntos";
                                            if (pointsMet && !winsMet) status = "Pendiente de Títulos";
                                            if (pointsMet && winsMet) status = "Aprobado para Ascenso";
                                            if (!pointsMet) status = "En Competencia";

                                            return (
                                                <>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Puntos Acumulados</span>
                                                        <span className={`text-[10px] font-bold ${pointsMet ? 'text-emerald-500' : 'text-foreground'}`}>
                                                            {points} / {pointsThreshold}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Torneos Ganados ({new Date().getFullYear()})</span>
                                                        <span className={`text-[10px] font-bold ${winsMet ? 'text-emerald-500' : 'text-foreground'}`}>
                                                            {(player as any).winsInCurrentCategory} / 2
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Estatus de Ascenso</span>
                                                        <span className={`text-[10px] font-black uppercase italic ${pointsMet && winsMet ? 'text-indigo-500' : 'text-muted-foreground'}`}>
                                                            {status}
                                                        </span>
                                                    </div>
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
                            className="relative w-full max-w-2xl bg-card border-t md:border border-border rounded-t-[2.5rem] md:rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-6 md:p-8 bg-muted/50 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-xl font-black italic shadow-lg shadow-indigo-600/20">
                                        {getAvatarPlaceholder(selectedPlayer.name)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-foreground leading-tight">
                                            {selectedPlayer.name}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Historial de Partidos</span>
                                            <span className="w-1 h-1 bg-border rounded-full" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">@{getUserHandle(selectedPlayer.email)}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPlayer(null)}
                                    className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Match List */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 no-scrollbar">
                                {loadingMatches ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Consultando Actas...</p>
                                    </div>
                                ) : matches.length > 0 ? (
                                    matches.map((match) => (
                                        <div key={match.id} className="bg-muted/30 border border-border rounded-3xl overflow-hidden">
                                            {/* Tournament Info */}
                                            <div className="px-5 py-3 bg-muted/50 border-b border-border/50 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Trophy className="w-3.5 h-3.5 text-indigo-500" />
                                                    <span className="text-[10px] font-black uppercase italic tracking-tight text-foreground truncate max-w-[150px]">{match.tournamentName}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-card border border-border rounded-lg text-muted-foreground">
                                                        {match.type === 'Playoff' ? `Ronda ${match.round}` : 'Grupos'}
                                                    </span>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${match.isWinner ? 'bg-emerald-500 text-black' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                                        {match.isWinner ? 'Victoria' : 'Derrota'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Scoreboard */}
                                            <div className="p-5 flex items-center justify-between gap-4">
                                                <div className="flex-1 text-right">
                                                    <p className={`text-xs font-black uppercase italic tracking-tight ${match.team1.includes(selectedPlayer.name) ? 'text-foreground' : 'text-muted-foreground opacity-60'}`}>{match.team1}</p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-black italic ${match.isWinner ? 'bg-indigo-600 text-white' : 'bg-muted border border-border text-muted-foreground opacity-50'}`}>
                                                        {match.score1}
                                                    </div>
                                                    <span className="text-[10px] font-black text-muted-foreground opacity-30 italic">VS</span>
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-black italic ${!match.isWinner && match.score2 !== undefined ? 'bg-indigo-600 text-white' : 'bg-muted border border-border text-muted-foreground opacity-50'}`}>
                                                        {match.score2}
                                                    </div>
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className={`text-xs font-black uppercase italic tracking-tight ${match.team2.includes(selectedPlayer.name) ? 'text-foreground' : 'text-muted-foreground opacity-60'}`}>{match.team2}</p>
                                                </div>
                                            </div>

                                            {/* Footer Match Info */}
                                            <div className="px-5 py-2.5 bg-muted/20 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarIcon className="w-2.5 h-2.5" />
                                                    {new Date(match.date).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Hash className="w-2.5 h-2.5" />
                                                    ID: {match.id.slice(0, 8)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-30 grayscale italic">
                                        <Activity className="w-10 h-10 mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-center">Sin actividad reciente registrada</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
