"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Ban, Shield, Users, Trophy, ChevronRight } from "lucide-react";

import { createPortal } from "react-dom";

interface AccessDeniedModalProps {
    isOpen: boolean;
    onClose: () => void;
    reason: "gender" | "category" | "membership" | "role" | null;
    message: string;
    tournamentName?: string;
}

export default function AccessDeniedModal({ isOpen, onClose, reason, message, tournamentName }: AccessDeniedModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const icons = {
        gender: <Users className="w-10 h-10 text-rojo" />,
        category: <Trophy className="w-10 h-10 text-azul-primary" />,
        membership: <Shield className="w-10 h-10 text-celeste" />,
        role: <Ban className="w-10 h-10 text-rojo" />,
    };

    const colors = {
        gender: "bg-rojo/5 border-rojo/10",
        category: "bg-azul-primary/5 border-azul-primary/10",
        membership: "bg-celeste/5 border-celeste/10",
        role: "bg-rojo/5 border-rojo/10",
    };

    const titles = {
        gender: "Requisito de Género",
        category: "Categoría No Permitida",
        membership: "Exclusivo Miembros",
        role: "Acceso No Permitido",
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-background/80 backdrop-blur-md"
                        onClick={onClose}
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-sm bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center"
                    >
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-azul-primary via-celeste to-azul-primary" />
                        
                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors border border-border"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center border shadow-sm ${reason ? colors[reason] : "bg-muted border-border"}`}>
                            {reason ? icons[reason] : <Ban className="w-10 h-10 text-muted-foreground" />}
                        </div>

                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-foreground mb-2 italic">
                            {reason ? titles[reason] : "No Disponible"}
                        </h2>
                        
                        <p className="text-muted-foreground text-xs font-medium leading-relaxed mb-8 italic text-center px-4">
                            {message}
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-azul-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-azul-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                            >
                                Entendido
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>

                        {tournamentName && (
                            <p className="mt-6 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 italic">
                                {tournamentName}
                            </p>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
