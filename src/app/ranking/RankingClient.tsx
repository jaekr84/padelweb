"use client";

import { useState, useMemo } from "react";
import { Trophy, Medal, Crown, Shield, User, Users } from "lucide-react";
import { type Category } from "@/db/schema";

interface RankingUser {
    id: string;
    name: string | null;
    email: string;
    category: string | null;
    gender: string | null;
    points: number | null;
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
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [genderFilter, setGenderFilter] = useState("all");

    // Helper to find category by points and gender
    const getCategoryByPoints = (points: number, userGender: string | null) => {
        if (!availableCategories) return null;
        // First try to find a category that matches points AND gender
        const matched = availableCategories.find(c => 
            points >= c.minPoints && 
            points <= c.maxPoints && 
            (c.gender === "mixto" || c.gender === userGender)
        );
        if (matched) return matched;
        
        // Fallback: search just by points if gender doesn't match 
        // (useful if they define the same threshold for both but only one is found)
        return availableCategories.find(c => points >= c.minPoints && points <= c.maxPoints);
    };

    const categories = useMemo(() => {
        let cats = availableCategories || [];
        
        // Filter categories by gender if gender filter is active
        if (genderFilter !== "all" && cats.length > 0) {
            cats = cats.filter(c => c.gender === "mixto" || c.gender === genderFilter);
        }

        if (cats.length > 0) {
            // Deduplicate names to ensure "6TA" only appears once even if defined for multiple genders
            const uniqueNames = Array.from(new Set(cats.map(c => c.name.toUpperCase())));
            return ["all", ...uniqueNames];
        }
        
        const uniqueCats = Array.from(new Set(users.map(u => u.category?.toUpperCase())))
            .filter((cat): cat is string => typeof cat === "string" && cat.length > 0)
            .sort();
        return ["all", ...uniqueCats];
    }, [users, availableCategories, genderFilter]);

    const filteredPlayers = useMemo(() => {
        let list = [...users];
        
        // Filter by gender
        if (genderFilter !== "all") {
            list = list.filter(u => u.gender === genderFilter);
        }

        // If we have custom categories, we filter by point ranges if a specific category is selected
        if (selectedCategory !== "all" && availableCategories && availableCategories.length > 0) {
            const targetCat = availableCategories.find(c => c.name.toUpperCase() === selectedCategory);
            if (targetCat) {
                list = list.filter(u => (u.points || 0) >= targetCat.minPoints && (u.points || 0) <= targetCat.maxPoints);
            }
        } else if (selectedCategory !== "all") {
            // Fallback to legacy string filtering
            list = list.filter(u => u.category?.toUpperCase() === selectedCategory);
        }

        return list.sort((a, b) => (b.points || 0) - (a.points || 0));
    }, [users, selectedCategory, availableCategories, genderFilter]);

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

                {/* ── Gender Filters ── */}
                <div className="flex gap-2 mb-4">
                    {[
                        { id: "all", label: "Todos", icon: Shield },
                        { id: "masculino", label: "Masculino", icon: Shield },
                        { id: "femenino", label: "Femenino", icon: Shield },
                    ].map(g => (
                        <button
                            key={g.id}
                            onClick={() => {
                                setGenderFilter(g.id);
                                setSelectedCategory("all"); // Reset category when changing gender
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${genderFilter === g.id ? "bg-indigo-600 border-indigo-600 text-white shadow-lg" : "bg-card border-border text-muted-foreground hover:border-indigo-500/50"}`}
                        >
                            {g.label}
                        </button>
                    ))}
                </div>

                {/* ── Category Filters ── */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
                    {categories.map((cat: string) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${selectedCategory === cat ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-card border-border text-muted-foreground hover:border-indigo-500/50"}`}
                        >
                            {cat === "all" ? "Todos" : cat}
                        </button>
                    ))}
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
                                    className="group block bg-card border border-border rounded-3xl overflow-hidden transition-all duration-300 hover:border-indigo-500/30 shadow-sm"
                                >
                                    <div className="p-4 flex items-center gap-4">

                                        {/* Posición */}
                                        <div className="w-8 flex items-center justify-center shrink-0">
                                            {isFirst ? (
                                                <Crown className="w-6 h-6 text-yellow-500 dark:text-yellow-400/90 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]" />
                                            ) : isSecond ? (
                                                <Medal className="w-6 h-6 text-slate-400 dark:text-slate-300/90 drop-shadow-[0_0_10px_rgba(148,163,184,0.2)]" />
                                            ) : isThird ? (
                                                <Medal className="w-6 h-6 text-orange-600 dark:text-orange-400/80 drop-shadow-[0_0_10px_rgba(194,120,57,0.2)]" />
                                            ) : (
                                                <span className="text-xl font-black text-muted-foreground italic opacity-40">{index + 1}</span>
                                            )}
                                        </div>

                                        {/* Categoria In-Avatar */}
                                        <div className="w-12 h-12 shrink-0 bg-muted border border-border rounded-2xl flex flex-col items-center justify-center shadow-inner text-muted-foreground">
                                            {(() => {
                                                const catObj = getCategoryByPoints(points, player.gender);
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
        </div>
    );
}
