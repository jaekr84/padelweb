"use client";

import { useState, useMemo } from "react";
import {
    Trophy,
    Shield,
    Search,
    TrendingUp,
    Star,
    Medal,
    ArrowUpRight,
    Check,
    Activity,
    Users,
    ChevronRight,
    Info,
    AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { promotePlayerManually } from "./actions";
import { toast } from "sonner";
import { type Category } from "@/db/schema";

interface CandidatePlayer {
    id: string;
    name: string;
    email: string;
    category: string;
    points: number;
    titles: number;
    finals: number;
}

interface PromotionManagerProps {
    initialPlayers: CandidatePlayer[];
    categories: Category[];
}

export default function PromotionManager({ initialPlayers, categories }: PromotionManagerProps) {
    const [search, setSearch] = useState("");
    const [filterBy, setFilterBy] = useState<"all" | "points" | "titles" | "finals">("all");
    const [players, setPlayers] = useState(initialPlayers);
    const [loading, setLoading] = useState<string | null>(null);
    const [selectedCategoryPerPlayer, setSelectedCategoryPerPlayer] = useState<Record<string, string>>({});

    const analyzedPlayers = useMemo(() => {
        return players.map(p => {
            const currentCat = categories.find(c => c.name === p.category);
            const catMax = currentCat?.maxPoints || 0;

            const pointsMet = p.points >= catMax;
            const pointsExceed = p.points >= catMax * 1.15;
            const titlesMet = p.titles >= 2;
            const oneTitle = p.titles === 1;
            const multipleFinals = p.finals >= 2;

            // Flags for UI badges
            return {
                ...p,
                catOrder: currentCat?.categoryOrder ?? 99,
                merits: {
                    pointsMet,
                    pointsExceed,
                    titlesMet,
                    oneTitle,
                    multipleFinals
                },
                score: (pointsMet ? 1 : 0) + (pointsExceed ? 1 : 0) + (p.titles * 2) + p.finals
            };
        });
    }, [players, categories]);

    const filteredPlayers = useMemo(() => {
        let list = analyzedPlayers;

        if (search) {
            const q = search.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
        }

        if (filterBy === "points") list = list.filter(p => p.merits.pointsMet);
        if (filterBy === "titles") list = list.filter(p => p.titles > 0);
        if (filterBy === "finals") list = list.filter(p => p.finals >= 2);

        // Sort by merit score (highest first)
        return list.sort((a, b) => b.score - a.score);
    }, [analyzedPlayers, search, filterBy]);

    const handlePromote = async (player: CandidatePlayer, targetCategory: string) => {
        if (!targetCategory) {
            toast.error("Selecciona la categoría destino");
            return;
        }

        if (!confirm(`¿Estás seguro de promover a ${player.name} a Categoría ${targetCategory}?`)) return;

        setLoading(player.id);
        try {
            const res = await promotePlayerManually(player.id, targetCategory);
            if (res.success) {
                toast.success(`${player.name} ha sido promovido a ${targetCategory}`);
                setPlayers(prev => prev.map(p => p.id === player.id ? {
                    ...p,
                    category: targetCategory,
                    titles: 0,
                    finals: 0
                } : p));
            }
        } catch (err: any) {
            toast.error(err.message || "Error al promover");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 pt-8 px-4 md:px-8 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/5 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
            </div>

            <div className="w-full space-y-10 relative z-10">

                {/* ── Header ── */}
                <div className="flex flex-col gap-3">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 mb-1"
                    >
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/5">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400/80 italic">SISTEMA DE MÉRITO</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none text-foreground"
                    >
                        PROMOCIÓN <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">TÁCTICA</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-muted-foreground text-[11px] font-black mt-2 uppercase tracking-[0.2em] max-w-3xl leading-relaxed"
                    >
                        IDENTIFICACIÓN Y GESTIÓN DE ATLETAS CON DESEMPEÑO EXCEPCIONAL PARA ASCENSO MANUAL DE RANGO.
                    </motion.p>
                </div>

                {/* ── Dashboard Stats ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {[
                        { icon: Star, color: 'amber', label: 'ELITE DETECTADA', value: analyzedPlayers.filter(p => p.score > 2).length },
                        { icon: Trophy, color: 'emerald', label: 'LÍDERES PUNTOS', value: analyzedPlayers.filter(p => p.merits.pointsMet).length },
                        { icon: Medal, color: 'indigo', label: 'FINALISTAS+', value: analyzedPlayers.filter(p => p.merits.multipleFinals).length }
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * i }}
                            className="bg-card border border-border backdrop-blur-xl p-8 flex items-center gap-6 group hover:border-indigo-500/20 transition-all duration-500 rounded-[2rem] shadow-sm"
                        >
                            <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-500/10 border border-${stat.color}-500/20 flex items-center justify-center text-${stat.color}-400 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                                <stat.icon className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{stat.label}</p>
                                <p className="text-3xl font-black italic text-foreground tracking-tighter">{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ── Logic Note ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-4 backdrop-blur-md rounded-[2.5rem]"
                >
                    <Info className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 italic">CRITERIO DE SELECCIÓN TÁCTICA</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] leading-relaxed">
                            ESTE ALGORITMO FILTRA JUGADORES QUE SUPERAN EL TECHO DE PUNTOS O POSEEN CONSISTENCIA EN FINALES, PERMITIENDO BYPASS MANUAL DEL REQUISITO DE DOBLE TÍTULO.
                        </p>
                    </div>
                </motion.div>

                {/* ── Controls ── */}
                <div className="flex flex-col md:flex-row gap-5 relative z-10">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="FILTRAR POR IDENTIDAD O EMAIL..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-muted border border-border rounded-[1.5rem] py-5 pl-14 pr-6 text-[10px] font-black uppercase tracking-[0.2em] text-foreground outline-none focus:border-indigo-500/50 transition-all shadow-inner placeholder:text-muted-foreground/30"
                        />
                    </div>
                    <div className="flex bg-muted border border-border rounded-[1.5rem] p-1.5 gap-1.5">
                        {[
                            { id: "all", label: "GENERAL" },
                            { id: "points", label: "PUNTOS" },
                            { id: "titles", label: "TÍTULOS" },
                            { id: "finals", label: "FINALES" },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilterBy(f.id as any)}
                                className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-sm ${filterBy === f.id ? "bg-indigo-600 text-white shadow-indigo-500/20" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Player Cards ── */}
                <div className="grid grid-cols-1 gap-5">
                    <AnimatePresence mode="popLayout">
                        {filteredPlayers.length > 0 ? (
                            filteredPlayers.map((p, idx) => {
                                const nextCats = categories.filter(c => c.categoryOrder < p.catOrder).sort((a, b) => b.categoryOrder - a.categoryOrder);
                                const selectedCat = selectedCategoryPerPlayer[p.id] || (nextCats[0]?.name || "");

                                return (
                                    <motion.div
                                        layout
                                        key={p.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-card border border-border backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 group hover:border-indigo-500/20 transition-all duration-500 shadow-xl overflow-hidden relative"
                                    >
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-indigo-500/10 transition-all duration-700" />

                                        <div className="flex items-center gap-6 flex-1 relative z-10 w-full">
                                            <div className="w-20 h-20 rounded-[2rem] bg-muted border border-border flex flex-col items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                                <span className="text-[8px] font-black uppercase text-indigo-600/80 leading-none mb-1 tracking-widest">RANGO</span>
                                                <span className="text-3xl font-black italic tracking-tighter leading-none text-foreground group-hover:text-indigo-400 transition-colors">{p.category}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter truncate leading-tight text-foreground group-hover:text-indigo-600 transition-all duration-500">
                                                    {p.name}
                                                </h3>
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {p.merits.pointsMet && (
                                                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg border shadow-sm ${p.merits.pointsExceed ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'}`}>
                                                            {p.merits.pointsExceed ? 'SOBRE EL LÍMITE (+15%)' : 'LÍDER RANKING'}
                                                        </span>
                                                    )}
                                                    {p.titles > 0 && (
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 shadow-sm animate-pulse">
                                                            {p.titles} TÍTULO{p.titles > 1 ? 'S' : ''} OBTENIDO
                                                        </span>
                                                    )}
                                                    {p.finals > 0 && (
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-700 shadow-sm">
                                                            {p.finals} FINAL{p.finals > 1 ? 'ES' : ''} JUGADA
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-12 gap-y-2 px-10 border-x border-border relative z-10 w-full md:w-auto">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">TOTAL PUNTOS</span>
                                                <span className="text-2xl font-black italic tracking-tighter text-foreground">{p.points.toLocaleString()}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">RATIO ÉXITO</span>
                                                <span className="text-2xl font-black italic tracking-tighter text-indigo-600">
                                                    {p.finals > 0 ? Math.round((p.titles / p.finals) * 100) : 0}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Area */}
                                        <div className="flex items-center gap-5 w-full md:w-auto relative z-10">
                                            <div className="flex flex-col flex-1 md:flex-none">
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-600/80 mb-2 ml-1">DESTINO</span>
                                                <div className="relative group/sel">
                                                    <select
                                                        value={selectedCat}
                                                        onChange={(e) => setSelectedCategoryPerPlayer(prev => ({ ...prev, [p.id]: e.target.value }))}
                                                        className="w-full bg-muted border border-border rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-foreground outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer md:min-w-[160px] pr-12 shadow-inner"
                                                    >
                                                        <option value="" disabled className="bg-background">CATEGORÍA</option>
                                                        {categories.map(c => (
                                                            <option
                                                                key={c.id}
                                                                value={c.name}
                                                                disabled={c.name === p.category}
                                                                className="bg-background"
                                                            >
                                                                {c.name === p.category ? `ACTUAL (${c.name})` : `${c.name}`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-hover/sel:text-indigo-400 transition-colors">
                                                        <ChevronRight className="w-4 h-4 rotate-90" />
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                disabled={loading === p.id || !selectedCat}
                                                onClick={() => handlePromote(p, selectedCat)}
                                                className={`flex items-center justify-center gap-3 py-5 px-10 mt-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border ${loading === p.id || !selectedCat ? 'bg-muted text-muted-foreground border-border cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500 border-indigo-400/20 shadow-indigo-600/20'}`}
                                            >
                                                {loading === p.id ? <Activity className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                                                <span>ASCENDER</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-24 text-center bg-card border border-border backdrop-blur-xl rounded-[3rem] mt-10 relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-indigo-500/5 blur-[100px]" />
                                <div className="relative z-10 flex flex-col items-center gap-8">
                                    <div className="w-24 h-24 rounded-full bg-muted border border-border flex items-center justify-center animate-pulse">
                                        <AlertCircle className="w-10 h-10 text-muted-foreground/30" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-foreground text-xl font-black uppercase italic tracking-[0.2em]">RADAR EN CALMA</p>
                                        <p className="text-muted-foreground text-[11px] font-black uppercase tracking-[0.2em]">NO SE HAN DETECTADO CANDIDATOS CON MÉRITOS FUERA DE RANGO</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
