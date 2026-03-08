"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Trophy, Star, Users, MapPin, Activity, LayoutGrid, ArrowRight, Zap } from "lucide-react";

export default function LandingPage({
    tournamentCount = 50,
    playerCount = 300,
    instructorCount = 20,
    clubCount = 15
}: {
    tournamentCount?: number;
    playerCount?: number;
    instructorCount?: number;
    clubCount?: number;
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
                            className="h-10 w-10 md:h-12 md:w-12 shrink-0 aspect-square rounded-full border border-white/10 shadow-lg object-cover"
                        />
                        <div className="flex flex-col leading-none">
                            <span className="text-[1.4rem] md:text-[1.8rem] font-black tracking-tighter italic uppercase text-white">A.C.A.P.</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isLoaded ? null : isSignedIn ? (
                            <Link href="/tournaments" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2 group">
                                Entrar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        ) : (
                            <>
                                <Link href="/sign-in" className="text-slate-300 hover:text-white text-[10px] md:text-xs font-black uppercase tracking-widest no-underline px-3 md:px-4 transition-all">Entrar</Link>
                                <Link href="/sign-up" className="bg-white text-black px-4 md:px-6 py-2 md:py-2.5 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl">Unirse</Link>
                            </>
                        )}
                    </div>
                </nav>
            </div>

            {/* ── HERO SECTION ── */}
            <section className="relative pt-32 md:pt-48 pb-20 px-6 max-w-[1400px] mx-auto z-10 flex flex-col items-center justify-center text-center">
                {/* ── Logo Central ── */}
                <div className="relative group mb-16">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-red-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                    <div className="relative flex items-center justify-center bg-white rounded-full p-2 border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(79,70,229,0.2)] shrink-0 aspect-square mx-auto">
                        <img
                            src="/img/stickers 1.jpg"
                            alt="A.C.A.P."
                            className="w-[280px] h-[280px] md:w-[580px] md:h-[580px] object-cover rounded-full aspect-square"
                        />
                    </div>
                </div>

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-4 md:grid-cols-4 items-center justify-center md:gap-6 w-full max-w-5xl animate-fade-in-up">
                    {[
                        { label: 'Torneos', value: tournamentCount, color: 'text-indigo-400' },
                        { label: 'Jugadores', value: playerCount, color: 'text-red-400' },
                        { label: 'Profes', value: instructorCount, color: 'text-emerald-400' },
                        { label: 'Centros', value: clubCount, color: 'text-blue-400' }
                    ].map((stat, idx) => (
                        <div
                            key={stat.label}
                            className="bg-slate-900/40 backdrop-blur-xl border border-white/5 md:px-8 md:py-6 rounded-[2rem] transition-all duration-300 hover:border-white/10 hover:bg-slate-900/60 shadow-xl flex flex-col items-center justify-center"
                            style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                            <div className={`text-2xl md:text-4xl font-black mb-1 ${stat.color}`}>
                                +{stat.value}
                            </div>
                            <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── TABS INSPIRED FEATURES ── */}
            <section className=" relative z-10" id="torneos">
                <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-2">
                        <h2 className="text-4xl md:text-6xl font-black uppercase italic italic">Potencia tu Juego</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Todo lo que necesitas en una sola plataforma</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 px-4">
                        {[
                            { title: 'Torneos', icon: Trophy, color: 'text-indigo-400', desc: 'Inscripción online y cuadros en tiempo real.' },
                            { title: 'Ranking', icon: Star, color: 'text-yellow-400', desc: 'Sigue tu evolución y compite por el top 1.' },
                            { title: 'Directorio', icon: MapPin, color: 'text-emerald-400', desc: 'Encuentra los mejores centros y clubes.' },
                            { title: 'Instructores', icon: Activity, color: 'text-red-400', desc: 'Contacta con profes certificados por ACAP.' },
                            { title: 'Comunidad', icon: Users, color: 'text-blue-400', desc: 'Conecta con otros jugadores de tu nivel.' },
                            { title: 'Estadísticas', icon: LayoutGrid, color: 'text-purple-400', desc: 'Análisis detallado de tus partidos.' },
                        ].map((feature, i) => (
                            <div key={i} className="group bg-slate-900/50 hover:bg-indigo-600/5 border border-slate-800 hover:border-indigo-500/30 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] transition-all duration-300 flex flex-col items-center text-center">
                                <feature.icon className={`w-8 h-8 md:w-10 md:h-10 ${feature.color} mb-4 md:mb-6 transition-transform group-hover:scale-110`} />
                                <h3 className="text-sm md:text-xl font-black uppercase italic mb-2 md:mb-3">{feature.title}</h3>
                                <p className="text-slate-500 text-[10px] md:text-sm font-medium leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA / FINALE ── */}
            <section className="py-20 px-6 relative z-10 text-center">
                <div className="max-w-4xl mx-auto bg-gradient-to-b from-slate-900 to-transparent border border-white/5 rounded-[3rem] p-12 md:p-20 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

                    <h2 className="text-4xl md:text-6xl font-black uppercase italic mb-8 leading-tight">
                        ¿Listo para entrar a la <span className="text-indigo-500">cancha</span>?
                    </h2>

                    {!isLoaded ? null : isSignedIn ? (
                        <Link href="/tournaments" className="inline-flex items-center gap-3 bg-indigo-600 text-white px-12 py-6 rounded-[1.8rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/25 hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 group">
                            Entrar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    ) : (
                        <Link href="/sign-up" className="inline-flex items-center gap-3 bg-white text-black px-12 py-6 rounded-[1.8rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-200 transition-all hover:scale-105 active:scale-95">
                            Registrarse Ahora <ArrowRight className="w-5 h-5" />
                        </Link>
                    )}
                </div>
            </section>

            {/* ── FOOTER (Unified) ── */}
            <footer className="py-12 px-6 border-t border-white/5 relative z-10">
                <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-3">
                        <img src="/img/stickers 1.jpg" alt="A.C.A.P." className="w-8 h-8 shrink-0 aspect-square rounded-full grayscale opacity-50" />
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
