"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, Variants } from "framer-motion";
import { Trophy, Star, Users, MapPin, ArrowRight, Activity, ShoppingBag } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

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

const SponsorItem = ({ s }: { s: any }) => (
    <div className="mx-12 shrink-0">
        {s.link ? (
            <Link
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="relative h-16 w-40 md:h-24 md:w-72 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
            >
                <Image
                    src={s.imageUrl}
                    alt={s.name}
                    fill
                    className="object-contain filter grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                    sizes="(max-width: 768px) 160px, 288px"
                />
            </Link>
        ) : (
            <div className="relative h-16 w-40 md:h-24 md:w-72 flex items-center justify-center">
                <Image
                    src={s.imageUrl}
                    alt={s.name}
                    fill
                    className="object-contain filter grayscale opacity-40"
                    sizes="(max-width: 768px) 160px, 288px"
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
    const yHero = useTransform(scrollYProgress, [0, 1], [0, 400]);
    const opacityHero = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

    return (
        <div className="min-h-screen bg-black text-slate-200 overflow-x-hidden font-sans selection:bg-azul-primary/30">

            {/* ── FONDO DINÁMICO (Parallax Mesh Glows) ── */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div style={{ y: useTransform(scrollYProgress, [0, 1], [0, -200]) }} className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] bg-celeste/10 rounded-full blur-[150px]" />
                <motion.div style={{ y: useTransform(scrollYProgress, [0, 1], [0, 300]) }} className="absolute top-[20%] -right-[10%] w-[500px] h-[500px] bg-azul-primary/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay"></div>
            </div>

            {/* ── NAV ── */}
            <Navbar />

            {/* ── HERO SECTION ── */}
            <motion.section style={{ y: yHero, opacity: opacityHero }} className="relative z-10 pt-20 lg:pt-24 pb-2 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
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
                            className="relative flex items-center justify-center shrink-0 mx-auto w-[280px] h-[180px] md:w-[450px] md:h-[300px] z-10"
                            style={{
                                filter: "drop-shadow(0 0 1px rgba(255,255,255,0.3)) drop-shadow(0 0 20px rgba(14, 165, 233, 0.1))"
                            }}
                        >
                            {/* Logo Base */}
                            <Image src="/img/acap logo svg blanco sombra.svg" alt="A.C.A.P." fill className="object-contain" priority sizes="(max-width: 768px) 280px, 450px" />

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
                        <motion.h1 variants={fadeUp} className="text-lg md:text-xl lg:text-[1.5rem] font-black italic tracking-tighter uppercase leading-[0.85] mb-4 text-white">
                            ASOCIACIÓN <span className="text-korea-gradient">COREANA</span> DE PÁDEL EN <span className="text-argentina-gradient">ARGENTINA</span>
                        </motion.h1>

                        {/* Reflejo de Suelo (Tipo Espejo de Cristal - Estático) */}
                        <div
                            className="absolute -bottom-[60%] flex items-center justify-center shrink-0 w-[280px] h-[180px] md:w-[450px] md:h-[300px] pointer-events-none select-none -z-10 opacity-30"
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
                            <div className="w-[300px] h-[200px] md:w-[600px] md:h-[400px] bg-celeste/10 blur-[130px] rounded-full" />
                        </div>
                    </motion.div>


                    <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl lg:text-[5.5rem] font-black italic tracking-tighter uppercase leading-[0.85] mb-6 text-white">
                        Dominá La <br /> <span className="text-gradient-animate drop-shadow-[0_0_40px_rgba(14,165,233,0.3)]">Cancha</span>
                    </motion.h1>

                    <motion.p variants={fadeUp} className="text-base md:text-lg text-slate-400 font-medium mb-8 max-w-2xl mx-auto leading-relaxed">
                        A.C.A.P. forma parte de la mejor red social de pádel
                    </motion.p>

                    {/* Deleted old buttons here */}
                </motion.div>
            </motion.section>

            {/* ── SPONSOR MARQUEE ── */}
            {sponsors && sponsors.length > 0 && (
                <div className="relative z-10 w-full overflow-hidden bg-white/[0.02] border-y border-white/5 pt-1 pb-10 mb-16 flex flex-col items-center">
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-slate-500 mb-6 italic"
                    >
                        Nuestros Sponsors
                    </motion.p>
                    <div className="flex w-full overflow-hidden relative">
                        <div className="flex animate-marquee whitespace-nowrap">
                            {/* Renderizamos 4 veces para asegurar que cubra toda la pantalla sin gaps */}
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

            {/* KPI STATS */}
            <div className="max-w-7xl mx-auto px-6 relative z-10 mb-20">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, type: "spring" }}
                    className="grid grid-cols-2 lg:grid-cols-3 gap-6 md:gap-12 mt-16 w-full border-t border-slate-800 pt-12"
                >
                    {[
                        { label: "Torneos Activos", value: "+" + tournamentCount, color: "text-celeste" },
                        { label: "Jugadores Registrados", value: "+" + playerCount, color: "text-blue-400" },
                        { label: "Clubes Aliados", value: "" + clubCount, color: "text-cyan-400" }
                    ].map((stat, i) => (
                        <div key={i} className="flex flex-col items-center">
                            <span className={"text-4xl md:text-6xl font-black italic mb-2 drop-shadow-[0_0_20px_currentColor] " + stat.color}>{stat.value}</span>
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</span>
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* ── BENTO GRID FEATURES ── */}
            <section className="relative z-10 py-12 px-6 max-w-7xl mx-auto">
                <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[220px] md:auto-rows-[250px]"
                >
                    {/* Tarjeta 1: Comunidad */}
                    <motion.div variants={fadeUp} whileHover={{ scale: 1.02 }} className="glass-card rounded-[2rem] p-8 md:col-span-2 flex flex-col justify-end relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] group-hover:bg-blue-500/30 transition-colors" />
                        <Users className="w-12 h-12 text-blue-400 mb-6 relative z-10" />
                        <h3 className="text-3xl font-black italic uppercase text-white mb-2 relative z-10">Conectá y Jugá</h3>
                        <p className="text-sm text-slate-400 max-w-sm relative z-10">Armá parejas, encontrá rivales de tu nivel y sumergite en el feed social del deporte más emocionante.</p>
                    </motion.div>

                    {/* Tarjeta 2: Torneos */}
                    <Link href="/tournaments" className="block h-full group">
                        <motion.div variants={fadeUp} whileHover={{ scale: 1.02 }} className="glass-card rounded-[2rem] p-8 h-full flex flex-col justify-end relative overflow-hidden">
                            <div className="absolute -top-10 -left-10 w-48 h-48 bg-azul-primary/20 rounded-full blur-[60px] group-hover:bg-azul-primary/30 transition-colors" />
                            <Trophy className="w-12 h-12 text-celeste mb-6 relative z-10" />
                            <h3 className="text-2xl font-black italic uppercase text-white mb-2 relative z-10">Torneos</h3>
                            <div className="flex justify-between items-center relative z-10">
                                <p className="text-sm text-slate-400">Inscripción directa, llaves dinámicas y resultados.</p>
                                <ArrowRight className="w-4 h-4 text-celeste opacity-0 group-hover:opacity-100 transition-opacity" />
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
                                <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <ShoppingBag className="w-8 h-8 text-cyan-400" />
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
                        <div className="w-14 h-14 bg-azul-primary/20 rounded-full flex items-center justify-center shrink-0 border border-azul-primary/30">
                            <Trophy className="w-6 h-6 text-celeste" />
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
            <Footer />
        </div>
    );
}
