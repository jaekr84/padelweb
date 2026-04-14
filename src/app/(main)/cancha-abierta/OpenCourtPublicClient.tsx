"use client";

import { useState, useMemo } from "react";
import { Search, MapPin, Calendar, Clock, Users, Zap, Trophy, ChevronRight, LayoutGrid } from "lucide-react";
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

    const filteredEvents = useMemo(() => {
        return initialEvents.filter(e => 
            e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.club.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.city.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, initialEvents]);

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

                {/* Search Bar */}
                <div className="relative w-full max-w-lg z-10 pt-4">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-background/30" />
                    <input 
                        type="text"
                        placeholder="Buscar por club, ciudad o evento..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-background/10 border border-background/20 rounded-3xl py-6 pl-14 pr-6 text-sm font-bold placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 backdrop-blur-xl transition-all"
                    />
                </div>
            </div>

            {/* Event List */}
            <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-emerald-500" />
                        Próximas Fechas
                    </h2>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{filteredEvents.length} Eventos encontrados</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredEvents.map((event, idx) => {
                            const isRegistered = userRegistrations.includes(event.id);
                            const percent = event.totalSlots ? (event.registrationCount / event.totalSlots) * 100 : 0;
                            const isFull = event.totalSlots && event.registrationCount >= event.totalSlots;

                            return (
                                <motion.div
                                    key={event.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="group relative bg-card/40 hover:bg-card border border-border/50 rounded-[2.5rem] p-8 space-y-6 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 cursor-pointer overflow-hidden"
                                >
                                    {/* Club Badge */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-muted border border-border/40 overflow-hidden relative">
                                                {event.club.image ? (
                                                    <Image src={event.club.image} alt={event.club.name || ""} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 font-black text-xs">
                                                        {event.club.name?.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{event.club.name}</p>
                                                <p className="text-[9px] font-bold text-muted-foreground/50 flex items-center gap-1 uppercase">
                                                    <MapPin className="w-2.5 h-2.5" />
                                                    {event.city}
                                                </p>
                                            </div>
                                        </div>
                                        {isRegistered && (
                                            <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                Ya Inscripto
                                            </div>
                                        )}
                                    </div>

                                    {/* Event Title */}
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black uppercase italic tracking-tighter leading-tight group-hover:text-emerald-500 transition-colors">
                                            {event.name}
                                        </h3>
                                        <div className="flex items-center gap-4 text-[10px] font-black text-muted-foreground/60 uppercase">
                                            <div className="flex items-center gap-1.5 focus:outline-none">
                                                <Calendar className="w-3 h-3 text-emerald-500/60" />
                                                {event.date}
                                            </div>
                                            <div className="flex items-center gap-1.5 focus:outline-none">
                                                <Clock className="w-3 h-3 text-emerald-500/60" />
                                                {event.time}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Capacity Progress */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                                            <span>Cupos Disponibles</span>
                                            <span>{event.registrationCount} / {event.totalSlots || "?"}</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden p-0.5 border border-border/20">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(percent, 100)}%` }}
                                                className={`h-full rounded-full ${isFull ? 'bg-red-500' : 'bg-emerald-500'}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="pt-4 flex items-center justify-between border-t border-border/40">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Valor de Inscripción</span>
                                            <span className="text-lg font-black italic tracking-tight">${event.registrationFee}</span>
                                        </div>
                                        <Link 
                                            href={`/cancha-abierta/${event.id}`}
                                            className="flex items-center gap-3 px-8 py-4 bg-foreground text-background rounded-2xl hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-foreground/10"
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {isFull ? "Lista de Espera" : "Inscribirme"}
                                            </span>
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
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
