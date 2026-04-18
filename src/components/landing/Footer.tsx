"use client";

import Image from "next/image";
import Link from "next/link";
import { Instagram, Mail, Trophy, MapPin, ShoppingBag, ExternalLink } from "lucide-react";

export const Footer = () => {
    return (
        <footer className="relative z-10 border-t border-slate-800/50 pt-24 pb-12 overflow-hidden mt-12 bg-black">
            {/* Glossy top border effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-azul-primary/50 to-transparent opacity-50" />
            
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-20">
                {/* Brand Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10">
                            <Image src="/img/acap logo svg blanco sombra.svg" alt="A.C.A.P." fill className="object-contain" />
                        </div>
                        <span className="font-black text-2xl italic tracking-tighter text-white">A.C.A.P</span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                        La Asociación Coreana Argentina de Pádel. <br/>
                        Poder, técnica y comunidad en cada partido. Dominá la cancha con nosotros.
                    </p>
                    <div className="flex items-center gap-4">
                        <a 
                            href="https://www.instagram.com/acaparg?igsh=NW12OWR0OWcwcHky" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-pink-500 hover:border-pink-500/50 transition-all group"
                        >
                            <Instagram className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </a>
                        <a 
                            href="mailto:acap@acap.ar" 
                            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-celeste hover:border-celeste/50 transition-all group"
                        >
                            <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </a>
                    </div>
                </div>

                {/* Explore Section */}
                <div className="space-y-6">
                    <h4 className="text-white font-black uppercase tracking-widest text-xs">Explorar</h4>
                    <ul className="space-y-4">
                        <li>
                            <Link href="/ranking" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2 group">
                                <Trophy className="w-4 h-4 text-celeste opacity-50" /> Ranking Oficial
                            </Link>
                        </li>
                        <li>
                            <Link href="/tournaments" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2 group">
                                <Trophy className="w-4 h-4 text-azul-primary opacity-50" /> Próximos Torneos
                            </Link>
                        </li>
                        <li>
                            <Link href="/directory" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2 group">
                                <MapPin className="w-4 h-4 text-blue-400 opacity-50" /> Directorio de Clubes
                            </Link>
                        </li>
                        <li>
                            <Link href="/marketplace" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2 group">
                                <ShoppingBag className="w-4 h-4 text-cyan-400 opacity-50" /> Marketplace ACAP
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Info Section */}
                <div className="space-y-6">
                    <h4 className="text-white font-black uppercase tracking-widest text-xs">Información</h4>
                    <ul className="space-y-4">
                        <li>
                            <Link href="/contacto" className="text-slate-400 hover:text-white text-sm transition-colors">Contáctanos</Link>
                        </li>
                        <li>
                            <Link href="/reglamento" className="text-slate-400 hover:text-white text-sm transition-colors">Reglamento</Link>
                        </li>
                        <li>
                            <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Preguntas Frecuentes</a>
                        </li>
                        <li>
                            <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Términos y Condiciones</a>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Bottom Credits */}
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-900 pt-8">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-600">
                        © 2026 Asociación Coreana Argentina de Pádel. Todos los derechos reservados.
                    </span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="text-[9px] font-bold tracking-widest uppercase text-slate-600 flex items-center gap-1">
                        Designed & Developed by 
                        <a 
                            href="https://x.com/Kr84Jae" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-azul-primary hover:text-celeste transition-colors flex items-center gap-1"
                        >
                            @JaeKr84 <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    </span>
                </div>
            </div>

            {/* Background Glow */}
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-azul-primary/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-celeste/5 blur-[120px] rounded-full pointer-events-none" />
        </footer>
    );
};
