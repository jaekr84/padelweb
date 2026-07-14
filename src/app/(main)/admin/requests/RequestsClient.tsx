"use client";

import { useEffect, useState, useTransition } from "react";
import {
    getRegistrationRequests,
    updateRequestStatus,
    deleteRequestAction,
    getContactMessages,
    updateMessageStatus,
    deleteMessageAction,
    getPendingSignups,
    approveSignupAction,
    rejectSignupAction
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
    EyeOff,
    Search,
    Layers,
    UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RequestsClient() {
    const [activeTab, setActiveTab] = useState<"registro" | "altas" | "mensajes">("registro");
    const [requests, setRequests] = useState<any[]>([]);
    const [signups, setSignups] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(true);
    const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === "registro") {
                const data = await getRegistrationRequests();
                setRequests(data);
            } else if (activeTab === "altas") {
                const data = await getPendingSignups();
                setSignups(data);
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

    const handleApproveSignup = async (userId: string) => {
        startTransition(async () => {
            try {
                await approveSignupAction(userId);
                setSignups(prev => prev.filter(s => s.id !== userId));
                toast.success("Cuenta aprobada. El usuario ya puede iniciar sesión.");
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

    const handleRejectSignup = async (userId: string) => {
        if (!confirm("¿Rechazar y eliminar esta cuenta permanentemente?")) return;
        startTransition(async () => {
            try {
                await rejectSignupAction(userId);
                setSignups(prev => prev.filter(s => s.id !== userId));
                toast.success("Cuenta rechazada y eliminada");
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
            case 'pendiente': return { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', icon: Clock, label: 'Pendiente' };
            case 'enviado': return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: Send, label: 'Enviado' };
            case 'aceptado': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle2, label: 'Registrado' };
            case 'rechazado': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Rechazado' };
            case 'caducado': return { bg: 'bg-white/5', border: 'border-slate-500/20', text: 'text-slate-500', icon: Clock, label: 'Caducado' };
            default: return { bg: 'bg-white/10', border: 'border-white/10', text: 'text-slate-500', icon: Clock, label: status };
        }
    };

    const copyLink = (link: string) => {
        navigator.clipboard.writeText(link);
        toast.success("Copiado al portapapeles");
    };

    const filteredItems = (activeTab === "registro" ? requests : activeTab === "altas" ? signups : messages).filter(item => {
        const search = searchQuery.toLowerCase();
        if (activeTab === "registro") {
            return item.fullName.toLowerCase().includes(search) || item.whatsapp.includes(search);
        }
        if (activeTab === "altas") {
            const fullName = `${item.firstName || ""} ${item.lastName || ""}`.toLowerCase();
            return fullName.includes(search) || item.email.toLowerCase().includes(search) || (item.phone || "").includes(search);
        }
        return item.name.toLowerCase().includes(search) || item.email.toLowerCase().includes(search) || item.subject.toLowerCase().includes(search);
    });

    return (
        <>
            <style>{`
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .text-gradient-animate {
                    background: linear-gradient(to right, #4f46e5, #3b82f6, #4f46e5);
                    background-size: 300% 300%;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: gradient-x 6s ease infinite;
                }
                .glass-card {
                    background-color: rgba(17, 26, 46, 0.8); /* carbon-800 */
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .glass-card:hover {
                    border-color: rgba(79, 70, 229, 0.4);
                }
            `}</style>

            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/5 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            </div>

            <div className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 py-4 md:py-6 space-y-4 font-sans selection:bg-indigo-500/30">
                <motion.header 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4"
                >
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/5">
                                    {activeTab === "registro" ? <ShieldCheck className="w-5 h-5 text-indigo-400" /> : activeTab === "altas" ? <UserPlus className="w-5 h-5 text-indigo-400" /> : <Inbox className="w-5 h-5 text-indigo-400" />}
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-400 italic">Admin Tactical Console</span>
                                    <div className="h-px w-10 bg-indigo-500/30 mt-0.5" />
                                </div>
                            </div>
                            <h1 className="text-xl md:text-3xl heading-sport leading-none text-white">
                                {activeTab === "registro" ? "Solicitudes de " : activeTab === "altas" ? "Aprobación de " : "Buzón de " }
                                <span className="text-gradient-animate">
                                    {activeTab === "registro" ? "Registro" : activeTab === "altas" ? "Altas" : "Mensajes" }
                                </span>
                            </h1>
                            <p className="text-slate-400 text-[9px] font-black mt-1.5 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Layers className="w-2.5 h-2.5" /> Gestión centralizada de comunicaciones y nuevos accesos
                            </p>
                        </div>

                        <div className="flex p-0.5 bg-white/10 border border-white/10 rounded-xl w-full sm:w-fit self-end">
                            <button 
                                onClick={() => setActiveTab("registro")}
                                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all gap-1.5 flex items-center justify-center ${activeTab === "registro" ? "bg-white/10 text-indigo-400 border border-white/10" : "text-slate-400 hover:text-white"}`}
                            >
                                <ShieldCheck className="w-3.5 h-3.5" /> Registro
                            </button>
                            <button
                                onClick={() => setActiveTab("altas")}
                                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all gap-1.5 flex items-center justify-center ${activeTab === "altas" ? "bg-white/10 text-indigo-400 border border-white/10" : "text-slate-400 hover:text-white"}`}
                            >
                                <UserPlus className="w-3.5 h-3.5" /> Altas
                            </button>
                            <button
                                onClick={() => setActiveTab("mensajes")}
                                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all gap-1.5 flex items-center justify-center ${activeTab === "mensajes" ? "bg-white/10 text-indigo-400 border border-white/10" : "text-slate-400 hover:text-white"}`}
                            >
                                <Mail className="w-3.5 h-3.5" /> Mensajes
                            </button>
                        </div>
                    </div>

                    <div className="relative group w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder={`BUSCAR ${activeTab === 'registro' ? 'SOLICITUD (NOMBRE, WHATSAPP)' : activeTab === 'altas' ? 'ALTA (NOMBRE, EMAIL, TELÉFONO)' : 'MENSAJE (NOMBRE, EMAIL, ASUNTO)'}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-carbon-800/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                        />
                    </div>
                </motion.header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 animate-pulse">Sincronizando Sistema...</span>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card rounded-xl p-12 text-center flex flex-col items-center gap-4 shadow-sm border-dashed"
                    >
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-slate-400 border border-white/10 opacity-50">
                            {activeTab === "registro" ? <ShieldCheck className="w-5 h-5" /> : activeTab === "altas" ? <UserPlus className="w-5 h-5" /> : <Inbox className="w-5 h-5" />}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-black uppercase italic tracking-tight text-white">Sin registros encontrados</h3>
                            <p className="text-[9px] text-slate-400 max-w-xs mx-auto font-black uppercase tracking-widest">No hay elementos que coincidan con los criterios actuales.</p>
                        </div>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        <AnimatePresence mode="popLayout">
                            {activeTab === "registro" ? (
                                (filteredItems as any[]).map((req) => {
                                    const statusStyle = getStatusStyle(req.status, req.createdAt);
                                    const StatusIcon = statusStyle.icon;

                                    return (
                                        <motion.div
                                            key={req.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            className={`glass-card p-3 rounded-xl transition-all relative overflow-hidden group ${
                                                req.status === 'pendiente' 
                                                    ? 'border-indigo-500/40 bg-indigo-500/[0.02]' 
                                                    : 'opacity-70'
                                            }`}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105 ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                                                        <StatusIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-sm font-black uppercase italic tracking-tight text-white leading-none">{req.fullName}</h3>
                                                            <span className={`px-1.5 py-0.5 rounded-md border text-[7px] font-black uppercase tracking-widest ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                                                                {statusStyle.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="flex items-center gap-1 text-indigo-400 font-black text-[9px] uppercase tracking-widest">
                                                                <Phone className="w-3 h-3" /> {req.whatsapp}
                                                            </span>
                                                            <span className="flex items-center gap-1 text-slate-400 font-black text-[9px] uppercase tracking-widest">
                                                                <Calendar className="w-3 h-3" /> {new Date(req.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {req.status === 'pendiente' ? (
                                                        <div className="flex items-center gap-2 w-full md:w-auto">
                                                            <button
                                                                onClick={() => handleUpdateStatus(req.id, "rechazado")}
                                                                disabled={isPending}
                                                                className="h-8 px-4 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all font-black uppercase tracking-widest text-[8px] flex items-center gap-1.5"
                                                            >
                                                                <XCircle className="w-3 h-3" /> Rechazar
                                                            </button>
                                                            <button
                                                                onClick={() => handleProcess(req.id, req.whatsapp, req.fullName)}
                                                                disabled={isPending}
                                                                className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                                                            >
                                                                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                                                                Aprobar e Invitar
                                                            </button>
                                                        </div>
                                                    ) : req.status === 'enviado' ? (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleProcess(req.id, req.whatsapp, req.fullName)}
                                                                className="h-8 px-3 rounded-lg border border-blue-500/30 bg-blue-500/15 text-blue-400 text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5"
                                                            >
                                                                <Send className="w-3 h-3" /> Re-enviar
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateStatus(req.id, "aceptado")}
                                                                className="h-8 px-3 rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 text-[8px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1.5"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3" /> Registrar
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUpdateStatus(req.id, "pendiente")}
                                                            className="h-8 px-3 rounded-lg bg-white/10 text-slate-400 text-[8px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-1.5"
                                                        >
                                                            <Clock className="w-3 h-3" /> Reset
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(req.id)}
                                                        className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-slate-400 border border-white/10 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-90"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {generatedLinks[req.id] && req.status === 'enviado' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2 relative z-10"
                                                >
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[7px] font-black uppercase tracking-widest text-indigo-400 ml-1">Tactical Invite Link</label>
                                                        <div className="flex gap-2">
                                                            <div className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-[9px] font-mono overflow-hidden text-ellipsis whitespace-nowrap text-indigo-400 ">
                                                                {generatedLinks[req.id]}
                                                            </div>
                                                            <button
                                                                onClick={() => copyLink(generatedLinks[req.id])}
                                                                className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-sm flex items-center justify-center active:scale-90"
                                                            >
                                                                <Copy className="w-3.5 h-3.5" />
                                                            </button>
                                                            <a
                                                                href={`https://wa.me/${req.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Hola ${req.fullName}! Te enviamos tu link de registro para ACAP: ${generatedLinks[req.id]}`)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="w-8 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-sm flex items-center justify-center active:scale-90"
                                                            >
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    );
                                })
                            ) : activeTab === "altas" ? (
                                (filteredItems as any[]).map((signup) => (
                                    <motion.div
                                        key={signup.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className="glass-card p-3 rounded-xl transition-all relative overflow-hidden group border-indigo-500/40 bg-indigo-500/[0.02]"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105 bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
                                                    <UserPlus className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm font-black uppercase italic tracking-tight text-white leading-none">
                                                            {signup.firstName} {signup.lastName}
                                                        </h3>
                                                        <span className="px-1.5 py-0.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[7px] font-black uppercase tracking-widest">
                                                            {signup.role}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 mt-1">
                                                        <span className="flex items-center gap-1 text-indigo-400 font-black text-[9px] uppercase tracking-widest">
                                                            <Mail className="w-3 h-3" /> {signup.email}
                                                        </span>
                                                        {signup.phone && (
                                                            <span className="flex items-center gap-1 text-indigo-400 font-black text-[9px] uppercase tracking-widest">
                                                                <Phone className="w-3 h-3" /> {signup.phone}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1 text-slate-400 font-black text-[9px] uppercase tracking-widest">
                                                            <Calendar className="w-3 h-3" /> {new Date(signup.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 w-full md:w-auto">
                                                <button
                                                    onClick={() => handleRejectSignup(signup.id)}
                                                    disabled={isPending}
                                                    className="h-8 px-4 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all font-black uppercase tracking-widest text-[8px] flex items-center gap-1.5"
                                                >
                                                    <XCircle className="w-3 h-3" /> Rechazar
                                                </button>
                                                <button
                                                    onClick={() => handleApproveSignup(signup.id)}
                                                    disabled={isPending}
                                                    className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                                                >
                                                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                                    Aprobar
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                (filteredItems as any[]).map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className={`glass-card p-2.5 rounded-xl transition-all relative overflow-hidden group ${
                                            msg.status === 'pendiente' 
                                                ? 'border-indigo-500/40 bg-indigo-500/[0.02]' 
                                                : 'opacity-70 grayscale-[0.2] hover:grayscale-0'
                                        }`}
                                    >
                                        <div className="flex flex-col gap-2.5 relative z-10">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105 ${msg.status === 'pendiente' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-white/10 border-white/10 text-slate-400'}`}>
                                                        {msg.status === 'pendiente' ? <Mail className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-[13px] font-black uppercase italic tracking-tight text-white leading-none">{msg.name}</h3>
                                                            {msg.status === 'pendiente' && (
                                                                <span className="px-1.5 py-0.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[7px] font-black uppercase tracking-widest">Nuevo</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="flex items-center gap-1 text-indigo-400 font-black text-[8px] uppercase tracking-widest">
                                                                <Mail className="w-2.5 h-2.5" /> {msg.email}
                                                            </span>
                                                            <span className="flex items-center gap-1 text-slate-400 font-black text-[8px] uppercase tracking-widest">
                                                                <Calendar className="w-2.5 h-2.5" /> {new Date(msg.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 ml-auto md:ml-0">
                                                    <button
                                                        onClick={() => handleToggleMessageStatus(msg.id, msg.status)}
                                                        className={`h-7 px-3 rounded-lg border transition-all active:scale-95 text-[7px] font-black uppercase tracking-widest flex items-center gap-1.5 ${msg.status === 'leido' ? 'bg-white/10 text-slate-400 border-white/10 hover:text-white' : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'}`}
                                                    >
                                                        {msg.status === 'leido' ? <><EyeOff className="w-3 h-3" /> Pendiente</> : <><Eye className="w-3 h-3" /> Leído</>}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-400 border border-white/10 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-95"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-2.5 bg-carbon-800/40 border border-white/10 rounded-lg space-y-1">
                                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400/70 italic leading-none">{msg.subject}</p>
                                                <p className="text-[10px] text-white leading-relaxed font-medium">
                                                    {msg.message}
                                                </p>
                                            </div>

                                            <div className="flex justify-end pt-0.5">
                                                <a 
                                                    href={`mailto:${msg.email}?subject=RE: ${msg.subject}`}
                                                    className="h-7 px-4 bg-volt text-carbon-950 rounded-lg text-[7px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 shadow-sm"
                                                >
                                                    <Send className="w-3 h-3" /> Responder Comunicación
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
