"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, MapPin, ShoppingBag, Instagram, Mail } from "lucide-react";

export const Navbar = () => {
    return (
        <nav className="fixed top-0 w-full z-50 p-4 lg:p-6 flex justify-center">
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
                className="flex justify-between items-center w-full max-w-7xl bg-background/60 backdrop-blur-xl border border-blue-500/20 rounded-[2rem] px-6 py-3 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
            >
                <Link href="/" className="flex items-center gap-3 flex-1 group">
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <Image src="/img/acap logo svg blanco sombra.svg" alt="Logo" fill className="object-contain" priority sizes="40px" />
                        <div className="absolute inset-0 pointer-events-none overflow-hidden" 
                             style={{ 
                                WebkitMaskImage: 'url("/img/acap logo svg blanco sombra.svg")', 
                                maskImage: 'url("/img/acap logo svg blanco sombra.svg")', 
                                WebkitMaskSize: 'contain', 
                                maskSize: 'contain', 
                                WebkitMaskRepeat: 'no-repeat', 
                                maskRepeat: 'no-repeat' 
                             }}>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent w-[200%] h-[200%] animate-shine-multi" />
                        </div>
                    </div>
                    <span className="font-black text-xl italic tracking-tighter text-foreground group-hover:text-celeste transition-colors">A.C.A.P</span>
                </Link>

                <div className="hidden lg:flex gap-8 items-center justify-center flex-[2]">
                    <Link href="/ranking" className="text-[10px] font-black tracking-[0.2em] text-muted-foreground hover:text-celeste transition-all uppercase flex items-center gap-2 group">
                        <Trophy className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Ranking
                    </Link>
                    <Link href="/tournaments" className="text-[10px] font-black tracking-[0.2em] text-muted-foreground hover:text-celeste transition-all uppercase flex items-center gap-2 group">
                        <Trophy className="w-3.5 h-3.5 text-azul-primary group-hover:scale-110 transition-transform" /> Torneos
                    </Link>
                    <Link href="/directory" className="text-[10px] font-black tracking-[0.2em] text-muted-foreground hover:text-celeste transition-all uppercase flex items-center gap-2 group">
                        <MapPin className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Clubes
                    </Link>
                    <Link href="/marketplace" className="text-[10px] font-black tracking-[0.2em] text-muted-foreground hover:text-celeste transition-all uppercase flex items-center gap-2 group">
                        <ShoppingBag className="w-3.5 h-3.5 text-celeste group-hover:scale-110 transition-transform" /> Marketplace
                    </Link>
                    <Link href="/contacto" className="text-[10px] font-black tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all uppercase flex items-center gap-2 group">
                        <Mail className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Contacto
                    </Link>
                </div>

                <div className="flex gap-4 items-center justify-end flex-1">
                    <Link href="/login" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all mr-2">Entrar</Link>
                    <Link href="/register" className="relative overflow-hidden bg-white text-black px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl group">
                        <span className="relative z-10">Unite a ACAP</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-celeste to-azul-primary opacity-0 group-hover:opacity-10 transition-opacity" />
                    </Link>
                </div>
            </motion.div>
        </nav>
    );
};
