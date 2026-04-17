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
    const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

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

    const dropdownTriggerStyles = "w-full rounded-3xl border border-background/20 bg-background/10 py-6 pl-14 pr-10 text-sm font-bold uppercase tracking-tight text-white focus:outline-none focus:ring-2 focus:ring-celeste/50 backdrop-blur-xl transition-all flex items-center justify-between gap-2";
    const dropdownContentStyles = "z-50 overflow-hidden rounded-3xl border border-background/20 bg-foreground shadow-2xl";
    const dropdownViewportStyles = "p-1";
    const dropdownItemStyles = "relative flex cursor-default select-none items-center rounded-xl px-4 py-3 text-sm font-bold tracking-tight uppercase text-background outline-none transition-colors data-[highlighted]:bg-celeste/10 data-[highlighted]:text-background data-[state=checked]:bg-celeste data-[state=checked]:text-background";

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
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-celeste rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-azul-primary rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 space-y-4"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-background/10 border border-background/20 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">
                        <Zap className="w-3 h-3 text-celeste fill-current" />
                        Partidos de Rotación Rápida
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black uppercase tracking-tighter leading-none italic">
                        Cancha <span className="text-celeste">Abierta</span>
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
                                        <Select.ItemIndicator className="absolute right-4 inline-flex items-center text-celeste">
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
                                <Calendar className="w-6 h-6 text-celeste" />
                                Próximas Fechas
                            </>
                        ) : (
                            <>
                                <Trophy className="w-6 h-6 text-celeste" />
                                Historial de Eventos
                            </>
                        )}
                    </h2>
                    <div className="flex items-center gap-4">
                        {userRole === 'club' && (
                            <Link href="/admin/cancha-abierta/create">
                                <button className="flex items-center gap-2 bg-azul-primary hover:bg-azul-dark text-white font-black uppercase tracking-widest text-[10px] py-3 px-6 rounded-xl shadow-lg shadow-azul-primary/20 transition-all active:scale-95">
                                    <Plus className="w-4 h-4" />
                                    Crear Evento
                                </button>
                            </Link>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{filteredEvents.length} Eventos</span>
                    </div>
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
                        <div className="w-12 h-12 rounded-2xl bg-celeste/10 text-celeste flex items-center justify-center">
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
