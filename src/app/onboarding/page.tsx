"use client";

import { useState, useEffect, Suspense } from "react";
import { User, Users, GraduationCap, Building2, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { linkRoleToUser } from "./actions";
import { motion, AnimatePresence } from "framer-motion";

const ROLES = [
    {
        id: "jugador",
        label: "Jugador",
        icon: User,
        description: "Encontrá partidos, torneos y medí tu nivel.",
        color: "from-blue-500/20 to-blue-600/5",
        border: "border-blue-500/30",
        active: "bg-blue-600 border-blue-400 shadow-[0_0_30px_-5px_#3b82f6]",
        iconColor: "text-blue-400"
    },
    {
        id: "profesor",
        label: "Profesor",
        icon: GraduationCap,
        description: "Ofrecé clases, gestioná tus alumnos y horarios.",
        color: "from-emerald-500/20 to-emerald-600/5",
        border: "border-emerald-500/30",
        active: "bg-emerald-600 border-emerald-400 shadow-[0_0_30px_-5px_#10b981]",
        iconColor: "text-emerald-400"
    },
    {
        id: "club",
        label: "Club / Equipo",
        icon: Users,
        description: "Creá tu equipo, organizá torneos y circuitos.",
        color: "from-purple-500/20 to-purple-600/5",
        border: "border-purple-500/30",
        active: "bg-purple-600 border-purple-400 shadow-[0_0_30px_-5px_#a855f7]",
        iconColor: "text-purple-400"
    },
    {
        id: "centro_de_padel",
        label: "Centro de Padel",
        icon: Building2,
        description: "Gestioná tus canchas, reservas y torneos.",
        color: "from-amber-500/20 to-amber-600/5",
        border: "border-amber-500/30",
        active: "bg-amber-600 border-amber-400 shadow-[0_0_30px_-5px_#f59e0b]",
        iconColor: "text-amber-400"
    },
];

function OnboardingForm() {
    const searchParams = useSearchParams();
    const inviteClubId = searchParams.get("invite");
    const requestedRole = searchParams.get("role");
    const inviteToken = searchParams.get("invitation");

    const [role, setRole] = useState(() => {
        if (inviteClubId) return "jugador";
        if (requestedRole && ROLES.some(r => r.id === requestedRole)) return requestedRole;
        return "jugador";
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Lock role to jugador if invited by club
    useEffect(() => {
        if (inviteClubId) {
            setRole("jugador");
        }
    }, [inviteClubId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await linkRoleToUser(role, inviteClubId, inviteToken);
            if (res.success) {
                // Redirect to feed. The cookie is already updated by the server action.
                window.location.href = "/feed";
            } else {
                setError(res.error || "Ocurrió un error.");
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || "Ocurrió un error.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 font-sans selection:bg-blue-500/30 relative overflow-hidden">
            {/* Ambient Base Layer */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-2xl relative z-10"
            >
                <div className="bg-[#0f111a]/80 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 md:p-12 shadow-2xl">

                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-6">
                            <span className="text-blue-400 font-black italic text-xl tracking-tighter">PADEL WEB</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white mb-2">
                            Completá tu Perfil
                        </h1>
                        <p className="text-white/50 text-sm md:text-base font-medium">
                            Contanos cómo vas a usar la plataforma para personalizar tu experiencia
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-8">

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm font-medium text-center"
                                >
                                    {error}
                                </motion.div>
                            )}

                            {inviteClubId && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-4 rounded-2xl text-[13px] font-bold text-center flex items-center justify-center gap-3"
                                >
                                    <Users className="w-5 h-5 shrink-0" />
                                    Has sido invitado a unirte a un club. Te registrarás como jugador.
                                </motion.div>
                            )}
                            {inviteToken && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-4 py-4 rounded-2xl text-[13px] font-bold text-center flex items-center justify-center gap-3"
                                >
                                    <ShieldCheck className="w-5 h-5 shrink-0" />
                                    Invitación verificada por administración. Tu rol será asignado automáticamente.
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${(inviteClubId || inviteToken) ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            {ROLES.map((r) => {
                                const isSelected = role === r.id;
                                const Icon = r.icon;
                                return (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => setRole(r.id)}
                                        className={`group relative flex flex-col items-start p-6 rounded-3xl text-left transition-all duration-300 ${isSelected
                                            ? r.active
                                            : `bg-card border border-border hover:bg-white/10 hover:-translate-y-1`
                                            }`}
                                    >
                                        <div className={`p-3 rounded-2xl mb-4 transition-colors ${isSelected
                                            ? "bg-white/20 text-white"
                                            : `bg-card ${r.iconColor} group-hover:scale-110 transition-transform`
                                            }`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <h3 className={`text-lg font-black uppercase tracking-wider mb-2 ${isSelected ? "text-white" : "text-white/80"}`}>
                                            {r.label}
                                        </h3>
                                        <p className={`text-xs font-medium leading-relaxed ${isSelected ? "text-white/80" : "text-white/40"}`}>
                                            {r.description}
                                        </p>

                                        {isSelected && (
                                            <motion.div
                                                layoutId="role-indicator"
                                                className="absolute inset-0 rounded-3xl border-2 border-white/20 pointer-events-none"
                                                initial={false}
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-4 mt-4 border-t border-border/50 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-4 rounded-full bg-white text-black text-sm font-black uppercase tracking-widest shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100 w-full sm:w-auto"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        Continuar
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>

                    </form>
                </div>
            </motion.div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        }>
            <OnboardingForm />
        </Suspense>
    );
}
