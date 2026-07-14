"use client";

import { useState } from "react";
import {
    Trophy, Medal, Star, TrendingUp, TrendingDown,
    Clock, ShieldCheck, Info, ArrowUpRight, Target,
    Users, Activity, Zap, Shuffle, Timer, RotateCcw,
    CircleDot, UserCheck, Swords, GitMerge, CheckCircle2,
    AlertTriangle, Layers, BarChart3, ListOrdered, Network,
    Sliders, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
    { id: "torneos", label: "Torneos", icon: Trophy },
    { id: "round-robin", label: "Round Robin", icon: GitMerge },
    { id: "americano", label: "Americano", icon: BarChart3 },
    { id: "cancha-abierta", label: "Cancha Abierta", icon: Layers },
] as const;

type TabId = typeof TABS[number]["id"];

export default function ReglamentoPage() {
    const [activeTab, setActiveTab] = useState<TabId>("torneos");

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen bg-grid-carbon text-white relative font-sans selection:bg-volt/30 overflow-x-hidden pb-32">

            <style>{`
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .text-gradient-animate {
                    background: linear-gradient(to right, #0ea5e9, #1e40af, #fb7185, #0ea5e9);
                    background-size: 300% 300%;
                    -webkit-background-clip: text;
                    color: transparent;
                    animation: gradient-x 6s ease infinite;
                }
                .glass-card {
                    background-color: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .glass-card:hover {
                    border-color: rgba(14, 165, 233, 0.4);
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* Ambient glows */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-azul-primary/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-rosa/5 rounded-full blur-[150px]" />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-celeste/20 to-transparent opacity-20" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 pt-8 md:pt-12 pb-16">
                {/* Header */}
                <header className="mb-8 text-center md:text-left">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-celeste/10 border border-celeste/20 text-celeste text-[9px] font-black uppercase tracking-[0.3em] mb-4 shadow-lg shadow-celeste/10 backdrop-blur-md"
                    >
                        <ShieldCheck className="w-3 h-3" />
                        Reglamento Oficial
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="heading-sport text-2xl md:text-3xl leading-tight mb-4"
                    >
                        Reglas &{" "}
                        <span className="text-gradient-animate drop-shadow-[0_0_30px_rgba(14,165,233,0.3)]">Criterios</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-400 text-xs md:text-sm font-bold max-w-2xl leading-relaxed uppercase tracking-tight opacity-70 italic"
                    >
                        Toda la lógica detrás de cómo se arman los grupos, partidos y rankings.
                    </motion.p>
                </header>

                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 w-fit mb-8"
                >
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id
                                    ? "bg-celeste text-white shadow-lg shadow-celeste/20"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </motion.div>

                <AnimatePresence mode="wait">
                    {activeTab === "torneos" && (
                        <motion.div
                            key="torneos"
                            variants={container}
                            initial="hidden"
                            animate="show"
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 gap-6"
                        >
                            {/* Sección 1: Puntos */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 relative overflow-hidden group shadow-xl">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 -rotate-12 translate-x-4">
                                    <Star className="w-48 h-48 text-celeste" />
                                </div>

                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-xl bg-celeste/10 border border-celeste/20 flex items-center justify-center shadow-inner">
                                        <Zap className="w-6 h-6 text-celeste" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Obtención de Puntos</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Suma en cada etapa del torneo</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-celeste flex items-center gap-2 italic">Fases de Juego <div className="h-px bg-celeste/20 flex-1" /></h3>
                                        <div className="space-y-2">
                                            {[
                                                { label: "Campeón", points: "Ronda Final", icon: Trophy, color: "text-amber-400" },
                                                { label: "Finalista", points: "Subcampeón", icon: Medal, color: "text-slate-300" },
                                                { label: "Semifinal", points: "Top 4", icon: Medal, color: "text-orange-500" },
                                                { label: "Cuartos", points: "Top 8", icon: Medal, color: "text-celeste-light" },
                                            ].map((stat, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl group hover:border-celeste/30 hover:bg-celeste/5 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <stat.icon className={`w-4 h-4 ${stat.color} drop-shadow-[0_0_8px_currentColor]`} />
                                                        <span className="text-[11px] font-black uppercase italic tracking-tight">{stat.label}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40 italic">{stat.points}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-azul-primary flex items-center gap-2 italic">Bonus Adicionales <div className="h-px bg-azul-primary/20 flex-1" /></h3>
                                        <div className="space-y-2">
                                            {[
                                                { label: "Participación", desc: "Base por inscripción", icon: Target, color: "text-celeste" },
                                                { label: "Victoria en Zona", desc: "Por partido de grupo", icon: TrendingUp, color: "text-celeste-light" },
                                                { label: "Clasificación", desc: "Pase a Playoffs", icon: ArrowUpRight, color: "text-white" },
                                            ].map((stat, i) => (
                                                <div key={i} className="flex flex-col p-3 bg-white/5 border border-white/5 rounded-xl group hover:border-azul-primary/30 hover:bg-azul-primary/5 transition-all">
                                                    <div className="flex items-center gap-3 mb-0.5">
                                                        <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                                        <span className="text-[11px] font-black uppercase italic tracking-tight">{stat.label}</span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400 leading-tight uppercase tracking-widest opacity-60 ml-7">{stat.desc}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Tabla distribución */}
                                <div className="pt-8 border-t border-white/5">
                                    <div className="flex items-center gap-3 mb-6">
                                        <Activity className="w-5 h-5 text-celeste" />
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300 italic">Distribución de Puntos — 26 Inscriptos</h3>
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/10">
                                        <div className="overflow-x-auto no-scrollbar">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-white/5">
                                                        <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-slate-400 italic">Instancia</th>
                                                        <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-slate-400 italic text-center">Ronda</th>
                                                        <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-slate-400 italic text-center">Zona</th>
                                                        <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-slate-400 italic text-center">Base</th>
                                                        <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-emerald-500 italic text-center">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {[
                                                        { rank: "1° - Campeón", round: 1000, zone: 80, base: 20, total: 1100, highlight: true },
                                                        { rank: "2° - Subcampeón", round: 600, zone: 80, base: 20, total: 700, highlight: false },
                                                        { rank: "Semifinales", round: 360, zone: 80, base: 20, total: 460, highlight: false },
                                                        { rank: "Cuartos", round: 180, zone: 40, base: 20, total: 240, highlight: false },
                                                        { rank: "Octavos", round: 90, zone: 40, base: 20, total: 150, highlight: false },
                                                        { rank: "Solo Grupos", round: 0, zone: 40, base: 20, total: 60, highlight: false },
                                                    ].map((row, i) => (
                                                        <tr key={i} className={`group hover:bg-celeste/5 transition-colors ${row.highlight ? "bg-celeste/10" : ""}`}>
                                                            <td className="px-4 py-2">
                                                                <div className="flex items-center gap-2">
                                                                    {row.highlight && <Trophy className="w-3 h-3 text-amber-400" />}
                                                                    <span className={`text-[10px] font-black uppercase italic tracking-tight ${row.highlight ? "text-celeste" : "text-white"}`}>{row.rank}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2 text-center text-[9px] font-black text-white italic">{row.round}</td>
                                                            <td className="px-4 py-2 text-center text-[9px] font-bold text-slate-400">+{row.zone}</td>
                                                            <td className="px-4 py-2 text-center text-[9px] font-bold text-slate-400">+{row.base}</td>
                                                            <td className="px-4 py-2 text-center">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black italic tracking-tighter ${row.highlight ? "bg-celeste text-white" : "bg-white/5 text-white"}`}>
                                                                    {row.total}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </motion.section>

                            {/* Sección 2: Ascenso */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 relative overflow-hidden group shadow-xl">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-700">
                                    <TrendingUp className="w-64 h-64 text-rosa" />
                                </div>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-xl bg-rosa/10 border border-rosa/20 flex items-center justify-center shadow-inner">
                                        <ArrowUpRight className="w-6 h-6 text-rosa" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-rosa">Meritocracia & Ascenso</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Criterios técnicos para subir de nivel</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { title: "Doble Campeón", desc: "Gana 2 torneos en el año calendario para asegurar tu pase.", icon: Trophy, color: "bg-amber-400" },
                                        { title: "Superación Umbral", desc: "Puntaje superior al máximo de tu categoría por un 15% adicional.", icon: Star, color: "bg-rosa" },
                                        { title: "Consistencia Élite", desc: "Alcanzar umbral de siguiente categoría y haber ganado 1 torneo.", icon: Medal, color: "bg-celeste" },
                                    ].map((card, i) => (
                                        <div key={i} className="p-5 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-4 group hover:bg-rosa/5 hover:border-rosa/20 transition-all">
                                            <div className={`w-10 h-10 rounded-xl ${card.color} text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                                <card.icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-[11px] font-black uppercase italic tracking-widest mb-2 group-hover:text-rosa transition-colors leading-tight">{card.title}</h4>
                                                <p className="text-[9px] font-bold text-slate-500 leading-relaxed uppercase tracking-wider">{card.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-10 p-6 bg-rosa/5 border border-rosa/10 rounded-2xl flex items-start gap-5">
                                    <Info className="w-6 h-6 text-rosa shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-normal opacity-70">
                                        IMPORTANTE: El sistema procesa <span className="text-white">una categoría a la vez</span>. No se permiten ascensos dobles directos para preservar el equilibrio competitivo.
                                    </p>
                                </div>
                            </motion.section>

                            {/* Sección 3: Descenso */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group border-rojo/10">
                                <div className="absolute bottom-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-700">
                                    <TrendingDown className="w-64 h-64 text-rojo" />
                                </div>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-xl bg-rojo/10 border border-rojo/20 flex items-center justify-center">
                                        <Clock className="w-6 h-6 text-rojo" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-rojo">Penalización</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">La importancia de mantenerse en competencia</p>
                                    </div>
                                </div>
                                <div className="flex flex-col lg:flex-row items-center gap-8">
                                    <div className="flex-1 space-y-4">
                                        <p className="text-sm font-bold text-slate-400 leading-relaxed uppercase tracking-tight italic">
                                            Para asegurar nivel real: implementado el <strong className="text-rojo italic">— Descenso por Inactividad —</strong>.
                                        </p>
                                        <div className="p-6 bg-rojo/5 border border-rojo/10 rounded-xl w-full group-hover:bg-rojo/10 transition-all">
                                            <div className="flex items-center gap-3 mb-2">
                                                <TrendingDown className="w-5 h-5 text-rojo" />
                                                <span className="text-sm font-black uppercase italic tracking-tighter">Regla de 365 Días</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-[0.15em]">
                                                Sin actividad oficial por <strong className="text-white">12 meses consecutivos</strong>, baja automáticamente una categoría.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-full lg:w-56 p-6 glass-card rounded-xl flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden group-hover:border-rojo/40 transition-all">
                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-rojo/20 group-hover:h-full transition-all duration-700 opacity-20 pointer-events-none" />
                                        <div className="text-4xl font-black italic tracking-tighter text-rojo mb-1 relative">365</div>
                                        <div className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 relative">Días</div>
                                        <div className="w-10 h-px bg-white/10 my-3 relative" />
                                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 opacity-40 italic relative">-1 Categoría</div>
                                    </div>
                                </div>
                            </motion.section>

                            {/* Sección 4: Gestión */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-azul-primary/5 border border-azul-primary/10 flex items-center justify-center shadow-inner group-hover:bg-azul-primary/10 transition-all">
                                        <Users className="w-6 h-6 text-azul-primary transition-colors" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Performance</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Promoción manual supervisada</p>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-slate-400 leading-relaxed max-w-2xl uppercase tracking-tight italic opacity-70">
                                    Existen casos excepcionales donde un jugador demuestra un <span className="text-celeste">nivel disruptivo</span>. Los administradores tienen la facultad de realizar promociones manuales basadas en la observación directa.
                                </p>
                            </motion.section>
                        </motion.div>
                    )}

                    {activeTab === "round-robin" && (
                        <motion.div
                            key="round-robin"
                            variants={container}
                            initial="hidden"
                            animate="show"
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 gap-6"
                        >
                            {/* Intro */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 relative overflow-hidden group shadow-xl">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-all duration-700 -rotate-12 translate-x-4">
                                    <GitMerge className="w-48 h-48 text-celeste" />
                                </div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-celeste/10 border border-celeste/20 flex items-center justify-center shadow-inner">
                                        <GitMerge className="w-6 h-6 text-celeste" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">¿Qué es el Round Robin?</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Grupos + eliminación directa</p>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-tight italic opacity-80 max-w-2xl mb-6">
                                    El Round Robin divide a los participantes en <span className="text-white">grupos reducidos</span> donde todos se enfrentan entre sí. Los mejores de cada grupo avanzan a un bracket de eliminación directa. Es el formato más usado en torneos federados.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        { icon: Users, color: "text-celeste", bg: "bg-celeste/10 border-celeste/20", title: "Múltiples Grupos", desc: "Los jugadores se dividen en grupos. Dentro de cada grupo todos juegan contra todos." },
                                        { icon: ListOrdered, color: "text-azul-primary", bg: "bg-azul-primary/10 border-azul-primary/20", title: "Clasificación por Grupo", desc: "Al terminar la fase de grupos, los mejores de cada grupo clasifican a playoffs." },
                                        { icon: Network, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", title: "Playoff con Seeding", desc: "El bracket protege a los compañeros de grupo para que no se crucen temprano." },
                                    ].map((c, i) => (
                                        <div key={i} className={`p-4 rounded-xl border ${c.bg} flex flex-col gap-3`}>
                                            <c.icon className={`w-5 h-5 ${c.color}`} />
                                            <div>
                                                <p className="text-[10px] font-black uppercase italic tracking-widest mb-1">{c.title}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">{c.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>

                            {/* Fases del torneo */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center">
                                        <Activity className="w-6 h-6 text-azul-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Fases del Torneo</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">El flujo de gestión paso a paso</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        {
                                            step: "01", label: "Check-in y Asistencia",
                                            color: "bg-celeste/20 text-celeste border-celeste/30",
                                            desc: "El admin marca qué jugadores inscriptos están presentes y cuáles pagaron. Solo los jugadores marcados como presentes participan del sorteo.",
                                            detail: "También es posible registrar el pago de la inscripción individualmente.",
                                        },
                                        {
                                            step: "02", label: "Configuración de Estructura",
                                            color: "bg-azul-primary/20 text-azul-primary border-azul-primary/30",
                                            desc: "El admin define la cantidad de grupos y la cantidad de jugadores por grupo. El sistema muestra en tiempo real cuántos cupos quedan y cuántos partidos se jugarán.",
                                            detail: "Fórmula de partidos por grupo: n × (n−1) / 2, donde n = jugadores por grupo.",
                                        },
                                        {
                                            step: "03", label: "Sorteo y Asignación",
                                            color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                                            desc: "El sorteo puede ser automático (con animación) o manual mediante drag & drop. El sistema respeta las reglas de distribución para garantizar equilibrio.",
                                            detail: "El admin puede mover jugadores entre grupos libremente antes de confirmar el fixture.",
                                        },
                                        {
                                            step: "04", label: "Fase de Grupos",
                                            color: "bg-rosa/20 text-rosa border-rosa/30",
                                            desc: "Se cargan los resultados partido a partido. El admin ingresa los scores y los confirma. Los empates no están permitidos.",
                                            detail: "La clasificación se actualiza en tiempo real a medida que se confirman los resultados.",
                                        },
                                        {
                                            step: "05", label: "Playoffs (Eliminación Directa)",
                                            color: "bg-amber-400/20 text-amber-400 border-amber-400/30",
                                            desc: "Al confirmar todos los partidos de grupos, el botón 'Armar Play-offs' se activa. El admin puede ajustar cuántos clasifican antes de generar el bracket.",
                                            detail: "El ganador de cada partido avanza automáticamente a la siguiente ronda.",
                                        },
                                    ].map((s, i) => (
                                        <div key={i} className="flex items-start gap-4 p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/[0.07] transition-all group/item">
                                            <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[9px] font-black italic border ${s.color}`}>{s.step}</div>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black uppercase italic tracking-widest mb-1 group-hover/item:text-celeste transition-colors">{s.label}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed mb-1">{s.desc}</p>
                                                <p className="text-[8px] font-black text-slate-400/40 uppercase tracking-widest italic">{s.detail}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>

                            {/* Sorteo */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-700">
                                    <Shuffle className="w-64 h-64 text-celeste" />
                                </div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-celeste/10 border border-celeste/20 flex items-center justify-center">
                                        <Shuffle className="w-6 h-6 text-celeste" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Criterios del Sorteo</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Cómo se distribuyen los jugadores en los grupos</p>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed italic opacity-70 mb-6 max-w-2xl">
                                    El sorteo automático mezcla a los jugadores presentes de forma aleatoria y los distribuye uno por uno evaluando dos criterios en orden de prioridad:
                                </p>
                                <div className="space-y-3 mb-6">
                                    {[
                                        {
                                            priority: "01", label: "Evitar mismo club",
                                            color: "bg-celeste/20 text-celeste",
                                            desc: "Se prefiere asignar al jugador al grupo que tenga menos compañeros del mismo club. Garantiza variedad entre jugadores de distintos clubes en cada zona.",
                                        },
                                        {
                                            priority: "02", label: "Equilibrar tamaño de grupos",
                                            color: "bg-azul-primary/20 text-azul-primary",
                                            desc: "Entre grupos con la misma cantidad de jugadores del mismo club, se elige el grupo con menos jugadores en total. Evita que un grupo se llene antes que los demás.",
                                        },
                                    ].map((s, i) => (
                                        <div key={i} className="flex items-start gap-4 p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-celeste/5 hover:border-celeste/15 transition-all">
                                            <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[9px] font-black italic ${s.color}`}>{s.priority}</div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase italic tracking-widest mb-1">{s.label}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">{s.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-5 bg-azul-primary/5 border border-azul-primary/15 rounded-2xl flex items-start gap-4">
                                    <Info className="w-5 h-5 text-azul-primary shrink-0 mt-0.5" />
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed opacity-80">
                                        El admin puede <span className="text-white">rehacer el sorteo</span> las veces que quiera antes de confirmar el fixture, o mover jugadores manualmente mediante drag & drop entre grupos.
                                    </p>
                                </div>
                            </motion.section>

                            {/* Clasificación dentro del grupo */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-rosa/10 border border-rosa/20 flex items-center justify-center">
                                        <ListOrdered className="w-6 h-6 text-rosa" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Clasificación dentro del Grupo</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Sistema FIP de desempate recursivo</p>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed italic opacity-70 mb-6 max-w-2xl">
                                    El sistema usa un algoritmo de desempate recursivo (estilo FIP): si varios jugadores empatan en un criterio, se aplica el siguiente solo sobre ese subgrupo empatado — no sobre la tabla completa.
                                </p>
                                <div className="space-y-2 mb-6">
                                    {[
                                        { rank: "1°", label: "Victorias", desc: "Partidos ganados en el grupo. Criterio principal. Los empates en el marcador no están permitidos: el sistema los rechaza al intentar confirmar.", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
                                        { rank: "2°", label: "Diferencia de Juegos", desc: "Games ganados menos games perdidos en el grupo. Se aplica solo entre jugadores que empatan en victorias.", color: "text-celeste", bg: "bg-celeste/10 border-celeste/20" },
                                        { rank: "3°", label: "Games Ganados", desc: "Total de games anotados. Tercer nivel de desempate aplicado al subgrupo que sigue empatado tras los criterios anteriores.", color: "text-azul-primary", bg: "bg-azul-primary/10 border-azul-primary/20" },
                                        { rank: "4°", label: "Enfrentamiento Directo", desc: "Para desempates de exactamente 2 jugadores igualados en los tres criterios anteriores, se mira el resultado del partido entre ellos.", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                                    ].map((c, i) => (
                                        <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border ${c.bg}`}>
                                            <span className={`text-xl font-black italic tracking-tighter shrink-0 w-8 ${c.color}`}>{c.rank}</span>
                                            <div>
                                                <p className="text-[10px] font-black uppercase italic tracking-widest mb-1">{c.label}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">{c.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="overflow-hidden rounded-xl border border-white/5 bg-white/5">
                                    <div className="bg-white/5 px-4 py-3 border-b border-white/10">
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-celeste italic">Ejemplo — Grupo de 3 jugadores (todos contra todos = 3 partidos)</h4>
                                    </div>
                                    <div className="overflow-x-auto no-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-white/5">
                                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-slate-400">#</th>
                                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-slate-400">Jugador</th>
                                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-slate-400 text-center">PJ</th>
                                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-amber-400 text-center">V</th>
                                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-slate-400 text-center">D</th>
                                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-celeste text-center">+/-</th>
                                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-azul-primary text-center">GF</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {[
                                                    { pos: 1, name: "Jugador A", pj: 2, v: 2, d: 0, diff: "+6", gf: 12, qualify: true },
                                                    { pos: 2, name: "Jugador B", pj: 2, v: 1, d: 1, diff: "+1", gf: 9, qualify: true },
                                                    { pos: 3, name: "Jugador C", pj: 2, v: 0, d: 2, diff: "-7", gf: 5, qualify: false },
                                                ].map((row, i) => (
                                                    <tr key={i} className={`hover:bg-celeste/5 transition-colors ${row.qualify ? "bg-celeste/5" : ""}`}>
                                                        <td className="px-4 py-2 text-[9px] font-black text-slate-500 italic">{row.pos}</td>
                                                        <td className="px-4 py-2">
                                                            <span className={`text-[10px] font-black uppercase italic tracking-tight ${row.qualify ? "text-celeste" : "text-white"}`}>{row.name}</span>
                                                            {row.qualify && <span className="ml-2 text-[7px] font-black text-emerald-400 uppercase tracking-widest">↑ clasifica</span>}
                                                        </td>
                                                        <td className="px-4 py-2 text-center text-[9px] font-bold text-slate-400">{row.pj}</td>
                                                        <td className="px-4 py-2 text-center text-[9px] font-black text-amber-400">{row.v}</td>
                                                        <td className="px-4 py-2 text-center text-[9px] font-bold text-slate-400">{row.d}</td>
                                                        <td className="px-4 py-2 text-center">
                                                            <span className={`text-[9px] font-black ${row.diff.startsWith("+") ? "text-emerald-400" : "text-rojo"}`}>{row.diff}</span>
                                                        </td>
                                                        <td className="px-4 py-2 text-center text-[9px] font-bold text-slate-400">{row.gf}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.section>

                            {/* Clasificados y Playoff */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-700">
                                    <Network className="w-64 h-64 text-amber-400" />
                                </div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                                        <Network className="w-6 h-6 text-amber-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Clasificados & Seeding</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Cómo se arma el bracket con protección de grupo</p>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed italic opacity-70 mb-6 max-w-2xl">
                                    Por defecto clasifican <span className="text-white">2 jugadores por grupo</span>, pero el admin puede ajustar ese número con +/- antes de generar el bracket. El mínimo es 1 clasificado por grupo y el máximo es la cantidad total de jugadores del grupo mayor.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="space-y-3">
                                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 italic flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px]">1</span>
                                            Orden de seeds entre grupos
                                        </h3>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">
                                            Los seeds se asignan intercalando posiciones de todos los grupos: primero todos los 1ros, luego todos los 2dos, etc. El orden dentro de cada posición se decide por victorias → diferencia → games.
                                        </p>
                                        <div className="space-y-1.5">
                                            {[
                                                { seed: "Seed 1", from: "1° Grupo A", color: "bg-amber-400/20 text-amber-400" },
                                                { seed: "Seed 2", from: "1° Grupo B", color: "bg-amber-400/15 text-amber-400" },
                                                { seed: "Seed 3", from: "2° Grupo A", color: "bg-celeste/20 text-celeste" },
                                                { seed: "Seed 4", from: "2° Grupo B", color: "bg-celeste/15 text-celeste" },
                                            ].map((s, i) => (
                                                <div key={i} className="flex items-center justify-between p-2.5 bg-white/5 border border-white/5 rounded-xl">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black ${s.color}`}>{s.seed}</span>
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{s.from}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 italic flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px]">2</span>
                                            Protección de grupo en el bracket
                                        </h3>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">
                                            Los 2dos de cada grupo son desplazados en el cuadro para que no puedan cruzarse con el 1ro de su mismo grupo hasta la final. El desplazamiento es de la mitad de la cantidad de grupos.
                                        </p>
                                        <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                                            <p className="text-[8px] font-black text-amber-400/80 uppercase tracking-widest italic leading-relaxed">
                                                Ejemplo con 4 grupos: el 2° del Grupo A se desplaza 2 posiciones → no puede cruzarse con el 1° del Grupo A hasta la semifinal o final.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 bg-celeste/5 border border-celeste/15 rounded-2xl flex items-start gap-4">
                                    <Info className="w-5 h-5 text-celeste shrink-0 mt-0.5" />
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed opacity-80">
                                        Al igual que en el Americano, el número de clasificados puede ser <span className="text-celeste">cualquier par ≥ 2</span>. El sistema redondea al cuadro más cercano y rellena con <strong className="text-white">BYE</strong> (pase directo) a los mejores seeds. Los BYEs se auto-confirman y el ganador avanza solo.
                                    </p>
                                </div>
                            </motion.section>
                        </motion.div>
                    )}

                    {activeTab === "americano" && (
                        <motion.div
                            key="americano"
                            variants={container}
                            initial="hidden"
                            animate="show"
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 gap-6"
                        >
                            {/* Intro */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 relative overflow-hidden group shadow-xl">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-all duration-700 -rotate-12 translate-x-4">
                                    <BarChart3 className="w-48 h-48 text-celeste" />
                                </div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-celeste/10 border border-celeste/20 flex items-center justify-center shadow-inner">
                                        <BarChart3 className="w-6 h-6 text-celeste" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">¿Qué es el Americano?</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Formato libre con playoffs clasificatorios</p>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-tight italic opacity-80 max-w-2xl mb-6">
                                    El Americano es un torneo donde <span className="text-white">todos los participantes forman un único grupo</span> y se enfrentan entre sí en una fase libre. Al terminar la fase de grupos, los mejores clasificados avanzan a un bracket de eliminación directa.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        { icon: Users, color: "text-celeste", bg: "bg-celeste/10 border-celeste/20", title: "Un Solo Grupo", desc: "Todos los jugadores compiten en el mismo grupo, sin subdivisiones por zona." },
                                        { icon: Sliders, color: "text-azul-primary", bg: "bg-azul-primary/10 border-azul-primary/20", title: "Formato Configurable", desc: "El admin define canchas simultáneas, cantidad de partidos por jugador y tamaño del bracket." },
                                        { icon: Network, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", title: "Playoffs por Ranking", desc: "Los mejores N jugadores del grupo avanzan al bracket de eliminación directa." },
                                    ].map((c, i) => (
                                        <div key={i} className={`p-4 rounded-xl border ${c.bg} flex flex-col gap-3`}>
                                            <c.icon className={`w-5 h-5 ${c.color}`} />
                                            <div>
                                                <p className="text-[10px] font-black uppercase italic tracking-widest mb-1">{c.title}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">{c.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>

                            {/* Configuración del torneo */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center">
                                        <Sliders className="w-6 h-6 text-azul-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Configuración del Formato</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Parámetros definidos por el organizador</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        {
                                            label: "Canchas Simultáneas",
                                            key: "numCourts",
                                            default: "2",
                                            color: "border-celeste/30 bg-celeste/5",
                                            badge: "bg-celeste/15 text-celeste border-celeste/30",
                                            desc: "Cuántas canchas corren en paralelo. Cada cancha tiene un partido activo a la vez.",
                                            example: "Con 2 canchas y 8 jugadores, 4 juegan y 4 esperan.",
                                        },
                                        {
                                            label: "Partidos por Jugador",
                                            key: "matchesPerTeam",
                                            default: "2",
                                            color: "border-azul-primary/30 bg-azul-primary/5",
                                            badge: "bg-azul-primary/15 text-azul-primary border-azul-primary/30",
                                            desc: "Cuántos partidos debe completar cada jugador/pareja en la fase de grupos.",
                                            example: "Con 3 partidos por jugador y 8 jugadores: 12 partidos totales en la fase de grupos.",
                                        },
                                        {
                                            label: "Clasificados al Bracket",
                                            key: "bracketSize",
                                            default: "8",
                                            color: "border-emerald-500/30 bg-emerald-500/5",
                                            badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                                            desc: "Cuántos jugadores del grupo clasifican a playoffs. Puede ser cualquier número par ≥ 2, no necesariamente potencia de 2.",
                                            example: "Con 6 clasificados: el sistema genera un bracket de 8 y asigna BYE a los 2 mejores seeds.",
                                        },
                                        {
                                            label: "Modalidad",
                                            key: "isIndividual",
                                            default: "Parejas",
                                            color: "border-rosa/30 bg-rosa/5",
                                            badge: "bg-rosa/15 text-rosa border-rosa/30",
                                            desc: "Individual (cada jugador compite solo) o Parejas (equipos de 2 jugadores fijos).",
                                            example: "En modalidad individual, el ranking es personal. En parejas, es por equipo.",
                                        },
                                    ].map((cfg, i) => (
                                        <div key={i} className={`p-5 rounded-xl border ${cfg.color} flex flex-col gap-3`}>
                                            <div className="flex items-center justify-between">
                                                <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${cfg.badge}`}>{cfg.label}</span>
                                                <span className="text-[8px] font-black text-slate-400/40 uppercase tracking-widest">por defecto: {cfg.default}</span>
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">{cfg.desc}</p>
                                            <p className="text-[8px] font-black text-slate-400/45 uppercase tracking-widest italic border-t border-white/5 pt-2">{cfg.example}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>

                            {/* Fase de Grupos */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-700">
                                    <Swords className="w-64 h-64 text-celeste" />
                                </div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-celeste/10 border border-celeste/20 flex items-center justify-center">
                                        <Swords className="w-6 h-6 text-celeste" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Fase de Grupos</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Cómo se generan y asignan los partidos</p>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed italic opacity-70 mb-6 max-w-2xl">
                                    El admin genera los partidos cancha por cancha. Cuando una cancha queda libre, el sistema elige automáticamente los 2 jugadores/parejas disponibles con mayor necesidad de jugar.
                                </p>

                                <div className="space-y-3 mb-6">
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 italic flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px]">1</span>
                                        Criterios para seleccionar el próximo partido
                                    </h3>
                                    {[
                                        { priority: "01", label: "Menos partidos jugados", color: "bg-celeste/20 text-celeste", desc: "El jugador con menos partidos confirmados tiene prioridad absoluta. Garantiza que todos jueguen la misma cantidad de partidos." },
                                        { priority: "02", label: "Club diferente", color: "bg-azul-primary/20 text-azul-primary", desc: "Entre jugadores con igual cantidad de partidos, se prefiere enfrentar a jugadores de otro club." },
                                        { priority: "03", label: "Rival nuevo", color: "bg-emerald-500/20 text-emerald-400", desc: "Si ambos criterios anteriores empatan, se prefiere a un jugador con quien aún no se haya medido en el torneo." },
                                    ].map((s, i) => (
                                        <div key={i} className="flex items-start gap-4 p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-celeste/5 hover:border-celeste/15 transition-all group/item">
                                            <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[9px] font-black italic ${s.color}`}>{s.priority}</div>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black uppercase italic tracking-widest mb-1 group-hover/item:text-celeste transition-colors">{s.label}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">{s.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-5 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex items-start gap-4">
                                    <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed opacity-80">
                                        Un jugador solo puede estar en <span className="text-white">un partido a la vez</span>. Si ya está en cancha, no aparece como candidato hasta que su partido sea confirmado. La fase de grupos termina cuando todos los jugadores alcanzaron el número de partidos configurado.
                                    </p>
                                </div>
                            </motion.section>

                            {/* Clasificación */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-rosa/10 border border-rosa/20 flex items-center justify-center">
                                        <ListOrdered className="w-6 h-6 text-rosa" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Clasificación & Posiciones</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Criterios de desempate en el ranking de grupos</p>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed italic opacity-70 mb-6 max-w-2xl">
                                    La tabla de posiciones se actualiza en tiempo real con cada partido confirmado. El orden se determina por los siguientes criterios aplicados en cascada:
                                </p>
                                <div className="space-y-2 mb-6">
                                    {[
                                        { rank: "1°", label: "Victorias", desc: "Partidos ganados (score del jugador mayor que el del rival). Criterio principal.", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
                                        { rank: "2°", label: "Diferencia de Games", desc: "Games ganados menos games perdidos. Se aplica cuando dos jugadores tienen el mismo número de victorias.", color: "text-celeste", bg: "bg-celeste/10 border-celeste/20" },
                                        { rank: "3°", label: "Games Ganados", desc: "Total de games anotados en toda la fase de grupos. Desempate final para casos de empate absoluto.", color: "text-slate-400", bg: "bg-white/5 border-white/10" },
                                    ].map((c, i) => (
                                        <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border ${c.bg}`}>
                                            <span className={`text-xl font-black italic tracking-tighter shrink-0 w-8 ${c.color}`}>{c.rank}</span>
                                            <div>
                                                <p className="text-[10px] font-black uppercase italic tracking-widest mb-1">{c.label}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">{c.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="overflow-hidden rounded-xl border border-white/5 bg-white/5">
                                    <div className="bg-white/5 px-4 py-3 border-b border-white/10">
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-celeste italic">Ejemplo de tabla — 6 jugadores, 2 partidos c/u</h4>
                                    </div>
                                    <div className="overflow-x-auto no-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-white/5">
                                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-slate-400">#</th>
                                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-slate-400">Jugador</th>
                                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-slate-400 text-center">PJ</th>
                                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-amber-400 text-center">V</th>
                                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-slate-400 text-center">D</th>
                                                    <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-celeste text-center">+/-</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {[
                                                    { pos: 1, name: "Jugador A", pj: 2, v: 2, d: 0, diff: "+8", highlight: true },
                                                    { pos: 2, name: "Jugador B", pj: 2, v: 2, d: 0, diff: "+4", highlight: true },
                                                    { pos: 3, name: "Jugador C", pj: 2, v: 1, d: 1, diff: "+1", highlight: false },
                                                    { pos: 4, name: "Jugador D", pj: 2, v: 1, d: 1, diff: "-1", highlight: false },
                                                    { pos: 5, name: "Jugador E", pj: 2, v: 0, d: 2, diff: "-5", highlight: false },
                                                    { pos: 6, name: "Jugador F", pj: 2, v: 0, d: 2, diff: "-7", highlight: false },
                                                ].map((row, i) => (
                                                    <tr key={i} className={`hover:bg-celeste/5 transition-colors ${row.highlight ? "bg-celeste/5" : ""}`}>
                                                        <td className="px-4 py-2 text-[9px] font-black text-slate-500 italic">{row.pos}</td>
                                                        <td className="px-4 py-2">
                                                            <span className={`text-[10px] font-black uppercase italic tracking-tight ${row.highlight ? "text-celeste" : "text-white"}`}>{row.name}</span>
                                                            {row.pos <= 2 && <span className="ml-2 text-[7px] font-black text-emerald-400 uppercase tracking-widest">↑ clasifica</span>}
                                                        </td>
                                                        <td className="px-4 py-2 text-center text-[9px] font-bold text-slate-400">{row.pj}</td>
                                                        <td className="px-4 py-2 text-center text-[9px] font-black text-amber-400">{row.v}</td>
                                                        <td className="px-4 py-2 text-center text-[9px] font-bold text-slate-400">{row.d}</td>
                                                        <td className="px-4 py-2 text-center">
                                                            <span className={`text-[9px] font-black ${row.diff.startsWith("+") ? "text-emerald-400" : "text-rojo"}`}>{row.diff}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.section>

                            {/* Fase Playoffs */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-700">
                                    <Network className="w-64 h-64 text-amber-400" />
                                </div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                                        <Network className="w-6 h-6 text-amber-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Fase Playoff</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Bracket de eliminación directa con seeding</p>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed italic opacity-70 mb-6 max-w-2xl">
                                    Al finalizar la fase de grupos, los <span className="text-white">N mejores clasificados</span> (según el bracketSize configurado) avanzan a un bracket de eliminación directa. El bracket se arma con seeding para que los mejores se crucen lo más tarde posible.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="space-y-3">
                                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 italic flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px]">1</span>
                                            Seeding — cruce con bracket clásico
                                        </h3>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">
                                            El sistema usa el orden estándar de torneos: el 1° vs el último, el 2° vs el penúltimo, y así sucesivamente. Esto maximiza la probabilidad de que los mejores clasificados se encuentren en la final.
                                        </p>
                                        <div className="space-y-1.5">
                                            {[
                                                { s1: "1°", s2: "8°", round: "Cuartos" },
                                                { s1: "2°", s2: "7°", round: "Cuartos" },
                                                { s1: "3°", s2: "6°", round: "Cuartos" },
                                                { s1: "4°", s2: "5°", round: "Cuartos" },
                                            ].map((m, i) => (
                                                <div key={i} className="flex items-center gap-3 p-2 bg-white/5 border border-white/5 rounded-lg">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400/40 w-10">{m.round}</span>
                                                    <span className="px-2 py-0.5 bg-celeste/20 text-celeste text-[8px] font-black rounded">{m.s1}</span>
                                                    <ChevronRight className="w-3 h-3 text-slate-400/30" />
                                                    <span className="px-2 py-0.5 bg-rosa/20 text-rosa text-[8px] font-black rounded">{m.s2}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 italic flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px]">2</span>
                                            Avance automático de ganadores
                                        </h3>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">
                                            Al confirmar el resultado de un partido del bracket, el ganador avanza automáticamente al siguiente cruze. Si el resultado se corrige, el avance también se revierte.
                                        </p>
                                        <div className="space-y-2">
                                            {[
                                                { bracket: "8 jugadores", rounds: "3 rondas", matches: "7 partidos" },
                                                { bracket: "16 jugadores", rounds: "4 rondas", matches: "15 partidos" },
                                                { bracket: "4 jugadores", rounds: "2 rondas", matches: "3 partidos" },
                                            ].map((b, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                                                    <span className="text-[9px] font-black uppercase italic tracking-tight text-slate-200">{b.bracket}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{b.rounds}</span>
                                                        <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/20 text-amber-400 text-[8px] font-black rounded-full">{b.matches}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 bg-celeste/5 border border-celeste/15 rounded-2xl flex items-start gap-4">
                                    <Info className="w-5 h-5 text-celeste shrink-0 mt-0.5" />
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed opacity-80">
                                        El número de clasificados puede ser <span className="text-celeste">cualquier número par ≥ 2</span>, no necesariamente potencia de 2. El sistema redondea internamente al cuadro más cercano y rellena los slots sobrantes con <strong className="text-white">BYE</strong> (pase directo), asignados a los mejores seeds. Ejemplo: 6 clasificados → bracket de 8, el 1° y 2° avanzan solos su BYE.
                                    </p>
                                </div>
                            </motion.section>
                        </motion.div>
                    )}

                    {activeTab === "cancha-abierta" && (
                        <motion.div
                            key="cancha-abierta"
                            variants={container}
                            initial="hidden"
                            animate="show"
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 gap-6"
                        >
                            {/* Intro */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 relative overflow-hidden group shadow-xl">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-all duration-700 -rotate-12 translate-x-4">
                                    <Layers className="w-48 h-48 text-celeste" />
                                </div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-celeste/10 border border-celeste/20 flex items-center justify-center shadow-inner">
                                        <Layers className="w-6 h-6 text-celeste" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">¿Qué es Cancha Abierta?</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Formato de juego libre y rotativo</p>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-tight italic opacity-80 max-w-2xl mb-6">
                                    Cancha Abierta es un formato de juego donde <span className="text-white">todos juegan contra todos</span> de forma rotativa. No hay grupos fijos ni eliminatorias: los jugadores esperan en cola, se arman partidos automáticamente cuando una cancha queda libre, y al terminar vuelven a la fila.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        { icon: Timer, color: "text-celeste", bg: "bg-celeste/10 border-celeste/20", title: "Fila Dinámica", desc: "El que más espera, primero juega. El sistema prioriza automáticamente." },
                                        { icon: Shuffle, color: "text-azul-primary", bg: "bg-azul-primary/10 border-azul-primary/20", title: "Armado Auto", desc: "El sistema elige los 4 jugadores y la mejor combinación de parejas." },
                                        { icon: RotateCcw, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", title: "Rotación Continua", desc: "Al terminar cada partido los jugadores regresan a la cola de espera." },
                                    ].map((c, i) => (
                                        <div key={i} className={`p-4 rounded-xl border ${c.bg} flex flex-col gap-3`}>
                                            <c.icon className={`w-5 h-5 ${c.color}`} />
                                            <div>
                                                <p className="text-[10px] font-black uppercase italic tracking-widest mb-1">{c.title}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">{c.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>

                            {/* Inscripción y preferencia */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center">
                                        <UserCheck className="w-6 h-6 text-azul-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Inscripción & Preferencia</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Cómo registrarse en el evento</p>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed italic opacity-70 mb-6 max-w-2xl">
                                    Al inscribirse, cada jugador indica su <span className="text-white">preferencia de posición en cancha</span>. El sistema usa este dato para armar las mejores parejas posibles.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        {
                                            label: "Drive",
                                            icon: "→",
                                            color: "border-azul-primary/30 bg-azul-primary/5",
                                            badge: "bg-azul-primary text-white",
                                            desc: "Prefieres jugar en el lado derecho de la cancha (lado del drive).",
                                            ideal: "Ideal para diestros que atacan por el derecho.",
                                        },
                                        {
                                            label: "Revés",
                                            icon: "←",
                                            color: "border-rosa/30 bg-rosa/5",
                                            badge: "bg-rosa text-white",
                                            desc: "Prefieres jugar en el lado izquierdo de la cancha (lado del revés).",
                                            ideal: "Ideal para jugadores con revés dominante o zurdos.",
                                        },
                                        {
                                            label: "Ambos",
                                            icon: "↔",
                                            color: "border-emerald-500/30 bg-emerald-500/5",
                                            badge: "bg-emerald-500 text-white",
                                            desc: "Sin preferencia: puedes jugar en cualquier lado.",
                                            ideal: "El sistema te asigna donde más se necesite.",
                                        },
                                    ].map((pos, i) => (
                                        <div key={i} className={`p-5 rounded-xl border ${pos.color} flex flex-col gap-3`}>
                                            <div className="flex items-center justify-between">
                                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${pos.badge}`}>{pos.label}</span>
                                                <span className="text-xl font-black text-slate-400/30">{pos.icon}</span>
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">{pos.desc}</p>
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic border-t border-white/5 pt-2">{pos.ideal}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>

                            {/* Modos de partido */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-rosa/10 border border-rosa/20 flex items-center justify-center">
                                        <Swords className="w-6 h-6 text-rosa" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Modos de Partido</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Configuración por cancha</p>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed italic opacity-70 mb-6 max-w-2xl">
                                    Cada cancha puede tener un modo independiente. El admin configura el modo y el algoritmo respeta la restricción al seleccionar jugadores.
                                </p>
                                <div className="space-y-3">
                                    {[
                                        {
                                            mode: "Libre",
                                            badge: "bg-celeste/15 text-celeste border-celeste/30",
                                            icon: CircleDot,
                                            rule: "Los primeros 4 jugadores de la fila de espera, sin restricciones de género.",
                                            note: "El modo más dinámico y fluido. Perfecto para jornadas informales.",
                                        },
                                        {
                                            mode: "Mixto",
                                            badge: "bg-rosa/15 text-rosa border-rosa/30",
                                            icon: GitMerge,
                                            rule: "Se seleccionan los 2 hombres y 2 mujeres que llevan más tiempo esperando. Cada equipo debe tener exactamente 1 hombre y 1 mujer.",
                                            note: "Si no hay suficientes del mismo género (mínimo 2 de cada uno), el partido no se puede generar.",
                                        },
                                        {
                                            mode: "Mismo Género",
                                            badge: "bg-azul-primary/15 text-azul-primary border-azul-primary/30",
                                            icon: Users,
                                            rule: "Se seleccionan 4 jugadores asegurando que el número de hombres sea par (0, 2 o 4), garantizando parejas del mismo género.",
                                            note: "Asegura que cada equipo sea homogéneo: H+H vs H+H, M+M vs M+M, o H+H vs M+M.",
                                        },
                                    ].map((m, i) => (
                                        <div key={i} className="p-5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/[0.07] transition-all">
                                            <div className="flex items-start gap-4">
                                                <m.icon className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${m.badge}`}>{m.mode}</span>
                                                    </div>
                                                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider leading-relaxed mb-2">{m.rule}</p>
                                                    <p className="text-[8px] font-black text-slate-400/45 uppercase tracking-widest italic">{m.note}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>

                            {/* Algoritmo de armado */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-700">
                                    <Shuffle className="w-64 h-64 text-emerald-400" />
                                </div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <Shuffle className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Algoritmo de Armado</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Cómo el sistema elige las parejas óptimas</p>
                                    </div>
                                </div>

                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed italic opacity-70 mb-8 max-w-2xl">
                                    Con 4 jugadores seleccionados, existen <span className="text-white">3 formas posibles de armar las parejas</span>. El sistema evalúa cada combinación con un puntaje de penalidad y elige la de menor costo.
                                </p>

                                {/* Las 3 combinaciones */}
                                <div className="mb-8">
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 italic mb-3 flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px]">1</span>
                                        Las 3 combinaciones posibles para A, B, C, D
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {[
                                            { combo: "A+B vs C+D", players: [["A","B"],["C","D"]] },
                                            { combo: "A+C vs B+D", players: [["A","C"],["B","D"]] },
                                            { combo: "A+D vs B+C", players: [["A","D"],["B","C"]] },
                                        ].map((c, i) => (
                                            <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
                                                <p className="text-[8px] font-black text-slate-400/40 uppercase tracking-widest mb-2">Opción {i+1}</p>
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="flex gap-1.5">
                                                        {c.players[0].map(p => (
                                                            <span key={p} className="w-7 h-7 rounded-lg bg-celeste/20 border border-celeste/30 flex items-center justify-center text-[10px] font-black text-celeste">{p}</span>
                                                        ))}
                                                    </div>
                                                    <span className="text-[8px] font-black text-slate-400/30">vs</span>
                                                    <div className="flex gap-1.5">
                                                        {c.players[1].map(p => (
                                                            <span key={p} className="w-7 h-7 rounded-lg bg-rosa/20 border border-rosa/30 flex items-center justify-center text-[10px] font-black text-rosa">{p}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Sistema de penalidades */}
                                <div>
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 italic mb-3 flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px]">2</span>
                                        Sistema de penalidades — gana el menor puntaje
                                    </h3>
                                    <div className="space-y-2">
                                        {[
                                            { label: "Pareja ya jugó junta antes", value: "+50 pts", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/15", desc: "Por cada vez que esa pareja haya jugado junta en el evento." },
                                            { label: "Ya fueron rivales antes", value: "+100 pts", icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/5 border-orange-500/15", desc: "Por cada vez que se hayan enfrentado. Se suma para cada par de rivales." },
                                            { label: "Drive + Revés en la misma pareja", value: "−100 pts", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/20", desc: "Pareja posicionalmente perfecta: un jugador de drive y uno de revés." },
                                            { label: "Dos Drives en la misma pareja", value: "+150 pts", icon: AlertTriangle, color: "text-rojo", bg: "bg-rojo/5 border-rojo/15", desc: "Pareja posicionalmente crítica: dos jugadores de drive juntos." },
                                            { label: "Dos Reveses en la misma pareja", value: "+80 pts", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/5 border-amber-500/15", desc: "Pareja sub-óptima: dos jugadores de revés juntos." },
                                            { label: "Uno o ambos son 'Ambos'", value: "0 pts", icon: CircleDot, color: "text-slate-500", bg: "bg-white/5 border-white/5", desc: "Neutral: no suma ni resta penalidad posicional." },
                                            { label: "Género incompatible con el modo", value: "+10.000 pts", icon: AlertTriangle, color: "text-rojo", bg: "bg-rojo/10 border-rojo/25", desc: "Violación de la restricción de modo (mixto/mismo género). Descarta la combinación." },
                                        ].map((row, i) => (
                                            <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border ${row.bg} transition-all`}>
                                                <row.icon className={`w-4 h-4 mt-0.5 shrink-0 ${row.color}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <span className="text-[10px] font-black uppercase italic tracking-tight">{row.label}</span>
                                                        <span className={`text-[10px] font-black shrink-0 ${row.color}`}>{row.value}</span>
                                                    </div>
                                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">{row.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-6 p-5 bg-celeste/5 border border-celeste/15 rounded-2xl flex items-start gap-4">
                                    <Info className="w-5 h-5 text-celeste shrink-0 mt-0.5" />
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed opacity-80">
                                        El sistema evalúa las 3 combinaciones, suma las penalidades de cada una y asigna automáticamente la combinación con <span className="text-celeste">menor puntaje total</span>. En caso de empate, se toma la primera opción evaluada.
                                    </p>
                                </div>
                            </motion.section>

                            {/* Prioridad de cola */}
                            <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center">
                                        <Timer className="w-6 h-6 text-azul-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Prioridad de Fila</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 opacity-50">Quién sube a cancha primero</p>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed italic opacity-70 mb-6 max-w-2xl">
                                    La cola de jugadores disponibles se ordena por <span className="text-white">tiempo de espera</span>: quién más tarde terminó su último partido va primero en la cola.
                                </p>
                                <div className="space-y-3">
                                    {[
                                        { step: "01", title: "Primera vez en el evento", desc: "Ingresa inmediatamente a la cola de espera al presentarse. No tiene historial, por lo que el sistema lo considera como el que más espera.", priority: "Alta" },
                                        { step: "02", title: "Terminó un partido", desc: "Vuelve a la cola ordenado por la hora en que terminó su último partido. A más antigua la hora, mayor prioridad.", priority: "Media" },
                                        { step: "03", title: "Recién salió de cancha", desc: "Lleva el menor tiempo esperando. Ingresa al final de la cola hasta que otros jugadores jueguen.", priority: "Baja" },
                                    ].map((s, i) => (
                                        <div key={i} className="flex items-start gap-4 p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-azul-primary/5 hover:border-azul-primary/20 transition-all group/item">
                                            <div className="w-8 h-8 shrink-0 rounded-lg bg-azul-primary/20 text-azul-primary flex items-center justify-center text-[9px] font-black italic">{s.step}</div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-[10px] font-black uppercase italic tracking-widest group-hover/item:text-azul-primary transition-colors">{s.title}</p>
                                                    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${s.priority === "Alta" ? "bg-rojo/20 text-rojo" : s.priority === "Media" ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-slate-400"}`}>{s.priority}</span>
                                                </div>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">{s.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                <footer className="mt-16 text-center pb-8">
                    <div className="h-px bg-gradient-to-r from-transparent via-azul-primary/10 to-transparent mb-8" />
                    <p className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-400 opacity-30 italic">
                        Plataforma Oficial Ranking Padel <span className="text-azul-primary/50">//</span> v2.4
                    </p>
                </footer>
            </div>
        </div>
    );
}
