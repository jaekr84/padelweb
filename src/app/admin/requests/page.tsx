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

export default function RegistrationRequestsPage() {
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
        <div className="max-w-4xl space-y-8">
            <header className="flex flex-col gap-2 border-b border-white/5 pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tight text-white">Notificaciones</h1>
                        <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em]">Gestión de nuevos ingresos</p>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 p-20 text-center flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-600 border border-white/5">
                        <ShieldCheck className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black uppercase text-white italic tracking-tight">No hay solicitudes</h3>
                    <p className="text-slate-500 font-medium">Todas las peticiones han sido procesadas.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence mode="popLayout">
                        {requests.map((req) => {
                            const statusStyle = getStatusStyle(req.status, req.createdAt);
                            const StatusIcon = statusStyle.icon;

                            return (
                                <motion.div
                                    key={req.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`bg-slate-900/40 p-6 md:p-8 rounded-[2rem] border transition-all ${req.status === 'pendiente' ? 'border-white/5 shadow-[0_0_50px_-20px_rgba(79,70,229,0.2)]' : 'border-white/5 opacity-80 group grayscale-[0.5] hover:grayscale-0'
                                        } relative overflow-hidden`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-start gap-5">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                                                <StatusIcon className="w-7 h-7" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-xl font-black uppercase italic tracking-tight text-white">{req.fullName}</h3>
                                                    <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                                                        {statusStyle.label}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px] uppercase tracking-widest">
                                                        <Phone className="w-3.5 h-3.5" />
                                                        {req.whatsapp}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px] uppercase tracking-widest">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(req.createdAt).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-3">
                                            {req.status === 'pendiente' && (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateStatus(req.id, "rechazado")}
                                                        disabled={isPending}
                                                        className="w-full sm:w-auto p-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                                                        title="Rechazar solicitud"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleProcess(req.id, req.whatsapp, req.fullName)}
                                                        disabled={isPending}
                                                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                                                    >
                                                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                        Aprobar y Enviar Link
                                                    </button>
                                                </>
                                            )}

                                            {req.status === 'enviado' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(req.id, "aceptado")}
                                                    disabled={isPending}
                                                    className="w-full sm:w-auto bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 transition-all active:scale-95"
                                                >
                                                    Marcar como Aceptado
                                                </button>
                                            )}

                                            {(req.status === 'rechazado' || req.status === 'aceptado' || req.status === 'caducado') && (
                                                <button
                                                    onClick={() => handleUpdateStatus(req.id, "pendiente")}
                                                    disabled={isPending}
                                                    className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-400 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Reiniciar
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDelete(req.id)}
                                                className="p-4 rounded-2xl bg-white/5 text-slate-500 border border-white/10 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-95"
                                                title="Eliminar de la lista"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Generated Link Tray */}
                                    {generatedLinks[req.id] && req.status === 'enviado' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            className="mt-6 pt-6 border-t border-white/5 flex flex-col gap-3"
                                        >
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-1">Link de Invitación Generado</label>
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-black/60 border border-indigo-500/30 rounded-xl px-4 py-3 text-[11px] font-mono whitespace-nowrap overflow-hidden text-ellipsis text-indigo-200">
                                                    {generatedLinks[req.id]}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => copyLink(generatedLinks[req.id])}
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all shadow-lg active:scale-90"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <a
                                                    href={`https://wa.me/${req.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Hola ${req.fullName}! Te enviamos tu link de registro para ACAP (válido por 2hs): ${generatedLinks[req.id]}`)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl transition-all shadow-lg active:scale-90 flex items-center justify-center"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
