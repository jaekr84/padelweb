"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export default function LandingPage() {
    const { isSignedIn, isLoaded } = useAuth();

    return (
        <div className="min-h-screen bg-white text-[#0F172A] font-sans overflow-x-hidden">

            {/* ══ NAV (Floating Pill) ══ */}
            <div className="flex justify-center px-4 pt-4 md:px-8 md:pt-6 absolute top-0 left-0 right-0 z-[200]">
                <nav className="flex items-center justify-between w-full max-w-[1200px] h-16 md:h-[72px] px-4 md:px-6 bg-white/90 backdrop-blur-[20px] border border-black/5 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2">
                        <img
                            src="/img/stickers 1.jpg"
                            alt="Logo ACAP"
                            className="h-9 w-9 md:h-12 md:w-12 object-contain rounded-full bg-transparent"
                        />
                        <div className="flex flex-col leading-[1.2]">
                            <span className="text-[0.5rem] md:text-[0.65rem] font-bold tracking-[0.05em] uppercase text-[#003580]">Asociación Coreana Argentina de</span>
                            <span className="text-[0.9rem] md:text-[1.1rem] font-black tracking-[0.02em] text-[#0F172A]">PÁDEL</span>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-8">
                        <a href="#torneos" className="text-[#0F172A] font-medium transition-colors hover:text-[#003580] no-underline">Torneos</a>
                        <a href="#ranking" className="text-[#0F172A] font-medium transition-colors hover:text-[#003580] no-underline">Ranking</a>
                        <a href="#profes" className="text-[#0F172A] font-medium transition-colors hover:text-[#003580] no-underline">Instructores</a>
                        <a href="#centros" className="text-[#0F172A] font-medium transition-colors hover:text-[#003580] no-underline">Centros</a>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isLoaded ? null : isSignedIn ? (
                            <Link href="/tournaments" className="bg-[#CE1126] text-white no-underline py-2 px-4 md:py-[0.55rem] md:px-[1.4rem] rounded-full text-[0.8rem] md:text-[0.88rem] font-bold transition-all duration-200 tracking-[0.02em] hover:bg-[#a80c1d] hover:-translate-y-[2px] shadow-sm lg:hover:shadow-[0_6px_24px_rgba(206,17,38,0.4)]">Ir a la App</Link>
                        ) : (
                            <>
                                <Link href="/sign-in" className="px-3 py-2 text-[0.8rem] font-semibold no-underline transition-all duration-200 bg-white border rounded-full text-[#0F172A] md:text-[0.88rem] md:px-[1.2rem] border-black/10 hover:border-black/15 hover:bg-[#F8FAFC] hover:text-[#003580] mr-1 md:mr-0">Entrar</Link>
                                <Link href="/sign-up" className="bg-[#CE1126] text-white no-underline py-2 px-4 md:py-[0.55rem] md:px-[1.4rem] rounded-full text-[0.8rem] md:text-[0.88rem] font-bold transition-all duration-200 tracking-[0.02em] hover:bg-[#a80c1d] hover:-translate-y-[2px] shadow-sm lg:hover:shadow-[0_6px_24px_rgba(206,17,38,0.4)]">Registrarse</Link>
                            </>
                        )}
                    </div>
                </nav>
            </div>

            {/* ══ HERO ══ */}
            <section className="relative flex flex-col lg:flex-row items-center text-center lg:text-left pt-[7rem] px-6 pb-12 md:pt-[8rem] md:px-10 lg:pt-[9rem] gap-8 lg:gap-12 max-w-[1280px] mx-auto">
                <div className="relative z-10 w-full lg:flex-[1.1]">
                    <div className="inline-flex items-center gap-[0.4rem] bg-[#003580]/5 border border-[#003580]/10 text-[#003580] py-[0.3rem] px-[0.8rem] rounded-full text-[0.65rem] font-bold tracking-[0.05em] uppercase mb-4">
                        🇰🇷 🇦🇷 &nbsp; Comunidad Oficial · Buenos Aires
                    </div>
                    <div className="text-[1.1rem] md:text-[1.4rem] font-bold tracking-[0.03em] text-[#003580] mb-2">Asociación Coreana Argentina de</div>
                    <h1 className="text-[clamp(4.5rem,18vw,6rem)] md:text-[clamp(6.5rem,12vw,9.5rem)] font-black leading-[0.9] tracking-[-0.04em] text-[#CE1126] mb-5 pt-1">
                        PÁDEL
                    </h1>
                    <p className="text-[0.95rem] md:text-[1.05rem] leading-[1.6] text-[#64748B] max-w-full lg:m-0 mb-8 mx-auto">
                        La plataforma oficial de la Asociación donde podés inscribirte a torneos,
                        seguir el ranking en tiempo real, encontrar instructores certificados
                        y explorar los mejores centros de pádel.
                    </p>
                    <div className="flex flex-col md:flex-row items-center lg:justify-start justify-center gap-4 w-full mt-6">
                        {!isLoaded ? null : isSignedIn ? (
                            <Link href="/tournaments" className="bg-[#CE1126] text-white no-underline py-[0.8rem] px-6 rounded-lg text-[0.9rem] font-bold tracking-[0.02em] transition-all duration-200 shadow-[0_4px_16px_rgba(206,17,38,0.3)] flex items-center justify-center gap-2 w-full md:w-auto max-w-[300px] hover:bg-[#a80c1d] lg:hover:-translate-y-[2px] lg:hover:shadow-[0_6px_24px_rgba(206,17,38,0.4)]">
                                Ir a la App →
                            </Link>
                        ) : (
                            <>
                                <Link href="/sign-in" className="bg-white text-[#0F172A] border border-black/10 no-underline py-[0.8rem] px-6 rounded-lg text-[0.9rem] font-bold tracking-[0.02em] transition-all duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.05)] flex items-center justify-center gap-2 w-full md:w-auto max-w-[300px] hover:border-black/15 hover:bg-[#F8FAFC] hover:text-[#003580] lg:hover:-translate-y-[2px] lg:hover:shadow-[0_6px_24px_rgba(0,0,0,0.08)]">
                                    Iniciar Sesión
                                </Link>
                                <Link href="/sign-up" className="bg-[#CE1126] text-white no-underline py-[0.8rem] px-6 rounded-lg text-[0.9rem] font-bold tracking-[0.02em] transition-all duration-200 shadow-[0_4px_16px_rgba(206,17,38,0.3)] flex items-center justify-center gap-2 w-full md:w-auto max-w-[300px] hover:bg-[#a80c1d] lg:hover:-translate-y-[2px] lg:hover:shadow-[0_6px_24px_rgba(206,17,38,0.4)]">
                                    Registrarse Gratis →
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14 w-full lg:flex-[1.3] mt-8 lg:mt-0">
                    <div className="relative flex items-center justify-center before:absolute before:-inset-[20px] lg:before:-inset-[30px] before:rounded-full before:bg-[radial-gradient(circle,rgba(0,174,239,0.15)_0%,transparent_60%)] before:animate-[pulseGlow_4s_ease-in-out_infinite] before:-z-10">
                        <img
                            src="/img/stickers 1.jpg"
                            alt="Asociación Coreana Argentina de Pádel"
                            className="w-[220px] h-[220px] md:w-[300px] md:h-[300px] lg:w-[380px] lg:h-[380px] object-contain bg-transparent"
                        />
                    </div>

                    {/* Stats Grid exactly next to logo like UI mockup */}
                    <div className="grid grid-cols-2 gap-3 w-full max-w-[400px] lg:w-auto">
                        <div className="bg-white border border-black/10 border-t-[3px] border-t-[#00AEEF] rounded-xl py-4 px-2 text-center flex flex-col justify-center shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-all duration-200 lg:hover:-translate-y-[2px] lg:hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
                            <div className="text-[1.8rem] md:text-[2.2rem] font-black text-[#003580] leading-none mb-1">+50</div>
                            <div className="text-[0.65rem] md:text-[0.75rem] uppercase font-bold tracking-[0.05em] text-[#64748B]">Torneos</div>
                        </div>
                        <div className="bg-white border border-black/10 border-t-[3px] border-t-[#00AEEF] rounded-xl py-4 px-2 text-center flex flex-col justify-center shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-all duration-200 lg:hover:-translate-y-[2px] lg:hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
                            <div className="text-[1.8rem] md:text-[2.2rem] font-black text-[#003580] leading-none mb-1">+300</div>
                            <div className="text-[0.65rem] md:text-[0.75rem] uppercase font-bold tracking-[0.05em] text-[#64748B]">Jugadores</div>
                        </div>
                        <div className="bg-white border border-black/10 border-t-[3px] border-t-[#00AEEF] rounded-xl py-4 px-2 text-center flex flex-col justify-center shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-all duration-200 lg:hover:-translate-y-[2px] lg:hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
                            <div className="text-[1.8rem] md:text-[2.2rem] font-black text-[#003580] leading-none mb-1">+15</div>
                            <div className="text-[0.65rem] md:text-[0.75rem] uppercase font-bold tracking-[0.05em] text-[#64748B]">Centros</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ DIVIDER ══ */}
            <div className="h-1 w-full bg-gradient-to-r from-[#CE1126] to-[#00AEEF]" />

            {/* ══ FEATURES ══ */}
            <section className="py-12 px-6 bg-[#F8FAFC] md:py-16 md:px-10" id="torneos">
                <div className="text-center mb-10">
                    <p className="text-[0.75rem] font-extrabold tracking-[0.1em] uppercase text-[#CE1126] mb-2">Features</p>
                    <h2 className="text-[1.8rem] md:text-[2.2rem] font-extrabold tracking-[-0.02em] text-[#003580]">¿Qué podés hacer?</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-[960px] mx-auto">
                    <div className="bg-white border border-black/5 border-t-[3px] border-t-transparent rounded-xl py-5 px-6 flex items-center gap-4 transition-all duration-200 shadow-[0_4px_6px_rgba(0,0,0,0.02)] lg:hover:bg-white lg:hover:-translate-y-[2px] lg:hover:border-t-[#00AEEF] lg:hover:shadow-[0_10px_20px_rgba(0,0,0,0.06)]" id="ranking">
                        <div className="text-2xl w-10 h-10 flex items-center justify-center bg-[#F8FAFC] rounded-[10px] shrink-0">🏆</div>
                        <div className="">
                            <h3 className="text-base font-bold mb-1 text-[#0F172A]">Torneos Oficiales</h3>
                        </div>
                    </div>

                    <div className="bg-white border border-black/5 border-t-[3px] border-t-transparent rounded-xl py-5 px-6 flex items-center gap-4 transition-all duration-200 shadow-[0_4px_6px_rgba(0,0,0,0.02)] lg:hover:bg-white lg:hover:-translate-y-[2px] lg:hover:border-t-[#00AEEF] lg:hover:shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                        <div className="text-2xl w-10 h-10 flex items-center justify-center bg-[#F8FAFC] rounded-[10px] shrink-0">⭐</div>
                        <div className="">
                            <h3 className="text-base font-bold mb-1 text-[#0F172A]">Ranking Federado</h3>
                        </div>
                    </div>

                    <div className="bg-white border border-black/5 border-t-[3px] border-t-transparent rounded-xl py-5 px-6 flex items-center gap-4 transition-all duration-200 shadow-[0_4px_6px_rgba(0,0,0,0.02)] lg:hover:bg-white lg:hover:-translate-y-[2px] lg:hover:border-t-[#00AEEF] lg:hover:shadow-[0_10px_20px_rgba(0,0,0,0.06)]" id="profes">
                        <div className="text-2xl w-10 h-10 flex items-center justify-center bg-[#F8FAFC] rounded-[10px] shrink-0">🎓</div>
                        <div className="">
                            <h3 className="text-base font-bold mb-1 text-[#0F172A]">Instructores Certificados</h3>
                        </div>
                    </div>

                    <div className="bg-white border border-black/5 border-t-[3px] border-t-transparent rounded-xl py-5 px-6 flex items-center gap-4 transition-all duration-200 shadow-[0_4px_6px_rgba(0,0,0,0.02)] lg:hover:bg-white lg:hover:-translate-y-[2px] lg:hover:border-t-[#00AEEF] lg:hover:shadow-[0_10px_20px_rgba(0,0,0,0.06)]" id="centros">
                        <div className="text-2xl w-10 h-10 flex items-center justify-center bg-[#F8FAFC] rounded-[10px] shrink-0">🏟️</div>
                        <div className="">
                            <h3 className="text-base font-bold mb-1 text-[#0F172A]">Centros de Pádel</h3>
                        </div>
                    </div>

                    <div className="bg-white border border-black/5 border-t-[3px] border-t-transparent rounded-xl py-5 px-6 flex items-center gap-4 transition-all duration-200 shadow-[0_4px_6px_rgba(0,0,0,0.02)] lg:hover:bg-white lg:hover:-translate-y-[2px] lg:hover:border-t-[#00AEEF] lg:hover:shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                        <div className="text-2xl w-10 h-10 flex items-center justify-center bg-[#F8FAFC] rounded-[10px] shrink-0">📊</div>
                        <div className="">
                            <h3 className="text-base font-bold mb-1 text-[#0F172A]">Estadísticas Personales</h3>
                        </div>
                    </div>

                    <div className="bg-white border border-black/5 border-t-[3px] border-t-transparent rounded-xl py-5 px-6 flex items-center gap-4 transition-all duration-200 shadow-[0_4px_6px_rgba(0,0,0,0.02)] lg:hover:bg-white lg:hover:-translate-y-[2px] lg:hover:border-t-[#00AEEF] lg:hover:shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                        <div className="text-2xl w-10 h-10 flex items-center justify-center bg-[#F8FAFC] rounded-[10px] shrink-0">🗂️</div>
                        <div className="">
                            <h3 className="text-base font-bold mb-1 text-[#0F172A]">Directorio Comunitario</h3>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ CTA ══ */}
            <section className="px-6 pb-16 md:pb-20 bg-white">
                <div className="max-w-[1000px] mx-auto bg-[#F8FAFC] border border-black/10 border-t-4 border-t-[#003580] rounded-2xl p-10 md:p-12 lg:p-16 text-center shadow-[0_12px_24px_rgba(0,0,0,0.04)]">
                    <h2 className="text-[1.6rem] md:text-[2rem] lg:text-[2.5rem] font-extrabold tracking-[-0.02em] mb-4 leading-[1.2] text-[#003580]">
                        Formá parte de la <span className="text-[#00AEEF]">Asociación Coreana Argentina</span> de Pádel
                    </h2>
                    <div className="flex flex-col md:flex-row gap-4 justify-center mt-8 items-center">
                        {!isLoaded ? null : isSignedIn ? (
                            <Link href="/tournaments" className="bg-[#CE1126] text-white no-underline py-[0.85rem] px-8 rounded-lg text-[0.95rem] font-bold transition-all duration-200 shadow-[0_6px_20px_rgba(206,17,38,0.2)] w-full md:w-auto max-w-[300px] hover:bg-[#a80c1d] lg:hover:-translate-y-[2px] lg:hover:shadow-[0_8px_25px_rgba(206,17,38,0.3)]">
                                Ir a la App →
                            </Link>
                        ) : (
                            <>
                                <Link href="/sign-in" className="bg-white text-[#0F172A] border border-black/10 no-underline py-[0.85rem] px-8 rounded-lg text-[0.95rem] font-bold transition-all duration-200 shadow-[0_6px_20px_rgba(0,0,0,0.05)] w-full md:w-auto max-w-[300px] flex items-center justify-center hover:border-black/15 hover:bg-[#F8FAFC] hover:text-[#003580] lg:hover:-translate-y-[2px] lg:hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)]">
                                    Iniciar Sesión
                                </Link>
                                <Link href="/sign-up" className="bg-[#CE1126] text-white no-underline py-[0.85rem] px-8 rounded-lg text-[0.95rem] font-bold transition-all duration-200 shadow-[0_6px_20px_rgba(206,17,38,0.2)] w-full md:w-auto max-w-[300px] flex items-center justify-center hover:bg-[#a80c1d] lg:hover:-translate-y-[2px] lg:hover:shadow-[0_8px_25px_rgba(206,17,38,0.3)]">
                                    Registrarse Ahora →
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ══ FOOTER ══ */}
            <footer className="bg-[#F8FAFC] border-t border-black/10 p-10 px-6">
                <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-4">
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 text-center">
                        <img src="/img/stickers 1.jpg" alt="ACAP" className="w-9 h-9 object-contain rounded-full" />
                        <span className="text-[0.85rem] font-bold text-[#003580]">
                            ASOCIACIÓN COREANA ARGENTINA DE PÁDEL
                        </span>
                    </div>
                    <p className="text-[0.75rem] text-[#64748B] text-center">
                        © {new Date().getFullYear()} - All rights reserved.
                    </p>
                </div>
            </footer>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulseGlow {
                    0%, 100% { transform: scale(1); opacity: 0.7; }
                    50% { transform: scale(1.15); opacity: 1; }
                }
            ` }} />

        </div>
    );
}
