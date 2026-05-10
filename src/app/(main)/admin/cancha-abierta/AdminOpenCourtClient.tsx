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
        <div className="max-w-6xl mx-auto space-y-4 animate-fade-in pb-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-3">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-azul-primary">Gestión de Eventos</span>
                        <div className="h-px w-5 bg-azul-primary/30" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-foreground leading-none">
                        Cancha <span className="text-azul-primary">Abierta</span>
                    </h1>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1 max-w-md">
                        Partidos organizados con rotación dinámica.
                    </p>
                </div>
                <Link href="/admin/cancha-abierta/create">
                    <button className="flex items-center gap-2 bg-azul-primary hover:bg-azul-dark text-white font-black uppercase tracking-widest text-[8px] h-8 px-4 rounded-lg shadow-lg shadow-azul-primary/10 transition-all active:scale-95 group">
                        <Plus className="w-3 h-3 transition-transform group-hover:rotate-90" />
                        Crear Evento
                    </button>
                </Link>
            </header>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-center bg-card/40 backdrop-blur-md p-1.5 rounded-xl border border-border/50">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground transition-colors group-focus-within:text-azul-primary" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, dirección o zona..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50"
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
                            className="group relative overflow-hidden bg-card/50 border border-border/50 rounded-xl p-2.5 hover:border-celeste/50 transition-all shadow-sm"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-3">
                                {/* Main Info */}
                                <div className="md:col-span-3 border-r border-border/30 pr-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider ${
                                            event.status === 'active' ? 'bg-celeste/10 text-celeste' : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {event.status === 'active' ? 'Activo' : 'Cerrado'}
                                        </div>
                                    </div>
                                    <h3 className="text-xs font-black uppercase italic tracking-tight text-foreground line-clamp-1 group-hover:text-azul-primary transition-colors">
                                        <span className="capitalize">{event.name}</span>
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                                        <MapPin className="w-2.5 h-2.5" />
                                        <span className="text-[8px] font-bold tracking-widest leading-none capitalize">{event.city}</span>
                                        <span className="text-[7px] font-bold text-muted-foreground/40 uppercase tracking-tighter truncate">• {event.address}</span>
                                    </div>
                                </div>

                                {/* Date & Time */}
                                <div className="md:col-span-3 flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3 text-muted-foreground/60" />
                                        <div className="flex flex-col">
                                            <span className="text-[6px] font-black uppercase tracking-widest text-muted-foreground/50">Fecha</span>
                                            <span className="text-[9px] font-black uppercase italic">{event.date}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3 h-3 text-muted-foreground/60" />
                                        <div className="flex flex-col">
                                            <span className="text-[6px] font-black uppercase tracking-widest text-muted-foreground/50">Horario</span>
                                            <span className="text-[9px] font-black uppercase italic">{event.time}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="md:col-span-3 flex items-center gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-[6px] font-black uppercase tracking-widest text-muted-foreground/50">Inscritos</span>
                                        <div className="flex items-end gap-1">
                                            <span className="text-base font-black italic leading-none">{event.registrations?.length || 0}</span>
                                            <span className="text-[8px] font-bold text-muted-foreground/40 mb-0.5">/ {event.totalSlots}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[6px] font-black uppercase tracking-widest text-muted-foreground/50">Costo</span>
                                        <div className="flex items-center gap-0.5 text-celeste">
                                            <DollarSign className="w-2.5 h-2.5" />
                                            <span className="text-xs font-black italic leading-none">{event.registrationFee}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="md:col-span-3 flex items-center justify-end gap-1.5">
                                    <Link 
                                        href={`/admin/cancha-abierta/${event.id}${event.status !== 'active' ? '?tab=history' : ''}`} 
                                        className="flex-1"
                                    >
                                        <button className={`w-full h-8 flex items-center justify-center gap-1.5 rounded-lg font-black uppercase tracking-widest text-[7px] transition-all shadow-sm group/btn ${
                                            event.status === 'active' 
                                                ? 'bg-azul-primary text-white shadow-azul-primary/10 hover:bg-azul-dark' 
                                                : 'bg-muted text-muted-foreground border border-border shadow-none hover:bg-muted/80'
                                        }`}>
                                            {event.status === 'active' ? (
                                                <Activity className="w-2.5 h-2.5" />
                                            ) : (
                                                <div className="w-2 h-2 flex items-center justify-center bg-muted-foreground/20 rounded-full">
                                                    <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                                                </div>
                                            )}
                                            {event.status === 'active' ? 'Gestión' : 'Cerrado'}
                                            <ChevronRight className="w-2 h-2 transition-transform group-hover/btn:translate-x-0.5" />
                                        </button>
                                    </Link>
                                    <div className="flex gap-1">
                                        <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted/30 text-muted-foreground hover:bg-celeste/10 hover:text-celeste transition-all active:scale-90 border border-border/30" title="Editar">
                                            <Edit className="w-3 h-3" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(event.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted/30 text-muted-foreground hover:bg-rojo/10 hover:text-rojo transition-all active:scale-90 border border-border/30"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-3 h-3" />
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
