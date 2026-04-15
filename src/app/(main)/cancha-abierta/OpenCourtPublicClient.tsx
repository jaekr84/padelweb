"use client";

import { useState, useMemo } from "react";
import { Search, MapPin, Calendar, Clock, Users, Zap, Trophy, ChevronRight, LayoutGrid, Check } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

type EventListing = {
    id: string;
    clubId: string;
    name: string;
    date: string;
    time: string;
    address: string;
    city: string;
    registrationFee: number;
    totalSlots: number | null;
    status: string;
    club: {
        name: string | null;
        image: string | null;
    };
    registrationCount: number;
};

interface OpenCourtPublicClientProps {
    initialEvents: EventListing[];
    userRegistrations: string[];
    isLoggedIn: boolean;
}

export default function OpenCourtPublicClient({ initialEvents, userRegistrations, isLoggedIn }: OpenCourtPublicClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

    const dropdownTriggerStyles = "w-full rounded-3xl border border-background/20 bg-background/10 py-6 pl-14 pr-10 text-sm font-bold uppercase tracking-tight text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 backdrop-blur-xl transition-all flex items-center justify-between gap-2";
    const dropdownContentStyles = "z-50 overflow-hidden rounded-3xl border border-background/20 bg-foreground shadow-2xl";
    const dropdownViewportStyles = "p-1";
    const dropdownItemStyles = "relative flex cursor-default select-none items-center rounded-xl px-4 py-3 text-sm font-bold tracking-tight uppercase text-background outline-none transition-colors data-[highlighted]:bg-emerald-500/10 data-[highlighted]:text-background data-[state=checked]:bg-emerald-500 data-[state=checked]:text-background";

    const searchOptions = useMemo(() => {
        const values = new Set<string>();

        initialEvents.forEach((event) => {
            if (event.city) values.add(event.city);
        });

        return Array.from(values).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    }, [initialEvents]);

    const filteredEvents = useMemo(() => {
        return initialEvents.filter(e => {
            const matchesSearch = !searchQuery ||
                e.city.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesTab = e.status === activeTab;

            return matchesSearch && matchesTab;
        });
    }, [searchQuery, initialEvents, activeTab]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
            {/* Hero Section */}
            <div className="relative rounded-[3rem] overflow-hidden bg-foreground p-12 lg:p-20 text-background flex flex-col items-center text-center space-y-6 shadow-2xl">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 space-y-4"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-background/10 border border-background/20 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">
                        <Zap className="w-3 h-3 text-emerald-400 fill-current" />
                        Partidos de Rotación Rápida
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black uppercase tracking-tighter leading-none italic">
                        Cancha <span className="text-emerald-400">Abierta</span>
                    </h1>
                    <p className="text-lg text-background/60 max-w-2xl mx-auto font-medium leading-relaxed">
                        Inscribite solo o con amigos. El club arma las parejas en el momento para que juegues con todos y pases una tarde de puro padel.
                    </p>
                </motion.div>

                {/* Search Dropdown */}
                <div className="relative w-full max-w-lg z-10 pt-4">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
                    <Select.Root value={searchQuery} onValueChange={(value) => setSearchQuery(value === "__empty__" ? "" : value)}>
                        <Select.Trigger className={dropdownTriggerStyles} aria-label="Seleccionar localidad">
                            <Select.Value placeholder="Buscar por localidad..." />
                            <Select.Icon>
                                <ChevronRight className="w-5 h-5 text-white/70 rotate-90" />
                            </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Content className={dropdownContentStyles} position="popper" sideOffset={8} style={{ width: "var(--radix-select-trigger-width)" }}>
                                <Select.Viewport className={dropdownViewportStyles}>
                                    <Select.Item value="__empty__" className={dropdownItemStyles}>
                                        <Select.ItemText>Buscar por localidad...</Select.ItemText>
                                        <Select.ItemIndicator className="absolute right-4 inline-flex items-center text-emerald-500">
                                            <Check className="w-4 h-4" />
                                        </Select.ItemIndicator>
                                    </Select.Item>
                                    {searchOptions.map((option) => (
                                        <Select.Item key={option} value={option} className={dropdownItemStyles}>
                                            <Select.ItemText>{option}</Select.ItemText>
                                            <Select.ItemIndicator className="absolute right-4 inline-flex items-center text-emerald-500">
                                                <Check className="w-4 h-4" />
                                            </Select.ItemIndicator>
                                        </Select.Item>
                                    ))}
                                </Select.Viewport>
                            </Select.Content>
                        </Select.Portal>
                    </Select.Root>
                </div>
            </div>

            {/* Tab Selector */}
            <div className="flex justify-center">
                <div className="bg-muted p-1.5 rounded-[2rem] flex items-center gap-1 shadow-inner border border-border/50">
                    <button
                        onClick={() => setActiveTab("active")}
                        className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === "active" ? 'bg-foreground text-background shadow-xl' : 'text-muted-foreground/60 hover:text-foreground'}`}
                    >
                        Próximas Fechas
                    </button>
                    <button
                        onClick={() => setActiveTab("completed")}
                        className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === "completed" ? 'bg-foreground text-background shadow-xl' : 'text-muted-foreground/60 hover:text-foreground'}`}
                    >
                        Eventos Finalizados
                    </button>
                </div>
            </div>

            {/* Event List */}
            <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                        {activeTab === "active" ? (
                            <>
                                <Calendar className="w-6 h-6 text-emerald-500" />
                                Próximas Fechas
                            </>
                        ) : (
                            <>
                                <Trophy className="w-6 h-6 text-orange-500" />
                                Historial de Eventos
                            </>
                        )}
                    </h2>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{filteredEvents.length} Eventos</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredEvents.map((event, idx) => {
                            const isRegistered = userRegistrations.includes(event.id);
                            const percent = event.totalSlots ? (event.registrationCount / event.totalSlots) * 100 : 0;
                            const isFull = event.totalSlots && event.registrationCount >= event.totalSlots;

                            const statusLabel = event.status === 'completed' ? 'FINALIZADO' : 'ABIERTO';
                            const statusColor = event.status === 'completed' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700';
                            const registeredLabel = isRegistered ? 'YA INSCRIPTO' : null;

                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                    key={event.id}
                                    className="group relative bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col h-full"
                                >
                                    {/* Header con Badges Flotantes */}
                                    <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
                                        <div className="flex gap-2">
                                            <span className="bg-tertiary-fixed text-on-tertiary-fixed-variant px-3 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase backdrop-blur-md bg-opacity-90">
                                                MI CLUB
                                            </span>
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase ${statusLabel === 'ABIERTO' ? 'bg-green-100 text-green-700' : 'bg-secondary-container text-on-secondary-container'
                                                }`}>
                                                {statusLabel}
                                            </span>
                                        </div>
                                        {registeredLabel && (
                                            <div className="bg-primary text-white p-2 rounded-full shadow-lg animate-in zoom-in duration-300">
                                                <Check className="w-4 h-4" strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Contenido Principal */}
                                    <div className="p-8 pt-20 flex-grow">
                                        <h3 className="text-on-surface text-3xl font-black tracking-tight leading-[1.1] mb-6 group-hover:text-primary transition-colors">
                                            {event.name}
                                        </h3>

                                        {/* Grid de Logística: Más limpio y directo */}
                                        <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 p-2 bg-slate-50 rounded-xl text-primary">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Fecha</p>
                                                    <p className="text-sm font-bold text-on-surface leading-tight">{formatDate(event.date)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 p-2 bg-slate-50 rounded-xl text-primary">
                                                    <Clock className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Hora</p>
                                                    <p className="text-sm font-bold text-on-surface leading-tight">{event.time}</p>
                                                </div>
                                            </div>
                                            <div className="col-span-2 flex items-start gap-4 p-4 bg-slate-50/50 rounded-[1.5rem] border border-slate-100/50">
                                                <div className="p-3 bg-white shadow-sm rounded-xl text-primary flex-shrink-0">
                                                    <MapPin className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col min-w-0"> {/* min-w-0 evita que el texto rompa el layout */}
                                                    <p className="text-[10px] font-black text-outline uppercase tracking-[0.15em] mb-1">
                                                        Ubicación
                                                    </p>
                                                    <p className="text-sm font-bold text-on-surface leading-tight truncate">
                                                        {event.address || 'Sin dirección'}
                                                    </p>
                                                    <p className="text-xs text-outline-variant font-medium mt-0.5">
                                                        {event.city}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status de Cupos: Diseño tipo Dashboard */}
                                        <div className="bg-slate-50/80 rounded-[2rem] p-6 border border-slate-100">
                                            <div className="flex justify-between items-end mb-3">
                                                <div>
                                                    <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Disponibilidad</p>
                                                    <p className="text-lg font-black text-on-surface">
                                                        {event.registrationCount} <span className="text-outline font-medium text-sm">/ {event.totalSlots || '∞'}</span>
                                                    </p>
                                                </div>
                                                <span className={`text-[10px] font-black px-2 py-1 rounded ${isFull ? 'text-red-500' : 'text-primary'}`}>
                                                    {isFull ? 'AGOTADO' : `${Math.max(0, (event.totalSlots || 0) - event.registrationCount)} LIBRES`}
                                                </span>
                                            </div>

                                            <div className="relative h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(percent, 100)}%` }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                    className={`h-full rounded-full ${percent > 80 ? 'bg-orange-400' : 'bg-primary'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer: Acción y Precio */}
                                    <div className="px-8 pb-8 pt-2">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Inversión</span>
                                                <span className="text-3xl font-black text-on-surface">${event.registrationFee}</span>
                                            </div>
                                            <Link
                                                href={`/cancha-abierta/${event.id}`}
                                                className={`
                    flex-grow flex justify-center items-center h-16 rounded-[1.25rem] font-black tracking-widest text-xs transition-all duration-300
                    ${isRegistered
                                                        ? 'bg-slate-100 text-on-surface hover:bg-slate-200'
                                                        : 'signature-gradient text-white shadow-[0_10px_20px_-5px_rgba(var(--primary-rgb),0.4)] hover:shadow-2xl hover:scale-[1.02] active:scale-95'
                                                    }
                `}
                                            >
                                                {isRegistered ? 'DETALLES' : 'INSCRIBIRME'}
                                            </Link>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {filteredEvents.length === 0 && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4 bg-muted/40 border border-dashed border-border/60 rounded-[3rem]">
                            <Search className="w-12 h-12 text-muted-foreground/20" />
                            <div className="text-center">
                                <h4 className="text-lg font-black uppercase tracking-tighter italic text-muted-foreground/60">No encontramos eventos</h4>
                                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Intentá buscando por otro club o ciudad</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
                {[
                    { icon: Zap, title: "Formato Ágil", desc: "No necesitás equipo. Vení solo y nosotros rotamos a los jugadores para que juegues con todos." },
                    { icon: Trophy, title: "Subí de Nivel", desc: "Ganar partidos te ayuda a mejorar tu ranking interno y subir de categoría más rápido." },
                    { icon: LayoutGrid, title: "Organización Total", desc: "Los clubes gestionan las canchas en vivo para que no pierdas tiempo esperando." }
                ].map((item, i) => (
                    <div key={i} className="bg-muted/80 border border-border/40 rounded-[2.5rem] p-8 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <item.icon className="w-6 h-6 border-none" />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-widest">{item.title}</h4>
                        <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
