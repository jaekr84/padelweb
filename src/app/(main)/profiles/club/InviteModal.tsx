"use client";

import { useState } from "react";
import { X, Copy, Check, Share2 } from "lucide-react";

interface InviteModalProps {
    clubName: string;
    clubId: string;
    onClose: () => void;
}

export function InviteModal({ clubName, clubId, onClose }: InviteModalProps) {
    const [copied, setCopied] = useState(false);

    const inviteLink =
        typeof window !== "undefined"
            ? `${window.location.origin}/sign-up?invite=${clubId}`
            : `https://padelweb.app/sign-up?invite=${clubId}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsApp = () => {
        const message = `¡Hola! Sumate a mi club "${clubName}" en PadelWeb: ${inviteLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-lg flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-card backdrop-blur-3xl border border-border rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full sm:max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 shadow-2xl relative">
                {/* Drag pill */}
                <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mt-4 sm:hidden mb-1" />

                {/* Header */}
                <div className="px-8 pt-6 pb-5 flex items-center justify-between border-b border-border">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground italic flex items-center gap-2">
                             <span className="text-celeste">Invitar</span> Jugadores
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-widest opacity-60">
                            {clubName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl bg-muted/50 hover:bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:scale-95"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col items-center gap-5">
                    {/* Icon */}
                    <div className="w-20 h-20 rounded-[2rem] bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center shadow-lg shadow-azul-primary/5">
                        <Share2 className="h-8 w-8 text-azul-primary" />
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground text-[11px] leading-relaxed text-center font-bold uppercase tracking-widest opacity-80">
                        Compartí este link para vincular jugadores a tu club automáticamente al registrarse.
                    </p>

                    {/* Link box */}
                    <div className="w-full flex items-center gap-2 bg-muted/30 border border-border rounded-2xl p-2.5 focus-within:border-azul-primary transition-all">
                        <div className="flex-1 overflow-hidden">
                            <p className="text-[10px] text-azul-primary font-mono truncate px-3 py-1 font-bold">
                                {inviteLink}
                            </p>
                        </div>
                        <button
                            onClick={handleCopy}
                            className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${copied
                                    ? "bg-azul-primary text-white shadow-lg shadow-azul-primary/20"
                                    : "bg-muted text-muted-foreground hover:bg-border border border-border"
                                }`}
                        >
                            {copied ? (
                                <><Check className="h-3 w-3" /> Copiado</>
                            ) : (
                                <><Copy className="h-3 w-3" /> Copiar</>
                            )}
                        </button>
                    </div>

                    {/* WhatsApp button */}
                    <button
                        onClick={handleWhatsApp}
                        className="w-full flex items-center justify-center gap-3 bg-azul-primary hover:bg-celeste active:scale-[0.98] text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-azul-primary/20"
                    >
                         <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M11.995 1C5.922 1 1 5.921 1 11.992c0 1.933.504 3.793 1.464 5.438L1 23l5.702-1.493A10.941 10.941 0 0 0 11.995 23c6.071 0 10.995-4.92 10.995-10.991C22.99 5.92 18.066 1 11.995 1Zm5.845 15.541c-.247.697-1.432 1.341-1.956 1.4-1.892.203-4.329-1.077-6.22-2.957-1.894-1.884-3.212-4.295-2.97-6.223.05-.41.528-1.527.974-1.527.135 0 .284.004.417.01.2.008.471-.077.737.558.272.651.936 2.29.98 2.38.042.083.081.205.006.353-.075.148-.114.24-.225.352-.112.112-.236.252-.338.353-.11.114-.226.241-.098.463.128.22.568 1.002.568 1.002.5.836 1.45 1.532 2.052 1.844.202.105.356.124.496.06.155-.07.419-.481.657-.905.155-.276.312-.206.529-.126.216.082 1.373.65 1.61.765.234.114.391.171.448.266.057.094.057.54-.19 1.237Z" />
                        </svg>
                        Compartir por WhatsApp
                    </button>

                    <button
                        onClick={onClose}
                        className="text-muted-foreground/50 hover:text-azul-primary text-[9px] font-black uppercase tracking-widest transition-colors mt-2"
                    >
                        Omitir por ahora
                    </button>
                </div>
            </div>
        </div>
    );
}
