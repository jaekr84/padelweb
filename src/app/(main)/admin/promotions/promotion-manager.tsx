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
        <div className="min-h-screen bg-background text-foreground pb-20 pt-8 px-4 md:px-8 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/5 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
            </div>

            <div className="w-full space-y-10 relative z-10">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
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
                    </div>

                    {/* ── Tab Switcher ── */}
                    <div className="flex bg-muted border border-border rounded-[1.5rem] p-1.5 gap-1.5">
                        <button
                            onClick={() => setActiveTab("candidates")}
                            className={`flex items-center gap-2 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === "candidates" ? "bg-indigo-600 text-white shadow-xl" : "text-muted-foreground hover:bg-card"}`}
                        >
                            <Users className="w-4 h-4" />
                            Candidatos
                        </button>
                        <button
                            onClick={() => setActiveTab("settings")}
                            className={`flex items-center gap-2 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === "settings" ? "bg-indigo-600 text-white shadow-xl" : "text-muted-foreground hover:bg-card"}`}
                        >
                            <Shield className="w-4 h-4" />
                            Configuración
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
                                <div className="bg-card border border-border rounded-[2.5rem] p-10 flex flex-col gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase italic tracking-tighter">MODO DE ASCENSOS</h3>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">CONTROL GLOBAL DEL SISTEMA</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6 mt-4">
                                        <div className="flex items-center justify-between p-6 bg-muted rounded-[2rem] border border-border">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-black uppercase tracking-widest">AUTOMÁTICO</span>
                                                <span className="text-[9px] text-muted-foreground uppercase font-medium">LOS JUGADORES ASCIENDEN AL FINALIZAR EL TORNEO SÍ CUMPLEN REQUISITOS.</span>
                                            </div>
                                            <button
                                                onClick={() => handleToggleMode("auto")}
                                                className={`w-14 h-8 rounded-full border-2 transition-all p-1 relative ${promoMode === "auto" ? "bg-emerald-500 border-emerald-400" : "bg-muted border-border"}`}
                                            >
                                                <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-md ${promoMode === "auto" ? "translate-x-6" : "translate-x-0"}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-6 bg-muted rounded-[2rem] border border-border">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-black uppercase tracking-widest">MANUAL / AUDITADO</span>
                                                <span className="text-[9px] text-muted-foreground uppercase font-medium">EL SISTEMA SOLO NOTIFICA, PERO EL ADMIN DEBE APROBAR CADA ASCENSO.</span>
                                            </div>
                                            <button
                                                onClick={() => handleToggleMode("manual")}
                                                className={`w-14 h-8 rounded-full border-2 transition-all p-1 relative ${promoMode === "manual" ? "bg-amber-500 border-amber-400" : "bg-muted border-border"}`}
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

                                <div className="bg-card border border-border rounded-[2.5rem] p-10 flex flex-col gap-6 border-dashed border-muted-foreground/30 opacity-60 grayscale">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center text-slate-400">
                                            <Info className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase italic tracking-tighter">PRÓXIMA FASE</h3>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">DESCENSOS AUTOMÁTICOS POR INACTIVIDAD</p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-black uppercase text-muted-foreground italic leading-relaxed">
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
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-6 bg-amber-500/5 border border-amber-500/20 flex items-start gap-4 backdrop-blur-md rounded-[2.5rem]"
                                >
                                    <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 italic">MODO AUDITORÍA ACTIVO</p>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.15em] leading-relaxed italic">
                                            LOS JUGADORES LISTADOS AQUÍ HAN CUMPLIDO LOS MÉRITOS PARA ASCENDER PERO ESTÁN EN ESPERA DE TU AUTORIZACIÓN MANUAL.
                                        </p>
                                    </div>
                                </motion.div>
                            )}

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
                                <div className="flex bg-muted border border-border rounded-[1.5rem] p-1.5 gap-1.5 overflow-x-auto no-scrollbar">
                                    {[
                                        { id: "all", label: "GENERAL" },
                                        { id: "pending", label: "PENDIENTES" },
                                        { id: "points", label: "PUNTOS" },
                                        { id: "titles", label: "TÍTULOS" },
                                        { id: "finals", label: "FINALES" },
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setFilterBy(f.id as any)}
                                            className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all shadow-sm ${filterBy === f.id ? "bg-indigo-600 text-white shadow-indigo-500/20" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
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
                                            const nextCats = categories.filter(c => c.categoryOrder > p.catOrder).sort((a, b) => a.categoryOrder - b.categoryOrder);
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
                                                            <div className="flex gap-4">
                                                                <button
                                                                    onClick={() => handlePlayerDetails(p)}
                                                                    className="flex items-center justify-center gap-3 py-5 px-10 mt-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border bg-muted text-foreground border-border hover:bg-card shadow-inner"
                                                                >
                                                                    <Activity className="w-4 h-4 text-indigo-400" />
                                                                    <span>HISTORIAL</span>
                                                                </button>
                                                                <button
                                                                    disabled={loading === p.id || !selectedCat}
                                                                    onClick={() => handlePromote(p, selectedCat)}
                                                                    className={`flex items-center justify-center gap-3 py-5 px-10 mt-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border ${loading === p.id || !selectedCat ? 'bg-muted text-muted-foreground border-border cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500 border-indigo-400/20 shadow-indigo-600/20'}`}
                                                                >
                                                                    {loading === p.id ? <Activity className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                                                                    <span>ASCENDER</span>
                                                                </button>
                                                            </div>
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {/* Modal de Historial / Mural */}
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
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
                                        <User className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-foreground leading-none">{selectedPlayer.name}</h2>
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => setActiveModalTab('perfil')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'perfil' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-muted text-muted-foreground hover:bg-border'}`}>Ficha Técnica</button>
                                            <button onClick={() => setActiveModalTab('mural')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeModalTab === 'mural' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-muted text-muted-foreground hover:bg-border'}`}>Mural de Logros</button>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedPlayer(null)} className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-border active:scale-90 transition-all"><X className="w-6 h-6 text-foreground" /></button>
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
                                            <div className="w-full md:w-[420px] p-8 border-b md:border-b-0 md:border-r border-border bg-muted/30 flex items-start justify-center overflow-hidden">
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
                                                                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded min-w-[24px] text-center">{item.s}</span>
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
                                                            <Activity className="w-6 h-6 text-indigo-600" /> 
                                                            Historial de Competencia
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
                                                            <span className="text-[10px] font-black uppercase text-indigo-700">{matches.length} MATCHES</span>
                                                        </div>
                                                    </div>

                                                    {loadingMatches ? (
                                                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                                                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Sincronizando Base de Datos...</span>
                                                        </div>
                                                    ) : matches.length > 0 ? (
                                                        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="bg-muted/50 border-b border-border">
                                                                        <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700">Torneo / Evento</th>
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
                                                                            <tr key={m.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                                                <td className="py-5 px-8">
                                                                                    <div className="flex flex-col">
                                                                                        <div className="text-[10px] font-black uppercase italic tracking-tighter text-foreground group-hover:text-indigo-600 transition-colors max-w-[200px] truncate">
                                                                                            {m.tournamentName}
                                                                                        </div>
                                                                                        <div className="flex gap-1 mt-1">
                                                                                            <span className="text-[8px] font-black uppercase text-muted-foreground/40">{m.type}</span>
                                                                                            {isFinal && (
                                                                                                <span className="text-[8px] font-black uppercase text-indigo-600 border border-indigo-500/20 bg-indigo-500/5 px-1 rounded-sm ml-2">FINAL</span>
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
                                                                                        <span className={`text-base font-black italic tracking-tighter whitespace-nowrap ${isWinner ? 'text-indigo-600' : 'text-rose-600'}`}>
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
