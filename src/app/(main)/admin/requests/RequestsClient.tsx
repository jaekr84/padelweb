"use client";

import { useEffect, useState, useTransition } from "react";
import { getRegistrationRequests, updateRequestStatus, deleteRequestAction } from "./actions";
import { generateInvitationLink } from "../invitations/actions";
import { toast } from "sonner";
import {
    MessageSquare,
    User,
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
    XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RequestsClient() {
    const [requests, setRequests] = useState<any[]>([]);
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(true);
    const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const data = await getRegistrationRequests();
            setRequests(data);
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
                await loadRequests();
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
                await loadRequests();
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

    const getStatusStyle = (status: string, createdAt: Date) => {
        const isExpired = status === 'enviado' && (new Date().getTime() - new Date(createdAt).getTime() > 2 * 60 * 60 * 1000);
        const currentStatus = isExpired ? 'caducado' : status;

        switch (currentStatus) {
            case 'pendiente': return { bg: 'bg-indigo-600/10', border: 'border-indigo-500/20', text: 'text-indigo-400', icon: Clock, label: 'Pendiente' };
            case 'enviado': return { bg: 'bg-blue-600/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: Send, label: 'Enviado' };
            case 'aceptado': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle2, label: 'Registrado' };
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
        <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-8">
            <header className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-[1.25rem] bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                        <MessageSquare className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight leading-none text-foreground">Notificaciones</h1>
                        <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Gestión de nuevos ingresos</p>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cargando solicitudes...</span>
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-card border border-border rounded-[2.5rem] p-12 md:p-20 text-center flex flex-col items-center gap-6 shadow-xl">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-border">
                        <ShieldCheck className="w-10 h-10 opacity-20" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-black uppercase italic tracking-tight text-foreground">Sin solicitudes</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium">Buen trabajo, has procesado todas las peticiones externas.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {requests.map((req) => {
                            const statusStyle = getStatusStyle(req.status, req.createdAt);
                            const StatusIcon = statusStyle.icon;

                            return (
                                <motion.div
                                    key={req.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className={`bg-card p-5 md:p-8 rounded-[2.5rem] border transition-all relative overflow-hidden group ${
                                        req.status === 'pendiente' 
                                            ? 'border-indigo-500/30 shadow-[0_20px_40px_-15px_rgba(79,70,229,0.1)]' 
                                            : 'border-border/50 opacity-60 grayscale-[0.5]'
                                    }`}
                                >
                                    <div className="flex flex-col gap-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border transition-all shadow-sm ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                                                    <StatusIcon className="w-6 h-6 md:w-8 md:h-8" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tight text-foreground">{req.fullName}</h3>
                                                        <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                                                            {statusStyle.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col md:flex-row md:items-center gap-x-4 gap-y-1">
                                                        <div className="flex items-center gap-2 text-indigo-500 font-bold text-[10px] md:text-[11px] uppercase tracking-widest">
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
                                                        className="w-full lg:flex-1 h-12 rounded-xl md:rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                        Rechazar
                                                    </button>
                                                    <button
                                                        onClick={() => handleProcess(req.id, req.whatsapp, req.fullName)}
                                                        disabled={isPending}
                                                        className="w-full lg:flex-[2] h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                                                    >
                                                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                        Aprobar e Invitar
                                                    </button>
                                                </>
                                            )}

                                            {req.status === 'enviado' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(req.id, "aceptado")}
                                                    disabled={isPending}
                                                    className="w-full flex-1 h-12 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Marcar como Registrado
                                                </button>
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

                                        {/* Generated Link Tray */}
                                        {generatedLinks[req.id] && req.status === 'enviado' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                className="pt-6 border-t border-border flex flex-col gap-4"
                                            >
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 ml-1">Link de Invitación Generado</label>
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <div className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-[11px] font-mono overflow-hidden text-ellipsis whitespace-nowrap text-indigo-600 dark:text-indigo-300">
                                                            {generatedLinks[req.id]}
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => copyLink(generatedLinks[req.id])}
                                                                className="flex-1 sm:flex-none h-12 w-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg flex items-center justify-center active:scale-90"
                                                                title="Copiar Link"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                            <a
                                                                href={`https://wa.me/${req.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Hola ${req.fullName}! Te enviamos tu link de registro para ACAP (válido por 2hs): ${generatedLinks[req.id]}`)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex-1 sm:flex-none h-12 w-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg flex items-center justify-center active:scale-90"
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
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
