"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView, Variants } from "framer-motion";
import { Trophy, Star, Users, MapPin, ArrowRight, Activity, ShoppingBag, ChevronDown, Zap, Shield, TrendingUp } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

// ── Framer Motion Variants ──
const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.12 }
    }
};

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } }
};

const fadeIn: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.8, ease: "easeOut" } }
};

const logoEntrance: Variants = {
    hidden: { opacity: 0, filter: "blur(40px)", scale: 1.08 },
    show: {
        opacity: 1,
        filter: "blur(0px)",
        scale: 1,
        transition: { duration: 2.2, ease: [0.16, 1, 0.3, 1] }
    }
};

// ── Animated Counter ──
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });

    useEffect(() => {
        if (!inView) return;
        const duration = 1800;
        const steps = 60;
        const increment = target / steps;
        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(Math.floor(current));
            }
        }, duration / steps);
        return () => clearInterval(timer);
    }, [inView, target]);

    return <span ref={ref}>{count}{suffix}</span>;
}

// ── Sponsor Marquee Item ──
const SponsorItem = ({ s }: { s: any }) => (
    <div className="mx-12 shrink-0">
        {s.link ? (
            <Link
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="relative h-16 w-40 md:h-20 md:w-60 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            >
                <Image
                    src={s.imageUrl}
                    alt={s.name}
                    fill
                    className="object-contain filter grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                    sizes="(max-width: 768px) 160px, 240px"
                />
            </Link>
        ) : (
            <div className="relative h-16 w-40 md:h-20 md:w-60 flex items-center justify-center">
                <Image
                    src={s.imageUrl}
                    alt={s.name}
                    fill
                    className="object-contain filter grayscale opacity-30"
                    sizes="(max-width: 768px) 160px, 240px"
                />
            </div>
        )}
    </div>
);

export default function LandingPage({
    tournamentCount = 50,
    playerCount = 300,
    clubCount = 15,
    sponsors = []
}: {
    tournamentCount?: number;
    playerCount?: number;
    clubCount?: number;
    sponsors?: any[];
}) {
    const { scrollYProgress } = useScroll();
    const yHero = useTransform(scrollYProgress, [0, 0.5], [0, 180]);
    const opacityHero = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
    const yBg1 = useTransform(scrollYProgress, [0, 1], [0, -160]);
    const yBg2 = useTransform(scrollYProgress, [0, 1], [0, 260]);

    const featuresRef = useRef<HTMLElement>(null);

    return (
        <div className="min-h-screen bg-black text-slate-200 overflow-x-hidden font-sans selection:bg-azul-primary/30">

            {/* ── Background Glows ── */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div style={{ y: yBg1 }} className="absolute -top-[15%] -left-[5%] w-[700px] h-[700px] bg-celeste/[0.07] rounded-full blur-[180px]" />
                <motion.div style={{ y: yBg2 }} className="absolute top-[30%] -right-[8%] w-[600px] h-[600px] bg-azul-primary/[0.08] rounded-full blur-[180px]" />
                <motion.div style={{ y: yBg1 }} className="absolute bottom-[10%] left-[30%] w-[400px] h-[400px] bg-blue-600/[0.05] rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.035] mix-blend-overlay" />
            </div>

            {/* ── Navbar ── */}
            <Navbar />

            {/* ════════════════════════════════════
                HERO
            ════════════════════════════════════ */}
            <motion.section
                style={{ y: yHero, opacity: opacityHero }}
                className="relative z-10 pt-24 lg:pt-28 pb-0 px-6 max-w-7xl mx-auto flex flex-col items-center text-center"
            >
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={staggerContainer}
                    className="max-w-4xl w-full flex flex-col items-center"
                >
                    {/* Badge */}
                    <motion.div variants={fadeUp} className="mb-8">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-celeste/10 border border-celeste/20 text-celeste text-[11px] font-black uppercase tracking-[0.2em]">
                            <Zap className="w-3 h-3" />
                            La Red Social del Pádel
                        </span>
                    </motion.div>

                    {/* Logo + Title Block */}
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={logoEntrance}
                        className="relative group mb-6 z-0 flex flex-col items-center justify-center [perspective:1200px]"
                    >
                        {/* Logo */}
                        <div
                            className="relative flex items-center justify-center shrink-0 mx-auto w-[240px] h-[155px] md:w-[380px] md:h-[245px] z-10"
                            style={{ filter: "drop-shadow(0 0 1px rgba(255,255,255,0.25)) drop-shadow(0 0 30px rgba(14,165,233,0.12))" }}
                        >
                            <Image src="/img/acap logo svg blanco sombra.svg" alt="A.C.A.P." fill className="object-contain" priority sizes="(max-width: 768px) 240px, 380px" />
                            <div
                                className="absolute inset-0 pointer-events-none overflow-hidden"
                                style={{
                                    WebkitMaskImage: 'url("/img/acap logo svg blanco sombra.svg")',
                                    maskImage: 'url("/img/acap logo svg blanco sombra.svg")',
                                    WebkitMaskSize: 'contain', maskSize: 'contain',
                                    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center', maskPosition: 'center'
                                }}
                            >
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-white/60 via-white/20 to-transparent h-[400%] w-[400%] animate-shine-multi opacity-80" />
                            </div>
                        </div>

                        <motion.p variants={fadeUp} className="text-[11px] md:text-sm font-black italic tracking-[0.15em] uppercase text-slate-400 mb-2">
                            ASOCIACIÓN <span className="text-korea-gradient">COREANA</span> DE PÁDEL EN <span className="text-argentina-gradient">ARGENTINA</span>
                        </motion.p>

                        {/* Mirror Reflection */}
                        <div
                            className="absolute -bottom-[55%] flex items-center justify-center shrink-0 w-[240px] h-[155px] md:w-[380px] md:h-[245px] pointer-events-none select-none -z-10 opacity-20"
                            style={{
                                transform: "scaleY(-1)",
                                maskImage: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 55%)",
                                WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 55%)",
                                filter: "blur(3px)"
                            }}
                        >
                            <Image src="/img/acap logo svg blanco sombra.svg" alt="" fill className="object-contain opacity-40" />
                        </div>

                        <div className="absolute -bottom-7 w-[180px] md:w-[360px] h-[1px] bg-gradient-to-r from-transparent via-white/8 to-transparent" />

                        {/* Aurora glow */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 -z-20 flex justify-center opacity-25">
                            <div className="w-[260px] h-[160px] md:w-[500px] md:h-[320px] bg-celeste/10 blur-[140px] rounded-full" />
                        </div>
                    </motion.div>

                    {/* Main Headline */}
                    <motion.h1
                        variants={fadeUp}
                        className="text-5xl md:text-7xl lg:text-[5.5rem] font-black italic tracking-tighter uppercase leading-[0.88] mb-5 text-white"
                    >
                        Dominá La <br />
                        <span className="text-gradient-animate drop-shadow-[0_0_50px_rgba(14,165,233,0.25)]">Cancha</span>
                    </motion.h1>

                    <motion.p variants={fadeUp} className="text-base md:text-lg text-slate-400 font-medium mb-10 max-w-xl mx-auto leading-relaxed">
                        Torneos oficiales, ranking en tiempo real y la comunidad padelista más vibrante de Argentina.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 items-center">
                        <Link
                            href="/register"
                            className="relative overflow-hidden bg-celeste text-black px-8 py-3.5 rounded-full text-[11px] font-black uppercase tracking-[0.18em] hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(14,165,233,0.35)] group cursor-pointer"
                        >
                            <span className="relative z-10">Unite Gratis</span>
                            <div className="absolute inset-0 bg-white/20 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 skew-x-12" />
                        </Link>
                        <Link
                            href="/tournaments"
                            className="flex items-center gap-2 px-8 py-3.5 rounded-full text-[11px] font-black uppercase tracking-[0.18em] text-slate-300 border border-slate-700 hover:border-celeste/50 hover:text-white transition-all cursor-pointer"
                        >
                            Ver Torneos <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </motion.div>

                    {/* Scroll indicator */}
                    <motion.div
                        variants={fadeIn}
                        className="mt-16 flex flex-col items-center gap-2 text-slate-600"
                        animate={{ y: [0, 6, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    >
                        <span className="text-[9px] font-black uppercase tracking-[0.25em]">Descubrí más</span>
                        <ChevronDown className="w-4 h-4" />
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* ════════════════════════════════════
                SPONSORS MARQUEE
            ════════════════════════════════════ */}
            {sponsors && sponsors.length > 0 && (
                <div className="relative z-10 w-full overflow-hidden bg-white/[0.02] border-y border-white/[0.04] pt-2 pb-10 mt-20 mb-8 flex flex-col items-center">
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-600 mb-7 italic"
                    >
                        Nuestros Sponsors
                    </motion.p>
                    <div className="flex w-full overflow-hidden relative">
                        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
                        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
                        <div className="flex animate-marquee whitespace-nowrap">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex">
                                    {sponsors.map((s, idx) => (
                                        <SponsorItem key={`${i}-${s.id}-${idx}`} s={s} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════
                KPI STATS
            ════════════════════════════════════ */}
            <div className="max-w-7xl mx-auto px-6 relative z-10 py-16">
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={staggerContainer}
                    className="grid grid-cols-3 gap-6 md:gap-0 border border-white/[0.06] rounded-3xl overflow-hidden bg-white/[0.02] backdrop-blur-sm divide-x divide-white/[0.06]"
                >
                    {[
                        { label: "Torneos Activos", value: tournamentCount, suffix: "+", color: "text-celeste", glow: "rgba(14,165,233,0.3)" },
                        { label: "Jugadores", value: playerCount, suffix: "+", color: "text-blue-400", glow: "rgba(96,165,250,0.3)" },
                        { label: "Clubes Aliados", value: clubCount, suffix: "", color: "text-cyan-400", glow: "rgba(34,211,238,0.3)" }
                    ].map((stat, i) => (
                        <motion.div key={i} variants={fadeUp} className="flex flex-col items-center py-10 px-4 relative group">
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(ellipse at center, ${stat.glow}08 0%, transparent 70%)` }} />
                            <span className={`text-4xl md:text-6xl font-black italic mb-2 ${stat.color}`} style={{ filter: `drop-shadow(0 0 20px ${stat.glow})` }}>
                                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                            </span>
                            <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-slate-600 text-center">{stat.label}</span>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* ════════════════════════════════════
                BENTO GRID — FEATURES
            ════════════════════════════════════ */}
            <section ref={featuresRef} className="relative z-10 py-8 px-6 max-w-7xl mx-auto">
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={staggerContainer}
                    className="mb-12 text-center"
                >
                    <motion.span variants={fadeUp} className="inline-block text-[10px] font-black uppercase tracking-[0.25em] text-celeste mb-4">
                        Todo en un lugar
                    </motion.span>
                    <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black italic uppercase text-white leading-tight">
                        El Ecosistema<br />Completo del Pádel
                    </motion.h2>
                </motion.div>

                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-60px" }}
                    variants={staggerContainer}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[230px] md:auto-rows-[260px]"
                >
                    {/* Tarjeta 1: Comunidad — ancho 2 */}
                    <motion.div
                        variants={fadeUp}
                        whileHover={{ scale: 1.015 }}
                        className="glass-card rounded-[1.75rem] p-8 md:col-span-2 flex flex-col justify-end relative overflow-hidden group cursor-default"
                    >
                        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/15 rounded-full blur-[90px] group-hover:bg-blue-500/25 transition-colors duration-500" />
                        <div className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Users className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-3xl font-black italic uppercase text-white mb-2">Conectá y Jugá</h3>
                            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">Armá parejas, encontrá rivales de tu nivel y sumergite en el feed social del deporte más emocionante de Argentina.</p>
                        </div>
                    </motion.div>

                    {/* Tarjeta 2: Torneos */}
                    <Link href="/tournaments" className="block h-full group">
                        <motion.div variants={fadeUp} whileHover={{ scale: 1.015 }} className="glass-card rounded-[1.75rem] p-8 h-full flex flex-col justify-end relative overflow-hidden cursor-pointer">
                            <div className="absolute -top-8 -left-8 w-52 h-52 bg-azul-primary/20 rounded-full blur-[70px] group-hover:bg-azul-primary/30 transition-colors duration-500" />
                            <div className="absolute top-6 left-6 w-12 h-12 rounded-2xl bg-azul-primary/15 border border-celeste/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Trophy className="w-6 h-6 text-celeste" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black italic uppercase text-white mb-2">Torneos</h3>
                                <div className="flex justify-between items-end">
                                    <p className="text-sm text-slate-400 leading-relaxed max-w-[160px]">Inscripción directa, llaves dinámicas y resultados.</p>
                                    <div className="w-8 h-8 rounded-full border border-celeste/30 flex items-center justify-center group-hover:bg-celeste group-hover:border-celeste transition-all duration-300 shrink-0 ml-2">
                                        <ArrowRight className="w-3.5 h-3.5 text-celeste group-hover:text-black transition-colors" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>

                    {/* Tarjeta 3: Ranking */}
                    <Link href="/ranking" className="block h-full">
                        <motion.div variants={fadeUp} whileHover={{ scale: 1.015 }} className="glass-card h-full rounded-[1.75rem] p-8 flex flex-col justify-end relative overflow-hidden group cursor-pointer">
                            <div className="absolute bottom-0 right-0 w-52 h-52 bg-yellow-500/10 rounded-full blur-[70px] group-hover:bg-yellow-500/20 transition-colors duration-500" />
                            <div className="absolute top-6 left-6 w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Star className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black italic uppercase text-white mb-2">Ranking Oficial</h3>
                                <div className="flex justify-between items-end">
                                    <p className="text-sm text-slate-400 leading-relaxed max-w-[160px]">Suma puntos oficiales de la A.C.A.P.</p>
                                    <div className="w-8 h-8 rounded-full border border-yellow-500/30 flex items-center justify-center group-hover:bg-yellow-400 group-hover:border-yellow-400 transition-all duration-300 shrink-0 ml-2">
                                        <ArrowRight className="w-3.5 h-3.5 text-yellow-400 group-hover:text-black transition-colors" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>

                    {/* Tarjeta 4: Directorio — ancho 2 */}
                    <Link href="/directory" className="md:col-span-2 group">
                        <motion.div variants={fadeUp} whileHover={{ scale: 1.015 }} className="glass-card rounded-[1.75rem] p-8 h-full flex flex-col justify-end relative overflow-hidden cursor-pointer">
                            <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/15 rounded-full blur-[90px] group-hover:bg-cyan-500/25 transition-colors duration-500" />
                            <div className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <MapPin className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-3xl font-black italic uppercase text-white mb-2">Explorá Clubes</h3>
                                <div className="flex justify-between items-end">
                                    <p className="text-sm text-slate-400 max-w-sm leading-relaxed">Encontrá las mejores sedes, seguí en vivo los partidos y conectá con nuevos lugares de juego.</p>
                                    <div className="w-8 h-8 rounded-full border border-cyan-400/30 flex items-center justify-center group-hover:bg-cyan-400 group-hover:border-cyan-400 transition-all duration-300 shrink-0 ml-4">
                                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:text-black transition-colors" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>

                    {/* Tarjeta 5: Marketplace — ancho 3 */}
                    <Link href="/marketplace" className="md:col-span-3 group">
                        <motion.div
                            variants={fadeUp}
                            whileHover={{ scale: 1.008 }}
                            className="glass-card rounded-[1.75rem] p-8 h-full flex items-center justify-between relative overflow-hidden cursor-pointer"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/8 via-transparent to-transparent pointer-events-none" />
                            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none" />
                            <div className="relative z-10 flex items-center gap-6">
                                <div className="w-16 h-16 bg-cyan-500/15 rounded-2xl border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-cyan-500/25 transition-all duration-300 shrink-0">
                                    <ShoppingBag className="w-7 h-7 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-black italic uppercase text-white mb-1">Marketplace ACAP</h3>
                                    <p className="text-slate-400 font-medium max-w-md text-sm leading-relaxed">Comprá y vendé equipamiento de padel. Paletas, calzado y accesorios entre jugadores de la comunidad.</p>
                                </div>
                            </div>
                            <div className="relative z-10 hidden md:flex items-center gap-3 bg-white/[0.05] hover:bg-cyan-500 px-7 py-3.5 rounded-full border border-white/10 hover:border-cyan-500 group-hover:bg-cyan-500 group-hover:border-cyan-500 group-hover:text-black transition-all duration-300 shrink-0 cursor-pointer">
                                <span className="text-[10px] font-black uppercase tracking-widest text-nowrap">Ver Bazar</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </motion.div>
                    </Link>
                </motion.div>
            </section>

            {/* ════════════════════════════════════
                WHY ACAP — VALUE PROPS
            ════════════════════════════════════ */}
            <section className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={staggerContainer}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    {[
                        {
                            icon: Shield,
                            color: "text-celeste",
                            bg: "bg-celeste/10",
                            border: "border-celeste/20",
                            glow: "bg-celeste/10",
                            title: "Torneos Oficiales",
                            desc: "Competencias avaladas por la asociación con árbitros, reglamento oficial y certificación de resultados."
                        },
                        {
                            icon: TrendingUp,
                            color: "text-blue-400",
                            bg: "bg-blue-500/10",
                            border: "border-blue-500/20",
                            glow: "bg-blue-500/10",
                            title: "Ranking en Tiempo Real",
                            desc: "Tu posición actualizada después de cada partido. Seguí tu progreso semana a semana."
                        },
                        {
                            icon: Activity,
                            color: "text-cyan-400",
                            bg: "bg-cyan-500/10",
                            border: "border-cyan-500/20",
                            glow: "bg-cyan-500/10",
                            title: "Actividad Social",
                            desc: "Feed en vivo con resultados, logros y noticias de la comunidad. Tu club, siempre conectado."
                        }
                    ].map(({ icon: Icon, color, bg, border, glow, title, desc }, i) => (
                        <motion.div
                            key={i}
                            variants={fadeUp}
                            className="glass-card rounded-2xl p-8 flex flex-col gap-5 group hover:scale-[1.02] transition-transform duration-300 cursor-default"
                        >
                            <div className={`w-12 h-12 rounded-xl ${bg} border ${border} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                                <Icon className={`w-6 h-6 ${color}`} />
                            </div>
                            <div>
                                <h3 className={`text-lg font-black italic uppercase ${color} mb-2`}>{title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* ════════════════════════════════════
                SOCIAL FEED — En Vivo
            ════════════════════════════════════ */}
            <section className="relative z-10 py-16 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 mb-14 text-center">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="inline-block text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mb-4"
                    >
                        Feed en tiempo real
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                        className="text-4xl md:text-5xl font-black italic uppercase text-white"
                    >
                        Tu Actividad,{" "}
                        <span className="text-gradient-animate">En Vivo</span>
                    </motion.h2>
                </div>

                <div className="max-w-3xl mx-auto space-y-4 px-6 relative">
                    <div className="absolute inset-y-0 left-0 w-1/5 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-1/5 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

                    {[
                        {
                            icon: Trophy,
                            iconBg: "bg-azul-primary/20",
                            iconBorder: "border-azul-primary/30",
                            iconColor: "text-celeste",
                            text: <>¡<strong className="text-white">Martín Lopez</strong> acaba de coronarse campeón de 5ta categoría en El Bosque Padel!</>,
                            time: "Hace 2 horas",
                            rotate: "rotate-[0.7deg]",
                            offset: "md:-ml-8",
                            dir: { x: 80 }
                        },
                        {
                            icon: Activity,
                            iconBg: "bg-blue-500/20",
                            iconBorder: "border-blue-500/30",
                            iconColor: "text-blue-400",
                            text: <><strong className="text-white">Julián Crítico</strong> subió un nuevo partido en Parque Roca. ¡Buscando revancha!</>,
                            time: "Hace 5 horas",
                            rotate: "-rotate-[0.7deg]",
                            offset: "md:ml-auto md:-mr-8",
                            dir: { x: -80 }
                        },
                        {
                            icon: Star,
                            iconBg: "bg-yellow-500/20",
                            iconBorder: "border-yellow-500/30",
                            iconColor: "text-yellow-400",
                            text: <><strong className="text-white">Club Palermo Padel</strong> publicó un torneo abierto para el próximo sábado. ¡Quedan 4 lugares!</>,
                            time: "Hace 8 horas",
                            rotate: "rotate-[0.4deg]",
                            offset: "md:-ml-4",
                            dir: { x: 60 }
                        }
                    ].map(({ icon: Icon, iconBg, iconBorder, iconColor, text, time, rotate, offset, dir }, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: dir.x }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-60px" }}
                            transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                            className={`glass-card p-5 rounded-2xl flex gap-4 w-full md:w-[80%] ${offset} ${rotate}`}
                        >
                            <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center shrink-0 border ${iconBorder}`}>
                                <Icon className={`w-5 h-5 ${iconColor}`} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-300 font-medium leading-relaxed">{text}</p>
                                <span className="text-[10px] text-slate-600 mt-2 block font-bold">{time}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ════════════════════════════════════
                CTA SECTION FINAL
            ════════════════════════════════════ */}
            <section className="relative z-10 py-32 px-6 overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-celeste/[0.06] blur-[120px] rounded-full" />
                    <div className="absolute inset-0 border-y border-white/[0.04]" />
                </div>

                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={staggerContainer}
                    className="max-w-3xl mx-auto text-center relative z-10"
                >
                    <motion.span variants={fadeUp} className="inline-block text-[10px] font-black uppercase tracking-[0.25em] text-celeste mb-6">
                        ¿Listo para competir?
                    </motion.span>
                    <motion.h2 variants={fadeUp} className="text-5xl md:text-6xl font-black italic uppercase text-white leading-tight mb-6">
                        Empezá a Jugar<br />
                        <span className="text-gradient-animate">Hoy Mismo</span>
                    </motion.h2>
                    <motion.p variants={fadeUp} className="text-slate-400 text-base md:text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                        Unite a la comunidad coreano-argentina de pádel. Gratis para siempre para jugadores.
                    </motion.p>
                    <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/register"
                            className="relative overflow-hidden bg-white text-black px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.15)] group cursor-pointer"
                        >
                            <span className="relative z-10">Crear Cuenta Gratis</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-celeste/20 to-azul-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </Link>
                        <Link
                            href="/login"
                            className="px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border border-slate-800 hover:border-slate-600 hover:text-white transition-all cursor-pointer"
                        >
                            Ya tengo cuenta
                        </Link>
                    </motion.div>

                    {/* Trust signals */}
                    <motion.div variants={fadeUp} className="flex items-center justify-center gap-6 mt-10 flex-wrap">
                        {["Sin tarjeta de crédito", "100% Gratuito", "Comunidad activa"].map((t) => (
                            <span key={t} className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                                <span className="w-1 h-1 rounded-full bg-celeste/60" />
                                {t}
                            </span>
                        ))}
                    </motion.div>
                </motion.div>
            </section>

            {/* ── Footer ── */}
            <Footer />
        </div>
    );
}
