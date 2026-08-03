"use client";

import { useState, useTransition, useEffect } from "react";
import { registerAction, requestRegistrationAction, verifyTokenAction } from "./actions";
import { User, Mail, Lock, Phone, CreditCard, Calendar, Users, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, MessageSquare, Send, ChevronDown, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

export default function RegisterPage() {
    const searchParams = useSearchParams();
    const invitationToken = searchParams.get("invitation");
    const inviteClubId = searchParams.get("invite");

    const [isPending, startTransition] = useTransition();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState<boolean | null>(null);
    // Por qué no vale el link (usada / vencida / revocada), para poder decírselo.
    const [invalidReason, setInvalidReason] = useState<string | null>(null);
    const [requestSuccess, setRequestSuccess] = useState(false);
    const [pendingApproval, setPendingApproval] = useState(false);

    // Verify token on mount if present
    useEffect(() => {
        if (invitationToken) {
            verifyTokenAction(invitationToken).then(res => {
                setIsVerified(res.valid);
                setInvalidReason(res.valid ? null : (res as any).reason ?? "invalido");
            });
        } else {
            setIsVerified(false);
        }
    }, [invitationToken]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);
        // El rol no se manda: lo fija el servidor ("jugador" siempre).

        startTransition(async () => {
            const res = await registerAction(formData);
            if (res?.error) {
                setError(res.error);
                toast.error(res.error);
            } else if (res?.pendingApproval) {
                setPendingApproval(true);
                toast.success(res.message);
            }
        });
    };

    const handleRequest = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const res = await requestRegistrationAction(formData);
            if (res?.error) {
                setError(res.error);
            } else {
                setRequestSuccess(true);
                toast.success(res.message);
            }
        });
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 selection:bg-azul-primary/30">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-azul-primary/5 via-transparent to-transparent pointer-events-none" />

            {/* Back Navigation */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl mb-8 flex justify-between items-center relative z-10 px-4"
            >
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-full border border-hairline overflow-hidden group-hover:border-azul-primary/30 transition-colors">
                        <Image src="/img/stickers 1.jpg" alt="Logo" width={32} height={32} className="object-cover" />
                    </div>
                    <span className="font-black italic tracking-tighter text-sm uppercase text-muted-foreground group-hover:text-foreground transition-colors">A.C.A.P.</span>
                </Link>
                <Link
                    href="/"
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-subtle hover:text-foreground transition-all group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Volver a la Web
                </Link>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl bg-card/80 border border-hairline backdrop-blur-3xl rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden my-8"
            >
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-azul-primary/10 blur-3xl -mr-16 -mt-16 rounded-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-celeste/5 blur-3xl -ml-16 -mb-16 rounded-full" />

                <div className="text-center mb-10 relative">
                    <h1 className="text-4xl font-black italic tracking-tight text-foreground mb-2 uppercase">
                        {isVerified ? "Registro de Jugador" : "Solicitar Registro"}
                    </h1>
                    <p className="text-muted-foreground font-medium">
                        {isVerified
                            ? "Completá tus datos para registrarte."
                            : "El registro es por invitación. Completa tus datos para solicitar acceso."}
                    </p>

                    {/* Que quien recibe el link sepa que es de un solo uso y vence. */}
                    {isVerified && (
                        <p className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[10px] font-bold text-amber-400">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            Esta invitación es de un solo uso y vence a las 24hs de generada
                        </p>
                    )}
                </div>

                {pendingApproval ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-azul-primary/10 border border-azul-primary/20 p-8 rounded-3xl text-center flex flex-col items-center gap-4"
                    >
                        <div className="w-16 h-16 rounded-full bg-azul-primary/20 flex items-center justify-center text-azul-primary">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black uppercase italic text-foreground tracking-tight">Cuenta Creada</h3>
                        <p className="text-muted-foreground text-sm font-medium">
                            Tu cuenta fue creada con éxito, pero un administrador debe aprobarla antes de que puedas iniciar sesión. Te avisaremos cuando esté habilitada.
                        </p>
                        <Link href="/login" className="mt-4 text-[10px] font-black uppercase tracking-widest text-celeste hover:text-celeste/80">
                            Volver al Login
                        </Link>
                    </motion.div>
                ) : !isVerified ? (
                    <form onSubmit={handleRequest} className="space-y-6 relative text-left">
                        {invitationToken && invalidReason && (
                            <div className="p-4 rounded-2xl bg-rojo/10 border border-rojo/30 text-center">
                                <p className="text-[11px] font-black uppercase tracking-widest text-rojo">
                                    {invalidReason === "usada" ? "Este link de invitación ya fue usado"
                                        : invalidReason === "vencida" ? "El link de invitación venció"
                                            : invalidReason === "revocada" ? "Esta invitación fue anulada"
                                                : "El link de invitación no es válido"}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                                    Podés solicitar acceso completando el formulario.
                                </p>
                            </div>
                        )}
                        {requestSuccess ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-azul-primary/10 border border-azul-primary/20 p-8 rounded-3xl text-center flex flex-col items-center gap-4"
                            >
                                <div className="w-16 h-16 rounded-full bg-azul-primary/20 flex items-center justify-center text-azul-primary">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-black uppercase italic text-foreground tracking-tight">Solicitud Enviada</h3>
                                <p className="text-muted-foreground text-sm font-medium">
                                    Recibimos tu solicitud. Nos contactaremos con vos por WhatsApp para enviarte el link de registro.
                                </p>
                                <Link href="/login" className="mt-4 text-[10px] font-black uppercase tracking-widest text-celeste hover:text-celeste/80">
                                    Volver al Login
                                </Link>
                            </motion.div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-subtle tracking-[0.2em] ml-4">Nombre Completo</label>
                                    <div className="group relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle group-focus-within:text-azul-primary transition-colors" />
                                        <input
                                            name="fullName"
                                            required
                                            placeholder="Ej: Juan Perez"
                                            className="w-full bg-surface border border-hairline rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-foreground placeholder:text-subtle focus:outline-none focus:border-azul-primary/50 focus:ring-4 focus:ring-azul-primary/10 transition-all font-sans"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-subtle tracking-[0.2em] ml-4">Número de WhatsApp</label>
                                    <div className="group relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle group-focus-within:text-azul-primary transition-colors" />
                                        <input
                                            name="whatsapp"
                                            type="tel"
                                            required
                                            placeholder="11 4444 5555"
                                            className="w-full bg-surface border border-hairline rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-foreground placeholder:text-subtle focus:outline-none focus:border-azul-primary/50 focus:ring-4 focus:ring-azul-primary/10 transition-all font-sans"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-[13px] font-bold text-center"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full bg-azul-primary hover:bg-azul-primary/90 disabled:bg-azul-primary/50 text-white font-black uppercase tracking-widest italic py-5 rounded-2xl transition-all shadow-[0_0_40px_-10px_rgba(30,64,175,0.5)] flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                    {isPending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Solicitar Registro
                                            <Send className="w-5 h-5" />
                                        </>
                                    )}
                                </button>

                                <div className="text-center mt-6">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-subtle">
                                        ¿Ya tienes una cuenta? {" "}
                                        <Link href="/login" className="text-celeste hover:text-celeste/80 transition-colors decoration-2 underline-offset-4">
                                            Inicia Sesión
                                        </Link>
                                    </p>
                                </div>
                            </>
                        )}
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 relative text-left">
                        <input type="hidden" name="invitationToken" value={invitationToken || ""} />
                        <input type="hidden" name="inviteClubId" value={inviteClubId || ""} />

                        {invitationToken && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-celeste/10 border border-celeste/20 text-celeste px-6 py-4 rounded-3xl text-[12px] font-bold text-center flex items-center justify-center gap-3 mb-8"
                            >
                                <ShieldCheck className="w-5 h-5 shrink-0" />
                                Invitación de jugador verificada correctamente.
                            </motion.div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* First Name */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-subtle tracking-[0.2em] ml-4">Nombre</label>
                                <div className="group relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle group-focus-within:text-azul-primary transition-colors" />
                                    <input
                                        name="firstName"
                                        required
                                        placeholder="Ej: Juan"
                                        className="w-full bg-surface border border-hairline rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-foreground placeholder:text-subtle focus:outline-none focus:border-azul-primary/50 focus:ring-4 focus:ring-azul-primary/10 transition-all font-sans"
                                    />
                                </div>
                            </div>

                            {/* Last Name */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-subtle tracking-[0.2em] ml-4">Apellido</label>
                                <div className="group relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle group-focus-within:text-azul-primary transition-colors" />
                                    <input
                                        name="lastName"
                                        required
                                        placeholder="Ej: Perez"
                                        className="w-full bg-surface border border-hairline rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-foreground placeholder:text-subtle focus:outline-none focus:border-azul-primary/50 focus:ring-4 focus:ring-azul-primary/10 transition-all font-sans"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-subtle tracking-[0.2em] ml-4">Mail (Usuario)</label>
                            <div className="group relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle group-focus-within:text-azul-primary transition-colors" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="juan@perez.com"
                                    className="w-full bg-surface border border-hairline rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-foreground placeholder:text-subtle focus:outline-none focus:border-azul-primary/50 focus:ring-4 focus:ring-azul-primary/10 transition-all font-sans"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Phone */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-subtle tracking-[0.2em] ml-4">Teléfono WhatsApp</label>
                                <div className="group relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle group-focus-within:text-azul-primary transition-colors" />
                                    <input
                                        name="phone"
                                        type="tel"
                                        required
                                        placeholder="11 4444 5555"
                                        className="w-full bg-surface border border-hairline rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-foreground placeholder:text-subtle focus:outline-none focus:border-azul-primary/50 focus:ring-4 focus:ring-azul-primary/10 transition-all font-sans"
                                    />
                                </div>
                            </div>

                            {/* BirthDate */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-subtle tracking-[0.2em] ml-4">Fecha de Nacimiento</label>
                                <div className="group relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle group-focus-within:text-azul-primary transition-colors" />
                                    <input
                                        name="birthDate"
                                        type="date"
                                        required
                                        className="w-full bg-surface border border-hairline rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-foreground [color-scheme:dark] focus:outline-none focus:border-azul-primary/50 focus:ring-4 focus:ring-azul-primary/10 transition-all font-sans"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Gender */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-subtle tracking-[0.2em] ml-4">Género</label>
                                <div className="group relative">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle group-focus-within:text-azul-primary transition-colors" />
                                    <select
                                        name="gender"
                                        required
                                        className="w-full bg-surface border border-hairline rounded-2xl py-4 pl-12 pr-12 text-[13px] font-medium text-foreground appearance-none focus:outline-none focus:border-azul-primary/50 focus:ring-4 focus:ring-azul-primary/10 transition-all font-sans cursor-pointer relative z-10"
                                    >
                                        <option value="" disabled selected>Selecciona</option>
                                        <option value="masculino">Masculino</option>
                                        <option value="femenino">Femenino</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle group-focus-within:text-azul-primary transition-colors pointer-events-none" />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-subtle tracking-[0.2em] ml-4">Contraseña</label>
                                <div className="group relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle group-focus-within:text-azul-primary transition-colors" />
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        className="w-full bg-surface border border-hairline rounded-2xl py-4 pl-12 pr-12 text-[13px] font-medium text-foreground placeholder:text-subtle focus:outline-none focus:border-azul-primary/50 focus:ring-4 focus:ring-azul-primary/10 transition-all font-sans"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-subtle hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-[13px] font-bold text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full bg-azul-primary hover:bg-azul-primary/90 disabled:bg-azul-primary/50 text-white font-black uppercase tracking-widest italic py-5 rounded-2xl transition-all shadow-[0_0_40px_-10px_rgba(30,64,175,0.5)] flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            {isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Crear Cuenta
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        <div className="text-center mt-6">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle">
                                ¿Ya tienes una cuenta? {" "}
                                <Link href="/login" className="text-celeste hover:text-celeste/80 transition-colors decoration-2 underline-offset-4">
                                    Inicia Sesión
                                </Link>
                            </p>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
