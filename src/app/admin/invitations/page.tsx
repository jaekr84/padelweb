"use client";

import { useTransition, useRef, useState } from "react";
import { createInvitation } from "./actions";
import { toast } from "sonner";
import { Send, Loader2, User, Building2, ShieldCheck, Mail, Link as LinkIcon, Copy, Check } from "lucide-react";

export default function InvitationsPage() {
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
        <div className="max-w-2xl">
            <h1 className="text-3xl font-black uppercase italic mb-2 border-b border-indigo-500/20 pb-4 flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-indigo-500" />
                Gestionar Invitaciones
            </h1>
            <p className="text-slate-400 text-sm mb-8">
                Genera links de invitación exclusivos para nuevos clubes o jugadores. Los links tienen una validez de 2 horas.
            </p>

            <form ref={formRef} action={handleSubmit} className="bg-slate-900/40 p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-xl flex flex-col gap-8">

                {/* Role Selection */}
                <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Tipo de Cuenta</label>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { id: "club", label: "Nuevo Club", desc: "Permisos admin", icon: Building2 },
                            { id: "jugador", label: "Jugador Libre", desc: "Verificado - Sin club", icon: User }
                        ].map((role) => (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => { setSelectedRole(role.id); setGeneratedLink(null); }}
                                className={`flex flex-col gap-2 p-5 rounded-2xl border transition-all text-left group ${selectedRole === role.id ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-600/5' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <role.icon className={`w-6 h-6 ${selectedRole === role.id ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                                    {selectedRole === role.id && <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                                </div>
                                <div className="flex flex-col mt-1">
                                    <span className={`text-[13px] font-black uppercase tracking-wider ${selectedRole === role.id ? 'text-white' : 'text-slate-400'}`}>{role.label}</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight">{role.desc}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-500 flex items-start gap-3">
                        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-medium">
                            El link será de uso único y tendrá una <span className="font-bold underline">validez de 2 horas</span>. Luego de ese tiempo, el token expirará y deberá generarse uno nuevo.
                        </p>
                    </div>

                    {generatedLink && (
                        <div className="flex flex-col gap-2 mt-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-1">Link de Invitación Generado</label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-black/60 border border-indigo-500/30 rounded-xl px-4 py-3 text-[11px] font-mono whitespace-nowrap overflow-hidden text-ellipsis text-indigo-200">
                                    {generatedLink}
                                </div>
                                <button
                                    type="button"
                                    onClick={copyToClipboard}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all shadow-lg active:scale-90"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Te enviamos tu link de invitación para ACAP (válido por 2hs): ${generatedLink}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl transition-all shadow-lg active:scale-90 flex items-center justify-center"
                                >
                                    <Send className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
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
