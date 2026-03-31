"use client";

import { 
    Trophy, Medal, Star, TrendingUp, TrendingDown, 
    Clock, ShieldCheck, Info, ArrowUpRight, Target, 
    Users, ChevronRight, Activity, Zap
} from "lucide-react";
import { motion } from "framer-motion";

export default function ReglamentoPage() {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen bg-background text-foreground relative font-sans selection:bg-emerald-500/30 overflow-x-hidden pb-32">
            
            {/* CSS KEYFRAMES & GLOBAL STYLES */}
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
            
            {/* Ambient background glows */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 md:pt-24 pb-32">
                {/* ── Header ── */}
                <header className="mb-20 text-center md:text-left">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6 shadow-lg shadow-emerald-900/10 backdrop-blur-md"
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Reglamento Oficial
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-8"
                    >
                        Sistema de <br/>
                        <span className="text-gradient-animate drop-shadow-[0_0_25px_rgba(16,185,129,0.2)]">Puntos & Categorías</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-muted-foreground text-lg md:text-xl font-bold max-w-3xl leading-relaxed uppercase tracking-tight opacity-70 italic"
                    >
                        Entiende cómo funciona la meritocracia en nuestra plataforma. <br className="hidden md:block" />
                        Cada partido cuenta, cada torneo suma y la constancia es la clave del ascenso.
                    </motion.p>
                </header>

                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 gap-12"
                >
                    {/* ── Sección 1: Cómo sumar puntos ── */}
                    <motion.section variants={item} className="glass-card rounded-[3rem] p-8 md:p-14 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 -rotate-12 translate-x-4">
                            <Star className="w-64 h-64 text-emerald-500" />
                        </div>

                        <div className="flex items-center gap-5 mb-12">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner">
                                <Zap className="w-8 h-8 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Obtención de Puntos</h2>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1 opacity-50">Suma en cada etapa del torneo</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
                            <div className="space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-emerald-500 flex items-center gap-2 italic">Fases de Juego <div className="h-px bg-emerald-500/20 flex-1" /></h3>
                                <div className="space-y-3">
                                    {[
                                        { label: "Campeón", points: "Ronda Final", icon: Trophy, color: "text-amber-400" },
                                        { label: "Finalista", points: "Subcampeón", icon: Medal, color: "text-slate-300" },
                                        { label: "Semifinal", points: "Top 4", icon: Medal, color: "text-orange-500" },
                                        { label: "Cuartos", points: "Top 8", icon: Medal, color: "text-emerald-400" },
                                    ].map((stat, i) => (
                                        <div key={i} className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-2xl group hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all">
                                            <div className="flex items-center gap-4">
                                                <stat.icon className={`w-5 h-5 ${stat.color} drop-shadow-[0_0_8px_currentColor]`} />
                                                <span className="text-sm font-black uppercase italic tracking-tight">{stat.label}</span>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">{stat.points}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-blue-500 flex items-center gap-2 italic">Bonus Adicionales <div className="h-px bg-blue-500/20 flex-1" /></h3>
                                <div className="space-y-3">
                                    {[
                                        { label: "Participación", desc: "Base por inscripción", icon: Target, color: "text-blue-400" },
                                        { label: "Victoria en Zona", desc: "Por partido de grupo", icon: TrendingUp, color: "text-emerald-400" },
                                        { label: "Clasificación", desc: "Pase a Playoffs", icon: ArrowUpRight, color: "text-purple-400" },
                                    ].map((stat, i) => (
                                        <div key={i} className="flex flex-col p-5 bg-white/5 border border-white/5 rounded-2xl group hover:border-blue-500/30 hover:bg-blue-500/5 transition-all">
                                            <div className="flex items-center gap-4 mb-1">
                                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                                <span className="text-sm font-black uppercase italic tracking-tight">{stat.label}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground leading-tight uppercase tracking-widest opacity-60 ml-9">{stat.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* EJEMPLO PRÁCTICO */}
                        <div className="pt-12 border-t border-white/5">
                            <div className="flex items-center gap-4 mb-8">
                                <Activity className="w-6 h-6 text-emerald-500" />
                                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-foreground/70 italic">Caso de Estudio: Torneo 1.000 Puntos</h3>
                            </div>

                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                                
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center relative z-10">
                                    <div className="lg:col-span-3 space-y-8">
                                        <p className="text-base font-bold text-muted-foreground leading-relaxed uppercase tracking-tight italic">
                                            Para un torneo <span className="text-foreground">Individual</span> con una recompensa de <strong className="text-emerald-400 text-2xl italic tracking-tighter">— 1.000 pts —</strong> para el campeón:
                                        </p>

                                        <div className="space-y-6">
                                            {[
                                                { num: "01", title: "Base de Participación", desc: "Todos los inscriptos acreditan una base mínima de +20 pts." },
                                                { num: "02", title: "Mérito en Zona", desc: "Cada victoria en fase de grupos suma +40 pts adicionales." },
                                                { num: "03", title: "Premio acumulado", desc: "Al avanzar, consolidas los puntos de tu ronda de eliminación." },
                                            ].map((step, i) => (
                                                <div key={i} className="flex items-start gap-5 group/item">
                                                    <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xs font-black italic shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover/item:scale-110 transition-transform">{step.num}</div>
                                                    <div>
                                                        <p className="text-xs font-black uppercase italic tracking-widest mb-1 group-hover/item:text-emerald-400 transition-colors">{step.title}</p>
                                                        <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider leading-relaxed opacity-60">{step.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2">
                                        <div className="glass-card rounded-[2.5rem] p-8 shadow-3xl space-y-6 relative border-emerald-500/20">
                                            <div className="absolute top-4 right-6 text-[8px] font-black uppercase tracking-[0.4em] text-emerald-500/40">SIMULACIÓN</div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest border-b border-white/5 pb-3">
                                                    <span className="text-muted-foreground">Inscripción</span>
                                                    <span className="text-emerald-400">+20 PTS</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest border-b border-white/5 pb-3">
                                                    <span className="text-muted-foreground">2 Ganes en Zona</span>
                                                    <span className="text-emerald-400">+80 PTS</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest border-b border-white/5 pb-3">
                                                    <span className="text-muted-foreground">Llegar a Cuartos</span>
                                                    <span className="text-emerald-400">+180 PTS</span>
                                                </div>
                                                <div className="flex flex-col items-center pt-4">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.5em] text-emerald-500/50 mb-1">TOTAL ACUMULADO</span>
                                                    <span className="text-4xl font-black italic tracking-tighter text-foreground text-gradient-animate">280 PTS</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* TABLA DE DISTRIBUCIÓN COMPLETA */}
                                <div className="mt-16 overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/20 backdrop-blur-md">
                                    <div className="bg-white/5 px-8 py-5 border-b border-white/10 flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 italic">Desglose de Distribución (Individual)</h4>
                                        <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Basado en 26 Inscriptos</div>
                                    </div>
                                    <div className="overflow-x-auto no-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-white/5">
                                                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Instancia</th>
                                                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Ptos Ronda</th>
                                                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Zona</th>
                                                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Base</th>
                                                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-emerald-500 italic text-center">Total Jugador</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {[
                                                    { rank: "1° - Campeón", round: 1000, zone: 80, base: 20, total: 1100, highlight: true },
                                                    { rank: "2° - Subcampeon", round: 600, zone: 80, base: 20, total: 700, highlight: false },
                                                    { rank: "Semifinales", round: 360, zone: 80, base: 20, total: 460, highlight: false },
                                                    { rank: "Cuartos", round: 180, zone: 40, base: 20, total: 240, highlight: false },
                                                    { rank: "Octavos", round: 90, zone: 40, base: 20, total: 150, highlight: false },
                                                    { rank: "Grupos", round: 0, zone: 40, base: 20, total: 60, highlight: false },
                                                ].map((row, i) => (
                                                    <tr key={i} className={`group hover:bg-emerald-500/5 transition-colors ${row.highlight ? "bg-emerald-500/10" : ""}`}>
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-3">
                                                                {row.highlight && <Trophy className="w-3.5 h-3.5 text-amber-400 drop-shadow-md" />}
                                                                <span className={`text-[11px] font-black uppercase italic tracking-tight ${row.highlight ? "text-emerald-400" : "text-foreground"}`}>
                                                                    {row.rank}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5 text-center text-[10px] font-black text-foreground italic">{row.round}</td>
                                                        <td className="px-8 py-5 text-center text-[10px] font-bold text-muted-foreground">+{row.zone}</td>
                                                        <td className="px-8 py-5 text-center text-[10px] font-bold text-muted-foreground">+{row.base}</td>
                                                        <td className="px-8 py-5 text-center">
                                                            <span className={`px-4 py-1.5 rounded-full text-[11px] font-black italic tracking-tighter ${row.highlight ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40" : "bg-white/5 text-foreground"}`}>
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
                        </div>
                    </motion.section>

                    {/* ── Sección 2: El Ascenso ── */}
                    <motion.section variants={item} className="glass-card rounded-[3rem] p-8 md:p-14 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-700">
                            <TrendingUp className="w-80 h-80 text-blue-500" />
                        </div>

                        <div className="flex items-center gap-5 mb-12">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-inner">
                                <ArrowUpRight className="w-8 h-8 text-blue-500" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-blue-400">Meritocracia & Ascenso</h2>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1 opacity-50">Criterios técnicos para subir de nivel</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { title: "Doble Campeón", desc: "El título es la prueba final. Gana 2 torneos en la misma categoría durante el año calendario para asegurar tu pase al siguiente nivel.", icon: Trophy, color: "bg-amber-400" },
                                { title: "Superación del Umbral", desc: "Si tu puntaje acumulado supera el máximo de tu categoría por un 15% adicional, se procesa el ascenso por superioridad técnica.", icon: Star, color: "bg-emerald-400" },
                                { title: "Consistencia Élite", desc: "Alcanzar el umbral de puntos de la siguiente categoría sumado a haber ganado al menos 1 torneo oficial.", icon: Medal, color: "bg-blue-400" },
                            ].map((card, i) => (
                                <div key={i} className="p-8 bg-white/5 border border-white/5 rounded-[2rem] flex flex-col gap-6 group hover:bg-blue-500/5 hover:border-blue-500/20 transition-all">
                                    <div className={`w-12 h-12 rounded-2xl ${card.color} text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                        <card.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black uppercase italic tracking-widest mb-3 group-hover:text-blue-400 transition-colors leading-tight">{card.title}</h4>
                                        <p className="text-[10px] font-bold text-muted-foreground/60 leading-relaxed uppercase tracking-wider">{card.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-5">
                            <Info className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-normal opacity-70">
                                IMPORTANTE: El sistema procesa <span className="text-foreground">una categoría a la vez</span>. No se permiten ascensos dobles directos para preservar el equilibrio competitivo.
                            </p>
                        </div>
                    </motion.section>

                    {/* ── Sección 3: Inactividad y Descenso ── */}
                    <motion.section variants={item} className="glass-card rounded-[3rem] p-8 md:p-14 shadow-2xl relative overflow-hidden group border-rose-500/10">
                        <div className="absolute bottom-0 right-0 p-12 opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-700">
                            <TrendingDown className="w-80 h-80 text-rose-500" />
                        </div>

                        <div className="flex items-center gap-5 mb-10">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                <Clock className="w-8 h-8 text-rose-500" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-rose-400">Penalización e Inactividad</h2>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1 opacity-50">La importancia de mantenerse en competencia</p>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row items-center gap-12">
                            <div className="flex-1 space-y-6">
                                <p className="text-lg font-bold text-muted-foreground leading-relaxed uppercase tracking-tight italic">
                                    Para asegurar que el ranking refleje el nivel real de los jugadores activos, hemos implementado el <strong className="text-rose-500 italic">— Descenso por Inactividad —</strong>.
                                </p>
                                <div className="p-8 bg-rose-500/5 border border-rose-500/10 rounded-[2rem] w-full group-hover:bg-rose-500/10 transition-all">
                                    <div className="flex items-center gap-4 mb-4">
                                        <TrendingDown className="w-7 h-7 text-rose-500" />
                                        <span className="text-base font-black uppercase italic tracking-tighter">Regla de los 365 Días</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-muted-foreground/60 leading-relaxed uppercase tracking-[0.15em]">
                                        Si un jugador no registra actividad oficial durante un período de <strong className="text-foreground">12 meses consecutivos</strong>, el sistema bajará automáticamente una categoría a dicho perfil para su próximo regreso.
                                    </p>
                                </div>
                            </div>
                            <div className="w-full lg:w-72 p-10 glass-card rounded-[2.5rem] flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden group-hover:border-rose-500/40 transition-all">
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-rose-500/20 group-hover:h-full transition-all duration-700 opacity-20 pointer-events-none" />
                                <div className="text-6xl font-black italic tracking-tighter text-rose-500 mb-2 relative">365</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground relative">Días de Silencio</div>
                                <div className="w-12 h-px bg-white/10 my-6 relative" />
                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 italic relative">Penalty: 1 Categoría</div>
                            </div>
                        </div>
                    </motion.section>

                    {/* ── Sección 4: Gestión Administrativa ── */}
                    <motion.section variants={item} className="glass-card rounded-[3rem] p-8 md:p-14 shadow-2xl relative overflow-hidden group">
                        <div className="flex items-center gap-5 mb-8">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center justify-center shadow-inner group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">
                                <Users className="w-8 h-8 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Control por Performance</h2>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1 opacity-50">Promoción manual supervisada</p>
                            </div>
                        </div>

                        <p className="text-base font-bold text-muted-foreground leading-relaxed max-w-3xl uppercase tracking-tight italic opacity-70">
                            Existen casos excepcionales donde un jugador demuestra un <span className="text-emerald-400">nivel disruptivo</span> que no llega a cumplir las condiciones automáticas. Los administradores tienen la facultad de realizar promociones manuales basadas en la observación directa de su juego y competitividad real.
                        </p>
                    </motion.section>
                </motion.div>

                {/* ── Footer ── */}
                <footer className="mt-32 text-center pb-12">
                    <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mb-12" />
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-30 italic">
                        Plataforma Oficial de Ranking de Padel <span className="text-emerald-500/50">//</span> Pro-System v2.4
                    </p>
                </footer>
            </div>
        </div>
    );
}
