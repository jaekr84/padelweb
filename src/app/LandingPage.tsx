"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Trophy, Star, Users, MapPin, Activity, LayoutGrid, ArrowRight, Zap } from "lucide-react";

export default function LandingPage({
    tournamentCount = 50,
    playerCount = 300
}: {
    tournamentCount?: number;
    playerCount?: number;
}) {
    const { isSignedIn, isLoaded } = useAuth();

    return (
        <div className="min-h-screen bg-[#090A0F] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">

            {/* ── AMBIENT GLOWS (Sincronizado con la App) ── */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />
            </div>

            {/* ── GRID PATTERN ── */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-1" />

            {/* ── NAV (Floating Glass) ── */}
            <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center p-4 md:p-6">
                <nav className="flex items-center justify-between w-full max-w-[1200px] h-16 md:h-20 px-4 md:px-8 bg-black/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] shadow-2xl">
                    <div className="flex items-center gap-3">
                        <img
                            src="/img/stickers 1.jpg"
                            alt="Logo A.C.A.P."
                            className="h-10 w-10 md:h-12 md:w-12 rounded-full border border-white/10 shadow-lg object-cover"
                        />
                        <div className="flex flex-col leading-none">
                            <span className="text-[0.45rem] md:text-[0.6rem] font-black tracking-[0.2em] uppercase text-indigo-400 opacity-80">Asociación Coreana Argentina</span>
                            <span className="text-[1.4rem] md:text-[1.8rem] font-black tracking-tighter italic uppercase text-white">A.C.A.P.</span>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-10">
                        {['Torneos', 'Ranking', 'Instructores', 'Centros'].map((item) => (
                            <a
                                key={item}
                                href={`#${item.toLowerCase()}`}
                                className="text-sm font-bold tracking-widest uppercase text-slate-400 hover:text-white transition-colors tracking-widest no-underline"
                            >
                                {item}
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        {!isLoaded ? null : isSignedIn ? (
                            <Link href="/tournaments" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2 group">
                                Entrar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        ) : (
                            <>
                                <Link href="/sign-in" className="hidden md:block text-slate-300 hover:text-white text-xs font-black uppercase tracking-widest no-underline px-4">Entrar</Link>
                                <Link href="/sign-up" className="bg-white text-black px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl">Unirse</Link>
                            </>
                        )}
                    </div>
                </nav>
            </div>

            {/* ── HERO SECTION ── */}
            <section className="relative pt-32 md:pt-48 pb-20 px-6 max-w-[1400px] mx-auto z-10">
                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                    <div className="flex-1 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 py-2 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 animate-fade-in">
                            <Zap className="w-3 h-3 fill-current" /> Comunidad Oficial · Buenos Aires
                        </div>

                        <h1 className="text-[clamp(3rem,10vw,5rem)] md:text-[clamp(5rem,10vw,8.5rem)] font-black leading-[0.8] tracking-[-0.04em] uppercase italic mb-8">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-red-500">A.C.A.P.</span>
                            <span className="text-white block text-lg md:text-2xl tracking-normal normal-case not-italic font-bold opacity-70 mb-1 mt-1 leading-tight">Asociación Coreana Argentina de Padel</span>

                        </h1>

                        <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed max-w-2xl lg:m-0 mx-auto mb-10">
                            La plataforma definitiva de la <span className="text-white font-bold">A.C.A.P.</span> Gestiona torneos, escala en el ranking oficial y conecta con la comunidad más grande de Buenos Aires.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                            {!isLoaded ? null : isSignedIn ? (
                                <Link href="/tournaments" className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-5 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all hover:scale-105">
                                    Ir al Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link href="/sign-up" className="w-full sm:w-auto bg-white text-black px-10 py-5 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] shadow-white/10 hover:bg-slate-200 transition-all hover:scale-105 flex items-center justify-center gap-3">
                                        Empieza Ahora <ArrowRight className="w-5 h-5" />
                                    </Link>
                                    <Link href="/directory" className="w-full sm:w-auto bg-slate-900/50 backdrop-blur border border-slate-800 text-white px-10 py-5 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all">
                                        Ver Directorio
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        {/* Featured UI Preview / Logo Glow */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-red-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                            <div className="relative flex items-center justify-center bg-white rounded-full p-2 border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(79,70,229,0.2)]">
                                <img
                                    src="/img/stickers 1.jpg"
                                    alt="A.C.A.P."
                                    className="w-[280px] h-[280px] md:w-[450px] md:h-[450px] object-cover rounded-full"
                                />
                            </div>

                            {/* Floating Stats */}
                            <div className="absolute -top-6 -right-6 bg-slate-900/80 backdrop-blur border border-slate-700 p-6 rounded-3xl shadow-2xl animate-bounce-slow text-center min-w-[120px]">
                                <div className="text-2xl font-black text-indigo-400">+{tournamentCount}</div>
                                <div className="text-[10px] font-black uppercase text-slate-500">Torneos</div>
                            </div>
                            <div className="absolute bottom-10 -left-10 bg-slate-900/80 backdrop-blur border border-slate-700 p-6 rounded-3xl shadow-2xl animate-float-delayed text-center min-w-[120px]">
                                <div className="text-2xl font-black text-red-400">+{playerCount}</div>
                                <div className="text-[10px] font-black uppercase text-slate-500">Jugadores</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA / FINALE ── */}
            {/* <section className="py-20 px-6 relative z-10 text-center">
                <div className="max-w-4xl mx-auto bg-gradient-to-b from-slate-900 to-transparent border border-white/5 rounded-[3rem] p-12 md:p-20 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

                    <h2 className="text-4xl md:text-6xl font-black uppercase italic mb-8 leading-tight">
                        ¿Listo para entrar a la <span className="text-indigo-500">pista</span>?
                    </h2>

                    <Link href="/sign-up" className="inline-flex items-center gap-3 bg-white text-black px-12 py-6 rounded-[1.8rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-200 transition-all hover:scale-105 active:scale-95">
                        Registrarse Ahora <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>
 */}
            {/* ── FOOTER (Unified) ── */}
            <footer className="py-12 px-6 border-t border-white/5 relative z-10">
                <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-3">
                        <img src="/img/stickers 1.jpg" alt="A.C.A.P." className="w-8 h-8 rounded-full grayscale opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                            © {new Date().getFullYear()} Asociación Coreana Argentina de Pádel
                        </span>
                    </div>

                    <div className="flex gap-8">
                        {['Privacidad', 'Términos', 'Contacto'].map(item => (
                            <a key={item} href="#" className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-indigo-400 no-underline transition-colors">{item}</a>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
}
