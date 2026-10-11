"use client";

import Image from "next/image";
import Link from "next/link";
import {
    animate,
    motion,
    useInView,
    useMotionValue,
    useMotionValueEvent,
    useScroll,
    useSpring,
    useTransform,
    useVelocity,
} from "framer-motion";
import { ArrowUpRight, ArrowRight, Trophy, Star, Users, MapPin, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Footer } from "@/components/landing/Footer";
import { TrajectoryCourt, type Shot } from "@/components/landing/telemetry/TrajectoryCourt";
import { HeatCourt } from "@/components/landing/telemetry/HeatCourt";
import type { LandingData } from "@/lib/landing";

// Paleta: grafito, infrarrojo y hielo, con el volt de la marca para la pelota.
const IR = "#ff4d1f";
const ICE = "#dbe7ff";
const LOGO = "/img/acap logo svg blanco sombra.svg";
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const TYPE_LABEL: Record<string, string> = { americano: "AMERICANO", round_robin: "ROBIN", desafio: "DESAFÍO" };
const SHOTS = ["SAQUE", "VOLEA", "BANDEJA", "VÍBORA", "SMASH", "CHIQUITA", "GLOBO", "REMATE POR 3", "CONTRAPARED"];

const CSS = `
.tele-root { --ir: ${IR}; --ice: ${ICE}; }
.tele-dots { background-image: radial-gradient(rgba(219,231,255,0.09) 1px, transparent 1px); background-size: 22px 22px; }
.tele-outline { color: transparent; -webkit-text-stroke: 1.5px var(--ice); }
@media (min-width: 768px) { .tele-outline { -webkit-text-stroke-width: 2px; } }
.tele-marquee { animation: tele-marquee 28s linear infinite; }
.tele-marquee-rev { animation: tele-marquee 34s linear infinite reverse; }
@keyframes tele-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.tele-wave { stroke-dasharray: 6 4; animation: tele-wave 1.4s linear infinite; }
@keyframes tele-wave { to { stroke-dashoffset: -20; } }
.tele-scan { background: linear-gradient(to bottom, transparent, rgba(255,77,31,0.22), transparent); animation: tele-scan 5s cubic-bezier(.6,0,.4,1) infinite; }
@keyframes tele-scan { from { transform: translateY(-100%); } to { transform: translateY(100vh); } }
.tele-blink { animation: tele-blink 1.1s steps(1) infinite; }
@keyframes tele-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .tele-marquee, .tele-marquee-rev, .tele-wave, .tele-scan, .tele-blink { animation: none !important; }
}
`;

// La velocidad del scroll inclina la tipografía: frenás y se endereza.
function useScrollSkew(max = 10) {
    const { scrollY } = useScroll();
    const v = useVelocity(scrollY);
    const s = useSpring(v, { damping: 40, stiffness: 300 });
    return useTransform(s, [-2500, 0, 2500], [max, 0, -max], { clamp: true });
}

function Count({ to }: { to: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true });
    const mv = useMotionValue(0);
    const text = useTransform(mv, (v) => Math.round(v).toLocaleString("es-AR"));
    useEffect(() => {
        if (!inView) return;
        const c = animate(mv, to, { duration: 1.8, ease: EASE_OUT });
        return () => c.stop();
    }, [inView, to, mv]);
    return <motion.span ref={ref}>{text}</motion.span>;
}

function Tag({ children, color = IR }: { children: React.ReactNode; color?: string }) {
    return (
        <span className="label-tech text-[10px] md:text-[11px] flex items-center gap-2.5" style={{ color }}>
            <span className="w-1.5 h-1.5" style={{ background: color }} />
            {children}
        </span>
    );
}

function Nav() {
    const { scrollY } = useScroll();
    const [scrolled, setScrolled] = useState(false);
    useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));
    const links = [
        { href: "/ranking", label: "Ranking" },
        { href: "/tournaments", label: "Torneos" },
        { href: "/directory", label: "Clubes" },
        { href: "/marketplace", label: "Marketplace" },
    ];
    return (
        <nav className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${scrolled ? "bg-[#07080a]/85 backdrop-blur-xl border-b border-white/10" : "border-b border-transparent"}`}>
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
                <Link href="/" className="flex items-center gap-2.5 shrink-0">
                    <span className="relative w-9 h-9">
                        <Image src={LOGO} alt="" fill className="object-contain" priority sizes="36px" />
                    </span>
                    <span className="heading-sport text-xl text-white">A.C.A.P</span>
                    <span className="hidden sm:inline label-tech text-[9px] text-[var(--ir)] border border-[var(--ir)]/40 px-1.5 py-0.5">TLM</span>
                </Link>
                <div className="hidden lg:flex items-center gap-1">
                    {links.map((l, i) => (
                        <Link key={l.href} href={l.href} className="group label-tech text-[11px] text-slate-400 hover:text-white px-3 py-2 transition-colors">
                            <span className="text-[var(--ir)] opacity-60 group-hover:opacity-100 mr-1.5">0{i + 1}</span>
                            {l.label}
                        </Link>
                    ))}
                </div>
                <div className="flex items-center gap-3 md:gap-5">
                    <Link href="/login" className="label-tech text-[11px] text-slate-300 hover:text-white transition-colors">
                        Entrar
                    </Link>
                    <Link href="/register" className="bg-[var(--ir)] text-black px-4 md:px-5 py-2.5 label-tech text-[11px] font-bold hover:bg-white transition-colors">
                        Unite
                    </Link>
                </div>
            </div>
        </nav>
    );
}

// ── HERO: cancha en vivo ──
function Hero({ tournamentCount, playerCount, clubCount }: Pick<LandingData, "tournamentCount" | "playerCount" | "clubCount">) {
    const [shot, setShot] = useState<Shot | null>(null);
    const [shotN, setShotN] = useState(0);
    const skew = useScrollSkew(8);
    const onShot = (s: Shot) => {
        setShot(s);
        setShotN((n) => n + 1);
    };

    return (
        <section className="relative min-h-[100svh] pt-24 md:pt-28 pb-10 overflow-hidden">
            <div aria-hidden className="absolute inset-0 tele-dots" />
            <div aria-hidden className="absolute -top-40 right-[-10%] w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] rounded-full bg-[radial-gradient(circle,rgba(255,77,31,0.22),transparent_65%)]" />
            <div aria-hidden className="absolute inset-x-0 top-0 h-40 tele-scan pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:min-h-[calc(100svh-15rem)] flex flex-col lg:justify-center">
                <div className="relative z-10 lg:pointer-events-none [&_a]:pointer-events-auto">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                        <Tag>
                            SISTEMA DE TELEMETRÍA · EN VIVO <span className="tele-blink">_</span>
                        </Tag>
                    </motion.div>
                    <motion.h1 style={{ skewX: skew }} className="heading-sport text-white mt-6 leading-[0.86] text-[13.2vw] sm:text-[12vw] lg:text-[8.2vw] 2xl:text-[9.5rem] origin-left">
                        {["Jugá", "en otra", "frecuencia"].map((w, i) => (
                            <span key={w} className="block overflow-hidden">
                                <motion.span
                                    initial={{ y: "105%" }}
                                    animate={{ y: 0 }}
                                    transition={{ duration: 0.9, delay: 0.15 + i * 0.1, ease: EASE_OUT }}
                                    className={`block ${i === 1 ? "tele-outline" : i === 2 ? "text-[var(--ir)]" : ""}`}
                                >
                                    {w}
                                </motion.span>
                            </span>
                        ))}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.55, ease: EASE_OUT }}
                        className="text-slate-400 max-w-md mt-6 text-base md:text-lg leading-relaxed"
                    >
                        Torneos, ranking y estadísticas de la Asociación Coreana Argentina de Pádel. Cada punto, medido.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.65, ease: EASE_OUT }}
                        className="mt-8 flex flex-wrap items-center gap-4"
                    >
                        <Link href="/register" className="group relative inline-flex items-center gap-3 bg-[var(--ir)] text-black px-7 py-4 label-tech text-xs font-bold overflow-hidden">
                            <span className="absolute inset-0 bg-white -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
                            <span className="relative">Crear mi perfil</span>
                            <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link href="/tournaments" className="label-tech text-xs text-white border-b border-white/30 hover:border-[var(--ir)] hover:text-[var(--ir)] pb-1 transition-colors">
                            Ver torneos
                        </Link>
                    </motion.div>
                </div>

                {/* Cancha + HUD */}
                <div className="relative mt-6 lg:mt-0 lg:absolute lg:right-[-3vw] lg:top-1/2 lg:-translate-y-1/2 lg:w-[60%] xl:w-[58%]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2, delay: 0.2, ease: EASE_OUT }}
                    className="relative"
                >
                    <div className="relative aspect-[4/3] lg:aspect-[5/4] -mx-4 md:mx-0">
                        <TrajectoryCourt onShot={onShot} />
                    </div>
                    <div className="absolute top-0 left-0 md:left-2 pointer-events-none">
                        <div className="label-tech text-[9px] text-slate-500">ÚLTIMO TIRO</div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <motion.span key={shotN} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-scoreboard text-4xl md:text-5xl text-white leading-none">
                                {shot?.speed ?? "--"}
                            </motion.span>
                            <span className="label-tech text-[10px] text-slate-500">KM/H</span>
                        </div>
                        <div className="label-tech text-[11px] text-[var(--ir)] mt-1">{shot?.kind ?? "···"}</div>
                    </div>
                    <div className="absolute top-0 right-0 md:right-2 lg:right-[5vw] text-right pointer-events-none">
                        <div className="label-tech text-[9px] text-slate-500">REPLAY</div>
                        <div className="label-tech text-[11px] text-[#d4ff3f] mt-1">SLOW-MO 0.5×</div>
                        <div className="label-tech text-[9px] text-slate-600 mt-1">CAM · 20×10 M</div>
                    </div>
                </motion.div>
                </div>
            </div>

            {/* Lecturas reales */}
            <div className="relative max-w-7xl mx-auto px-4 md:px-6 mt-6 lg:mt-2">
                <div className="grid grid-cols-3 border-t border-white/10">
                    {[
                        { label: "Torneos", value: tournamentCount, ch: "CH.01" },
                        { label: "Jugadores", value: playerCount, ch: "CH.02" },
                        { label: "Clubes", value: clubCount, ch: "CH.03" },
                    ].map((s, i) => (
                        <div key={s.label} className={`pt-5 ${i ? "pl-4 md:pl-8 border-l border-white/10" : ""}`}>
                            <div className="label-tech text-[9px] text-slate-600">{s.ch}</div>
                            <div className="text-scoreboard text-3xl md:text-5xl text-white mt-1">
                                <Count to={s.value} />
                            </div>
                            <div className="label-tech text-[10px] md:text-[11px] text-slate-400 mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ── Cinta de golpes ──
function ShotTicker() {
    const skew = useScrollSkew(14);
    const row = [...SHOTS, ...SHOTS];
    return (
        <section aria-hidden className="relative py-6 md:py-10 overflow-hidden">
            <motion.div style={{ skewY: skew }} className="-rotate-2 bg-[var(--ir)] py-3 md:py-4">
                <div className="flex w-max tele-marquee">
                    {row.map((s, i) => (
                        <span key={i} className="heading-sport text-3xl md:text-5xl text-black px-6 flex items-center gap-6">
                            {s} <span className="w-3 h-3 md:w-4 md:h-4 bg-black rotate-45" />
                        </span>
                    ))}
                </div>
            </motion.div>
            <motion.div style={{ skewY: skew }} className="rotate-1 -mt-2 border-y border-white/10 bg-[#07080a] py-2.5">
                <div className="flex w-max tele-marquee-rev">
                    {row.map((s, i) => (
                        <span key={i} className="label-tech text-xs md:text-sm text-slate-500 px-5">
                            {String(i % SHOTS.length).padStart(2, "0")} / {s}
                        </span>
                    ))}
                </div>
            </motion.div>
        </section>
    );
}

// ── Mapa térmico ──
function HeatSection() {
    const coverage = useRef<HTMLSpanElement>(null);
    const skew = useScrollSkew(6);
    return (
        <section className="relative py-20 md:py-32">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
                <div className="grid lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 0.8, ease: EASE_OUT }}
                    >
                        <Tag>Huella térmica</Tag>
                        <motion.h2 style={{ skewX: skew }} className="heading-sport text-5xl md:text-7xl text-white mt-5 leading-[0.9] origin-left">
                            Cada partido
                            <br />
                            <span className="tele-outline">deja</span> <span className="text-[var(--ir)]">calor.</span>
                        </motion.h2>
                        <p className="text-slate-400 mt-6 max-w-sm leading-relaxed">
                            Resultados, rachas, mejores parejas y tiempos de juego. Tu perfil guarda todo lo que pasa en la cancha. Pasá el cursor y jugá.
                        </p>
                        <div className="mt-8 flex items-end gap-6">
                            <div>
                                <div className="label-tech text-[9px] text-slate-600">COBERTURA</div>
                                <div className="text-scoreboard text-5xl text-white leading-none mt-1">
                                    <span ref={coverage}>00</span>
                                    <span className="text-[var(--ir)] text-3xl">%</span>
                                </div>
                            </div>
                            <Link href="/register" className="group label-tech text-[11px] text-white border border-white/20 hover:border-[var(--ir)] hover:text-[var(--ir)] px-5 py-3 inline-flex items-center gap-2 transition-colors">
                                Ver mis stats <ArrowUpRight className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, rotateX: 35, y: 40 }}
                        whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 1.1, ease: EASE_OUT }}
                        style={{ transformPerspective: 1200 }}
                        className="relative border border-white/10 bg-black/40 p-3 md:p-5"
                    >
                        <div className="flex items-center justify-between mb-3 label-tech text-[9px] text-slate-500">
                            <span>VISTA CENITAL · 64×32 SENSORES</span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ir)] tele-blink" /> REC
                            </span>
                        </div>
                        <HeatCourt coverageRef={coverage} />
                        <div className="mt-3 flex items-center gap-3">
                            <span className="label-tech text-[9px] text-slate-600">FRÍO</span>
                            <span className="flex-1 h-1.5 bg-[linear-gradient(90deg,#460c78,#d21446,#ff4d1f,#ffcd28,#ffffeb)]" />
                            <span className="label-tech text-[9px] text-slate-600">CALIENTE</span>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

// ── Módulos como sensores ──
const MODULES = [
    { ch: "S-01", icon: Trophy, title: "Torneos", desc: "Inscripción online, americanos, robin y llaves que se arman solas.", href: "/tournaments", f: [1.2, 3.1] },
    { ch: "S-02", icon: Star, title: "Ranking", desc: "Puntos oficiales, actualizados después de cada torneo.", href: "/ranking", f: [0.7, 4.3] },
    { ch: "S-03", icon: Users, title: "Comunidad", desc: "Parejas, rivales y logros de tu nivel.", href: "/register", f: [2.1, 5.2] },
    { ch: "S-04", icon: MapPin, title: "Clubes", desc: "Sedes y canchas de toda la red.", href: "/directory", f: [1.6, 2.4] },
    { ch: "S-05", icon: ShoppingBag, title: "Marketplace", desc: "Paletas, calzado y accesorios entre jugadores.", href: "/marketplace", f: [0.9, 6.1] },
];

function wavePath([a, b]: number[]) {
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
        const x = (i / 60) * 200;
        const y = 20 + Math.sin(i * a * 0.2) * 9 + Math.sin(i * b * 0.2) * 5;
        pts.push(`${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(" ");
}

function SensorCard({ m, i }: { m: (typeof MODULES)[number]; i: number }) {
    const Icon = m.icon;
    const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        e.currentTarget.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, delay: i * 0.07, ease: EASE_OUT }}
            className={i < 2 ? "md:col-span-3" : "md:col-span-2"}
        >
            <Link
                href={m.href}
                onPointerMove={onMove}
                className="group relative block h-full min-h-[260px] border border-white/10 bg-[#0b0d11] p-6 overflow-hidden"
            >
                {/* mancha térmica que sigue al puntero */}
                <span
                    aria-hidden
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: "radial-gradient(320px circle at var(--mx,50%) var(--my,50%), rgba(255,77,31,0.35), rgba(255,77,31,0.06) 45%, transparent 70%)" }}
                />
                <div className="relative flex items-start justify-between">
                    <span className="label-tech text-[10px] text-slate-500 group-hover:text-[var(--ir)] transition-colors">{m.ch}</span>
                    <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-white group-hover:rotate-45 transition-all duration-300" />
                </div>
                <svg aria-hidden viewBox="0 0 200 40" className="relative w-full h-10 mt-6" preserveAspectRatio="none">
                    <path d={wavePath(m.f)} fill="none" stroke="rgba(219,231,255,0.15)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    <path d={wavePath(m.f)} fill="none" stroke={IR} strokeWidth="1.5" className="tele-wave opacity-40 group-hover:opacity-100 transition-opacity" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="relative mt-8 flex items-end gap-4">
                    <Icon className="w-8 h-8 text-[var(--ir)] shrink-0" />
                    <h3 className="heading-sport text-3xl xl:text-4xl text-white leading-none min-w-0 break-words">{m.title}</h3>
                </div>
                <p className="relative text-sm text-slate-400 mt-4 max-w-xs leading-relaxed">{m.desc}</p>
            </Link>
        </motion.div>
    );
}

function Modules() {
    return (
        <section className="relative py-16 md:py-24">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
                <div className="flex items-end justify-between gap-6 mb-10">
                    <div>
                        <Tag color={ICE}>Sensores activos · 05</Tag>
                        <h2 className="heading-sport text-5xl md:text-7xl text-white mt-5 leading-[0.9]">
                            La plataforma
                            <br />
                            <span className="tele-outline">completa</span>
                        </h2>
                    </div>
                </div>
                <div className="grid md:grid-cols-6 gap-px bg-white/10 border border-white/10">
                    {MODULES.map((m, i) => (
                        <SensorCard key={m.ch} m={m} i={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}

// ── Próximos torneos como cuenta regresiva ──
function daysUntil(date: string | null) {
    if (!date) return null;
    const [y, m, d] = date.split("-").map(Number);
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((Date.UTC(y, m - 1, d) - today) / 86400000);
}

function Upcoming({ upcoming }: Pick<LandingData, "upcoming">) {
    if (upcoming.length === 0) return null;
    return (
        <section className="relative py-16 md:py-24">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
                <div className="flex items-end justify-between gap-6 mb-10">
                    <div>
                        <Tag>Próximos eventos</Tag>
                        <h2 className="heading-sport text-5xl md:text-7xl text-white mt-5 leading-[0.9]">
                            Cuenta
                            <br />
                            regresiva
                        </h2>
                    </div>
                    <Link href="/tournaments" className="hidden md:inline-flex items-center gap-2 label-tech text-[11px] text-slate-400 hover:text-[var(--ir)] transition-colors pb-2">
                        Todos los torneos <ArrowUpRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {upcoming.map((t, i) => {
                        const [, m, d] = (t.startDate ?? "").split("-");
                        const left = daysUntil(t.startDate);
                        return (
                            <motion.div
                                key={t.id}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.7, delay: i * 0.08, ease: EASE_OUT }}
                            >
                                <Link href={`/tournaments/${t.id}`} className="group relative flex flex-col h-full border border-white/10 hover:border-[var(--ir)] bg-[#0b0d11] p-5 transition-colors">
                                    <div className="flex items-center justify-between label-tech text-[10px]">
                                        <span className="text-[var(--ir)]">{TYPE_LABEL[t.type] ?? t.type.toUpperCase()}</span>
                                        <span className="text-slate-500">
                                            {d ?? "--"} {m ? MONTHS[Number(m) - 1] : ""}
                                        </span>
                                    </div>
                                    <div className="mt-8 flex items-baseline gap-2">
                                        <span className="label-tech text-sm text-slate-500">T−</span>
                                        <span suppressHydrationWarning className="text-scoreboard text-7xl text-white group-hover:text-[var(--ir)] leading-none transition-colors">
                                            {left === null ? "--" : String(Math.max(0, left)).padStart(2, "0")}
                                        </span>
                                        <span className="label-tech text-[10px] text-slate-500">{left === 1 ? "DÍA" : "DÍAS"}</span>
                                    </div>
                                    {/* barra de proximidad: llena a 30 días */}
                                    <div className="mt-4 h-1 bg-white/10 overflow-hidden">
                                        <motion.div
                                            initial={{ scaleX: 0 }}
                                            whileInView={{ scaleX: left === null ? 0 : Math.max(0.04, 1 - Math.min(left, 30) / 30) }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 1.2, delay: 0.3, ease: EASE_OUT }}
                                            className="h-full bg-[var(--ir)] origin-left"
                                        />
                                    </div>
                                    <h3 className="heading-sport text-xl text-white mt-6 line-clamp-2">{t.name}</h3>
                                    {(t.clubName || t.location) && (
                                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5 truncate">
                                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate">{[t.clubName, t.location].filter(Boolean).join(" · ")}</span>
                                        </p>
                                    )}
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
                <Link href="/tournaments" className="md:hidden mt-8 inline-flex items-center gap-2 label-tech text-[11px] text-[var(--ir)]">
                    Todos los torneos <ArrowUpRight className="w-4 h-4" />
                </Link>
            </div>
        </section>
    );
}

// ── Ranking con barras LED segmentadas ──
const SEGMENTS = 28;

function Ranking({ topPlayers }: Pick<LandingData, "topPlayers">) {
    const listRef = useRef<HTMLOListElement>(null);
    const inView = useInView(listRef, { once: true, amount: 0.4 });
    if (topPlayers.length === 0) return null;
    const max = Math.max(1, ...topPlayers.map((p) => p.points ?? 0));

    return (
        <section className="relative py-20 md:py-32 border-y border-white/10 bg-[#0b0d11] overflow-hidden">
            <div aria-hidden className="absolute inset-0 tele-dots opacity-60" />
            <div className="relative max-w-7xl mx-auto px-4 md:px-6 grid lg:grid-cols-[1fr_1.6fr] gap-12 lg:gap-16 items-center">
                <div>
                    <Tag color="#d4ff3f">Ranking oficial · señal más fuerte</Tag>
                    <h2 className="heading-sport text-5xl md:text-7xl text-white mt-5 leading-[0.9]">
                        Picos
                        <br />
                        <span className="tele-outline">de</span> <span className="text-[var(--ir)]">rendimiento</span>
                    </h2>
                    <p className="text-slate-400 mt-6 max-w-sm leading-relaxed">Cada torneo suma. ¿Cuánto te falta para entrar en la lectura?</p>
                    <Link href="/ranking" className="group mt-8 inline-flex items-center gap-3 border border-white/20 hover:bg-[var(--ir)] hover:border-[var(--ir)] hover:text-black px-6 py-3.5 label-tech text-xs text-white transition-colors">
                        Ranking completo <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <ol ref={listRef} className="space-y-5">
                    {topPlayers.map((p, i) => {
                        const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "Jugador";
                        const lit = Math.max(2, Math.round(((p.points ?? 0) / max) * SEGMENTS));
                        return (
                            <li key={p.id}>
                                <div className="flex items-baseline justify-between gap-4 mb-2">
                                    <div className="flex items-baseline gap-3 min-w-0">
                                        <span className="label-tech text-[11px] text-slate-500">P{i + 1}</span>
                                        <span className="heading-sport text-lg md:text-2xl text-white truncate">{name}</span>
                                        {p.category && <span className="hidden sm:inline label-tech text-[10px] text-slate-500">CAT {p.category}</span>}
                                    </div>
                                    <span className="text-scoreboard text-xl md:text-2xl text-white shrink-0">
                                        <Count to={p.points ?? 0} />
                                        <span className="label-tech text-[9px] text-slate-500 ml-1">PTS</span>
                                    </span>
                                </div>
                                <div className="flex gap-[3px]">
                                    {Array.from({ length: SEGMENTS }, (_, k) => {
                                        const on = k < lit;
                                        const hot = k >= lit - 3;
                                        return (
                                            <span
                                                key={k}
                                                className="flex-1 h-3 md:h-4 transition-colors duration-200"
                                                style={{
                                                    background: inView && on ? (hot ? IR : i === 0 ? "#d4ff3f" : ICE) : "rgba(255,255,255,0.06)",
                                                    opacity: inView && on && !hot ? 0.35 + (k / lit) * 0.65 : 1,
                                                    transitionDelay: `${i * 90 + k * 22}ms`,
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}

function Sponsors({ sponsors }: Pick<LandingData, "sponsors">) {
    if (sponsors.length === 0) return null;
    return (
        <section className="relative py-16 md:py-20">
            <div className="max-w-7xl mx-auto px-4 md:px-6 mb-8 flex items-center gap-4">
                <span className="label-tech text-[11px] text-slate-500 shrink-0">Nos acompañan</span>
                <span className="flex-1 h-px bg-white/10" />
            </div>
            <div className="relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
                <div className="flex w-max tele-marquee">
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
    );
}

function FinalCta() {
    const ref = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
    const x = useTransform(scrollYProgress, [0, 1], ["10%", "-35%"]);
    return (
        <section ref={ref} className="relative bg-[var(--ir)] text-black overflow-hidden py-20 md:py-28">
            <motion.div aria-hidden style={{ x }} className="absolute top-1/2 -translate-y-1/2 heading-sport text-[28vw] leading-none whitespace-nowrap text-black/[0.07] select-none">
                0.88 M · 20 × 10 · 0.88 M
            </motion.div>
            <div className="relative max-w-7xl mx-auto px-4 md:px-6 grid md:grid-cols-[1.4fr_1fr] gap-10 items-end">
                <h2 className="heading-sport text-6xl md:text-8xl leading-[0.85]">
                    Empezá a
                    <br />
                    medirte.
                </h2>
                <div>
                    <p className="text-base md:text-lg leading-relaxed font-medium text-black/80">
                        Creá tu perfil, anotate al próximo torneo y mirá cómo crece tu curva.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-5">
                        <Link href="/register" className="group inline-flex items-center gap-3 bg-black text-white px-8 py-5 label-tech text-sm font-bold hover:bg-[#1a1d24] transition-colors">
                            Crear cuenta <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link href="/login" className="label-tech text-xs underline underline-offset-4 decoration-2 hover:decoration-black/40">
                            Ya tengo cuenta
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default function TelemetryLanding(data: LandingData) {
    return (
        <div className="tele-root dark relative min-h-screen bg-[#07080a] text-white overflow-x-clip">
            <style>{CSS}</style>
            <Nav />
            <main>
                <Hero tournamentCount={data.tournamentCount} playerCount={data.playerCount} clubCount={data.clubCount} />
                <ShotTicker />
                <HeatSection />
                <Modules />
                <Upcoming upcoming={data.upcoming} />
                <Ranking topPlayers={data.topPlayers} />
                <Sponsors sponsors={data.sponsors} />
                <FinalCta />
            </main>
            <Footer />
        </div>
    );
}
