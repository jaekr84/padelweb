"use client";

import { useState, useMemo } from "react";
import { Search, MapPin, Calendar, Clock, Users, Zap, Trophy, ChevronRight, LayoutGrid, Check, Plus } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import PublicOpenCourtCard from "./PublicOpenCourtCard";
import { startConversation } from "@/app/(main)/mensajes/actions";
import { useRouter } from "next/navigation";

type EventListing = {
    id: string;
    clubId: string;
    creatorId: string | null;
    name: string;
    date: string;
    time: string;
    address: string;
    city: string;
    registrationFee: number;
    totalSlots: number | null;
    status: string;
    creator: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        imageUrl: string | null;
    } | null;
    club: {
        name: string | null;
        image: string | null;
        ownerId: string | null;
    };
    registrationCount: number;
};

interface OpenCourtPublicClientProps {
    initialEvents: EventListing[];
    userRegistrations: string[];
    isLoggedIn: boolean;
    currentUserId?: string;
    userRole?: string;
}

export default function OpenCourtPublicClient({ initialEvents, userRegistrations, isLoggedIn, currentUserId, userRole }: OpenCourtPublicClientProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    const handleMessage = async (e: React.MouseEvent, recipientId: string) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const { conversationId } = await startConversation(recipientId);
            router.push(`/mensajes?conv=${conversationId}`);
        } catch (e) {
            console.error(e);
        }
    };

    const dropdownTriggerStyles = "w-full rounded-2xl border border-border bg-card py-2.5 pl-10 pr-4 text-[11px] font-bold uppercase tracking-widest text-foreground focus:outline-none focus:ring-1 focus:ring-azul-primary/30 transition-all flex items-center justify-between gap-2 shadow-sm shadow-azul-primary/5";
    const dropdownContentStyles = "z-50 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200";
    const dropdownViewportStyles = "p-1";
    const dropdownItemStyles = "relative flex cursor-default select-none items-center rounded-xl px-4 py-2 text-[10px] font-black tracking-widest uppercase text-foreground outline-none transition-colors data-[highlighted]:bg-azul-primary/10 data-[highlighted]:text-azul-primary data-[state=checked]:bg-azul-primary data-[state=checked]:text-white";

    const searchOptions = useMemo(() => {
        const values = new Set<string>();

        initialEvents.forEach((event) => {
            if (event.city) values.add(event.city);
        });

        return Array.from(values).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    }, [initialEvents]);

    const upcomingEvents = useMemo(() => {
        return initialEvents
            .filter(e => e.status === "active")
            .filter(e => !searchQuery || e.city.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [searchQuery, initialEvents]);

    const pastEvents = useMemo(() => {
        return initialEvents
            .filter(e => e.status === "completed")
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [initialEvents]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    };

    const clubCount = new Set(initialEvents.map(e => e.clubId)).size;
    const activeEventsCount = initialEvents.filter(e => e.status === "active").length;

    return (
        <div className="relative min-h-screen font-sans selection:bg-azul-primary/30">
            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-azul-primary/10 rounded-full blur-[120px]" />
                <div className="absolute top-[10%] right-[-15%] w-[400px] h-[400px] bg-celeste/8 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-azul-primary">ACAP</span>
                            <div className="h-px w-8 bg-azul-primary/30" />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tight leading-none text-foreground">
                            Cancha <span className="text-azul-primary drop-shadow-[0_0_15px_rgba(30,64,175,0.2)]">Abierta</span>
                        </h1>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest max-w-sm">
                            Partidos de rotación rápida. Uníte para jugar con todos.
                        </p>
                    </div>

                    {userRole === 'club' && (
                        <Link href="/admin/cancha-abierta/create">
                            <button className="group bg-azul-primary hover:bg-azul-dark text-white pl-5 pr-3 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-azul-primary/20 flex items-center gap-4 shrink-0">
                                Crear Evento
                                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                    <Plus className="w-4 h-4" />
                                </div>
                            </button>
                        </Link>
                    )}
                </div>

                {/* Stats Pills */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-1 shadow-sm transition-all hover:border-azul-primary/30">
                        <Calendar className="w-4 h-4 text-azul-primary" />
                        <span className="text-xl font-black text-foreground">{initialEvents.length}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Totales</span>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-1 shadow-sm transition-all hover:border-azul-primary/30">
                        <Users className="w-4 h-4 text-celeste" />
                        <span className="text-xl font-black text-foreground">{clubCount}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Sedes</span>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-1 shadow-sm transition-all hover:border-azul-primary/30">
                        <Zap className="w-4 h-4 text-orange-500" />
                        <span className="text-xl font-black text-foreground">{activeEventsCount}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Próximos</span>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-azul-primary animate-pulse" />
                        <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-foreground">Próximas Fechas</h2>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 z-10" />
                        <Select.Root value={searchQuery} onValueChange={(value) => setSearchQuery(value === "__empty__" ? "" : value)}>
                            <Select.Trigger className={dropdownTriggerStyles}>
                                <Select.Value placeholder="Ciudad..." />
                                <Select.Icon>
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 rotate-90" />
                                </Select.Icon>
                            </Select.Trigger>
                            <Select.Portal>
                                <Select.Content className={dropdownContentStyles} position="popper" sideOffset={8} style={{ width: "var(--radix-select-trigger-width)" }}>
                                    <Select.Viewport className={dropdownViewportStyles}>
                                        <Select.Item value="__empty__" className={dropdownItemStyles}>
                                            <Select.ItemText>Todas las ciudades</Select.ItemText>
                                        </Select.Item>
                                        {searchOptions.map((option) => (
                                            <Select.Item key={option} value={option} className={dropdownItemStyles}>
                                                <Select.ItemText>{option}</Select.ItemText>
                                            </Select.Item>
                                        ))}
                                    </Select.Viewport>
                                </Select.Content>
                            </Select.Portal>
                        </Select.Root>
                    </div>
                </div>

                {/* Upcoming Events Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AnimatePresence mode="popLayout">
                        {upcomingEvents.map((event) => {
                            const isRegistered = userRegistrations.includes(event.id);
                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                    key={event.id}
                                >
                                    <PublicOpenCourtCard 
                                        event={event} 
                                        isRegistered={isRegistered}
                                        isLoggedIn={isLoggedIn}
                                        currentUserId={currentUserId}
                                        onMessage={handleMessage}
                                    />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {upcomingEvents.length === 0 && (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center space-y-4 bg-muted/30 border border-dashed border-border/80 rounded-[2.5rem]">
                            <Search className="w-10 h-10 text-muted-foreground/10" />
                            <div className="text-center">
                                <h4 className="text-sm font-black uppercase tracking-tighter italic text-muted-foreground/50">Sin eventos disponibles</h4>
                                <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">Intentá con otra ciudad o filtro</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Past Events Section */}
                {pastEvents.length > 0 && (
                    <div className="pt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                        <div className="flex items-center gap-4 px-2">
                            <div className="h-px flex-1 bg-border" />
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-celeste" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 whitespace-nowrap">Resultados Recientes</h2>
                            </div>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                            {pastEvents.map((event) => (
                                <PublicOpenCourtCard 
                                    key={event.id}
                                    event={event} 
                                    isRegistered={userRegistrations.includes(event.id)}
                                    isLoggedIn={isLoggedIn}
                                    currentUserId={currentUserId}
                                    onMessage={handleMessage}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Info Tiles */}
            <div className="max-w-4xl mx-auto px-4 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-10">
                    {[
                        { icon: Zap, title: "Formato Ágil", color: "text-orange-500", desc: "No necesitás equipo. Vení solo y nosotros rotamos los jugadores." },
                        { icon: Trophy, title: "Subí de Nivel", color: "text-azul-primary", desc: "Mejorá tu ranking interno y subí de categoría más rápido ganando partidos." },
                        { icon: LayoutGrid, title: "Gestión en Vivo", color: "text-celeste", desc: "Los clubes gestionan las canchas en vivo para evitar esperas." }
                    ].map((item, i) => (
                        <div key={i} className="group bg-card hover:bg-azul-primary/[0.02] border border-border rounded-[2rem] p-6 space-y-4 transition-all duration-300 shadow-sm hover:shadow-md">
                            <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform ${item.color}`}>
                                <item.icon className="w-5 h-5 fill-current opacity-20" />
                                <item.icon className="absolute w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground">{item.title}</h4>
                                <p className="text-[10px] font-bold text-muted-foreground leading-relaxed italic">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
