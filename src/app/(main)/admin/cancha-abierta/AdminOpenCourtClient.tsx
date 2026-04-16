"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
    Plus, Search, Settings, Calendar, Clock, MapPin, 
    Users, DollarSign, Activity, Trash2, Edit, ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { OpenCourtEvent, Club, OpenCourtRegistration } from "@/db/schema";
import { deleteOpenCourtEventAction } from "./actions";
import { toast } from "sonner";

interface EventWithDetails extends OpenCourtEvent {
    club: Club | null;
    registrations: OpenCourtRegistration[];
}

interface Props {
    initialEvents: EventWithDetails[];
}

export default function AdminOpenCourtClient({ initialEvents }: Props) {
    const [events, setEvents] = useState(initialEvents);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredEvents = useMemo(() => {
        return events.filter(e => 
            e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.city?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [events, searchQuery]);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este evento?")) return;
        
        const res = await deleteOpenCourtEventAction(id);
        if (res.success) {
            setEvents(events.filter(e => e.id !== id));
            toast.success("Evento eliminado");
        } else {
            toast.error("Error al eliminar evento");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Gestión de Eventos</span>
                        <div className="h-px w-8 bg-emerald-500/30" />
                    </div>
                    <h1 className="text-4xl font-black uppercase italic tracking-tight text-foreground leading-none">
                        Cancha <span className="text-emerald-500">Abierta</span>
                    </h1>
                    <p className="text-xs font-medium text-muted-foreground mt-2 max-w-md">
                        Partidos organizados con rotación dinámica y balance de niveles.
                    </p>
                </div>
                <Link href="/admin/cancha-abierta/create">
                    <button className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[11px] py-4 px-8 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 group">
                        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                        Crear Evento
                    </button>
                </Link>
            </header>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-3 rounded-2xl border border-border/50">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-emerald-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, dirección o zona..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50"
                    />
                </div>
            </div>

            {/* Event List */}
            <div className="grid grid-cols-1 gap-4">
                {filteredEvents.length === 0 ? (
                    <div className="bg-card/30 border border-dashed border-border rounded-[2rem] py-20 text-center">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">No hay eventos creados</p>
                    </div>
                ) : (
                    filteredEvents.map((event) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group relative overflow-hidden bg-card/50 border border-border/50 rounded-3xl p-6 hover:border-emerald-500/50 transition-all shadow-sm hover:shadow-xl hover:shadow-emerald-500/5"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-6">
                                {/* Main Info */}
                                <div className="md:col-span-1 border-r border-border/30 pr-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                            event.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {event.status === 'active' ? 'Activo' : 'Finalizado'}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black uppercase italic tracking-tight text-foreground line-clamp-1 group-hover:text-emerald-500 transition-colors">
                                        <span className="capitalize">{event.name}</span>
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                                        <MapPin className="w-3 h-3" />
                                        <span className="text-[10px] font-bold tracking-widest leading-none capitalize">{event.city}</span>
                                        <span className="text-[8px] font-medium text-muted-foreground/40">• {event.address}</span>
                                    </div>
                                </div>

                                {/* Date & Time */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Fecha</span>
                                            <span className="text-xs font-black uppercase italic">{event.date}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Horario</span>
                                            <span className="text-xs font-black uppercase italic">{event.time}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-8">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Inscritos</span>
                                        <div className="flex items-end gap-1">
                                            <span className="text-2xl font-black italic leading-none">{event.registrations?.length || 0}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground/40 mb-0.5">/ {event.totalSlots}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Costo</span>
                                        <div className="flex items-center gap-0.5 text-emerald-500">
                                            <DollarSign className="w-3.5 h-3.5" />
                                            <span className="text-lg font-black italic leading-none">{event.registrationFee}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3">
                                    <Link 
                                        href={`/admin/cancha-abierta/${event.id}${event.status !== 'active' ? '?tab=history' : ''}`} 
                                        className="flex-1 max-w-[140px]"
                                    >
                                        <button className={`w-full h-12 flex items-center justify-center gap-2 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:scale-[1.02] active:scale-95 transition-all shadow-lg group/btn ${
                                            event.status === 'active' 
                                                ? 'bg-foreground text-background shadow-black/5' 
                                                : 'bg-muted text-muted-foreground border border-border shadow-none'
                                        }`}>
                                            {event.status === 'active' ? (
                                                <Activity className="w-3.5 h-3.5" />
                                            ) : (
                                                <div className="w-3.5 h-3.5 flex items-center justify-center bg-muted-foreground/20 rounded-full">
                                                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                                                </div>
                                            )}
                                            {event.status === 'active' ? 'Gestión' : 'Evento Finalizado'}
                                            <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-1" />
                                        </button>
                                    </Link>
                                    <div className="flex gap-2">
                                        <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500 transition-all active:scale-90">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(event.id)}
                                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-90"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
