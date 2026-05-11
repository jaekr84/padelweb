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
            
            {/* Ambient background glows */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-azul-primary/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-rosa/5 rounded-full blur-[150px]" />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-celeste/20 to-transparent opacity-20" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 pt-8 md:pt-12 pb-16">
                {/* ── Header ── */}
                {/* ── Header ── */}
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
                        className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-tight mb-4"
                    >
                        Sistema de <br/>
                        <span className="text-gradient-animate drop-shadow-[0_0_30px_rgba(14,165,233,0.3)]">Puntos & Ascensos</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-muted-foreground text-xs md:text-sm font-bold max-w-2xl leading-relaxed uppercase tracking-tight opacity-70 italic"
                    >
                        Entiende cómo funciona la meritocracia en nuestra plataforma. <br className="hidden md:block" />
                        Cada partido cuenta, cada torneo suma y la constancia es la clave del ascenso.
                    </motion.p>
                </header>

                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 gap-6"
                >
                    {/* ── Sección 1: Cómo sumar puntos ── */}
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
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1 opacity-50">Suma en cada etapa del torneo</p>
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
                                            <span className="text-[9px] font-bold text-muted-foreground leading-tight uppercase tracking-widest opacity-60 ml-7">{stat.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* EJEMPLO PRÁCTICO */}
                        <div className="pt-8 border-t border-white/5">
                            <div className="flex items-center gap-3 mb-6">
                                <Activity className="w-5 h-5 text-celeste" />
                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground/70 italic">Caso de Estudio: 1.000 Puntos</h3>
                            </div>

                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 md:p-8 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                                
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center relative z-10">
                                    <div className="lg:col-span-3 space-y-6">
                                        <p className="text-sm font-bold text-muted-foreground leading-relaxed uppercase tracking-tight italic">
                                            Torneo <span className="text-foreground">Individual</span>: <strong className="text-emerald-400 text-xl italic tracking-tighter">— 1.000 pts —</strong> para el campeón:
                                        </p>

                                        <div className="space-y-4">
                                            {[
                                                { num: "01", title: "Participación", desc: "Acreditan base de +20 pts." },
                                                { num: "02", title: "Mérito en Zona", desc: "Cada victoria suma +40 pts." },
                                                { num: "03", title: "Acumulado", desc: "Consolidas los puntos de tu ronda." },
                                            ].map((step, i) => (
                                                <div key={i} className="flex items-start gap-4 group/item">
                                                    <div className="w-8 h-8 shrink-0 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black italic shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover/item:scale-110 transition-transform">{step.num}</div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase italic tracking-widest mb-0.5 group-hover/item:text-emerald-400 transition-colors">{step.title}</p>
                                                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-relaxed opacity-60">{step.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2">
                                        <div className="glass-card rounded-2xl p-6 shadow-3xl space-y-4 relative border-emerald-500/20">
                                            <div className="absolute top-3 right-4 text-[7px] font-black uppercase tracking-[0.4em] text-emerald-500/40">SIMULACIÓN</div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest border-b border-white/5 pb-2">
                                                    <span className="text-muted-foreground">Inscripción</span>
                                                    <span className="text-emerald-400">+20 PTS</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest border-b border-white/5 pb-2">
                                                    <span className="text-muted-foreground">Zona (2 ganes)</span>
                                                    <span className="text-emerald-400">+80 PTS</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest border-b border-white/5 pb-2">
                                                    <span className="text-muted-foreground">Cuartos</span>
                                                    <span className="text-emerald-400">+180 PTS</span>
                                                </div>
                                                <div className="flex flex-col items-center pt-2">
                                                    <span className="text-[8px] font-black uppercase tracking-[0.5em] text-emerald-500/50 mb-0.5">TOTAL</span>
                                                    <span className="text-2xl font-black italic tracking-tighter text-foreground text-gradient-animate">280 PTS</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* TABLA DE DISTRIBUCIÓN COMPLETA */}
                                <div className="mt-8 overflow-hidden rounded-xl border border-black/5 bg-white/10">
                                    <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-celeste italic">Desglose Distribución</h4>
                                        <div className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/60">26 Inscriptos</div>
                                    </div>
                                    <div className="overflow-x-auto no-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-white/5">
                                                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground italic">Instancia</th>
                                                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Ronda</th>
                                                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Zona</th>
                                                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Base</th>
                                                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-emerald-500 italic text-center">Total</th>
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
                                                    <tr key={i} className={`group hover:bg-celeste/5 transition-colors ${row.highlight ? "bg-celeste/10" : ""}`}>
                                                        <td className="px-4 py-2">
                                                            <div className="flex items-center gap-2">
                                                                {row.highlight && <Trophy className="w-3 h-3 text-amber-400" />}
                                                                <span className={`text-[10px] font-black uppercase italic tracking-tight ${row.highlight ? "text-celeste" : "text-foreground"}`}>
                                                                    {row.rank}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 text-center text-[9px] font-black text-foreground italic">{row.round}</td>
                                                        <td className="px-4 py-2 text-center text-[9px] font-bold text-muted-foreground">+{row.zone}</td>
                                                        <td className="px-4 py-2 text-center text-[9px] font-bold text-muted-foreground">+{row.base}</td>
                                                        <td className="px-4 py-2 text-center">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black italic tracking-tighter ${row.highlight ? "bg-celeste text-white" : "bg-white/5 text-foreground"}`}>
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
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1 opacity-50">Criterios técnicos para subir de nivel</p>
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
                                        <p className="text-[9px] font-bold text-muted-foreground/60 leading-relaxed uppercase tracking-wider">{card.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 p-6 bg-rosa/5 border border-rosa/10 rounded-2xl flex items-start gap-5">
                            <Info className="w-6 h-6 text-rosa shrink-0 mt-0.5" />
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-normal opacity-70">
                                IMPORTANTE: El sistema procesa <span className="text-foreground">una categoría a la vez</span>. No se permiten ascensos dobles directos para preservar el equilibrio competitivo.
                            </p>
                        </div>
                    </motion.section>

                    {/* ── Sección 3: Inactividad y Descenso ── */}
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
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1 opacity-50">La importancia de mantenerse en competencia</p>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row items-center gap-8">
                            <div className="flex-1 space-y-4">
                                <p className="text-sm font-bold text-muted-foreground leading-relaxed uppercase tracking-tight italic">
                                    Para asegurar nivel real: implementado el <strong className="text-rojo italic">— Descenso por Inactividad —</strong>.
                                </p>
                                <div className="p-6 bg-rojo/5 border border-rojo/10 rounded-xl w-full group-hover:bg-rojo/10 transition-all">
                                    <div className="flex items-center gap-3 mb-2">
                                        <TrendingDown className="w-5 h-5 text-rojo" />
                                        <span className="text-sm font-black uppercase italic tracking-tighter">Regla de 365 Días</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground/60 leading-relaxed uppercase tracking-[0.15em]">
                                        Sin actividad oficial por <strong className="text-foreground">12 meses consecutivos</strong>, baja automáticamente una categoría.
                                    </p>
                                </div>
                            </div>
                            <div className="w-full lg:w-56 p-6 glass-card rounded-xl flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden group-hover:border-rojo/40 transition-all">
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-rojo/20 group-hover:h-full transition-all duration-700 opacity-20 pointer-events-none" />
                                <div className="text-4xl font-black italic tracking-tighter text-rojo mb-1 relative">365</div>
                                <div className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground relative">Días</div>
                                <div className="w-10 h-px bg-white/10 my-3 relative" />
                                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 italic relative">-1 Categoría</div>
                            </div>
                        </div>
                    </motion.section>

                    {/* ── Sección 4: Gestión Administrativa ── */}
                    <motion.section variants={item} className="glass-card rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-azul-primary/5 border border-azul-primary/10 flex items-center justify-center shadow-inner group-hover:bg-azul-primary/10 transition-all">
                                <Users className="w-6 h-6 text-azul-primary transition-colors" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase italic tracking-tighter">Performance</h2>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1 opacity-50">Promoción manual supervisada</p>
                            </div>
                        </div>

                        <p className="text-xs font-bold text-muted-foreground leading-relaxed max-w-2xl uppercase tracking-tight italic opacity-70">
                            Existen casos excepcionales donde un jugador demuestra un <span className="text-celeste">nivel disruptivo</span>. Los administradores tienen la facultad de realizar promociones manuales basadas en la observación directa.
                        </p>
                    </motion.section>
                </motion.div>

                {/* ── Footer ── */}
                <footer className="mt-16 text-center pb-8">
                    <div className="h-px bg-gradient-to-r from-transparent via-azul-primary/10 to-transparent mb-8" />
                    <p className="text-[8px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-30 italic">
                        Plataforma Oficial Ranking Padel <span className="text-azul-primary/50">//</span> v2.4
                    </p>
                </footer>
            </div>
        </div>
    );
}
