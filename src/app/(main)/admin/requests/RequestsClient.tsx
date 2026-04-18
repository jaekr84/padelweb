"use client";

import { useEffect, useState, useTransition } from "react";
import { 
    getRegistrationRequests, 
    updateRequestStatus, 
    deleteRequestAction,
    getContactMessages,
    updateMessageStatus,
    deleteMessageAction
} from "./actions";
import { generateInvitationLink } from "../invitations/actions";
import { toast } from "sonner";
import {
    MessageSquare,
    Calendar,
    Phone,
    CheckCircle2,
    Clock,
    Trash2,
    Loader2,
    Copy,
    ExternalLink,
    ShieldCheck,
    Send,
    XCircle,
    Mail,
    Inbox,
    Eye,
    EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RequestsClient() {
    const [activeTab, setActiveTab] = useState<"registro" | "mensajes">("registro");
    const [requests, setRequests] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(true);
    const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === "registro") {
                const data = await getRegistrationRequests();
                setRequests(data);
            } else {
                const data = await getContactMessages();
                setMessages(data);
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async (id: string, whatsapp: string, fullName: string) => {
        startTransition(async () => {
            try {
                const link = await generateInvitationLink("jugador");
                await updateRequestStatus(id, "enviado");
                setGeneratedLinks(prev => ({ ...prev, [id]: link }));
                await loadData();
                toast.success("Link generado y solicitud actualizada");
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

    const handleUpdateStatus = async (id: string, status: "pendiente" | "enviado" | "aceptado" | "rechazado" | "caducado") => {
        if (status === "rechazado" && !confirm("¿Marcar esta solicitud como rechazada?")) return;
        startTransition(async () => {
            try {
                await updateRequestStatus(id, status);
                await loadData();
                toast.success(`Estado actualizado a ${status}`);
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar solicitud permanentemente?")) return;
        try {
            await deleteRequestAction(id);
            setRequests(requests.filter(r => r.id !== id));
            toast.success("Solicitud eliminada");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    // Message Actions
    const handleToggleMessageStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === "pendiente" ? "leido" : "pendiente";
        startTransition(async () => {
            try {
                await updateMessageStatus(id, newStatus as any);
                await loadData();
                toast.success(newStatus === "leido" ? "Marcado como leído" : "Marcado como pendiente");
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

    const handleDeleteMessage = async (id: string) => {
        if (!confirm("¿Eliminar este mensaje permanentemente?")) return;
        try {
            await deleteMessageAction(id);
            setMessages(messages.filter(m => m.id !== id));
            toast.success("Mensaje eliminado");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const getStatusStyle = (status: string, createdAt: Date) => {
        const isExpired = status === 'enviado' && (new Date().getTime() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000);
        const currentStatus = isExpired ? 'caducado' : status;

        switch (currentStatus) {
            case 'pendiente': return { bg: 'bg-azul-primary/10', border: 'border-azul-primary/20', text: 'text-azul-primary', icon: Clock, label: 'Pendiente' };
            case 'enviado': return { bg: 'bg-celeste/10', border: 'border-celeste/20', text: 'text-celeste', icon: Send, label: 'Enviado' };
            case 'aceptado': return { bg: 'bg-azul-primary/10', border: 'border-azul-primary/20', text: 'text-azul-primary', icon: CheckCircle2, label: 'Registrado' };
            case 'rechazado': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Rechazado' };
            case 'caducado': return { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-500', icon: Clock, label: 'Caducado' };
            default: return { bg: 'bg-slate-600/10', border: 'border-slate-500/20', text: 'text-slate-400', icon: Clock, label: status };
        }
    };

    const copyLink = (link: string) => {
        navigator.clipboard.writeText(link);
        toast.success("Copiado al portapapeles");
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
                    background: linear-gradient(to right, var(--azul-primary), var(--celeste), var(--azul-primary));
                    background-size: 300% 300%;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: gradient-x 6s ease infinite;
                }
                .glass-card {
                    background-color: color-mix(in srgb, var(--card) 90%, transparent);
                    backdrop-filter: blur(20px);
                    border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
                }
                .glass-card:hover {
                    border-color: var(--azul-primary);
                }
                .glow-button {
                    position: relative;
                }
                .glow-button::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: 2rem;
                    background: linear-gradient(45deg, var(--azul-primary), var(--celeste));
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
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-azul-primary/10 rounded-full blur-[150px]" />
                <div className="absolute top-[30%] right-[-15%] w-[500px] h-[500px] bg-celeste/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 flex-1 w-full max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-8 font-sans selection:bg-azul-primary/30">
                <motion.header 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-8 mb-4"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground shadow-sm relative overflow-hidden">
                                <div className="absolute inset-0 bg-azul-primary/10 blur-xl opacity-50" />
                                {activeTab === "registro" ? <MessageSquare className="relative z-10 w-6 h-6" /> : <Inbox className="relative z-10 w-6 h-6" />}
                            </div>
                            <div>
                                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-azul-primary/80 mb-1">Centro Administrativo</p>
                                <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tight leading-none text-foreground">
                                    {activeTab === "registro" ? "Solicitudes de " : "Buzón de " }
                                    <span className="text-gradient-animate drop-shadow-[0_0_20px_var(--azul-primary),0.3)]">
                                        {activeTab === "registro" ? "Registro" : "Mensajes" }
                                    </span>
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Selector */}
                    <div className="flex p-1 bg-muted/50 border border-border rounded-2xl w-full sm:w-fit">
                        <button 
                            onClick={() => setActiveTab("registro")}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${activeTab === "registro" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <ShieldCheck className="w-4 h-4" /> Registro
                        </button>
                        <button 
                            onClick={() => setActiveTab("mensajes")}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${activeTab === "mensajes" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <Mail className="w-4 h-4" /> Mensajes
                        </button>
                    </div>
                </motion.header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-azul-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sincronizando...</span>
                </div>
            ) : (activeTab === "registro" ? requests : messages).length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-[2.5rem] p-12 md:p-20 text-center flex flex-col items-center gap-6 shadow-xl relative overflow-hidden group"
                >
                    <div className="absolute top-[-30%] right-[-10%] w-[300px] h-[300px] bg-azul-primary/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-border relative z-10">
                        {activeTab === "registro" ? <ShieldCheck className="w-10 h-10 opacity-20" /> : <Inbox className="w-10 h-10 opacity-20" />}
                    </div>
                    <div className="space-y-2 relative z-10">
                        <h3 className="text-xl font-black uppercase italic tracking-tight text-foreground">
                            {activeTab === "registro" ? "Sin solicitudes" : "Buzón vacío"}
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium">
                            {activeTab === "registro" ? "Buen trabajo, has procesado todas las peticiones externas." : "No hay mensajes de contacto por el momento."}
                        </p>
                    </div>
                </motion.div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {activeTab === "registro" ? (
                            requests.map((req) => {
                                const statusStyle = getStatusStyle(req.status, req.createdAt);
                                const StatusIcon = statusStyle.icon;

                                return (
                                    <motion.div
                                        key={req.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className={`glass-card p-5 md:p-8 rounded-[2.5rem] transition-all relative overflow-hidden group ${
                                            req.status === 'pendiente' 
                                                ? 'shadow-[0_20px_40px_-15px_rgba(30,58,138,0.15)] border-azul-primary/30' 
                                                : 'opacity-60 grayscale-[0.2] hover:grayscale-0'
                                        }`}
                                    >
                                        <div className="absolute top-0 right-0 w-40 h-40 bg-azul-primary/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        
                                        <div className="flex flex-col gap-6 relative z-10">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border transition-all shadow-sm ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                                                        <StatusIcon className="w-6 h-6 md:w-8 md:h-8" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div className="flex flex-wrap items-center gap-2 text-left">
                                                            <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tight text-foreground">{req.fullName}</h3>
                                                            <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                                                                {statusStyle.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col md:flex-row md:items-center gap-x-4 gap-y-1">
                                                            <div className="flex items-center gap-2 text-azul-primary font-bold text-[10px] md:text-[11px] uppercase tracking-widest">
                                                                <Phone className="w-3.5 h-3.5" />
                                                                {req.whatsapp}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-muted-foreground font-bold text-[10px] md:text-[11px] uppercase tracking-widest">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {new Date(req.createdAt).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 ml-auto md:ml-0">
                                                    <button
                                                        onClick={() => handleDelete(req.id)}
                                                        className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-muted text-muted-foreground border border-border hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-90"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3">
                                                {req.status === 'pendiente' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleUpdateStatus(req.id, "rechazado")}
                                                            disabled={isPending}
                                                            className="w-full lg:flex-1 h-12 rounded-xl md:rounded-2xl bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                            Rechazar
                                                        </button>
                                                        <button
                                                            onClick={() => handleProcess(req.id, req.whatsapp, req.fullName)}
                                                            disabled={isPending}
                                                            className="glow-button w-full lg:flex-[2] h-12 bg-foreground hover:bg-foreground/90 text-background rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-azul-primary/20 active:scale-95 disabled:opacity-50 border border-border"
                                                        >
                                                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                            Aprobar e Invitar
                                                        </button>
                                                    </>
                                                )}

                                                {req.status === 'enviado' && (
                                                    <div className="flex flex-col sm:flex-row gap-2 w-full flex-1">
                                                        <button
                                                            onClick={() => handleProcess(req.id, req.whatsapp, req.fullName)}
                                                            disabled={isPending}
                                                            className="w-full flex-1 h-12 bg-azul-primary/10 hover:bg-azul-primary text-azul-primary hover:text-white rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest border border-azul-primary/20 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                            Re-generar Link
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(req.id, "aceptado")}
                                                            disabled={isPending}
                                                            className="w-full flex-[1.5] h-12 bg-celeste/10 hover:bg-celeste text-celeste hover:text-white rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest border border-celeste/20 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            Marcar Registrado
                                                        </button>
                                                    </div>
                                                )}

                                                {(req.status === 'rechazado' || req.status === 'aceptado' || req.status === 'caducado') && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(req.id, "pendiente")}
                                                        disabled={isPending}
                                                        className="w-full flex-1 h-12 bg-muted hover:bg-border text-muted-foreground rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Clock className="w-4 h-4" />
                                                        Reiniciar Estado
                                                    </button>
                                                )}
                                            </div>

                                            {generatedLinks[req.id] && req.status === 'enviado' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    className="pt-6 border-t border-border flex flex-col gap-4"
                                                >
                                                    <div className="flex flex-col gap-2 text-left">
                                                        <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-azul-primary ml-1">Link de Invitación Generado</label>
                                                        <div className="flex flex-col sm:flex-row gap-2">
                                                            <div className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-[11px] font-mono overflow-hidden text-ellipsis whitespace-nowrap text-azul-primary ">
                                                                {generatedLinks[req.id]}
                                                            </div>
                                                            <div className="flex gap-2 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyLink(generatedLinks[req.id])}
                                                                    className="flex-1 sm:flex-none h-12 w-12 bg-azul-primary hover:bg-azul-primary/80 text-white rounded-xl transition-all shadow-lg flex items-center justify-center active:scale-90"
                                                                    title="Copiar Link"
                                                                >
                                                                    <Copy className="w-4 h-4" />
                                                                </button>
                                                                <a
                                                                    href={`https://wa.me/${req.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Hola ${req.fullName}! Te enviamos tu link de registro para ACAP (válido por 24hs): ${generatedLinks[req.id]}`)}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex-1 sm:flex-none h-12 w-12 bg-celeste hover:bg-celeste/80 text-white rounded-xl transition-all shadow-lg flex items-center justify-center active:scale-90"
                                                                    title="Enviar por WhatsApp"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className={`glass-card p-6 md:p-8 rounded-[2.5rem] transition-all relative overflow-hidden group ${
                                        msg.status === 'pendiente' 
                                            ? 'shadow-[0_20px_40px_-15px_rgba(30,58,138,0.15)] border-celeste/30 bg-celeste/5' 
                                            : 'opacity-70'
                                    }`}
                                >
                                    <div className="flex flex-col gap-6 relative z-10">
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex items-start gap-4 text-left">
                                                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border transition-all ${msg.status === 'pendiente' ? 'bg-celeste/20 border-celeste/40 text-celeste' : 'bg-muted border-border text-muted-foreground'}`}>
                                                    {msg.status === 'pendiente' ? <Mail className="w-6 h-6" /> : <ExternalLink className="w-6 h-6" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-lg font-black uppercase italic tracking-tight text-foreground">{msg.name}</h3>
                                                        {msg.status === 'pendiente' && (
                                                            <span className="px-2 py-0.5 rounded-lg border border-celeste/30 bg-celeste/10 text-celeste text-[8px] font-black uppercase tracking-widest">
                                                                Nuevo
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-azul-primary font-bold text-[10px] md:text-[11px] uppercase tracking-widest flex items-center gap-2">
                                                        <Mail className="w-3.5 h-3.5" /> {msg.email}
                                                    </p>
                                                    <p className="text-muted-foreground font-bold text-[10px] md:text-[11px] uppercase tracking-widest flex items-center gap-2">
                                                        <Calendar className="w-3.5 h-3.5" /> {new Date(msg.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 ml-auto md:ml-0">
                                                <button
                                                    onClick={() => handleToggleMessageStatus(msg.id, msg.status)}
                                                    className={`p-3 rounded-xl border transition-all active:scale-95 ${msg.status === 'leido' ? 'bg-muted text-muted-foreground border-border hover:text-foreground' : 'bg-celeste text-black border-celeste hover:bg-celeste/80'}`}
                                                    title={msg.status === 'leido' ? "Marcar como no leído" : "Marcar como leído"}
                                                >
                                                    {msg.status === 'leido' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className="p-3 rounded-xl bg-muted text-muted-foreground border border-border hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-95"
                                                    title="Eliminar mensaje"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-5 md:p-6 bg-background/40 border border-border rounded-2xl space-y-3 text-left">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-azul-primary/60">{msg.subject}</p>
                                            <p className="text-sm text-foreground leading-relaxed font-medium">
                                                {msg.message}
                                            </p>
                                        </div>

                                        <div className="flex justify-end">
                                            <a 
                                                href={`mailto:${msg.email}?subject=RE: ${msg.subject}`}
                                                className="w-full sm:w-auto px-6 h-12 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 shadow-lg shadow-white/5"
                                            >
                                                <Send className="w-4 h-4" /> Responder por Email
                                            </a>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            )}
            </div>
        </>
    );
}
