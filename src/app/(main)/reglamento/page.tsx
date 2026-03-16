"use client";

import { Trophy, Medal, Star, TrendingUp, TrendingDown, Clock, ShieldCheck, Info, ArrowUpRight, Target, Users } from "lucide-react";
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
        <div className="min-h-screen bg-background text-foreground pb-24 font-sans selection:bg-indigo-500/30">
            {/* Ambient glows */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 pt-12 md:pt-20">
                {/* ── Header ── */}
                <header className="mb-16 text-center md:text-left">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4"
                    >
                        <ShieldCheck className="w-3 h-3" />
                        Reglamento Oficial
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none mb-6"
                    >
                        Sistema de <span className="text-indigo-500">Puntos y Categorías</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-muted-foreground text-lg font-medium max-w-2xl leading-relaxed"
                    >
                        Entiende cómo funciona la meritocracia en nuestra plataforma. Cada partido cuenta, cada torneo suma y la constancia es la clave del éxito.
                    </motion.p>
                </header>

                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 gap-8"
                >
                    {/* ── Sección 1: Cómo sumar puntos ── */}
                    <motion.section variants={item} className="bg-card/40 border border-border rounded-[2.5rem] p-8 md:p-12 backdrop-blur-sm shadow-xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Star className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase italic tracking-tight">Obtención de Puntos</h2>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">Suma en cada etapa del torneo</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500/80 italic">Fases de Juego</h3>
                                <div className="space-y-3">
                                    {[
                                        { label: "Campeón", points: "", icon: Trophy, color: "text-yellow-500" },
                                        { label: "Finalista", points: "", icon: Medal, color: "text-slate-400" },
                                        { label: "Semifinal", points: "", icon: Medal, color: "text-orange-600" },
                                        { label: "Cuartos", points: "", icon: Medal, color: "text-indigo-400" },
                                    ].map((stat, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-2xl group hover:border-indigo-500/30 transition-all">
                                            <div className="flex items-center gap-3">
                                                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                                <span className="text-xs font-black uppercase italic tracking-tight">{stat.label}</span>
                                            </div>
                                            <span className="text-xs font-bold opacity-60 italic">{stat.points}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500/80 italic">Bonus por Esfuerzo</h3>
                                <div className="space-y-3">
                                    {[
                                        { label: "Participación", desc: "Por solo inscribirte y jugar", icon: Target },
                                        { label: "Victoria en Zona", desc: "Cada partido ganado en grupos", icon: TrendingUp },
                                        { label: "Octavos", desc: "Suma adicional al clasificar", icon: ArrowUpRight },
                                    ].map((stat, i) => (
                                        <div key={i} className="flex flex-col p-4 bg-muted/30 border border-border rounded-2xl group hover:border-indigo-500/30 transition-all">
                                            <div className="flex items-center gap-3 mb-1">
                                                <stat.icon className="w-4 h-4 text-indigo-500" />
                                                <span className="text-xs font-black uppercase italic tracking-tight">{stat.label}</span>
                                            </div>
                                            <span className="text-[10px] font-medium text-muted-foreground leading-tight uppercase tracking-wider">{stat.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* EJEMPLO PRÁCTICO */}
                        <div className="pt-8 border-t border-border/50">
                            <div className="flex items-center gap-3 mb-6">
                                <Info className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">Ejemplo Práctico: Torneo de 1.000 Puntos</h3>
                            </div>

                            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-6 md:p-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                                    <div className="md:col-span-2 space-y-6">
                                        <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                            Imagina un torneo con <strong className="text-foreground">26 jugadores</strong> (Individual) y una recompensa de <strong className="text-indigo-500 italic">1.000 puntos</strong> para el campeón:
                                        </p>

                                        <div className="space-y-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-black italic shrink-0 shadow-lg">1</div>
                                                <div>
                                                    <p className="text-[11px] font-black uppercase italic tracking-tight mb-1">Base de Participación</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Todos los inscriptos arrancan con <span className="text-foreground">+20 pts</span>.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-black italic shrink-0 shadow-lg">2</div>
                                                <div>
                                                    <p className="text-[11px] font-black uppercase italic tracking-tight mb-1">Partidos Ganados en Zona</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Cada victoria en grupos suma <span className="text-foreground">+40 pts</span>.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-black italic shrink-0 shadow-lg">3</div>
                                                <div>
                                                    <p className="text-[11px] font-black uppercase italic tracking-tight mb-1">Premio por Instancia</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Al clasificar y avanzar, sumas los puntos de tu ronda final.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-card border border-border rounded-[2rem] p-6 shadow-2xl space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-center text-indigo-500/60 mb-2 italic">— Caso Testigo —</p>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-[10px] font-bold uppercase border-b border-border/50 pb-2">
                                                <span className="text-muted-foreground">Inscripción</span>
                                                <span className="text-foreground">+20 pts</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold uppercase border-b border-border/50 pb-2">
                                                <span className="text-muted-foreground">2 Ganes en Zona</span>
                                                <span className="text-foreground">+80 pts</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold uppercase border-b border-border/50 pb-2">
                                                <span className="text-muted-foreground">Llegar a Cuartos</span>
                                                <span className="text-foreground">+180 pts</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-xs font-black uppercase italic tracking-tighter text-indigo-500">Total Ranking</span>
                                                <span className="text-xl font-black italic tracking-tighter text-foreground">280 PTS</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* TABLA DE DISTRIBUCIÓN COMPLETA */}
                                <div className="mt-12 overflow-hidden rounded-3xl border border-border bg-card">
                                    <div className="bg-indigo-500/10 px-6 py-4 border-b border-border">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 italic">Desglose Final Torneo Individual (26 Inscriptos)</h4>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-muted/50">
                                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Posición / Instancia</th>
                                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Cant.</th>
                                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Ptos Ronda</th>
                                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Zona (avg)</th>
                                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Base</th>
                                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-indigo-500 italic text-center">Total/Jug</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {[
                                                    { rank: "1° - Campeón", qty: 1, round: 1000, zone: 80, base: 20, total: 1100, highlight: true },
                                                    { rank: "2° - Subcampeón", qty: 1, round: 600, zone: 80, base: 20, total: 700, highlight: false },
                                                    { rank: "Semifinalistas", qty: 2, round: 360, zone: 80, base: 20, total: 460, highlight: false },
                                                    { rank: "Cuartos de Final", qty: 4, round: 180, zone: 40, base: 20, total: 240, highlight: false },
                                                    { rank: "Octavos de Final", qty: 8, round: 90, zone: 40, base: 20, total: 150, highlight: false },
                                                    { rank: "Fase de Grupos", qty: 10, round: 0, zone: 40, base: 20, total: 60, highlight: false },
                                                ].map((row, i) => (
                                                    <tr key={i} className={`group hover:bg-muted/30 transition-colors ${row.highlight ? "bg-indigo-500/5" : ""}`}>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                {row.highlight && <Trophy className="w-3 h-3 text-yellow-500" />}
                                                                <span className={`text-[11px] font-black uppercase italic tracking-tight ${row.highlight ? "text-indigo-500" : "text-foreground"}`}>
                                                                    {row.rank}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase">{row.qty} jug.</td>
                                                        <td className="px-6 py-4 text-center text-[10px] font-black text-foreground italic">{row.round}</td>
                                                        <td className="px-6 py-4 text-center text-[10px] font-bold text-muted-foreground">+{row.zone}</td>
                                                        <td className="px-6 py-4 text-center text-[10px] font-bold text-muted-foreground">+{row.base}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-3 py-1 rounded-full text-[11px] font-black italic tracking-tighter ${row.highlight ? "bg-indigo-500 text-white shadow-lg shadow-indigo-900/40" : "bg-muted text-foreground"}`}>
                                                                {row.total}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="bg-muted/20 px-6 py-3 border-t border-border">
                                        <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest leading-relaxed">
                                            * Nota: La cantidad de jugadores varía según si el torneo es individual (26 jug.) o por parejas (52 jug.). Los puntos se otorgan a cada integrante por igual.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {/* ── Sección 2: El Ascenso ── */}
                    <motion.section variants={item} className="bg-card/40 border border-border rounded-[2.5rem] p-8 md:p-12 backdrop-blur-sm shadow-xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-40 h-40 text-indigo-500" />
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                <ArrowUpRight className="w-6 h-6 text-indigo-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase italic tracking-tight">Criterios de Ascenso</h2>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">Cómo subir de categoría</p>
                            </div>
                        </div>

                        <p className="text-sm font-medium text-muted-foreground mb-8 max-w-xl">
                            Para subir de categoría, el sistema evalúa tu desempeño actual. El ascenso se produce si cumples con <strong className="text-foreground">CUALQUIERA</strong> de los siguientes requisitos:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { title: "Doble Campeón", desc: "Gana 2 torneos en la misma categoría durante el año calendario.", icon: Trophy },
                                { title: "Nivel Superior", desc: "Superar el puntaje máximo de tu categoría por un 15% adicional.", icon: Star },
                                { title: "Puntos + Logro", desc: "Alcanzar el umbral de puntos de la siguiente categoría + ganar al menos 1 torneo.", icon: Medal },
                            ].map((card, i) => (
                                <div key={i} className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl flex flex-col gap-4 group hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-900/40">
                                        <card.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black uppercase italic tracking-tight mb-2 group-hover:text-indigo-500 transition-colors">{card.title}</h4>
                                        <p className="text-[11px] font-bold text-muted-foreground/70 leading-relaxed uppercase tracking-wider">{card.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 p-4 bg-muted/50 border border-border/50 rounded-2xl flex items-start gap-4">
                            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-normal">
                                El sistema solo permite subir <span className="text-foreground">una categoría a la vez</span> por evaluación para asegurar una transición fluida en el nivel de competición.
                            </p>
                        </div>
                    </motion.section>

                    {/* ── Sección 3: Inactividad y Descenso ── */}
                    <motion.section variants={item} className="bg-card/40 border border-border rounded-[2.5rem] p-8 md:p-12 backdrop-blur-sm shadow-xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-rose-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase italic tracking-tight">Inactividad y Descenso</h2>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">La importancia de la constancia</p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1 space-y-4 text-center md:text-left">
                                <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                    Para asegurar que el ranking refleje el nivel real actual de los jugadores, hemos implementado una regla de <strong className="text-rose-500 italic">Descenso por Inactividad</strong>.
                                </p>
                                <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-3xl inline-block w-full">
                                    <div className="flex items-center gap-4 mb-3">
                                        <TrendingDown className="w-6 h-6 text-rose-500" />
                                        <span className="text-sm font-black uppercase italic tracking-tight">Regla de los 12 Meses</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-muted-foreground/70 leading-relaxed uppercase tracking-widest">
                                        Si un jugador no registra inscripción en ningún torneo durante un período de <strong className="text-foreground">12 meses consecutivos</strong>, el sistema lo bajará automáticamente una categoría.
                                    </p>
                                </div>
                            </div>
                            <div className="w-full md:w-64 p-8 bg-muted/30 border border-border rounded-3xl flex flex-col items-center justify-center text-center">
                                <div className="text-4xl font-black italic tracking-tighter text-rose-500 mb-1">365</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Días de inactividad</div>
                                <div className="w-full h-px bg-border my-4" />
                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 italic">Baja una categoría</div>
                            </div>
                        </div>
                    </motion.section>

                    {/* ── Sección 4: Gestión Administrativa ── */}
                    <motion.section variants={item} className="bg-card/40 border border-border rounded-[2.5rem] p-8 md:p-12 backdrop-blur-sm shadow-xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                <Users className="w-6 h-6 text-indigo-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase italic tracking-tight">Promoción Manual</h2>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">Control por performance</p>
                            </div>
                        </div>

                        <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-2xl">
                            Existen casos excepcionales donde un jugador demuestra un nivel muy superior a su categoría actual pero no llega a cumplir las condiciones automáticas. Los administradores tienen la facultad de realizar <strong className="text-indigo-500">Promociones Manuales</strong> basadas en la observación directa de su juego y resultados.
                        </p>
                    </motion.section>
                </motion.div>

                {/* ── Footer ── */}
                <footer className="mt-20 text-center pb-12">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 italic">
                        Plataforma Oficial de Ranking de Padel v2.1
                    </p>
                </footer>
            </div>
        </div>
    );
}
