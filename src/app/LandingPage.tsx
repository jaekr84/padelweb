"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, Variants } from "framer-motion";
import { Trophy, Star, Users, MapPin, ArrowRight, Activity, ShoppingBag } from "lucide-react";

// Variantes de Framer Motion
const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.15 }
    }
};

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } }
};

const logoEntrance: Variants = {
    hidden: { opacity: 0, filter: "blur(40px)", scale: 1.1 },
    show: {
        opacity: 1,
        filter: "blur(0px)",
        scale: 1,
        transition: {
            duration: 2.5,
            ease: [0.16, 1, 0.3, 1]
        }
    }
};

export default function LandingPage({
    tournamentCount = 50,
    playerCount = 300,
    clubCount = 15
}: {
    tournamentCount?: number;
    playerCount?: number;
    clubCount?: number;
}) {
    const { scrollYProgress } = useScroll();
    const yHero = useTransform(scrollYProgress, [0, 1], [0, 400]);
    const opacityHero = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

    return (
        <div className="min-h-screen bg-black text-slate-200 overflow-x-hidden font-sans selection:bg-emerald-500/30">
            {/* ── CSS KEYFRAMES PARA TEXTO ANIMADO Y GLOWS ── */}
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
                .glow-button {
                    position: relative;
                }
                .glow-button::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: 2rem;
                    background: linear-gradient(45deg, #10b981, #3b82f6);
                    z-index: -1;
                    filter: blur(8px);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .glow-button:hover::before {
                    opacity: 1;
                }
                .glass-card {
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                }
                .glass-card:hover {
                    border-color: rgba(16, 185, 129, 0.5);
                }
                @keyframes shine-multi {
                    /* Barrido 1: Izquierda a Derecha */
                    0% { transform: translate(-150%, -50%) rotate(25deg); opacity: 0; }
                    2% { opacity: 1; }
                    31% { transform: translate(250%, -50%) rotate(25deg); opacity: 1; }
                    32% { opacity: 0; }
                    
                    /* Barrido 2: Derecha a Izquierda */
                    33% { transform: translate(250%, -50%) rotate(-25deg); opacity: 0; }
                    35% { opacity: 1; }
                    64% { transform: translate(-150%, -50%) rotate(-25deg); opacity: 1; }
                    65% { opacity: 0; }
                    
                    /* Barrido 3: Arriba a Abajo (Diagonal Profunda) */
                    66% { transform: translate(-50%, -200%) rotate(60deg); opacity: 0; }
                    68% { opacity: 1; }
                    98% { transform: translate(-50%, 300%) rotate(60deg); opacity: 1; }
                    100% { transform: translate(-50%, 300%) rotate(60deg); opacity: 0; }
                }
                .animate-shine-multi {
                    animation: shine-multi 6s linear infinite;
                }
                .text-korea-gradient {
                    display: inline-block;
                    background: linear-gradient(165deg, #CD2E3A 35%, #ffffff 38%, #ffffff 62%, #0047A0 65%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 0 15px rgba(205, 46, 58, 0.4)) drop-shadow(0 0 15px rgba(0, 71, 160, 0.4));
                    position: relative;
                }
                .text-argentina-gradient {
                    display: inline-block;
                    background: linear-gradient(165deg, #74ACDF 30%, #ffffff 35%, #ffffff 65%, #74ACDF 70%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 0 15px rgba(116, 172, 223, 0.4));
                    position: relative;
                }
            `}</style>

            {/* ── FONDO DINÁMICO (Parallax Mesh Glows) ── */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div style={{ y: useTransform(scrollYProgress, [0, 1], [0, -200]) }} className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px]" />
                <motion.div style={{ y: useTransform(scrollYProgress, [0, 1], [0, 300]) }} className="absolute top-[20%] -right-[10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay"></div>
            </div>

            {/* ── NAV ── */}
            <nav className="fixed top-0 w-full z-50 p-4 lg:p-6 flex justify-center">
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
                    className="flex justify-between items-center w-full max-w-7xl glass-card rounded-[2rem] px-6 py-3 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                >
                    <div className="flex items-center gap-3 flex-1">
                        <div className="relative w-10 h-10 flex items-center justify-center">
                            <Image src="/img/acap logo svg blanco sombra.svg" alt="Logo" fill className="object-contain" priority sizes="40px" />
                            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ WebkitMaskImage: 'url("/img/acap logo svg blanco sombra.svg")', maskImage: 'url("/img/acap logo svg blanco sombra.svg")', WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }}>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent w-[200%] h-[200%] animate-shine-multi" />
                            </div>
                        </div>
                        <span className="font-black text-xl italic tracking-tighter text-white">A.C.A.P</span>
                    </div>

                    <div className="hidden lg:flex gap-8 items-center justify-center flex-[2]">
                        <Link href="/ranking" className="text-[10px] font-black tracking-[0.2em] text-slate-400 hover:text-emerald-400 transition-all uppercase flex items-center gap-2 group">
                            <Trophy className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Ranking
                        </Link>
                        <Link href="/tournaments" className="text-[10px] font-black tracking-[0.2em] text-slate-400 hover:text-emerald-400 transition-all uppercase flex items-center gap-2 group">
                            <Trophy className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" /> Torneos
                        </Link>
                        <Link href="/directory" className="text-[10px] font-black tracking-[0.2em] text-slate-400 hover:text-emerald-400 transition-all uppercase flex items-center gap-2 group">
                            <MapPin className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Clubes
                        </Link>
                        <Link href="/marketplace" className="text-[10px] font-black tracking-[0.2em] text-slate-400 hover:text-emerald-400 transition-all uppercase flex items-center gap-2 group">
                            <ShoppingBag className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" /> Marketplace
                        </Link>
                    </div>

                    <div className="flex gap-4 items-center justify-end flex-1">
                        <Link href="/login" className="hidden sm:block text-[10px] font-black tracking-[0.2em] text-slate-400 hover:text-white transition-colors uppercase">Login</Link>
                        <Link href="/register" className="glow-button bg-slate-900 border border-slate-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl">Entrar</Link>
                    </div>
                </motion.div>
            </nav>

            {/* ── HERO SECTION ── */}
            <motion.section style={{ y: yHero, opacity: opacityHero }} className="relative z-10 pt-24 lg:pt-32 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
                <motion.div initial="hidden" animate="show" variants={staggerContainer} className="max-w-4xl w-full flex flex-col items-center">

                    {/* ── Logo Central con Brillo y Reflejo Espejo (Estático) ── */}
                    <motion.div
                        initial="hidden"
                        animate="show"
                        variants={logoEntrance}
                        className="relative group mb-8 z-0 flex flex-col items-center justify-center [perspective:1200px]"
                    >
                        {/* Logo Principal */}
                        <div
                            className="relative flex items-center justify-center shrink-0 mx-auto w-[350px] h-[240px] md:w-[650px] md:h-[450px] z-10"
                            style={{
                                filter: "drop-shadow(0 0 1px rgba(255,255,255,0.3)) drop-shadow(0 0 20px rgba(16, 185, 129, 0.1))"
                            }}
                        >
                            {/* Logo Base */}
                            <Image src="/img/acap logo svg blanco sombra.svg" alt="A.C.A.P." fill className="object-contain" priority sizes="(max-width: 768px) 350px, 650px" />

                            {/* Capa de Brillo Enmascarada */}
                            <div
                                className="absolute inset-0 pointer-events-none overflow-hidden"
                                style={{
                                    WebkitMaskImage: 'url("/img/acap logo svg blanco sombra.svg")',
                                    maskImage: 'url("/img/acap logo svg blanco sombra.svg")',
                                    WebkitMaskSize: 'contain',
                                    maskSize: 'contain',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center',
                                    maskPosition: 'center'
                                }}
                            >
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-white/60 via-white/20 to-transparent h-[400%] w-[400%] animate-shine-multi opacity-80" />
                            </div>
                        </div>
                        <motion.h1 variants={fadeUp} className="text-xl md:text-2xl lg:text-[2rem] font-black italic tracking-tighter uppercase leading-[0.85] mb-8 text-white">
                            ASOCIACIÓN <span className="text-korea-gradient">COREANA</span> DE PÁDEL EN <span className="text-argentina-gradient">ARGENTINA</span>
                        </motion.h1>

                        {/* Reflejo de Suelo (Tipo Espejo de Cristal - Estático) */}
                        <div
                            className="absolute -bottom-[60%] flex items-center justify-center shrink-0 w-[350px] h-[240px] md:w-[650px] md:h-[450px] pointer-events-none select-none -z-10 opacity-30"
                            style={{
                                transform: "scaleY(-1)",
                                maskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 50%)",
                                WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 50%)",
                                filter: "blur(4px)"
                            }}
                        >
                            <Image src="/img/acap logo svg blanco sombra.svg" alt="" fill className="object-contain opacity-50" />
                        </div>

                        {/* Brillo Horizontal en el Punto de Contacto del Reflejo */}
                        <div className="absolute -bottom-8 w-[200px] md:w-[400px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent blur-[1px]" />

                        {/* Sutil resplandor de fondo (Auroras) */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 -z-20 flex justify-center opacity-30">
                            <div className="w-[300px] h-[200px] md:w-[600px] md:h-[400px] bg-emerald-500/10 blur-[130px] rounded-full" />
                        </div>
                    </motion.div>


                    <motion.h1 variants={fadeUp} className="text-6xl md:text-8xl lg:text-[7rem] font-black italic tracking-tighter uppercase leading-[0.85] mb-8 text-white">
                        Domina La <br /> <span className="text-gradient-animate drop-shadow-[0_0_40px_rgba(16,185,129,0.3)]">Cancha</span>
                    </motion.h1>

                    <motion.p variants={fadeUp} className="text-lg md:text-xl text-slate-400 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
                        A.C.A.P. forma parte de la mejor red social de padel
                    </motion.p>

                    <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-5 justify-center">
                        <Link href="/ranking" className="glow-button bg-slate-900 border border-slate-700 text-white px-10 py-4 rounded-full text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                            <Trophy className="w-5 h-5 text-yellow-500" /> Ver Ranking
                        </Link>
                        <Link href="/register" className="glow-button bg-white text-black px-10 py-4 rounded-full text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                            Unirse <ArrowRight className="w-5 h-5" />
                        </Link>
                    </motion.div>
                </motion.div>

                {/* KPI STATS */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, type: "spring" }}
                    className="grid grid-cols-2 lg:grid-cols-3 gap-6 md:gap-12 mt-28 w-full border-t border-slate-800 pt-16"
                >
                    {[
                        { label: "Torneos Activos", value: "+" + tournamentCount, color: "text-emerald-400" },
                        { label: "Jugadores Registrados", value: "+" + playerCount, color: "text-blue-400" },
                        { label: "Clubes Aliados", value: "" + clubCount, color: "text-cyan-400" }
                    ].map((stat, i) => (
                        <div key={i} className="flex flex-col items-center">
                            <span className={"text-4xl md:text-6xl font-black italic mb-2 drop-shadow-[0_0_20px_currentColor] " + stat.color}>{stat.value}</span>
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</span>
                        </div>
                    ))}
                </motion.div>
            </motion.section>

            {/* ── BENTO GRID FEATURES ── */}
            <section className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]"
                >
                    {/* Tarjeta 1: Comunidad */}
                    <motion.div variants={fadeUp} whileHover={{ scale: 1.02 }} className="glass-card rounded-[2rem] p-8 md:col-span-2 flex flex-col justify-end relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] group-hover:bg-blue-500/30 transition-colors" />
                        <Users className="w-12 h-12 text-blue-400 mb-6 relative z-10" />
                        <h3 className="text-3xl font-black italic uppercase text-white mb-2 relative z-10">Conecta y Juega</h3>
                        <p className="text-sm text-slate-400 max-w-sm relative z-10">Arma parejas, encuentra rivales de tu nivel y sumérgete en el feed social del deporte más emocionante.</p>
                    </motion.div>

                    {/* Tarjeta 2: Torneos */}
                    <Link href="/tournaments" className="block h-full group">
                        <motion.div variants={fadeUp} whileHover={{ scale: 1.02 }} className="glass-card rounded-[2rem] p-8 h-full flex flex-col justify-end relative overflow-hidden">
                            <div className="absolute -top-10 -left-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-[60px] group-hover:bg-emerald-500/30 transition-colors" />
                            <Trophy className="w-12 h-12 text-emerald-400 mb-6 relative z-10" />
                            <h3 className="text-2xl font-black italic uppercase text-white mb-2 relative z-10">Torneos</h3>
                            <div className="flex justify-between items-center relative z-10">
                                <p className="text-sm text-slate-400">Inscripción directa, llaves dinámicas y resultados.</p>
                                <ArrowRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </motion.div>
                    </Link>

                    {/* Tarjeta 3: Ranking */}
                    <Link href="/ranking" className="block h-full">
                        <motion.div variants={fadeUp} whileHover={{ scale: 1.02 }} className="glass-card h-full rounded-[2rem] p-8 flex flex-col justify-end relative overflow-hidden group">
                            <div className="absolute bottom-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-[60px]" />
                            <Star className="w-12 h-12 text-yellow-500 mb-6 relative z-10" />
                            <h3 className="text-2xl font-black italic uppercase text-white mb-2 relative z-10">Ranking Oficial</h3>
                            <div className="flex justify-between items-center relative z-10">
                                <p className="text-sm text-slate-400">Suma puntos oficiales de la A.C.A.P.</p>
                                <ArrowRight className="w-4 h-4 text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </motion.div>
                    </Link>

                    {/* Tarjeta 4: Directorio */}
                    <Link href="/directory" className="md:col-span-2 group">
                        <motion.div variants={fadeUp} whileHover={{ scale: 1.02 }} className="glass-card rounded-[2rem] p-8 h-full flex flex-col justify-end relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-[80px]" />
                            <MapPin className="w-12 h-12 text-cyan-400 mb-6 relative z-10" />
                            <h3 className="text-3xl font-black italic uppercase text-white mb-2 relative z-10">Explorá Clubes</h3>
                            <div className="flex justify-between items-center relative z-10">
                                <p className="text-sm text-slate-400 max-w-sm">Encontrá las mejores sedes, seguí en vivo los partidos y conectá con nuevos lugares de juego.</p>
                                <ArrowRight className="w-6 h-6 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </motion.div>
                    </Link>
                    {/* Tarjeta 5: Marketplace */}
                    <Link href="/marketplace" className="md:col-span-3 group">
                        <motion.div variants={fadeUp} whileHover={{ scale: 1.01 }} className="glass-card rounded-[2rem] p-8 h-full flex items-center justify-between relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent pointer-events-none" />
                            <div className="relative z-10 flex items-center gap-8">
                                <div className="w-20 h-20 bg-cyan-500/20 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <ShoppingBag className="w-10 h-10 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black italic uppercase text-white mb-1">Marketplace ACAP</h3>
                                    <p className="text-slate-400 font-medium max-w-md text-sm">Comprá y vendé equipamiento de padel. Paletas, calzado y accesorios entre jugadores de la comunidad.</p>
                                </div>
                            </div>
                            <div className="relative z-10 flex items-center gap-3 bg-white/5 px-6 py-3 rounded-full border border-white/10 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                                <span className="text-xs font-black uppercase tracking-widest text-nowrap">Ver Bazar</span>
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </motion.div>
                    </Link>
                </motion.div>
            </section>

            {/* ── DYNAMIC SOCIAL FEED MOCK ── */}
            <section className="relative z-10 py-24 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
                    <h2 className="text-4xl md:text-5xl font-black italic uppercase text-white">Tu Actividad, <span className="text-blue-500">En Vivo</span></h2>
                </div>

                {/* Carrusel infinito o Layout de Feed */}
                <div className="max-w-4xl mx-auto space-y-6 px-6 relative">
                    <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-black to-transparent z-10" />
                    <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-black to-transparent z-10" />

                    <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="glass-card p-6 rounded-2xl flex gap-4 w-full md:w-3/4 mx-auto rotate-1 md:-ml-8"
                    >
                        <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0 border border-emerald-500/30">
                            <Trophy className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-300 font-medium">¡<strong className="text-white">Martín Lopez</strong> acaba de coronarse campeón de 5ta categoría en El Bosque Padel!</p>
                            <span className="text-xs text-slate-500 mt-2 block font-bold">Hace 2 horas</span>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: -100 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="glass-card p-6 rounded-2xl flex gap-4 w-full md:w-3/4 mx-auto -rotate-1 md:ml-auto md:-mr-8"
                    >
                        <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0 border border-blue-500/30">
                            <Activity className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-300 font-medium"><strong className="text-white">Julián Crítico</strong> subió un nuevo partido en Parque Roca. ¡Buscando revancha!</p>
                            <span className="text-xs text-slate-500 mt-2 block font-bold">Hace 5 horas</span>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── FOOTER FINAL CTA ── */}
            <footer className="relative z-10 border-t border-slate-800/50 pt-24 pb-12 overflow-hidden mt-12 bg-black">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />

                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-5xl md:text-7xl font-black italic uppercase text-white mb-10 drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">Entra a jugar</h2>
                    <Link href="/register" className="glow-button inline-block bg-white text-black px-16 py-5 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:scale-110 active:scale-95 transition-all">
                        Unirse a la Comunidad
                    </Link>
                </div>

                <div className="max-w-6xl mx-auto mt-32 px-6 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-900 pt-8">
                    <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8">
                            <Image src="/img/acap logo svg blanco sombra.svg" alt="A.C.A.P." fill className="object-contain" />
                        </div>
                        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-600">© 2026 Asociación Coreana Argentina de Pádel</span>
                    </div>
                    <div>
                        <span className="text-[9px] font-bold tracking-widest uppercase text-slate-600">
                            Designed & Developed by <a href="https://x.com/Kr84Jae" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-emerald-400 transition-colors">@JaeKr84</a>
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
