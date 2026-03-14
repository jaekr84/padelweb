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
        <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-8">
            <header className="space-y-2 border-b border-border pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-foreground">
                        Invitaciones
                    </h1>
                </div>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                    Genera links de invitación exclusivos para nuevos clubes o jugadores. Los links tienen una validez de 2 horas.
                </p>
            </header>

            <form ref={formRef} action={handleSubmit} className="bg-card p-6 md:p-10 rounded-[2.5rem] border border-border shadow-2xl flex flex-col gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -mr-24 -mt-24" />

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
                                        ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_10px_30px_-10px_rgba(79,70,229,0.2)] ring-1 ring-indigo-500/10' 
                                        : 'bg-muted/50 border-border/50 hover:bg-muted hover:border-border'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <role.icon className={`w-6 h-6 ${selectedRole === role.id ? 'text-indigo-500' : 'text-muted-foreground/60 group-hover:text-muted-foreground'}`} />
                                    {selectedRole === role.id && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                </div>
                                <div className="flex flex-col mt-2">
                                    <span className={`text-[12px] font-black uppercase tracking-wider ${selectedRole === role.id ? 'text-foreground' : 'text-muted-foreground'}`}>{role.label}</span>
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
                            El link será de uso único y tendrá una <span className="underline decoration-2 underline-offset-4">validez de 2 horas</span>. Luego deberá generarse uno nuevo.
                        </p>
                    </div>

                    {generatedLink && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-3 p-2 bg-indigo-500/5 rounded-3xl border border-indigo-500/10"
                        >
                            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-500 ml-4 pt-2">Link Generado</label>
                            <div className="flex flex-col sm:flex-row gap-2 px-2 pb-2">
                                <div className="flex-1 bg-muted border border-border rounded-2xl px-5 py-4 text-[11px] font-mono overflow-hidden text-ellipsis whitespace-nowrap text-indigo-600 dark:text-indigo-300">
                                    {generatedLink}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={copyToClipboard}
                                        className="flex-1 sm:w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center active:scale-90"
                                    >
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                    <a
                                        href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Te enviamos tu link de invitación para ACAP (válido por 2hs): ${generatedLink}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 sm:w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-90 flex items-center justify-center"
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
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
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
    );
}
