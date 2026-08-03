"use client";

import { useTransition, useRef, useState } from "react";
import { motion } from "framer-motion";
import { createInvitation, listInvitations, revokeInvitation, getInvitationLink } from "./actions";
import { toast } from "sonner";
import { Send, Loader2, User, Building2, ShieldCheck, Mail, Link as LinkIcon, Copy, Check, Ban, Clock, History } from "lucide-react";

type InvitationRow = Awaited<ReturnType<typeof listInvitations>>[number];

const STATUS_STYLES: Record<string, string> = {
    pendiente: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
    usada: "bg-surface-raised text-muted-foreground border-hairline-strong",
    vencida: "bg-amber-500/15 text-amber-400 border-amber-500/40",
    revocada: "bg-rojo/15 text-rojo border-rojo/40",
};

const formatDate = (d: Date | string | null) =>
    d ? new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default function InvitationsClient({ initialInvitations = [] }: { initialInvitations?: InvitationRow[] }) {
    const [invitations, setInvitations] = useState<InvitationRow[]>(initialInvitations);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<"pendientes" | "todas">("pendientes");

    const visibleInvitations = filter === "pendientes"
        ? invitations.filter(i => i.status === "pendiente")
        : invitations;

    /** Reconstruye el link (no se guarda en la base) para copiar o reenviar. */
    const withLink = async (id: string, action: (link: string) => void) => {
        setBusyId(id);
        const res = await getInvitationLink(id);
        setBusyId(null);
        if (res?.error || !res?.link) {
            toast.error(res?.error || "No se pudo obtener el link");
            await refresh();
            return;
        }
        action(res.link);
    };

    const copyInvitation = (id: string) => withLink(id, (link) => {
        navigator.clipboard.writeText(link);
        setCopiedId(id);
        toast.success("Link copiado");
        setTimeout(() => setCopiedId(null), 2000);
    });

    const shareInvitation = (id: string) => withLink(id, (link) => {
        const text = `¡Hola! Te enviamos tu link de invitación para ACAP. Es personal, de un solo uso y vence en 24hs: ${link}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    });

    const refresh = async () => {
        try {
            setInvitations(await listInvitations());
        } catch {
            // El listado es informativo: si falla, no rompemos la generación.
        }
    };

    const handleRevoke = async (id: string) => {
        setRevokingId(id);
        const res = await revokeInvitation(id);
        if (res?.error) toast.error(res.error);
        else {
            toast.success("Invitación anulada");
            await refresh();
        }
        setRevokingId(null);
    };

    const [isPending, startTransition] = useTransition();
    const [selectedRole] = useState("jugador");
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = (formData: FormData) => {
        formData.append("type", "link");

        startTransition(async () => {
            const result = await createInvitation(formData);
            if (result.error) {
                toast.error(result.error);
            } else if (result.success && result.link) {
                setGeneratedLink(result.link);
                toast.success("¡Link generado correctamente!");
                await refresh();
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
                    background-color: var(--glass);
                    backdrop-filter: blur(20px);
                    border: 1px solid var(--hairline);
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

            <div className="relative z-10 flex-1 w-full max-w-2xl mx-auto px-4 py-4 md:py-6 space-y-4 font-sans selection:bg-emerald-500/30">
                <motion.header 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1.5 border-b border-hairline pb-4 mb-2"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-surface-raised border border-hairline flex items-center justify-center text-foreground shadow-sm relative overflow-hidden">
                            <div className="absolute inset-0 bg-emerald-500/10 blur-xl opacity-50" />
                            <User className="relative z-10 w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-0.5">Accesos al sistema</p>
                            <h1 className="text-xl md:text-2xl heading-sport leading-none text-foreground">
                                Invitación de <span className="text-gradient-animate drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">Jugadores</span>
                            </h1>
                        </div>
                    </div>
                <p className="text-muted-foreground text-[10px] font-medium leading-relaxed pl-[56px]">
                    Genera links de invitación para nuevos jugadores. Cada link lleva un token propio y deja de funcionar apenas se completa el registro, o a las 24 horas.
                </p>
                </motion.header>

                <form ref={formRef} action={handleSubmit} className="glass-card p-4 md:p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden shadow-xl transition-all group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="flex flex-col gap-2 relative z-10">
                    <label className="text-[8px] font-black uppercase tracking-[0.25em] text-muted-foreground ml-1">Configuración del Link</label>

                    <div className="flex flex-col gap-1.5">
                        <input
                            name="email"
                            type="text"
                            placeholder="¿Para quién es? (nombre o email, opcional)"
                            className="w-full bg-surface border border-hairline rounded-xl px-3 py-2.5 text-[11px] font-bold text-foreground placeholder:text-subtle outline-none focus:border-emerald-500/50 transition-all"
                        />
                        <p className="text-[8px] text-subtle font-medium ml-1 leading-relaxed">
                            Si ponés un email, el link solo va a servir para ese correo. Con un nombre, queda como referencia para saber a quién se lo enviaste.
                        </p>
                    </div>

                    <div className="bg-surface border border-hairline p-3 rounded-xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <User className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-wider text-foreground">Rol: Jugador Libre</span>
                            <span className="text-[8px] font-bold text-muted-foreground opacity-70 leading-tight">Acceso estándar al feed y torneos públicos</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 relative z-10">
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                        <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-wide text-amber-400">
                                Cómo funciona el link
                            </p>
                            <ul className="space-y-0.5 text-[9px] font-medium text-muted-foreground leading-relaxed">
                                <li>· Lleva un <span className="text-amber-400 font-bold">token único</span>: no se puede adivinar ni reutilizar.</li>
                                <li>· Se anula solo <span className="text-amber-400 font-bold">al completarse el registro</span>.</li>
                                <li>· O <span className="text-amber-400 font-bold">a las 24 horas</span>, lo que pase primero.</li>
                                <li>· Podés anularlo antes desde la lista de abajo.</li>
                            </ul>
                        </div>
                    </div>

                    {generatedLink && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-2 p-1.5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 relative overflow-hidden"
                        >
                            <label className="text-[8px] font-black uppercase tracking-[0.25em] text-emerald-500 ml-3 pt-1 relative z-10">Link Generado</label>
                            <div className="flex flex-col sm:flex-row gap-1.5 px-1.5 pb-1.5 relative z-10">
                                <div className="flex-1 bg-surface-raised border border-hairline rounded-xl px-3 py-2.5 text-[10px] font-mono overflow-hidden text-ellipsis whitespace-nowrap text-emerald-400 ">
                                    {generatedLink}
                                </div>
                                <div className="flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={copyToClipboard}
                                        className="flex-1 sm:w-10 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center active:scale-90"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                    <a
                                        href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Te enviamos tu link de invitación para ACAP. Es personal, de un solo uso y vence en 24hs: ${generatedLink}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 sm:w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-90 flex items-center justify-center"
                                    >
                                        <Send className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="flex justify-end pt-2 relative z-10">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="glow-button w-full sm:w-auto bg-volt hover:bg-volt-dark text-carbon-950 px-8 py-2.5 rounded-xl border border-transparent text-[9px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando...
                            </>
                        ) : (
                            <>
                                Generar Link <LinkIcon className="w-3.5 h-3.5 ml-1" />
                            </>
                        )}
                    </button>
                </div>
            </form>

                {/* Historial: qué links siguen vivos, cuáles se usaron y quién los usó */}
                <div className="glass-card p-4 md:p-5 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-surface border border-hairline flex items-center justify-center">
                            <History className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-[11px] font-black uppercase italic tracking-tight text-foreground leading-none">Invitaciones generadas</h2>
                            <span className="text-[9px] font-bold text-muted-foreground">
                                {invitations.filter(i => i.status === "pendiente").length} activas de {invitations.length}
                            </span>
                        </div>

                        <div className="ml-auto flex items-center gap-0.5 p-0.5 bg-surface border border-hairline rounded-lg">
                            {(["pendientes", "todas"] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-2.5 h-6 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${filter === f
                                        ? "bg-emerald-500 text-carbon-950"
                                        : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {visibleInvitations.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground py-6 text-center font-medium">
                            {invitations.length === 0
                                ? "Todavía no generaste invitaciones."
                                : "No hay invitaciones pendientes."}
                        </p>
                    ) : (
                        <div className="divide-y divide-hairline">
                            {visibleInvitations.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between gap-3 py-2.5">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${STATUS_STYLES[inv.status]}`}>
                                            {inv.status}
                                        </span>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-black uppercase tracking-wide text-foreground truncate">
                                                {inv.label || inv.email || inv.role}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground truncate">
                                                {inv.status === "usada"
                                                    ? `Usada por ${inv.usedByUserId} · ${formatDate(inv.usedAt)}`
                                                    : inv.status === "pendiente"
                                                        ? `Vence ${formatDate(inv.expiresAt)}`
                                                        : `Creada ${formatDate(inv.createdAt)}`}
                                            </span>
                                        </div>
                                    </div>

                                    {inv.status === "pendiente" && (
                                        <div className="shrink-0 flex items-center gap-1.5">
                                            <button
                                                onClick={() => copyInvitation(inv.id)}
                                                disabled={busyId === inv.id}
                                                title="Copiar link"
                                                className="w-7 h-7 rounded-lg bg-surface border border-hairline text-muted-foreground flex items-center justify-center hover:border-emerald-500/50 hover:text-emerald-400 transition-all disabled:opacity-50"
                                            >
                                                {busyId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" />
                                                    : copiedId === inv.id ? <Check className="w-3 h-3 text-emerald-400" />
                                                        : <Copy className="w-3 h-3" />}
                                            </button>
                                            <button
                                                onClick={() => shareInvitation(inv.id)}
                                                disabled={busyId === inv.id}
                                                title="Reenviar por WhatsApp"
                                                className="w-7 h-7 rounded-lg bg-surface border border-hairline text-muted-foreground flex items-center justify-center hover:border-blue-500/50 hover:text-blue-400 transition-all disabled:opacity-50"
                                            >
                                                <Send className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => handleRevoke(inv.id)}
                                                disabled={revokingId === inv.id}
                                                className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg bg-rojo/10 border border-rojo/30 text-rojo text-[8px] font-black uppercase tracking-widest hover:bg-rojo hover:text-white transition-all disabled:opacity-50"
                                            >
                                                {revokingId === inv.id
                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                    : <Ban className="w-3 h-3" />}
                                                Anular
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
