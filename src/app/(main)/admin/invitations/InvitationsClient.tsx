"use client";

import { useTransition, useRef, useState } from "react";
import { motion } from "framer-motion";
import { createInvitation } from "./actions";
import { toast } from "sonner";
import { Send, Loader2, User, Building2, ShieldCheck, Mail, Link as LinkIcon, Copy, Check } from "lucide-react";

export default function InvitationsClient() {
    const [isPending, startTransition] = useTransition();
    const [selectedRole, setSelectedRole] = useState("club");
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = (formData: FormData) => {
        formData.append("role", selectedRole);
        formData.append("type", "link");

        startTransition(async () => {
            const result = await createInvitation(formData);
            if (result.error) {
                toast.error(result.error);
            } else if (result.success && result.link) {
                setGeneratedLink(result.link);
                toast.success("¡Link generado correctamente!");
            }
        });
    };

    const copyToClipboard = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            setCopied(true);
            toast.success("Link copiado");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <>
            <style>{`
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .text-gradient-animate {
                    background: linear-gradient(to right, #10b981, #3b82f6, #06b6d4, #10b981);
                    background-size: 300% 300%;
                    -webkit-background-clip: text;
                    color: transparent;
                    animation: gradient-x 6s ease infinite;
                }
                .glass-card {
                    background-color: color-mix(in srgb, var(--card) 90%, transparent);
                    backdrop-filter: blur(20px);
                    border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
                }
                .glass-card:hover {
                    border-color: rgba(16, 185, 129, 0.5);
                }
                .glow-button {
                    position: relative;
                }
                .glow-button::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: 2rem;
                    background: linear-gradient(45deg, #10b981, #3b82f6);
                    z-index: -1;
                    filter: blur(8px);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .glow-button:hover::before {
                    opacity: 1;
                }
            `}</style>
            
            {/* Ambient glow */}
            <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px]" />
                <div className="absolute top-[30%] right-[-15%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 flex-1 w-full max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-8 font-sans selection:bg-emerald-500/30">
                <motion.header 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2 border-b border-border/50 pb-6 mb-4"
                >
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground shadow-sm relative overflow-hidden">
                            <div className="absolute inset-0 bg-emerald-500/10 blur-xl opacity-50" />
                            <ShieldCheck className="relative z-10 w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500/80 mb-1">Accesos al sistema</p>
                            <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tight leading-none text-foreground">
                                Gestión de <span className="text-gradient-animate drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">Invitaciones</span>
                            </h1>
                        </div>
                    </div>
                <p className="text-muted-foreground/80 text-sm font-medium leading-relaxed pl-[76px]">
                    Genera links de invitación exclusivos para nuevos clubes o jugadores. Los links tienen una validez de 24 horas.
                </p>
                </motion.header>

                <form ref={formRef} action={handleSubmit} className="glass-card p-6 md:p-10 rounded-[2.5rem] flex flex-col gap-8 relative overflow-hidden shadow-2xl transition-all group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Role Selection */}
                    <div className="flex flex-col gap-4 relative z-10">
                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground ml-1">Tipo de Cuenta</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { id: "club", label: "Nuevo Club", desc: "Permisos administrativos", icon: Building2 },
                            { id: "jugador", label: "Jugador Libre", desc: "Sin club asignado", icon: User }
                        ].map((role) => (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => { setSelectedRole(role.id); setGeneratedLink(null); }}
                                className={`flex flex-col gap-3 p-6 rounded-[2rem] border transition-all text-left relative overflow-hidden group ${
                                    selectedRole === role.id 
                                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/10' 
                                        : 'bg-muted/30 border-border/50 hover:bg-muted hover:border-border'
                                }`}
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <role.icon className={`w-6 h-6 transition-colors ${selectedRole === role.id ? 'text-emerald-500' : 'text-muted-foreground/60 group-hover:text-muted-foreground'}`} />
                                    {selectedRole === role.id && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />}
                                </div>
                                <div className="flex flex-col mt-2 relative z-10">
                                    <span className={`text-[12px] font-black uppercase tracking-wider transition-colors ${selectedRole === role.id ? 'text-foreground' : 'text-muted-foreground'}`}>{role.label}</span>
                                    <span className="text-[9px] font-bold text-muted-foreground opacity-70 leading-tight mt-0.5">{role.desc}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-6 relative z-10">
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-500 flex items-start gap-4">
                        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold leading-relaxed uppercase tracking-wide">
                            El link será de uso único y tendrá una <span className="underline decoration-2 underline-offset-4">validez de 24 horas</span>. Luego deberá generarse uno nuevo.
                        </p>
                    </div>

                    {generatedLink && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-3 p-2 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 relative overflow-hidden"
                        >
                            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-500 ml-4 pt-2 relative z-10">Link Generado</label>
                            <div className="flex flex-col sm:flex-row gap-2 px-2 pb-2 relative z-10">
                                <div className="flex-1 bg-muted border border-border rounded-2xl px-5 py-4 text-[11px] font-mono overflow-hidden text-ellipsis whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                                    {generatedLink}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={copyToClipboard}
                                        className="flex-1 sm:w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center active:scale-90"
                                    >
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                    <a
                                        href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Te enviamos tu link de invitación para ACAP (válido por 24hs): ${generatedLink}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 sm:w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-90 flex items-center justify-center"
                                    >
                                        <Send className="w-5 h-5" />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="flex justify-end pt-4 relative z-10">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="glow-button w-full sm:w-auto bg-foreground hover:bg-foreground/90 text-background px-12 py-5 rounded-full border border-border text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                            </>
                        ) : (
                            <>
                                Generar Link <LinkIcon className="w-4 h-4 ml-1" />
                            </>
                        )}
                    </button>
                </div>
            </form>
            </div>
        </>
    );
}
