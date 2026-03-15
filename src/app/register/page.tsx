"use client";

import { useState, useTransition } from "react";
import { registerAction, requestRegistrationAction, verifyTokenAction } from "./actions";
import { User, Mail, Lock, Phone, CreditCard, Calendar, Users, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, MessageSquare, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

const ROLES = [
    {
        id: "jugador",
        label: "Jugador",
        icon: User,
        description: "Encontrá partidos, torneos y medí tu nivel.",
        color: "from-blue-500/20 to-blue-600/5",
        active: "bg-blue-600 border-blue-400 shadow-[0_0_30px_-5px_#3b82f6]",
        iconColor: "text-blue-400"
    },
    {
        id: "club",
        label: "Club / Equipo",
        icon: Users,
        description: "Creá tu equipo, organizá torneos y circuitos.",
        color: "from-purple-500/20 to-purple-600/5",
        active: "bg-purple-600 border-purple-400 shadow-[0_0_30px_-5px_#a855f7]",
        iconColor: "text-purple-400"
    }
];

export default function RegisterPage() {
    const searchParams = useSearchParams();
    const invitationToken = searchParams.get("invitation");
    const inviteClubId = searchParams.get("invite");

    const [isPending, startTransition] = useTransition();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState("jugador");
    const [isVerified, setIsVerified] = useState<boolean | null>(null);
    const [requestSuccess, setRequestSuccess] = useState(false);

    // Verify token on mount if present
    useState(() => {
        if (invitationToken) {
            verifyTokenAction(invitationToken).then(res => {
                setIsVerified(res.valid);
            });
        } else {
            setIsVerified(false);
        }
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);
        formData.set("role", selectedRole);

        startTransition(async () => {
            const res = await registerAction(formData);
            if (res?.error) {
                setError(res.error);
                toast.error(res.error);
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
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 selection:bg-indigo-500/30">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl bg-slate-900/40 border border-white/5 backdrop-blur-3xl rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden my-8"
            >
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 blur-3xl -ml-16 -mb-16 rounded-full" />

                <div className="text-center mb-10 relative">
                    <h1 className="text-4xl font-black italic tracking-tight text-white mb-2 uppercase">
                        {isVerified ? "Únete a ACAP" : "Solicitar Registro"}
                    </h1>
                    <p className="text-slate-400 font-medium">
                        {isVerified
                            ? "Crea tu cuenta personalizada para empezar a competir."
                            : "El registro es por invitación. Completa tus datos para solicitar acceso."}
                    </p>
                </div>

                {!isVerified ? (
                    <form onSubmit={handleRequest} className="space-y-6 relative text-left">
                        {requestSuccess ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-indigo-500/10 border border-indigo-500/20 p-8 rounded-3xl text-center flex flex-col items-center gap-4"
                            >
                                <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-black uppercase italic text-white tracking-tight">Solicitud Enviada</h3>
                                <p className="text-slate-400 text-sm font-medium">
                                    Recibimos tu solicitud. Nos contactaremos con vos por WhatsApp para enviarte el link de registro.
                                </p>
                                <Link href="/login" className="mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300">
                                    Volver al Login
                                </Link>
                            </motion.div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Nombre Completo</label>
                                    <div className="group relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                        <input
                                            name="fullName"
                                            required
                                            placeholder="Ej: Juan Perez"
                                            className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Número de WhatsApp</label>
                                    <div className="group relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                        <input
                                            name="whatsapp"
                                            type="tel"
                                            required
                                            placeholder="+54 9 11 ..."
                                            className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
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
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-black uppercase tracking-widest italic py-5 rounded-2xl transition-all shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] flex items-center justify-center gap-3 active:scale-[0.98]"
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
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        ¿Ya tienes una cuenta? {" "}
                                        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors decoration-2 underline-offset-4">
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

                        {/* Role Selection Section */}
                        <div className="space-y-4 mb-8">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Selecciona tu Rol</label>

                            <AnimatePresence>
                                {invitationToken && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-4 py-4 rounded-2xl text-[12px] font-bold text-center flex items-center justify-center gap-3 mb-4"
                                    >
                                        <ShieldCheck className="w-5 h-5 shrink-0" />
                                        Invitación verificada. Tu rol será asignado por administración.
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${invitationToken ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                {ROLES.map((r) => {
                                    const isSelected = selectedRole === r.id;
                                    const Icon = r.icon;
                                    return (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => setSelectedRole(r.id)}
                                            className={`group relative flex flex-col items-start p-5 rounded-3xl text-left transition-all duration-300 ${isSelected
                                                ? r.active
                                                : `bg-slate-950/50 border border-white/5 hover:bg-white/5`
                                                }`}
                                        >
                                            <div className={`p-2.5 rounded-xl mb-3 transition-colors ${isSelected
                                                ? "bg-white/20 text-white"
                                                : `bg-slate-900 ${r.iconColor} group-hover:scale-110 transition-transform`
                                                }`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <h3 className={`text-[15px] font-black uppercase tracking-wider mb-1 ${isSelected ? "text-white" : "text-white/80"}`}>
                                                {r.label}
                                            </h3>
                                            <p className={`text-[11px] font-medium leading-relaxed ${isSelected ? "text-white/80" : "text-white/40"}`}>
                                                {r.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* First Name */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Nombre</label>
                                <div className="group relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        name="firstName"
                                        required
                                        placeholder="Ej: Juan"
                                        className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
                                    />
                                </div>
                            </div>

                            {/* Last Name */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Apellido</label>
                                <input
                                    name="lastName"
                                    required
                                    placeholder="Ej: Perez"
                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-6 text-[13px] font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Mail (Usuario)</label>
                                <div className="group relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="juan@perez.com"
                                        className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
                                    />
                                </div>
                            </div>

                            {/* Document */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">N° Documento</label>
                                <div className="group relative">
                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        name="documentNumber"
                                        required
                                        placeholder="DNI o CUIT"
                                        className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Phone */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Teléfono WhatsApp</label>
                                <div className="group relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        name="phone"
                                        type="tel"
                                        required
                                        placeholder="+54 9..."
                                        className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
                                    />
                                </div>
                            </div>

                            {/* BirthDate */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Fecha de Nacimiento</label>
                                <div className="group relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        name="birthDate"
                                        type="date"
                                        required
                                        className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-white [color-scheme:dark] focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Gender */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Género</label>
                                <div className="group relative">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <select
                                        name="gender"
                                        required
                                        className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-white appearance-none focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
                                    >
                                        <option value="" disabled selected>Selecciona</option>
                                        <option value="masculino">Masculino</option>
                                        <option value="femenino">Femenino</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Contraseña</label>
                                <div className="group relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-[13px] font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors"
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
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-black uppercase tracking-widest italic py-5 rounded-2xl transition-all shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] flex items-center justify-center gap-3 active:scale-[0.98]"
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
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                ¿Ya tienes una cuenta? {" "}
                                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors decoration-2 underline-offset-4">
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
