"use client";

import { useState, useTransition } from "react";
import { loginAction } from "./actions";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";

export default function LoginPage() {
    const [isPending, startTransition] = useTransition();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const res = await loginAction(formData);
            if (res?.error) {
                setError(res.error);
                toast.error(res.error);
            }
        });
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 selection:bg-indigo-500/30">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-slate-900/40 border border-white/5 backdrop-blur-3xl rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden"
            >
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 blur-3xl -ml-16 -mb-16 rounded-full" />

                <div className="text-center mb-10 relative">
                    <h1 className="text-4xl font-black italic tracking-tight text-white mb-2 uppercase select-none tracking-widest">Login</h1>
                    <p className="text-slate-400 font-medium">Ingresa a tu cuenta de ACAP.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 relative">
                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Email</label>
                        <div className="group relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="tu@email.com"
                                className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[13px] font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center pr-4">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-4">Contraseña</label>
                            <span className="text-[10px] font-black uppercase text-slate-600 cursor-not-allowed">¿La olvidaste?</span>
                        </div>
                        <div className="group relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="••••••••"
                                className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-[13px] font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all"
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
                                Iniciar Sesión
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <div className="text-center mt-6">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            ¿No tienes una cuenta? {" "}
                            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors decoration-2 underline-offset-4">
                                Regístrate
                            </Link>
                        </p>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
