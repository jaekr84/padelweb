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
        <div className="min-h-screen bg-background text-foreground pb-20 pt-8 px-4 md:px-8">
            <div className="max-w-5xl mx-auto space-y-8">
                
                {/* ── Header ── */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2">
                         <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 italic">Superadmin Panel</span>
                    </div>
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
                        Promoción <span className="text-indigo-500">Manual</span>
                    </h1>
                    <p className="text-muted-foreground text-xs font-bold mt-2 uppercase tracking-widest opacity-60">
                        Gestiona ascensos basados en mérito excepcional fuera del sistema automático
                    </p>
                </div>

                {/* ── Dashboard Stats ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-card border border-border rounded-3xl p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                            <Star className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Con Mérito</p>
                            <p className="text-2xl font-black italic">{analyzedPlayers.filter(p => p.score > 2).length}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-3xl p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Líderes de Puntos</p>
                            <p className="text-2xl font-black italic">{analyzedPlayers.filter(p => p.merits.pointsMet).length}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-3xl p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                            <Medal className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Multifinalistas</p>
                            <p className="text-2xl font-black italic">{analyzedPlayers.filter(p => p.merits.multipleFinals).length}</p>
                        </div>
                    </div>
                </div>

                {/* ── Logic Note ── */}
                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-4">
                    <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-[11px] font-black uppercase tracking-widest text-indigo-500 italic">Nota de Criterio</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
                            Esta página identifica jugadores que superan los límites de su categoría pero no han cumplido la regla estricta de 2 títulos. Podés evaluarlos por su consistencia en finales o excedente de puntos.
                        </p>
                    </div>
                </div>

                {/* ── Controls ── */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-4 text-xs font-bold outline-none focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex bg-card border border-border rounded-2xl p-1 gap-1">
                        {[
                            { id: "all", label: "Todos" },
                            { id: "points", label: "Puntos" },
                            { id: "titles", label: "Títulos" },
                            { id: "finals", label: "Finales" },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilterBy(f.id as any)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterBy === f.id ? "bg-indigo-600 text-white shadow-md" : "text-muted-foreground hover:bg-muted/50"}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Player Cards ── */}
                <div className="grid grid-cols-1 gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredPlayers.length > 0 ? (
                            filteredPlayers.map((p) => {
                                const nextCats = categories.filter(c => c.categoryOrder < p.catOrder).sort((a,b) => b.categoryOrder - a.categoryOrder);
                                const selectedCat = selectedCategoryPerPlayer[p.id] || (nextCats[0]?.name || "");

                                return (
                                    <motion.div
                                        layout
                                        key={p.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-card border border-border rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 group hover:border-indigo-500/30 transition-all shadow-sm overflow-hidden relative"
                                    >
                                        {/* BG Accent */}
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                                            {p.merits.pointsExceed ? <ArrowUpRight className="w-40 h-40" /> : <Trophy className="w-40 h-40" />}
                                        </div>

                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex flex-col items-center justify-center shrink-0">
                                                <span className="text-[10px] font-black uppercase opacity-60 leading-none mb-0.5">Cat</span>
                                                <span className="text-xl font-black italic tracking-tighter leading-none text-indigo-500">{p.category}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-xl font-black uppercase italic tracking-tighter truncate leading-tight">
                                                    {p.name}
                                                </h3>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {p.merits.pointsMet && (
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${p.merits.pointsExceed ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                                                            Puntos Líder {p.merits.pointsExceed ? '(+15%)' : ''}
                                                        </span>
                                                    )}
                                                    {p.titles > 0 && (
                                                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                                            {p.titles} Título{p.titles > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                    {p.finals > 0 && (
                                                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-500 opacity-80">
                                                            {p.finals} Final{p.finals > 1 ? 'es' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Merit Details */}
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-6 border-x border-border/50">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Puntos Ranking</span>
                                                <span className="text-base font-black italic tracking-tighter">{p.points.toLocaleString()}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Efectividad</span>
                                                <span className="text-base font-black italic tracking-tighter">
                                                    {p.finals > 0 ? Math.round((p.titles / p.finals) * 100) : 0}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Area */}
                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            <div className="flex flex-col flex-1 md:flex-none">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-1 ml-1">Nueva Categoría</span>
                                                <div className="relative">
                                                    <select 
                                                        value={selectedCat}
                                                        onChange={(e) => setSelectedCategoryPerPlayer(prev => ({ ...prev, [p.id]: e.target.value }))}
                                                        className="w-full bg-card border border-border rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer md:min-w-[140px] pr-10"
                                                    >
                                                        <option value="" disabled>Seleccionar...</option>
                                                        {categories.map(c => (
                                                            <option 
                                                                key={c.id} 
                                                                value={c.name}
                                                                disabled={c.name === p.category}
                                                            >
                                                                {c.name === p.category ? `Actual (${c.name})` : `Categoría ${c.name}`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                                        <ChevronRight className="w-3 h-3 rotate-90" />
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                disabled={loading === p.id || !selectedCat}
                                                onClick={() => handlePromote(p, selectedCat)}
                                                className={`flex items-center justify-center gap-2 py-3 px-6 mt-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${loading === p.id || !selectedCat ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-900/40 hover:-translate-y-0.5'}`}
                                            >
                                                {loading === p.id ? <Activity className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                                                Ejecutar
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="py-20 text-center bg-card border border-border rounded-[2.5rem] mt-8">
                                <AlertCircle className="w-12 h-12 text-muted-foreground opacity-20 mx-auto mb-4" />
                                <p className="text-sm font-black uppercase italic tracking-widest text-muted-foreground opacity-50">No hay candidatos con méritos destacados</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
