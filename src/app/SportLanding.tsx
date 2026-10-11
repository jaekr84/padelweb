"use client";

import Image from "next/image";
import Link from "next/link";
import {
    motion,
    useScroll,
    useTransform,
    useSpring,
    useVelocity,
    useMotionValue,
    useAnimationFrame,
    useInView,
    useReducedMotion,
    useMotionValueEvent,
    useAnimationControls,
} from "framer-motion";
import { ArrowUpRight, ArrowRight, Trophy, Star, MapPin, ShoppingBag, Users, Instagram } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { Footer } from "@/components/landing/Footer";
import { HeroVideo } from "@/components/landing/HeroVideo";
import { AcapLogoAnimated } from "@/components/landing/AcapLogoAnimated";
import { BallImpact } from "@/components/landing/BallImpact";
import type { LandingData } from "@/lib/landing";

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const LOGO = "/img/acap logo svg blanco sombra.svg";

const NOISE =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const TYPE_LABEL: Record<string, string> = {
    americano: "Americano",
    round_robin: "Robin",
    desafio: "Desafío",
};

const wrap = (min: number, max: number, v: number) => {
    const range = max - min;
    return ((((v - min) % range) + range) % range) + min;
};

// ── Contador estilo marcador (rellena con ceros) ──
function ScoreCounter({ target }: { target: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.6 });
    const reduce = useReducedMotion();
    const [value, setValue] = useState(0);
    const digits = Math.max(3, String(target).length);

    useEffect(() => {
        if (!inView) return;
        if (reduce) return;
        let raf = 0;
        const start = performance.now();
        const duration = 1600;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 4);
            setValue(Math.round(target * eased));
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [inView, target, reduce]);

    return (
        <span ref={ref} className="tabular-nums">
            {String(reduce ? target : value).padStart(digits, "0")}
        </span>
    );
}

// ── Titular cinético: letras que suben con skew ──
function KineticLine({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
    const reduce = useReducedMotion();
    return (
        <span className={`block overflow-hidden whitespace-nowrap pt-[0.14em] -mt-[0.14em] pb-[0.08em] ${className}`} aria-hidden>
            {text.split("").map((ch, i) => (
                <motion.span
                    key={i}
                    className="inline-block will-change-transform"
                    initial={reduce ? false : { y: "115%", skewY: 14, opacity: 0 }}
                    animate={{ y: "0%", skewY: 0, opacity: 1 }}
                    transition={{ duration: 0.9, delay: delay + i * 0.035, ease: EASE_OUT }}
                >
                    {ch === " " ? " " : ch}
                </motion.span>
            ))}
        </span>
    );
}

// ── Marquesina que acelera con la velocidad del scroll ──
function VelocityMarquee({ children, baseVelocity, className = "" }: { children: ReactNode; baseVelocity: number; className?: string }) {
    const reduce = useReducedMotion();
    const baseX = useMotionValue(0);
    const { scrollY } = useScroll();
    const scrollVelocity = useVelocity(scrollY);
    const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
    const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 4], { clamp: false });
    const x = useTransform(baseX, (v) => `${wrap(-25, -50, v)}%`);
    const direction = useRef(1);

    useAnimationFrame((_, delta) => {
        if (reduce) return;
        let move = direction.current * baseVelocity * (delta / 1000);
        const f = velocityFactor.get();
        if (f < 0) direction.current = -1;
        else if (f > 0) direction.current = 1;
        move += direction.current * move * f;
        baseX.set(baseX.get() + move);
    });

    return (
        <div className={`overflow-hidden whitespace-nowrap flex ${className}`}>
            <motion.div className="flex whitespace-nowrap" style={{ x }}>
                {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="flex shrink-0" aria-hidden={i > 0}>
                        {children}
                    </span>
                ))}
            </motion.div>
        </div>
    );
}

// ── Nav ──
function SportNav() {
    const { scrollY } = useScroll();
    const [scrolled, setScrolled] = useState(false);
    useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

    const links = [
        { href: "/ranking", label: "Ranking" },
        { href: "/tournaments", label: "Torneos" },
        { href: "/directory", label: "Clubes" },
        { href: "/marketplace", label: "Marketplace" },
        { href: "/contacto", label: "Contacto" },
    ];

    return (
        <motion.nav
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT }}
            className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${scrolled ? "bg-flag-navy/85 backdrop-blur-xl border-b border-white/10" : "bg-transparent border-b border-transparent"}`}
        >
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
                <Link href="/" className="flex items-center gap-2.5 shrink-0">
                    <span className="relative w-9 h-9">
                        <Image src={LOGO} alt="" fill className="object-contain" priority sizes="36px" />
                    </span>
                    <span className="heading-sport text-xl text-white">A.C.A.P</span>
                </Link>

                <div className="hidden lg:flex items-center gap-7">
                    {links.map((l) => (
                        <Link key={l.href} href={l.href} className="group relative label-tech text-[11px] text-slate-400 hover:text-white transition-colors">
                            {l.label}
                            <span className="absolute -bottom-1.5 left-0 h-[2px] w-full origin-left scale-x-0 bg-flag-celeste transition-transform duration-300 group-hover:scale-x-100" />
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-3 md:gap-5">
                    <Link href="/login" className="label-tech text-[11px] text-slate-300 hover:text-white transition-colors">
                        Entrar
                    </Link>
                    <Link
                        href="/register"
                        className="clip-notch bg-flag-rojo text-white px-4 md:px-5 py-2.5 label-tech text-[11px] font-bold hover:bg-white hover:text-flag-rojo transition-colors"
                    >
                        Unite
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}

// ── Tarjeta de módulo (sección horizontal) ──
const FEATURES = [
    { n: "01", icon: Trophy, title: "Torneos", desc: "Inscripción online, americanos, robin y llaves que se arman solas. Resultados al instante.", href: "/tournaments", tag: "Competí", img: "/img/landing/remate3.jpg" },
    { n: "02", icon: Star, title: "Ranking", desc: "Puntos oficiales de la A.C.A.P. después de cada torneo. Mirá dónde estás y a quién tenés que pasar.", href: "/ranking", tag: "Escalá", img: "/img/landing/remate1.jpg" },
    { n: "03", icon: Users, title: "Comunidad", desc: "Feed de resultados, logros y parejas. Encontrá rivales de tu nivel y armá partido.", href: "/register", tag: "Conectá", img: "/img/landing/remate2.jpg" },
    { n: "04", icon: MapPin, title: "Clubes", desc: "Sedes, canchas y torneos de cada club de la red, en un solo directorio.", href: "/directory", tag: "Explorá", img: "/img/landing/remate3.jpg" },
    { n: "05", icon: ShoppingBag, title: "Marketplace", desc: "Paletas, calzado y accesorios entre jugadores de la comunidad.", href: "/marketplace", tag: "Equipate", img: "/img/landing/remate1.jpg" },
];

function FeatureCard({ f, className = "" }: { f: (typeof FEATURES)[number]; className?: string }) {
    const Icon = f.icon;
    return (
        <Link
            href={f.href}
            className={`group relative clip-notch bg-flag-ink border border-white/10 p-7 md:p-9 flex flex-col justify-between overflow-hidden ${className}`}
        >
            {/* Foto real de cancha, apagada; se aviva en hover */}
            <Image
                src={f.img}
                alt=""
                fill
                sizes="440px"
                className="object-cover opacity-45 scale-105 group-hover:opacity-60 group-hover:scale-100 transition-all duration-700"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-flag-ink via-flag-ink/75 to-flag-navy/20" />
            {/* Relleno azul que sube en hover */}
            <span className="absolute inset-0 bg-gradient-to-t from-flag-azul via-flag-azul/90 to-flag-azul/60 origin-bottom scale-y-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100" />
            <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-flag-celeste via-white to-flag-rojo" />
            <span className="absolute -right-6 -top-6 w-40 h-40 bg-stripes text-white/[0.04] group-hover:text-white/[0.07] transition-colors" />

            <div className="relative flex items-start justify-between">
                <span
                    className="heading-sport text-[7rem] md:text-[9rem] leading-[0.8] text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.22)] group-hover:[-webkit-text-stroke:1.5px_rgba(255,255,255,0.55)] transition-all"
                >
                    {f.n}
                </span>
                <span className="w-12 h-12 flex items-center justify-center border border-white/15 group-hover:border-white/40 group-hover:rotate-45 transition-transform duration-500">
                    <ArrowUpRight className="w-5 h-5 text-flag-celeste group-hover:text-white group-hover:-rotate-45 transition-transform duration-500" />
                </span>
            </div>

            <div className="relative">
                <span className="badge-slant inline-block bg-white/5 group-hover:bg-flag-rojo border border-white/10 group-hover:border-flag-rojo px-3 py-1 mb-5 transition-colors">
                    <span className="unskew inline-flex items-center gap-2 label-tech text-[10px] text-flag-celeste group-hover:text-white transition-colors">
                        <Icon className="w-3.5 h-3.5" /> {f.tag}
                    </span>
                </span>
                <h3 className="heading-sport text-4xl md:text-5xl text-white transition-colors mb-3">{f.title}</h3>
                <p className="text-sm md:text-base text-slate-300 group-hover:text-flag-celeste-light leading-relaxed max-w-xs transition-colors">{f.desc}</p>
            </div>
        </Link>
    );
}

// ── Scroll horizontal fijado (desktop) ──
function PinnedFeatures() {
    const sectionRef = useRef<HTMLElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const [distance, setDistance] = useState(0);

    useLayoutEffect(() => {
        const measure = () => {
            if (!trackRef.current) return;
            setDistance(Math.max(0, trackRef.current.scrollWidth - window.innerWidth));
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);

    const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
    const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
    const x = useTransform(smooth, [0, 1], [0, -distance]);

    return (
        <section ref={sectionRef} className="relative hidden md:block h-[320vh]">
            <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
                <motion.div ref={trackRef} style={{ x }} className="flex items-stretch gap-6 pl-[6vw] pr-[6vw] w-max">
                    <div className="w-[38vw] max-w-[560px] flex flex-col justify-center pr-8 shrink-0">
                        <span className="label-tech text-[11px] text-flag-celeste mb-6 flex items-center gap-3">
                            <span className="w-8 h-[2px] bg-flag-rojo" /> La plataforma
                        </span>
                        <h2 className="heading-sport text-6xl lg:text-7xl text-white">
                            Todo el pádel.
                            <br />
                            <span className="text-transparent [-webkit-text-stroke:2px_#74acdf]">Una sola</span>
                            <br />
                            cancha.
                        </h2>
                        <p className="text-slate-400 mt-6 max-w-sm leading-relaxed">
                            Deslizá. Cada módulo está pensado para jugar más y administrar menos.
                        </p>
                    </div>
                    {FEATURES.map((f) => (
                        <FeatureCard key={f.n} f={f} className="w-[400px] lg:w-[440px] h-[62vh] min-h-[460px] shrink-0" />
                    ))}
                </motion.div>

                {/* Barra de progreso */}
                <div className="absolute bottom-10 left-[6vw] right-[6vw] flex items-center gap-4">
                    <span className="label-tech text-[10px] text-slate-500">01</span>
                    <div className="relative flex-1 h-[2px] bg-white/10 overflow-hidden">
                        <motion.div style={{ scaleX: smooth }} className="absolute inset-0 origin-left bg-gradient-to-r from-flag-celeste via-white to-flag-rojo" />
                    </div>
                    <span className="label-tech text-[10px] text-slate-500">05</span>
                </div>
            </div>
        </section>
    );
}

function MobileFeatures() {
    return (
        <section className="md:hidden py-20">
            <div className="px-4 mb-8">
                <span className="label-tech text-[11px] text-flag-celeste mb-4 flex items-center gap-3">
                    <span className="w-8 h-[2px] bg-flag-rojo" /> La plataforma
                </span>
                <h2 className="heading-sport text-5xl text-white">
                    Todo el pádel.{" "}
                    <span className="text-transparent [-webkit-text-stroke:1.5px_#74acdf]">Una sola</span> cancha.
                </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {FEATURES.map((f) => (
                    <FeatureCard key={f.n} f={f} className="snap-start shrink-0 w-[82vw] h-[440px]" />
                ))}
            </div>
        </section>
    );
}

// ── Botón magnético ──
function MagneticLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
    const reduce = useReducedMotion();
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const x = useSpring(mx, { stiffness: 200, damping: 15 });
    const y = useSpring(my, { stiffness: 200, damping: 15 });

    const onMove = (e: PointerEvent<HTMLDivElement>) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - (r.left + r.width / 2)) * 0.35);
        my.set((e.clientY - (r.top + r.height / 2)) * 0.35);
    };

    return (
        <motion.div style={{ x, y }} onPointerMove={onMove} onPointerLeave={() => { mx.set(0); my.set(0); }} className="inline-block">
            <Link href={href} className={className}>
                {children}
            </Link>
        </motion.div>
    );
}

// ════════════════════════════════════════════════════════════════

export default function SportLanding({
    tournamentCount = 0,
    playerCount = 0,
    clubCount = 0,
    sponsors = [],
    upcoming = [],
    topPlayers = [],
}: Partial<LandingData>) {
    const reduce = useReducedMotion();

    // Hero: parallax de scroll
    const heroRef = useRef<HTMLElement>(null);
    const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
    const heroY = useTransform(heroProgress, [0, 1], [0, 220]);
    const heroOpacity = useTransform(heroProgress, [0, 0.8], [1, 0]);
    const ghostX = useTransform(heroProgress, [0, 1], ["0%", "-30%"]);

    // Hero: el video se acerca apenas al scrollear; el impacto sacude todo
    const videoScale = useTransform(heroProgress, [0, 1], [1, 1.12]);
    const shake = useAnimationControls();
    const [ballHits, setBallHits] = useState(0);

    // CTA final: el titular se desplaza con el scroll
    const ctaRef = useRef<HTMLElement>(null);
    const { scrollYProgress: ctaProgress } = useScroll({ target: ctaRef, offset: ["start end", "end start"] });
    const ctaX = useTransform(ctaProgress, [0, 1], ["12%", "-28%"]);

    const maxPoints = Math.max(1, ...topPlayers.map((p) => p.points ?? 0));

    const stats = [
        { label: "Torneos", value: tournamentCount },
        { label: "Jugadores", value: playerCount },
        { label: "Clubes", value: clubCount },
    ];

    return (
        <div className="theme-night min-h-screen bg-flag-navy text-slate-200 overflow-x-clip selection:bg-flag-celeste selection:text-flag-ink">
            {/* Grano */}
            <div className="fixed inset-0 z-[60] pointer-events-none opacity-[0.06] mix-blend-overlay" style={{ backgroundImage: NOISE }} />

            <SportNav />

            {/* ════════════════ HERO ════════════════ */}
            <motion.section
                ref={heroRef}
                animate={shake}
                className="relative min-h-[100svh] flex flex-col overflow-hidden"
            >
                {/* Fondo: remates reales en cancha nocturna, entonados en azul */}
                <motion.div style={{ scale: reduce ? 1 : videoScale }} className="absolute inset-0">
                    <HeroVideo />
                </motion.div>
                <div className="absolute inset-0 bg-flag-azul/25 mix-blend-multiply" />
                <div className="absolute inset-0 bg-gradient-to-r from-flag-navy/85 via-flag-navy/35 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-flag-navy via-transparent to-flag-navy/60" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_85%_10%,rgba(116,172,223,0.25),transparent_70%)]" />

                {/* Logo protagonista: 80% del ancho (sin pasarse del alto de la
                    pantalla), detrás del titular y apoyado a la derecha. */}
                <div className="absolute inset-0 flex items-center justify-end pr-[3vw] pointer-events-none">
                    <AcapLogoAnimated
                        hit={ballHits}
                        delay={0.6}
                        className="w-[min(80vw,calc(100svh*1.414))] opacity-60"
                    />
                </div>

                {/* Texto fantasma gigante */}
                <motion.div
                    aria-hidden
                    style={{ x: ghostX }}
                    className="absolute top-[14%] left-0 heading-sport text-[38vw] leading-none whitespace-nowrap text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.07)] select-none pointer-events-none"
                >
                    PÁDEL PÁDEL
                </motion.div>

                {/* Corte diagonal: celeste, blanco y rojo */}
                <motion.div
                    aria-hidden
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 1.1, delay: 0.9, ease: EASE_OUT }}
                    className="absolute left-[-10%] right-[-10%] top-[62%] opacity-50 md:opacity-90 h-[9px] bg-[linear-gradient(180deg,#74acdf_0_33%,#ffffff_33%_66%,#cd2e3a_66%)] origin-left -rotate-[8deg] shadow-[0_0_40px_rgba(116,172,223,0.45)]"
                />

                <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 flex-1 flex flex-col justify-center max-w-7xl w-full mx-auto px-4 md:px-6 pt-28 pb-10">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex items-center gap-4 mb-8"
                    >
                        <span className="label-tech text-[10px] md:text-[11px] text-slate-300 leading-relaxed">
                            Asociación <span className="text-korea-gradient">Coreana</span> de Pádel
                            <br />
                            en <span className="text-argentina-gradient">Argentina</span>
                        </span>
                    </motion.div>

                    {/* La pelota cae en el hueco a la derecha de "DOMINÁ", arriba de "CHA".
                        Se posiciona en em para seguir al titular en cualquier ancho. */}
                    <div className="relative text-[15vw] md:text-[11vw] lg:text-[10rem]">
                        <h1 aria-label="Dominá la cancha" className="heading-sport text-white drop-shadow-[0_6px_30px_rgba(3,10,26,0.6)] text-[15vw] md:text-[11vw] lg:text-[10rem] leading-[0.85] tracking-tight">
                            <KineticLine text="DOMINÁ" delay={0.35} />
                            <KineticLine text="LA CANCHA" delay={0.6} className="text-flag-celeste drop-shadow-[0_0_40px_rgba(116,172,223,0.45)]" />
                        </h1>
                        <BallImpact
                            className="absolute left-[4.95em] top-[0.42em]"
                            scaleClassName="scale-[0.36] md:scale-[0.58] lg:scale-100"
                            onImpact={() => {
                                setBallHits((n) => n + 1);
                                shake.start({
                                    x: [0, -14, 12, -8, 5, -2, 0],
                                    y: [0, 9, -7, 4, -2, 0],
                                    transition: { duration: 0.5, ease: "easeOut" },
                                });
                            }}
                        />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 1.2, ease: EASE_OUT }}
                        className="mt-8 flex flex-col md:flex-row md:items-end gap-8 md:gap-12"
                    >
                        <p className="text-base md:text-lg text-slate-200 max-w-md leading-relaxed">
                            Torneos oficiales, ranking en tiempo real y la comunidad coreano-argentina de pádel. En una sola app.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <MagneticLink
                                href="/register"
                                className="group relative clip-notch inline-flex items-center gap-3 bg-flag-rojo text-white px-7 py-4 label-tech text-xs font-bold overflow-hidden shadow-[0_10px_40px_-10px_rgba(205,46,58,0.7)]"
                            >
                                <span className="absolute inset-0 bg-white -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
                                <span className="relative group-hover:text-flag-rojo transition-colors duration-300">Unite gratis</span>
                                <ArrowRight className="relative w-4 h-4 group-hover:text-flag-rojo group-hover:translate-x-1 transition-all" />
                            </MagneticLink>
                            <Link
                                href="/tournaments"
                                className="clip-notch inline-flex items-center gap-3 border border-white/30 bg-white/[0.06] backdrop-blur px-7 py-4 label-tech text-xs text-white hover:border-flag-celeste hover:text-flag-celeste transition-colors"
                            >
                                Ver torneos
                            </Link>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Marcador de stats */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.4, ease: EASE_OUT }}
                    className="relative z-10 max-w-7xl w-full mx-auto px-4 md:px-6 pb-8"
                >
                    <div className="relative clip-notch bg-flag-ink/70 backdrop-blur-md border border-white/10 grid grid-cols-3 divide-x divide-white/10">
                        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-flag-celeste via-white to-flag-rojo" />
                        {stats.map((s) => (
                            <div key={s.label} className="px-3 md:px-8 py-4 md:py-6">
                                <div className="label-tech text-[9px] md:text-[10px] text-flag-celeste-light/80 mb-1 flex items-center gap-2">
                                    {s.label === "Torneos" && <span className="live-dot !w-1.5 !h-1.5" />}
                                    {s.label}
                                </div>
                                <div className="text-scoreboard text-3xl md:text-6xl text-white leading-none">
                                    <ScoreCounter target={s.value} />
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </motion.section>

            {/* ════════════════ MARQUESINAS ════════════════ */}
            <section aria-hidden className="relative py-10 md:py-16 overflow-hidden">
                <div className="-rotate-[3deg] scale-[1.06] bg-flag-celeste text-flag-ink py-3 md:py-4 border-y-4 border-white shadow-[0_0_60px_rgba(116,172,223,0.25)]">
                    <VelocityMarquee baseVelocity={-3}>
                        {["Torneos", "Ranking", "Americano", "Robin", "Desafío", "Cancha abierta"].map((w) => (
                            <span key={w} className="heading-sport text-4xl md:text-7xl px-6 md:px-10 flex items-center gap-6 md:gap-10">
                                {w} <span className="inline-block w-3 h-3 md:w-4 md:h-4 rotate-45 bg-flag-rojo" />
                            </span>
                        ))}
                    </VelocityMarquee>
                </div>
                <div className="rotate-[2deg] scale-[1.06] -mt-2 py-3 md:py-4 border-y-4 border-flag-rojo bg-flag-azul">
                    <VelocityMarquee baseVelocity={2.5}>
                        {["Poder", "Técnica", "Comunidad", "Garra", "Volea", "Bandeja", "Víbora"].map((w) => (
                            <span key={w} className="heading-sport text-4xl md:text-7xl px-6 md:px-10 text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.6)] flex items-center gap-6 md:gap-10">
                                {w} <span className="text-white [-webkit-text-stroke:0] text-3xl md:text-5xl">✦</span>
                            </span>
                        ))}
                    </VelocityMarquee>
                </div>
            </section>

            {/* ════════════════ MÓDULOS ════════════════ */}
            <PinnedFeatures />
            <MobileFeatures />

            {/* ════════════════ PRÓXIMOS TORNEOS ════════════════ */}
            {upcoming.length > 0 && (
                <section className="relative max-w-7xl mx-auto px-4 md:px-6 py-20 md:py-32">
                    <div className="flex items-end justify-between gap-6 mb-10 md:mb-14">
                        <motion.h2
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.7, ease: EASE_OUT }}
                            className="heading-sport text-5xl md:text-8xl text-white"
                        >
                            Próximos
                            <br />
                            <span className="text-flag-celeste">partidos</span>
                        </motion.h2>
                        <Link href="/tournaments" className="hidden md:inline-flex items-center gap-2 label-tech text-[11px] text-slate-400 hover:text-flag-celeste transition-colors pb-3">
                            Ver todos <ArrowUpRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="border-t border-white/10">
                        {upcoming.map((t, i) => {
                            const [, m, d] = (t.startDate ?? "").split("-");
                            const month = m ? MONTHS[Number(m) - 1] : "";
                            return (
                                <motion.div
                                    key={t.id}
                                    initial={{ opacity: 0, x: -40 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, amount: 0.4 }}
                                    transition={{ duration: 0.6, delay: i * 0.08, ease: EASE_OUT }}
                                >
                                    <Link href={`/tournaments/${t.id}`} className="group relative flex items-center gap-4 md:gap-10 py-6 md:py-8 border-b border-white/10 overflow-hidden">
                                        <span className="absolute inset-0 bg-gradient-to-r from-flag-azul to-flag-azul/70 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
                                        <div className="relative w-16 md:w-24 shrink-0 text-center">
                                            <div className="text-scoreboard text-4xl md:text-6xl text-white leading-none transition-colors">{d ?? "--"}</div>
                                            <div className="label-tech text-[10px] md:text-xs text-flag-rojo group-hover:text-flag-celeste-light mt-1 transition-colors">{month}</div>
                                        </div>
                                        <div className="relative flex-1 min-w-0">
                                            <span className="badge-slant inline-block bg-white/5 group-hover:bg-flag-rojo border border-white/10 group-hover:border-flag-rojo px-2.5 py-0.5 mb-2 transition-colors">
                                                <span className="unskew inline-block label-tech text-[9px] text-flag-celeste group-hover:text-white transition-colors">{TYPE_LABEL[t.type] ?? t.type}</span>
                                            </span>
                                            <h3 className="heading-sport text-2xl md:text-4xl text-white truncate transition-colors">{t.name}</h3>
                                            {(t.clubName || t.location) && (
                                                <p className="text-sm text-slate-500 group-hover:text-flag-celeste-light mt-1 truncate flex items-center gap-1.5 transition-colors">
                                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                    {[t.clubName, t.location].filter(Boolean).join(" · ")}
                                                </p>
                                            )}
                                        </div>
                                        <ArrowUpRight className="relative w-7 h-7 md:w-10 md:h-10 text-slate-600 group-hover:text-white group-hover:rotate-45 transition-all duration-500 shrink-0" />
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                    <Link href="/tournaments" className="md:hidden mt-8 inline-flex items-center gap-2 label-tech text-[11px] text-flag-celeste">
                        Ver todos <ArrowUpRight className="w-4 h-4" />
                    </Link>
                </section>
            )}

            {/* ════════════════ RANKING ════════════════ */}
            {topPlayers.length > 0 && (
                <section className="relative py-20 md:py-32 bg-flag-ink border-y border-white/10 overflow-hidden">
                    <div aria-hidden className="absolute -right-20 top-10 w-[500px] h-[500px] bg-stripes text-white/[0.025]" />
                    <div className="relative max-w-7xl mx-auto px-4 md:px-6 grid md:grid-cols-[1fr_1.4fr] gap-12 md:gap-20 items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.4 }}
                            transition={{ duration: 0.7, ease: EASE_OUT }}
                        >
                            <span className="label-tech text-[11px] text-flag-celeste mb-5 flex items-center gap-3">
                                <span className="live-dot" /> Ranking oficial
                            </span>
                            <h2 className="heading-sport text-5xl md:text-7xl text-white">
                                Los que
                                <br />
                                mandan
                            </h2>
                            <p className="text-slate-400 mt-6 max-w-sm leading-relaxed">
                                Cada torneo suma. Cada partido cuenta. ¿Cuánto te falta para entrar al top?
                            </p>
                            <Link href="/ranking" className="group mt-8 clip-notch inline-flex items-center gap-3 border border-white/20 px-6 py-3.5 label-tech text-xs text-white hover:bg-flag-rojo hover:text-white hover:border-flag-rojo transition-colors">
                                Ranking completo <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </motion.div>

                        <ol className="space-y-3">
                            {topPlayers.map((p, i) => {
                                const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "Jugador";
                                const pct = Math.max(8, Math.round(((p.points ?? 0) / maxPoints) * 100));
                                const medal = i === 0 ? "text-gold" : i === 1 ? "text-silver" : i === 2 ? "text-bronze" : "text-slate-600";
                                return (
                                    <motion.li
                                        key={p.id}
                                        initial={{ opacity: 0, x: 40 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true, amount: 0.5 }}
                                        transition={{ duration: 0.6, delay: i * 0.08, ease: EASE_OUT }}
                                        className="relative clip-corner-br bg-flag-navy border border-white/10 flex items-center gap-4 md:gap-6 pl-4 pr-5 md:pl-6 md:pr-8 py-4 overflow-hidden"
                                    >
                                        <motion.span
                                            aria-hidden
                                            initial={{ width: 0 }}
                                            whileInView={{ width: `${pct}%` }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 1.2, delay: 0.3 + i * 0.1, ease: EASE_OUT }}
                                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-flag-azul/0 via-flag-azul/30 to-flag-celeste/25 border-r-2 border-flag-celeste/80"
                                        />
                                        <span className={`relative heading-sport text-4xl md:text-5xl w-10 md:w-14 ${medal}`}>{i + 1}</span>
                                        <div className="relative flex-1 min-w-0">
                                            <div className="heading-sport text-lg md:text-2xl text-white truncate">{name}</div>
                                            {p.category && <div className="label-tech text-[10px] text-slate-500">Cat. {p.category}</div>}
                                        </div>
                                        <div className="relative text-right">
                                            <div className="text-scoreboard text-2xl md:text-3xl text-flag-celeste leading-none">
                                                <ScoreCounter target={p.points ?? 0} />
                                            </div>
                                            <div className="label-tech text-[9px] text-slate-500 mt-1">pts</div>
                                        </div>
                                    </motion.li>
                                );
                            })}
                        </ol>
                    </div>
                </section>
            )}

            {/* ════════════════ SPONSORS ════════════════ */}
            {sponsors.length > 0 && (
                <section className="relative py-16 md:py-20">
                    <div className="max-w-7xl mx-auto px-4 md:px-6 mb-8 flex items-center gap-4">
                        <span className="label-tech text-[11px] text-slate-500 shrink-0">Nos acompañan</span>
                        <span className="flex-1 h-px bg-white/10" />
                    </div>
                    <div className="relative flex overflow-hidden">
                        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-flag-navy to-transparent z-10 pointer-events-none" />
                        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-flag-navy to-transparent z-10 pointer-events-none" />
                        <div className="flex animate-marquee whitespace-nowrap">
                            {[1, 2, 3, 4].map((k) => (
                                <div key={k} className="flex" aria-hidden={k > 1}>
                                    {sponsors.map((s, idx) => {
                                        const logo = (
                                            <Image
                                                src={s.imageUrl}
                                                alt={s.name}
                                                fill
                                                className="object-contain grayscale brightness-200 opacity-40 hover:grayscale-0 hover:brightness-100 hover:opacity-100 transition-all duration-500"
                                                sizes="(max-width: 768px) 140px, 200px"
                                            />
                                        );
                                        return (
                                            <div key={`${k}-${s.id}-${idx}`} className="relative mx-8 md:mx-12 h-14 w-36 md:h-16 md:w-48 shrink-0">
                                                {s.link ? (
                                                    <Link href={s.link} target="_blank" rel="noopener noreferrer" tabIndex={k > 1 ? -1 : undefined}>
                                                        {logo}
                                                    </Link>
                                                ) : (
                                                    logo
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ════════════════ CTA FINAL ════════════════ */}
            <section ref={ctaRef} className="relative bg-flag-azul text-white overflow-hidden py-20 md:py-28">
                <Image src="/img/landing/remate3.jpg" alt="" fill sizes="100vw" className="object-cover object-[center_30%] opacity-35 mix-blend-luminosity" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-flag-azul via-flag-azul/85 to-flag-azul/40" />
                <div aria-hidden className="absolute inset-0 bg-stripes text-white/[0.03]" />
                <div aria-hidden className="absolute inset-x-0 top-0 h-[6px] bg-[linear-gradient(180deg,#74acdf_0_50%,#ffffff_50%)]" />
                <motion.div
                    aria-hidden
                    style={{ x: ctaX }}
                    className="relative heading-sport text-[30vw] md:text-[22vw] leading-[0.8] whitespace-nowrap select-none text-transparent [-webkit-text-stroke:2px_rgba(169,205,238,0.55)]"
                >
                    ¿JUGAMOS? ¿JUGAMOS?
                </motion.div>

                <div className="relative max-w-7xl mx-auto px-4 md:px-6 mt-10 md:mt-14 flex flex-col md:flex-row md:items-end justify-between gap-10">
                    <div className="max-w-lg">
                        <h2 className="heading-sport text-4xl md:text-5xl mb-4">Tu próximo torneo empieza acá</h2>
                        <p className="text-flag-celeste-light text-base md:text-lg leading-relaxed font-medium">
                            Creá tu cuenta, sumate a la comunidad y empezá a sumar puntos. Gratis para jugadores.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <MagneticLink
                            href="/register"
                            className="group clip-notch inline-flex items-center gap-3 bg-flag-rojo text-white px-8 py-5 label-tech text-sm font-bold shadow-[0_10px_40px_-10px_rgba(205,46,58,0.8)] hover:bg-white hover:text-flag-rojo transition-colors"
                        >
                            Crear cuenta
                            <ArrowUpRight className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
                        </MagneticLink>
                        <Link href="/login" className="label-tech text-xs text-white underline underline-offset-4 decoration-2 hover:decoration-white/40">
                            Ya tengo cuenta
                        </Link>
                        <a
                            href="https://www.instagram.com/acaparg?igsh=NW12OWR0OWcwcHky"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram de A.C.A.P."
                            className="w-12 h-12 flex items-center justify-center border-2 border-white hover:bg-white hover:text-flag-azul transition-colors"
                        >
                            <Instagram className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
