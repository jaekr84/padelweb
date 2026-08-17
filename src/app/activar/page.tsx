"use client";

// Activar la cuenta de un jugador invitado. La persona elige email y contraseña
// sobre la cuenta que ya tenía el admin cargada, así conserva sus puntos.

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Trophy } from "lucide-react";
import { toast } from "sonner";
import { activarCuenta, validarToken, type EstadoToken } from "./actions";

export default function ActivarPage() {
    return (
        <Suspense fallback={null}>
            <Activar />
        </Suspense>
    );
}

function Activar() {
    const token = useSearchParams().get("token") ?? "";
    const [estado, setEstado] = useState<EstadoToken | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [verClave, setVerClave] = useState(false);
    const [listo, setListo] = useState(false);
    const [pendiente, iniciar] = useTransition();

    useEffect(() => {
        if (!token) {
            setEstado({ valido: false, motivo: "invalido" });
            return;
        }
        validarToken(token).then(setEstado);
    }, [token]);

    const activar = (e: React.FormEvent) => {
        e.preventDefault();
        iniciar(async () => {
            const r = await activarCuenta(token, email, password);
            if (r.ok) setListo(true);
            else toast.error(r.error);
        });
    };

    if (!estado) {
        return (
            <Marco>
                <Loader2 className="w-6 h-6 text-celeste animate-spin mx-auto" />
            </Marco>
        );
    }

    if (listo) {
        return (
            <Marco>
                <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-volt/15 border border-volt/30 flex items-center justify-center mx-auto mb-4">
                        <Check className="w-7 h-7 text-volt-ink" />
                    </div>
                    <h1 className="heading-sport text-2xl text-foreground">¡Cuenta activada!</h1>
                    <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
                        Ya podés entrar con tu email y la contraseña que elegiste. Todo lo que jugaste como invitado
                        sigue siendo tuyo.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 w-full mt-5 py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95"
                    >
                        Iniciar sesión
                    </Link>
                </div>
            </Marco>
        );
    }

    if (!estado.valido) {
        const mensajes = {
            invalido: "El link no es válido.",
            vencida: "El link venció: duran 24 horas.",
            usada: "Este link ya se usó.",
            anulada: "El link fue anulado.",
            activada: "Esta cuenta ya está activada.",
        } as const;
        const puedeEntrar = estado.motivo === "usada" || estado.motivo === "activada";

        return (
            <Marco>
                <div className="text-center">
                    <h1 className="heading-sport text-2xl text-foreground">{mensajes[estado.motivo]}</h1>
                    <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
                        {puedeEntrar
                            ? "Entrá con tu email y tu contraseña. Si no la recordás, pedile ayuda al administrador."
                            : "Pedile al administrador que te mande uno nuevo."}
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 w-full mt-5 py-3 clip-notch bg-muted border border-hairline text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground transition-all"
                    >
                        Ir al inicio de sesión
                    </Link>
                </div>
            </Marco>
        );
    }

    return (
        <Marco>
            <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-celeste" />
                <span className="label-tech text-[8px] text-celeste">Activá tu cuenta</span>
            </div>
            <h1 className="heading-sport text-2xl text-foreground">Hola, {estado.nombre}</h1>
            <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
                Ya jugaste como invitado y tus puntos están guardados. Elegí tu email y una contraseña para entrar a
                la app con esa misma historia.
            </p>

            <form onSubmit={activar} className="mt-5 space-y-3">
                <label className="block">
                    <span className="label-tech text-[7px] text-subtle block mb-1.5">Tu email</span>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
                        <input
                            autoFocus
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tuemail@ejemplo.com"
                            className="w-full bg-muted border border-hairline rounded-xl h-11 pl-9 pr-3 text-[12px] font-bold text-foreground placeholder:text-subtle focus:outline-none focus:border-celeste/40"
                        />
                    </div>
                </label>

                <label className="block">
                    <span className="label-tech text-[7px] text-subtle block mb-1.5">Contraseña (mínimo 8 caracteres)</span>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
                        <input
                            type={verClave ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-muted border border-hairline rounded-xl h-11 pl-9 pr-10 text-[12px] font-bold text-foreground focus:outline-none focus:border-celeste/40"
                        />
                        <button
                            type="button"
                            onClick={() => setVerClave((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-foreground transition-colors cursor-pointer"
                        >
                            {verClave ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </label>

                <button
                    type="submit"
                    disabled={pendiente || email.trim().length === 0 || password.length < 8}
                    className="w-full flex items-center justify-center gap-2 py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
                >
                    {pendiente ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trophy className="w-3.5 h-3.5" />}
                    {pendiente ? "Activando..." : "Activar mi cuenta"}
                </button>
            </form>
        </Marco>
    );
}

function Marco({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-grid-carbon flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-sm rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 p-6">
                {children}
            </div>
        </div>
    );
}
