"use client";

import { useState, useMemo, useEffect } from "react";
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
    AlertCircle,
    User,
    X,
    Loader2,
    Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { promotePlayerManually } from "./actions";
import { getPlayerMatchHistory } from "../../ranking/actions"; // Repurposing since it's already created
import { toast } from "sonner";
import { type Category } from "@/db/schema";
import PlayerCard from "@/components/PlayerCard";

interface CandidatePlayer {
    id: string;
    name: string;
    email: string;
    category: string;
    points: number;
    titles: number;
    finals: number;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string | null;
    side?: string | null;
    gender?: string | null;
    club?: {
        name: string;
        logoUrl: string | null;
    } | null;
}

interface PromotionManagerProps {
    initialPlayers: CandidatePlayer[];
    categories: Category[];
    initialMode: "auto" | "manual";
}

export default function PromotionManager({ initialPlayers, categories, initialMode }: PromotionManagerProps) {
    const [activeTab, setActiveTab] = useState<"candidates" | "settings">("candidates");
    const [promoMode, setPromoMode] = useState<"auto" | "manual">(initialMode);
    const [search, setSearch] = useState("");
    const [filterBy, setFilterBy] = useState<"all" | "pending" | "points" | "titles" | "finals">("all");
    const [players, setPlayers] = useState(initialPlayers);
    const [loading, setLoading] = useState<string | null>(null);
    const [settingLoading, setSettingLoading] = useState(false);
    const [selectedCategoryPerPlayer, setSelectedCategoryPerPlayer] = useState<Record<string, string>>({});

    // -- Modal state for History/Mural --
    const [selectedPlayer, setSelectedPlayer] = useState<CandidatePlayer | null>(null);
    const [activeModalTab, setActiveModalTab] = useState<'perfil' | 'mural'>('perfil');
    const [matches, setMatches] = useState<any[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);

    useEffect(() => {
        if (selectedPlayer) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [selectedPlayer]);

    const handlePlayerDetails = async (player: CandidatePlayer) => {
        setSelectedPlayer(player);
        setActiveModalTab('perfil');
        setLoadingMatches(true);
        setMatches([]);
        try {
            const history = await getPlayerMatchHistory(player.id);
            setMatches(history);
        } catch (err) {
            console.error(err);
            toast.error("Error al cargar el historial");
        } finally {
            setLoadingMatches(false);
        }
    };

    const playerStats = useMemo(() => {
        if (!selectedPlayer) return null;
        const pj = matches.length;
        const pg = matches.filter(m => m.isWinner).length;
        const pp = pj - pg;
        const wr = pj > 0 ? Math.round((pg / pj) * 100) : 0;
        
        // Identificar finales: tipo Playoff y round 0 (o slot final si round 0 no existe, pero aqui round 0 es el estandar)
        const finalMatches = matches.filter(m => (m.type === 'Playoff' || m.type === 'Eliminación') && Number(m.round) === 0);
        
        const trofeos = finalMatches.filter(m => m.isWinner).length;
        const subcampeonatos = finalMatches.filter(m => !m.isWinner).length;
        
        return { pj, pg, pp, pe: 0, wr, trofeos, subcampeonatos };
    }, [selectedPlayer, matches]);

    useEffect(() => {
        if (promoMode === "manual" && filterBy === "all") {
            setFilterBy("pending");
        }
    }, [promoMode, filterBy]);

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

        if (filterBy === "pending") list = list.filter(p => p.score > 0);
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

    const handleToggleMode = async (newMode: "auto" | "manual") => {
        setSettingLoading(true);
        try {
            const { updatePromotionMode } = await import("@/lib/settings-actions");
            const res = await updatePromotionMode(newMode);
            if (res.ok) {
                setPromoMode(newMode);
                toast.success(`Sistema configurado en modo ${newMode === "auto" ? "Automático" : "Manual"}`);
            } else {
                toast.error("Error al actualizar configuración");
            }
        } catch (err) {
            toast.error("Error de conexión");
        } finally {
            setSettingLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-grid-carbon text-white pb-20 pt-8 px-4 md:px-8 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/5 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
            </div>

            <div className="w-full space-y-4 relative z-10">
                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/5">
                                <TrendingUp className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-400 italic">Admin Tactical Console</span>
                                <div className="h-px w-10 bg-indigo-500/30 mt-0.5" />
                            </div>
                        </div>
                        <h1 className="text-xl md:text-3xl heading-sport leading-none text-white">
                            Gestión de <span className="text-gradient-animate">Ascensos</span>
                        </h1>
                        <p className="text-slate-400 text-[9px] font-black mt-1.5 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Activity className="w-2.5 h-2.5" /> Revisión de méritos y promoción administrativa de categorías
                        </p>
                    </div>

                    {/* ── Tab Switcher ── */}
                    <div className="flex bg-white/10 border border-white/10 rounded-xl p-0.5 gap-0.5 self-end">
                        <button
                            onClick={() => setActiveTab("candidates")}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === "candidates" ? "bg-white/10 text-indigo-400 border border-white/10" : "text-slate-400 hover:text-white"}`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Candidatos
                        </button>
                        <button
                            onClick={() => setActiveTab("settings")}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === "settings" ? "bg-white/10 text-indigo-400 border border-white/10" : "text-slate-400 hover:text-white"}`}
                        >
                            <Shield className="w-3.5 h-3.5" />
                            Ajustes
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === "settings" ? (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-8"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-carbon-800 border border-white/10 rounded-[2.5rem] p-10 flex flex-col gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase italic tracking-tighter">MODO DE ASCENSOS</h3>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">CONTROL GLOBAL DEL SISTEMA</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6 mt-4">
                                        <div className="flex items-center justify-between p-6 bg-white/10 rounded-[2rem] border border-white/10">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-black uppercase tracking-widest">AUTOMÁTICO</span>
                                                <span className="text-[9px] text-slate-400 uppercase font-medium">LOS JUGADORES ASCIENDEN AL FINALIZAR EL TORNEO SÍ CUMPLEN REQUISITOS.</span>
                                            </div>
                                            <button
                                                onClick={() => handleToggleMode("auto")}
                                                className={`w-14 h-8 rounded-full border-2 transition-all p-1 relative ${promoMode === "auto" ? "bg-emerald-500 border-emerald-400" : "bg-white/10 border-white/10"}`}
                                            >
                                                <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-md ${promoMode === "auto" ? "translate-x-6" : "translate-x-0"}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-6 bg-white/10 rounded-[2rem] border border-white/10">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-black uppercase tracking-widest">MANUAL / AUDITADO</span>
                                                <span className="text-[9px] text-slate-400 uppercase font-medium">EL SISTEMA SOLO NOTIFICA, PERO EL ADMIN DEBE APROBAR CADA ASCENSO.</span>
                                            </div>
                                            <button
                                                onClick={() => handleToggleMode("manual")}
                                                className={`w-14 h-8 rounded-full border-2 transition-all p-1 relative ${promoMode === "manual" ? "bg-amber-500 border-amber-400" : "bg-white/10 border-white/10"}`}
                                            >
                                                <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-md ${promoMode === "manual" ? "translate-x-6" : "translate-x-0"}`} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {settingLoading && (
                                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 animate-pulse mt-2">
                                            <Activity className="w-3 h-3 animate-spin" />
                                            ACTUALIZANDO NÚCLEO...
                                        </div>
                                    )}
                                </div>

                                <div className="bg-carbon-800 border border-white/10 rounded-[2.5rem] p-10 flex flex-col gap-6 border-dashed border-white/10-foreground/30 opacity-60 grayscale">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-400">
                                            <Info className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase italic tracking-tighter">PRÓXIMA FASE</h3>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">DESCENSOS AUTOMÁTICOS POR INACTIVIDAD</p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-black uppercase text-slate-400 italic leading-relaxed">
                                        PRÓXIMAMENTE PODRÁS CONFIGURAR EL TIEMPO DE GRACIA PARA JUGADORES INACTIVOS SEGÚN LAS REGLAS DE LA ASOCIACIÓN.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="candidates"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-10"
                        >
                            {/* ── Logic Note (Conditional) ── */}
                            {promoMode === "manual" && (
                                <div className="p-4 bg-amber-500/5 border border-amber-500/10 flex items-start gap-3 rounded-2xl">
                                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Modo Auditoría Activo</p>
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-tight leading-relaxed">
                                            Aprobación manual requerida para procesar ascensos detectados.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── Dashboard Stats ── */}
                            <div className="grid grid-cols-3 gap-2 w-full">
                                {[
                                    { icon: Star, color: 'amber', label: 'ELITE DETECTADA', value: analyzedPlayers.filter(p => p.score > 2).length },
                                    { icon: Trophy, color: 'emerald', label: 'LÍDERES PUNTOS', value: analyzedPlayers.filter(p => p.merits.pointsMet).length },
                                    { icon: Medal, color: 'indigo', label: 'FINALISTAS+', value: analyzedPlayers.filter(p => p.merits.multipleFinals).length }
                                ].map((stat, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 * i }}
                                        className="bg-carbon-800 border border-white/10 rounded-xl p-3 shadow-sm group hover:border-indigo-500/30 transition-all relative overflow-hidden"
                                    >
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className={`w-8 h-8 rounded-lg bg-${stat.color}-500/10 border border-${stat.color}-500/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                                <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
                                                <span className="text-base font-black italic leading-none text-white tracking-tighter">{stat.value}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>


                            {/* ── Controls ── */}
                            <div className="flex flex-col md:flex-row gap-2 relative z-10">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="BUSCAR JUGADOR (NOMBRE, EMAIL)..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full bg-carbon-800/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-[9px] font-black uppercase tracking-widest text-white outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-sm placeholder:text-slate-500"
                                    />
                                </div>
                                <div className="flex bg-white/10 border border-white/10 rounded-lg p-0.5 gap-0.5 overflow-x-auto no-scrollbar">
                                    {[
                                        { id: "all", label: "GENERAL" },
                                        { id: "pending", label: "ASCENSOS" },
                                        { id: "points", label: "PUNTOS" },
                                        { id: "titles", label: "TÍTULOS" },
                                        { id: "finals", label: "FINALES" },
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setFilterBy(f.id as any)}
                                            className={`px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterBy === f.id ? "bg-white/10 text-indigo-400 border border-white/10" : "text-slate-400 hover:text-white"}`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── Player Table ── */}
                            <div className="bg-carbon-800 border border-white/10 rounded-xl overflow-hidden shadow-sm relative">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse table-auto">
                                        <thead>
                                            <tr className="bg-white/5 border-b border-white/10">
                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Jugador</th>
                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Cat / PTS</th>
                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Méritos</th>
                                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Destino</th>
                                                <th className="px-4 py-3 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {filteredPlayers.length > 0 ? (
                                                filteredPlayers.map((p, idx) => {
                                                    const nextCats = categories.filter(c => c.categoryOrder > p.catOrder).sort((a, b) => a.categoryOrder - b.categoryOrder);
                                                    const selectedCat = selectedCategoryPerPlayer[p.id] || (nextCats[0]?.name || "");

                                                    return (
                                                        <motion.tr
                                                            key={p.id}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            transition={{ delay: idx * 0.02 }}
                                                            className={`group hover:bg-white/5 transition-colors ${loading === p.id ? "opacity-50 pointer-events-none" : ""}`}
                                                        >
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-black italic text-indigo-400 text-xs shrink-0">
                                                                        {(p.firstName || p.name || "U").charAt(0)}
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-[11px] font-black uppercase italic tracking-tight truncate text-white">
                                                                            {p.name}
                                                                        </span>
                                                                        <span className="text-[8px] font-black text-slate-500 truncate uppercase tracking-tighter">
                                                                            {p.email}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-center">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-black italic text-white tracking-tighter leading-none">{p.category}</span>
                                                                    <span className="text-[8px] font-black text-indigo-400/70 uppercase mt-0.5">{p.points.toLocaleString()} PTS</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex flex-wrap justify-center gap-1 max-w-[140px] mx-auto">
                                                                    {p.merits.pointsMet && (
                                                                        <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${p.merits.pointsExceed ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`} title="Puntos cumplidos">
                                                                            PTS+
                                                                        </span>
                                                                    )}
                                                                    {p.titles > 0 && (
                                                                        <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400" title="Títulos obtenidos">
                                                                            {p.titles}T
                                                                        </span>
                                                                    )}
                                                                    {p.finals > 0 && (
                                                                        <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-500/15 border border-slate-500/25 text-slate-400" title="Finales jugadas">
                                                                            {p.finals}F
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex justify-center min-w-[100px]">
                                                                    <select
                                                                        value={selectedCat}
                                                                        onChange={(e) => setSelectedCategoryPerPlayer(prev => ({ ...prev, [p.id]: e.target.value }))}
                                                                        className="bg-white/15 border border-white/10 rounded-lg px-2 py-1.5 text-[8px] font-black uppercase tracking-widest text-white outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer w-full text-center"
                                                                    >
                                                                        <option value="" disabled>CAT</option>
                                                                        {categories.map(c => (
                                                                            <option
                                                                                key={c.id}
                                                                                value={c.name}
                                                                                disabled={c.name === p.category}
                                                                            >
                                                                                {c.name === p.category ? `ACT` : `${c.name}`}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <button
                                                                        onClick={() => handlePlayerDetails(p)}
                                                                        className="p-2 rounded-lg bg-white/10 border border-white/10 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all active:scale-95"
                                                                        title="HISTORIAL"
                                                                    >
                                                                        <Activity className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        disabled={loading === p.id || !selectedCat}
                                                                        onClick={() => handlePromote(p, selectedCat)}
                                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 border ${loading === p.id || !selectedCat ? 'bg-white/10 text-slate-400 border-white/10 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500 border-indigo-400/20 shadow-sm'}`}
                                                                    >
                                                                        {loading === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
                                                                        <span>ASCENDER</span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </motion.tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="py-24 text-center">
                                                        <div className="flex flex-col items-center gap-6 opacity-30">
                                                            <AlertCircle className="w-12 h-12" />
                                                            <div className="space-y-1">
                                                                <p className="text-white text-lg font-black uppercase italic tracking-[0.2em]">Cero Coincidencias</p>
                                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">No se han detectado candidatos con los parámetros actuales</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {/* Modal de Historial / Mural */}
            <AnimatePresence>
                {selectedPlayer && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 overflow-hidden">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPlayer(null)} className="absolute inset-0 bg-carbon-950/70 backdrop-blur-xl" />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.95, opacity: 0 }} 
                            className="relative w-full max-w-7xl h-full md:h-[90vh] bg-carbon-800 border border-white/10 rounded-none md:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-white/10 flex items-center justify-between shrink-0 bg-carbon-800/50 backdrop-blur-md z-20">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <User className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-none">{selectedPlayer.name}</h2>
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => setActiveModalTab('perfil')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'perfil' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/10 text-slate-400 hover:bg-white/10'}`}>Ficha Técnica</button>
                                            <button onClick={() => setActiveModalTab('mural')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'mural' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white/10 text-slate-400 hover:bg-white/10'}`}>Mural de Logros</button>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedPlayer(null)} className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all"><X className="w-6 h-6 text-white" /></button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {activeModalTab === 'perfil' ? (
                                        <motion.div 
                                            key="p" 
                                            initial={{ opacity: 0 }} 
                                            animate={{ opacity: 1 }} 
                                            exit={{ opacity: 0 }} 
                                            className="flex flex-col md:flex-row h-full"
                                        >
                                            {/* Fixed Sidebar for Player Card */}
                                            <div className="w-full md:w-[420px] p-8 border-b md:border-b-0 md:border-r border-white/10 bg-white/5 flex items-start justify-center overflow-hidden">
                                                <div className="scale-[0.85] md:scale-[0.85] origin-top md:-mt-8">
                                                    {playerStats && <PlayerCard 
                                                        player={{ 
                                                            firstName: selectedPlayer.firstName || selectedPlayer.name?.split(' ')[0] || "",
                                                            lastName: selectedPlayer.lastName || selectedPlayer.name?.split(' ').slice(1).join(' ') || "",
                                                            imageUrl: selectedPlayer.imageUrl,
                                                            category: selectedPlayer.category || "D",
                                                            side: (selectedPlayer.side as any) || "ambos",
                                                            points: selectedPlayer.points || 0,
                                                            clubName: selectedPlayer.club?.name
                                                        }} 
                                                        stats={playerStats} 
                                                    />}
                                                    
                                                    {/* Legend for Acronyms */}
                                                    <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 px-6 py-5 bg-carbon-800/50 border border-white/10 rounded-2xl">
                                                        {[
                                                            { s: 'PJ', d: 'Partidos Jugados' },
                                                            { s: 'PG', d: 'Partidos Ganados' },
                                                            { s: 'PP', d: 'Partidos Perdidos' },
                                                            { s: 'WR', d: 'Win Rate (%)' },
                                                            { s: 'SC', d: 'Subcampeonatos' },
                                                            { s: 'PTS', d: 'Puntos de Ranking' },
                                                        ].map(item => (
                                                            <div key={item.s} className="flex items-center gap-2">
                                                                <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/15 px-1.5 py-0.5 rounded min-w-[24px] text-center">{item.s}</span>
                                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{item.d}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Scrollable Main Area for History */}
                                            <div className="flex-1 overflow-y-auto p-10 no-scrollbar overscroll-contain">
                                                <div className="max-w-4xl mx-auto space-y-10">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-white">
                                                            <Activity className="w-6 h-6 text-indigo-400" /> 
                                                            Historial de Competencia
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/20">
                                                            <span className="text-[10px] font-black uppercase text-indigo-400">{matches.length} MATCHES</span>
                                                        </div>
                                                    </div>

                                                    {loadingMatches ? (
                                                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                                                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sincronizando Base de Datos...</span>
                                                        </div>
                                                    ) : matches.length > 0 ? (
                                                        <div className="bg-carbon-800 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="bg-white/10 border-b border-white/10">
                                                                        <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Torneo / Evento</th>
                                                                        <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Oponente / Equipo Rival</th>
                                                                        <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Score</th>
                                                                        <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right w-24">Estatus</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-border">
                                                                    {matches.slice(0, 50).map(m => {
                                                                        const rival = m.team1.includes(selectedPlayer.name) ? m.team2 : m.team1;
                                                                        const isFinal = (m.type === 'Playoff' || m.type === 'Eliminación') && Number(m.round) === 0;
                                                                        const isWinner = m.isWinner;
                                                                        const isSC = isFinal && !isWinner;

                                                                        return (
                                                                            <tr key={m.id} className="hover:bg-indigo-500/10 transition-colors group">
                                                                                <td className="py-5 px-8">
                                                                                    <div className="flex flex-col">
                                                                                        <div className="text-[10px] font-black uppercase italic tracking-tighter text-white group-hover:text-indigo-400 transition-colors max-w-[200px] truncate">
                                                                                            {m.tournamentName}
                                                                                        </div>
                                                                                        <div className="flex gap-1 mt-1">
                                                                                            <span className="text-[8px] font-black uppercase text-slate-500">{m.type}</span>
                                                                                            {isFinal && (
                                                                                                <span className="text-[8px] font-black uppercase text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 px-1 rounded-sm ml-2">FINAL</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="py-5 px-8">
                                                                                    <div className="text-xs font-black uppercase italic tracking-tighter text-slate-400 group-hover:text-white transition-colors max-w-[280px] truncate">
                                                                                        {rival}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="py-5 px-8 text-center bg-white/[0.03]">
                                                                                    <div className="inline-flex items-center px-3 py-1 bg-white/10 border border-white/10 rounded-lg">
                                                                                        <span className={`text-base font-black italic tracking-tighter whitespace-nowrap ${isWinner ? 'text-indigo-400' : 'text-rose-400'}`}>
                                                                                            {m.score1} — {m.score2}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="py-5 px-8 text-right">
                                                                                    <div className={`text-[9px] font-black uppercase px-2 py-1 rounded-md inline-block ${isWinner ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : isSC ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`}>
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
                                                        <div className="py-40 text-center bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
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
                                                    <div key={i} className="bg-carbon-800 border border-white/10 rounded-[3rem] p-12 flex flex-col items-center text-center relative overflow-hidden group shadow-xl hover:border-amber-500/30 transition-all duration-500">
                                                        <Trophy className="absolute top-4 right-4 w-24 h-24 text-amber-500/5 group-hover:scale-110 group-hover:text-amber-500/10 transition-all duration-700" />
                                                        <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-8 shadow-lg shadow-amber-500/5">
                                                            <Trophy className="w-10 h-10" />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 mb-2">CAMPEÓN OFICIAL</span>
                                                        <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-2 text-white leading-tight">{m.tournamentName}</h4>
                                                        <div className="flex items-center gap-2 mt-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10">
                                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cat {m.category}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {matches.filter(m => m.type === 'Playoff' && m.round === 0 && m.isWinner).length === 0 && (
                                                    <div className="col-span-full py-40 flex flex-col items-center opacity-20 border border-dashed border-white/10 rounded-[3rem]">
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
