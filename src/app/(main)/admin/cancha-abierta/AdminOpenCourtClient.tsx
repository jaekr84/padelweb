"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, MapPin, Activity, Trash2, Edit } from "lucide-react";
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
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all");

    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            const isActive = e.status === 'active';
            if (statusFilter === "active" && !isActive) return false;
            if (statusFilter === "closed" && isActive) return false;
            const q = searchQuery.toLowerCase();
            return e.name.toLowerCase().includes(q) ||
                (e.address?.toLowerCase().includes(q) ?? false) ||
                (e.city?.toLowerCase().includes(q) ?? false);
        });
    }, [events, searchQuery, statusFilter]);

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

                <div className="flex bg-muted/50 p-0.5 rounded-lg">
                    {["all", "active", "closed"].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s as any)}
                            className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${statusFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            {s === "all" ? "Todos" : s === "active" ? "Activos" : "Cerrados"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Event List - 1 fila por evento */}
            <div className="bg-card/40 border border-border/50 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/30 border-b border-border/50 text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground/70">
                            <th className="px-3 py-2">Evento</th>
                            <th className="px-3 py-2">Ubicación</th>
                            <th className="px-3 py-2 w-[80px]">Fecha</th>
                            <th className="px-3 py-2 w-[72px]">Horario</th>
                            <th className="px-3 py-2 w-[90px]">Inscritos</th>
                            <th className="px-3 py-2 w-[70px]">Costo</th>
                            <th className="px-3 py-2 w-[180px] text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {filteredEvents.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-20 text-center text-muted-foreground text-xs font-medium italic">
                                    No se encontraron eventos con los filtros aplicados.
                                </td>
                            </tr>
                        ) : (
                            filteredEvents.map((event) => (
                                <EventRow key={event.id} event={event} onDelete={handleDelete} />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function EventRow({ event, onDelete }: { event: EventWithDetails; onDelete: (id: string) => void }) {
    const isActive = event.status === 'active';
    return (
        <tr className="hover:bg-muted/5 transition-colors group align-middle">
            <td className="px-3 py-2">
                <span className="text-[12px] font-black uppercase italic text-foreground leading-tight group-hover:text-azul-primary transition-colors truncate block max-w-[220px] capitalize">
                    {event.name}
                </span>
            </td>
            <td className="px-3 py-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-2.5 h-2.5 text-muted-foreground/60 shrink-0" />
                    <span className="text-[11px] font-bold text-muted-foreground/90 truncate capitalize">
                        {event.city}{event.address ? ` · ${event.address}` : ""}
                    </span>
                </div>
            </td>
            <td className="px-3 py-2">
                <span className="text-[11px] font-black text-azul-primary/90 tabular-nums">{event.date}</span>
            </td>
            <td className="px-3 py-2">
                <span className="text-[11px] font-bold text-foreground/80 tabular-nums">{event.time}</span>
            </td>
            <td className="px-3 py-2">
                <span className="text-[11px] font-black text-foreground/80 tabular-nums">
                    {event.registrations?.length || 0}<span className="text-muted-foreground/50 font-bold"> / {event.totalSlots}</span>
                </span>
            </td>
            <td className="px-3 py-2">
                <span className="text-[11px] font-black text-celeste tabular-nums">${event.registrationFee}</span>
            </td>
            <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/cancha-abierta/${event.id}${!isActive ? '?tab=history' : ''}`}>
                        <button className={`h-7 flex items-center justify-center gap-1 px-2.5 rounded-lg transition-all active:scale-95 shadow-sm text-[7px] font-black uppercase tracking-widest ${isActive ? 'bg-azul-primary hover:bg-azul-dark text-white border border-azul-primary/20' : 'bg-muted/40 text-muted-foreground border border-border/50 hover:bg-muted/60'}`}>
                            <Activity className="w-2.5 h-2.5" />
                            {isActive ? 'Gestión' : 'Ver'}
                        </button>
                    </Link>
                    <button className="w-7 h-7 flex items-center justify-center bg-muted/40 hover:bg-celeste hover:text-white text-muted-foreground border border-border/50 rounded-lg transition-all active:scale-95" title="Editar">
                        <Edit className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => onDelete(event.id)}
                        className="w-7 h-7 flex items-center justify-center bg-muted/40 hover:bg-rojo hover:text-white text-muted-foreground border border-border/50 rounded-lg transition-all active:scale-95"
                        title="Eliminar"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
