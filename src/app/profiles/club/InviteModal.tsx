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
            <div className="bg-[#0D0F1A] border border-slate-700 rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 shadow-2xl">
                {/* Drag pill */}
                <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mt-3 sm:hidden mb-1" />

                {/* Header */}
                <div className="px-6 pt-4 pb-4 flex items-center justify-between border-b border-slate-700/60">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">
                            Invitar Jugadores
                        </h3>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">
                            {clubName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col items-center gap-5">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-blue-900/50 border border-blue-700/50 flex items-center justify-center">
                        <Share2 className="h-7 w-7 text-blue-400" />
                    </div>

                    {/* Description */}
                    <p className="text-slate-400 text-sm leading-relaxed text-center">
                        Compartí este link. Cuando alguien se registre con él, quedará asociado a tu club automáticamente.
                    </p>

                    {/* Link box */}
                    <div className="w-full flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl p-2 focus-within:border-blue-500/60 transition-colors">
                        <div className="flex-1 overflow-hidden">
                            <p className="text-[10px] text-slate-500 font-mono truncate px-2">
                                {inviteLink}
                            </p>
                        </div>
                        <button
                            onClick={handleCopy}
                            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${copied
                                    ? "bg-emerald-900/60 text-emerald-400 border border-emerald-700"
                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white border border-slate-600"
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
                        className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5c] active:scale-[0.98] text-white py-4 rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-900/20"
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M11.995 1C5.922 1 1 5.921 1 11.992c0 1.933.504 3.793 1.464 5.438L1 23l5.702-1.493A10.941 10.941 0 0 0 11.995 23c6.071 0 10.995-4.92 10.995-10.991C22.99 5.92 18.066 1 11.995 1Zm5.845 15.541c-.247.697-1.432 1.341-1.956 1.4-1.892.203-4.329-1.077-6.22-2.957-1.894-1.884-3.212-4.295-2.97-6.223.05-.41.528-1.527.974-1.527.135 0 .284.004.417.01.2.008.471-.077.737.558.272.651.936 2.29.98 2.38.042.083.081.205.006.353-.075.148-.114.24-.225.352-.112.112-.236.252-.338.353-.11.114-.226.241-.098.463.128.22.568 1.002.568 1.002.5.836 1.45 1.532 2.052 1.844.202.105.356.124.496.06.155-.07.419-.481.657-.905.155-.276.312-.206.529-.126.216.082 1.373.65 1.61.765.234.114.391.171.448.266.057.094.057.54-.19 1.237Z" />
                        </svg>
                        Compartir por WhatsApp
                    </button>

                    <button
                        onClick={onClose}
                        className="text-slate-600 hover:text-slate-400 text-[10px] font-bold uppercase tracking-widest transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
