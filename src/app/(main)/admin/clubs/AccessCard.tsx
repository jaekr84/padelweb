"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Send } from "lucide-react";

export type Access = { clubName: string; email: string; password: string };

const accessMessage = (a: Access) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `¡Hola! Ya está creada la cuenta de ${a.clubName} en ACAP.\n\nEntrá en ${origin}/login con:\nEmail: ${a.email}\nContraseña: ${a.password}\n\nDespués cambiá la contraseña desde tu perfil y completá los datos del club en "Mi Club".`;
};

/** Acceso recién creado: se muestra una sola vez, para copiar o mandar por WhatsApp. */
export default function AccessCard({ access }: { access: Access }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(accessMessage(access));
        setCopied(true);
        toast.success("Datos de acceso copiados");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col gap-3 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">
                    Acceso de {access.clubName}
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-surface-raised border border-hairline rounded-xl px-3 py-2 min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-widest text-subtle">Email</p>
                    <p className="text-[11px] font-mono text-foreground truncate">{access.email}</p>
                </div>
                <div className="bg-surface-raised border border-hairline rounded-xl px-3 py-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-subtle">Contraseña temporal</p>
                    <p className="text-[11px] font-mono text-emerald-400 select-all">{access.password}</p>
                </div>
            </div>
            <p className="text-[9px] text-amber-400 font-bold leading-relaxed">
                Copiala ahora: la contraseña no se vuelve a mostrar. Si se pierde, se puede resetear desde Usuarios.
            </p>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={copy}
                    className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest active:scale-95"
                >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copiar
                </button>
                <a
                    href={`https://wa.me/?text=${encodeURIComponent(accessMessage(access))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest active:scale-95"
                >
                    <Send className="w-4 h-4" /> WhatsApp
                </a>
            </div>
        </div>
    );
}
