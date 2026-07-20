"use client";

import { useState, useMemo } from "react";
import { Search, MapPin, Calendar, Clock, Users, Zap, Trophy, ChevronRight, LayoutGrid, Check, Plus, SlidersHorizontal, ArrowUpDown, MessageSquare, X } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import PublicOpenCourtCard from "./PublicOpenCourtCard";
import { startConversation } from "@/app/(main)/mensajes/actions";
import { useChatStore } from "@/store/useChatStore";
import { getOpenCourtRegistrationsAction, getOpenCourtMatchesAction } from "@/app/(main)/admin/cancha-abierta/actions";

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
    const setActiveConvId = useChatStore(s => s.setActiveConvId);
    const setChatExpanded = useChatStore(s => s.setExpanded);

    // View state
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

    // Filters & Sorting state
    const [textQuery, setTextQuery] = useState("");
    const [cityQuery, setCityQuery] = useState("");
    const [sortBy, setSortBy] = useState("date");

    // Modal 1: Registrations state
    const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState("");
    const [selectedEventName, setSelectedEventName] = useState("");
    const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [regSearchQuery, setRegSearchQuery] = useState("");

    // Modal 2: Results state
    const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
    const [resultsEventId, setResultsEventId] = useState("");
    const [resultsEventName, setResultsEventName] = useState("");
    const [isLoadingResults, setIsLoadingResults] = useState(false);
    const [resultsMatches, setResultsMatches] = useState<any[]>([]);
    const [resultsPlayers, setResultsPlayers] = useState<any[]>([]);
    const [resultsSearchQuery, setResultsSearchQuery] = useState("");

    // Abre el chat flotante sobre la página en lugar de navegar a /mensajes:
    // escribirle al organizador no debería sacar al usuario del listado.
    const handleMessage = async (e: React.MouseEvent, recipientId: string) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const { conversationId } = await startConversation(recipientId);
            setActiveConvId(conversationId);
            setChatExpanded(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleOpenParticipants = async (e: React.MouseEvent, eventId: string, eventName: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedEventId(eventId);
        setSelectedEventName(eventName);
        setIsParticipantsModalOpen(true);
        setIsLoadingRegistrations(true);
        setRegSearchQuery("");
        try {
            const res = await getOpenCourtRegistrationsAction(eventId);
            if (res.success && res.registrations) {
                setRegistrations(res.registrations);
            } else {
                console.error("Error loading registrations:", res.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingRegistrations(false);
        }
    };

    const handleOpenResults = async (e: React.MouseEvent, eventId: string, eventName: string) => {
        e.preventDefault();
        e.stopPropagation();
        setResultsEventId(eventId);
        setResultsEventName(eventName);
        setIsResultsModalOpen(true);
        setIsLoadingResults(true);
        setResultsSearchQuery("");
        try {
            const res = await getOpenCourtMatchesAction(eventId);
            if (res.success && res.matches && res.registrations) {
                setResultsMatches(res.matches);
                setResultsPlayers(res.registrations);
            } else {
                console.error("Error loading matches:", res.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingResults(false);
        }
    };

    const dropdownTriggerStyles = "w-full rounded-2xl border border-white/10 bg-carbon-900 py-2.5 pl-10 pr-4 text-[11px] font-bold uppercase tracking-widest text-white focus:outline-none focus:ring-1 focus:ring-azul-primary/30 transition-all flex items-center justify-between gap-2 shadow-sm shadow-azul-primary/5";
    const dropdownContentStyles = "z-50 overflow-hidden rounded-xl border border-white/10 bg-carbon-900 shadow-2xl animate-in fade-in zoom-in-95 duration-200";
    const dropdownViewportStyles = "p-1";
    const dropdownItemStyles = "relative flex cursor-default select-none items-center rounded-lg px-4 py-2 text-[10px] font-black tracking-widest uppercase text-white outline-none transition-colors data-[highlighted]:bg-azul-primary/10 data-[highlighted]:text-azul-primary data-[state=checked]:bg-azul-primary data-[state=checked]:text-white";

    const searchOptions = useMemo(() => {
        const values = new Set<string>();
        initialEvents.forEach((event) => {
            if (event.city) values.add(event.city);
        });
        return Array.from(values).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    }, [initialEvents]);

    // Live occupancy statistics
    const systemOccupancy = useMemo(() => {
        let registered = 0;
        let total = 0;
        initialEvents.forEach((e) => {
            if (e.status === "active") {
                registered += e.registrationCount || 0;
                total += e.totalSlots || 0;
            }
        });
        return {
            registered,
            total,
            pct: total > 0 ? Math.round((registered / total) * 100) : 0
        };
    }, [initialEvents]);

    // Filter & Sort upcoming events
    const upcomingEvents = useMemo(() => {
        return initialEvents
            .filter((e) => e.status === "active")
            .filter((e) => !cityQuery || e.city.toLowerCase() === cityQuery.toLowerCase())
            .filter((e) => {
                if (!textQuery) return true;
                const search = textQuery.toLowerCase();
                return (
                    e.name.toLowerCase().includes(search) ||
                    (e.club.name && e.club.name.toLowerCase().includes(search))
                );
            })
            .sort((a, b) => {
                if (sortBy === "price") {
                    return a.registrationFee - b.registrationFee;
                }
                if (sortBy === "occupancy") {
                    const pctA = a.totalSlots ? a.registrationCount / a.totalSlots : 0;
                    const pctB = b.totalSlots ? b.registrationCount / b.totalSlots : 0;
                    return pctB - pctA;
                }
                if (sortBy === "slots") {
                    const leftA = (a.totalSlots || 0) - a.registrationCount;
                    const leftB = (b.totalSlots || 0) - b.registrationCount;
                    return leftA - leftB;
                }
                // default sort by date (close date first)
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            });
    }, [textQuery, cityQuery, sortBy, initialEvents]);

    // Filter past events
    const pastEvents = useMemo(() => {
        return initialEvents
            .filter((e) => e.status === "completed")
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [initialEvents]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    };

    const clubCount = new Set(initialEvents.map((e) => e.clubId)).size;

    // Helper functions for results modal
    const getResultsPlayerName = (id: string | null) => {
        if (!id) return "Invitado";
        const found = resultsPlayers.find((p) => p.userId === id);
        return found ? found.name : "Invitado";
    };

    const getResultsPlayerImage = (id: string | null): string | null => {
        if (!id) return null;
        const found = resultsPlayers.find((p) => p.userId === id);
        return found?.image ?? null;
    };

    const getResultsPlayerSide = (id: string | null): string | null => {
        if (!id) return null;
        const found = resultsPlayers.find((p) => p.userId === id);
        return found?.side ?? null;
    };

    const highlightText = (text: string, query: string) => {
        if (!query) return text;
        const parts = text.split(new RegExp(`(${query})`, "gi"));
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === query.toLowerCase() ? (
                        <span key={i} className="bg-yellow-500/30 text-yellow-200 font-bold px-0.5 rounded">
                            {part}
                        </span>
                    ) : (
                        part
                    )
                )}
            </>
        );
    };

    // Filter registrations inside registrations modal
    const filteredRegistrations = useMemo(() => {
        return registrations.filter((r) =>
            !regSearchQuery || r.name.toLowerCase().includes(regSearchQuery.toLowerCase())
        );
    }, [registrations, regSearchQuery]);

    // Filter matches inside results modal
    const filteredMatches = useMemo(() => {
        if (!resultsSearchQuery) return resultsMatches;
        const q = resultsSearchQuery.toLowerCase();
        return resultsMatches.filter((m) => {
            const p1 = getResultsPlayerName(m.team1Player1Id).toLowerCase();
            const p2 = getResultsPlayerName(m.team1Player2Id).toLowerCase();
            const p3 = getResultsPlayerName(m.team2Player1Id).toLowerCase();
            const p4 = getResultsPlayerName(m.team2Player2Id).toLowerCase();
            return p1.includes(q) || p2.includes(q) || p3.includes(q) || p4.includes(q);
        });
    }, [resultsMatches, resultsPlayers, resultsSearchQuery]);

    // Compute player statistics inside results modal
    const resultsPlayerStats = useMemo(() => {
        const stats: Record<string, { played: number; won: number; points: number }> = {};
        resultsMatches.forEach((m) => {
            if (m.status !== "completed") return;
            const players = [m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id];
            players.forEach((pId) => {
                if (!pId) return;
                if (!stats[pId]) stats[pId] = { played: 0, won: 0, points: 0 };
                stats[pId].played += 1;
            });

            const score1 = m.score1 || 0;
            const score2 = m.score2 || 0;

            if (m.team1Player1Id) stats[m.team1Player1Id].points += score1;
            if (m.team1Player2Id) stats[m.team1Player2Id].points += score1;
            if (m.team2Player1Id) stats[m.team2Player1Id].points += score2;
            if (m.team2Player2Id) stats[m.team2Player2Id].points += score2;

            if (score1 > score2) {
                if (m.team1Player1Id) stats[m.team1Player1Id].won += 1;
                if (m.team1Player2Id) stats[m.team1Player2Id].won += 1;
            } else if (score2 > score1) {
                if (m.team2Player1Id) stats[m.team2Player1Id].won += 1;
                if (m.team2Player2Id) stats[m.team2Player2Id].won += 1;
            }
        });
        return stats;
    }, [resultsMatches]);

    return (
        <div className="relative min-h-screen bg-grid-carbon text-white font-sans selection:bg-volt/30">
            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-azul-primary/10 rounded-full blur-[120px]" />
                <div className="absolute top-[10%] right-[-15%] w-[400px] h-[400px] bg-celeste/8 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto px-4 py-4 md:py-6 space-y-5">
                {/* Header Section */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="label-tech text-[9px] text-volt">ACAP</span>
                            <div className="h-px w-6 bg-volt/30" />
                        </div>
                        <div>
                            <h1 className="heading-sport text-2xl md:text-3xl leading-none text-white">
                                Cancha <span className="text-celeste-light drop-shadow-[0_0_15px_rgba(56,189,248,0.25)]">Abierta</span>
                            </h1>
                            <p className="label-tech text-[9px] text-slate-500 mt-0.5">
                                Partidos de rotación rápida · Uníte para jugar con todos.
                            </p>
                        </div>
                    </div>

                    {userRole === "club" && (
                        <Link href="/admin/cancha-abierta/create">
                            <button className="group clip-notch bg-rojo hover:bg-rojo-dark text-white pl-4 pr-3 py-2 font-black text-[9px] uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-rojo/30 flex items-center gap-3 shrink-0">
                                Crear Evento
                                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                    <Plus className="w-3 h-3" />
                                </div>
                            </button>
                        </Link>
                    )}
                </div>

                {/* Stats — compact inline pill bar */}
                <div className="relative bg-carbon-900 border border-white/10 rounded-xl overflow-hidden shadow-sm">
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/15 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/15 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/15 pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/15 pointer-events-none" />
                    <div className="flex items-center divide-x divide-white/10 overflow-x-auto">
                        {[
                            { icon: Calendar, color: "text-azul-primary", value: initialEvents.length, label: "Totales" },
                            { icon: Users, color: "text-celeste", value: clubCount, label: "Sedes" },
                            { icon: Zap, color: "text-orange-500", value: `${systemOccupancy.registered}/${systemOccupancy.total}`, label: `${systemOccupancy.pct}% Ocup.` },
                            { icon: Trophy, color: "text-slate-500", value: pastEvents.length, label: "Finalizados" },
                            { icon: Check, color: "text-emerald-500", value: userRegistrations.length, label: "Mis Eventos" },
                            { icon: MapPin, color: "text-celeste", value: searchOptions[0] || "—", label: "Ciudad Top" },
                        ].map((kpi, i) => (
                            <div key={i} className="flex items-center gap-2 px-4 py-2 shrink-0 group hover:bg-white/5 transition-colors">
                                <kpi.icon className={`w-3 h-3 shrink-0 ${kpi.color}`} />
                                <span className="text-[11px] font-black font-mono text-white leading-none">{kpi.value}</span>
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 leading-none">{kpi.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* HUD Controls — unified pill bar */}
                <div className="relative bg-carbon-900 border border-white/10 rounded-xl overflow-hidden shadow-sm flex items-center divide-x divide-white/10">
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/15 pointer-events-none z-10" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/15 pointer-events-none z-10" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/15 pointer-events-none z-10" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/15 pointer-events-none z-10" />

                    {/* Search Input */}
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            value={textQuery}
                            onChange={(e) => setTextQuery(e.target.value)}
                            placeholder="Buscar cancha o club..."
                            className="w-full bg-transparent py-2 pl-8 pr-3 text-[9px] font-bold uppercase tracking-widest text-white focus:outline-none placeholder-slate-500 h-8 transition-all"
                        />
                    </div>

                    {/* City Select */}
                    <Select.Root value={cityQuery} onValueChange={(value) => setCityQuery(value === "__empty__" ? "" : value)}>
                        <Select.Trigger className="flex items-center gap-1.5 px-3 h-8 text-[9px] font-bold uppercase tracking-widest text-white focus:outline-none transition-all hover:bg-white/5 shrink-0 bg-transparent w-36">
                            <MapPin className="w-3 h-3 text-celeste shrink-0" />
                            <Select.Value placeholder="Ciudad..." />
                            <Select.Icon className="ml-auto">
                                <ChevronRight className="w-2.5 h-2.5 text-slate-500 rotate-90" />
                            </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Content className={dropdownContentStyles} position="popper" sideOffset={4} style={{ width: "160px" }}>
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

                    {/* Sort Select */}
                    <Select.Root value={sortBy} onValueChange={(value) => setSortBy(value)}>
                        <Select.Trigger className="flex items-center gap-1.5 px-3 h-8 text-[9px] font-bold uppercase tracking-widest text-white focus:outline-none transition-all hover:bg-white/5 shrink-0 bg-transparent w-40">
                            <ArrowUpDown className="w-3 h-3 text-orange-500 shrink-0" />
                            <Select.Value />
                            <Select.Icon className="ml-auto">
                                <ChevronRight className="w-2.5 h-2.5 text-slate-500 rotate-90" />
                            </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Content className={dropdownContentStyles} position="popper" sideOffset={4} style={{ width: "180px" }}>
                                <Select.Viewport className={dropdownViewportStyles}>
                                    <Select.Item value="date" className={dropdownItemStyles}><Select.ItemText>Por Fecha</Select.ItemText></Select.Item>
                                    <Select.Item value="price" className={dropdownItemStyles}><Select.ItemText>Menor Precio</Select.ItemText></Select.Item>
                                    <Select.Item value="occupancy" className={dropdownItemStyles}><Select.ItemText>Mayor Ocupación</Select.ItemText></Select.Item>
                                    <Select.Item value="slots" className={dropdownItemStyles}><Select.ItemText>Cupos Disponibles</Select.ItemText></Select.Item>
                                </Select.Viewport>
                            </Select.Content>
                        </Select.Portal>
                    </Select.Root>

                    {/* View Switcher */}
                    <div className="flex items-center shrink-0">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`flex items-center gap-1.5 px-3 h-8 text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === "grid" ? "bg-azul-primary/10 text-azul-primary" : "text-slate-500 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <LayoutGrid className="w-3 h-3" />
                            Grid
                        </button>
                        <div className="w-px h-4 bg-border/60" />
                        <button
                            onClick={() => setViewMode("table")}
                            className={`flex items-center gap-1.5 px-3 h-8 text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === "table" ? "bg-orange-500/10 text-orange-500" : "text-slate-500 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <SlidersHorizontal className="w-3 h-3" />
                            Consola
                        </button>
                    </div>
                </div>

                {/* Upcoming Events Container */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-2 h-2 rounded-full bg-azul-primary animate-pulse" />
                        <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Próximas Fechas</h2>
                    </div>

                    {viewMode === "grid" ? (
                        /* Upcoming Events Grid Layout */
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
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
                                                onOpenParticipants={handleOpenParticipants}
                                                onOpenResults={handleOpenResults}
                                            />
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                            {upcomingEvents.length === 0 && (
                                <div className="col-span-full py-16 flex flex-col items-center justify-center space-y-4 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem]">
                                    <Search className="w-10 h-10 text-slate-400/10" />
                                    <div className="text-center">
                                        <h4 className="text-sm font-black uppercase tracking-tighter italic text-slate-500">Sin eventos disponibles</h4>
                                        <p className="text-[9px] font-bold text-slate-400/30 uppercase tracking-[0.2em]">Intentá con otra ciudad o filtro</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Live Console / Table View */
                        <div className="bg-carbon-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-300">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[600px]">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/5 text-[8px] font-black tracking-widest uppercase text-slate-400/80 h-9">
                                            <th className="px-4 py-2">Cancha / Club</th>
                                            <th className="px-4 py-2">Fecha y Hora</th>
                                            <th className="px-4 py-2">Métricas</th>
                                            <th className="px-4 py-2">Estado</th>
                                            <th className="px-4 py-2 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {upcomingEvents.map((event) => {
                                            const isRegistered = userRegistrations.includes(event.id);
                                            const isFull = event.totalSlots && event.registrationCount >= event.totalSlots;
                                            const percent = event.totalSlots ? (event.registrationCount / event.totalSlots) * 100 : 0;

                                            return (
                                                <tr key={event.id} className="border-b border-white/10 hover:bg-white/5 transition-colors h-14 text-xs">
                                                    {/* Club / Name */}
                                                    <td className="px-4 py-2 min-w-[200px]">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-lg bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center shrink-0 text-[10px] font-black uppercase text-azul-primary overflow-hidden">
                                                                {event.club.image ? (
                                                                    <img src={event.club.image} alt={event.club.name || ""} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    (event.club.name || "C").charAt(0)
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className="text-[11px] font-black uppercase italic truncate tracking-tight text-white">
                                                                    {event.name}
                                                                </h4>
                                                                <p className="text-[8px] font-black uppercase tracking-wider text-slate-500 truncate">
                                                                    {event.club.name}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Date / Time */}
                                                    <td className="px-4 py-2 font-mono text-[10px] text-white/85">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold flex items-center gap-1 text-[10px]">
                                                                <Calendar className="w-3 h-3 text-celeste shrink-0" />
                                                                {formatDate(event.date)}
                                                            </span>
                                                            <span className="text-slate-400 flex items-center gap-1 text-[9px] mt-0.5">
                                                                <Clock className="w-3 h-3 text-orange-500 shrink-0" />
                                                                {event.time} HS
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Metrics & Occupancy bar */}
                                                    <td className="px-4 py-2">
                                                        <div className="flex flex-col gap-1 w-28">
                                                            <div className="flex items-center justify-between text-[9px] font-black font-mono">
                                                                <span className="text-slate-200">{event.registrationCount} / {event.totalSlots || 0}</span>
                                                                <span className="text-slate-500">{Math.round(percent)}%</span>
                                                            </div>
                                                            <div className="h-1 w-full bg-white/10 border border-white/5 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-500 ${percent >= 80 ? "bg-rojo" : "bg-celeste"
                                                                        }`}
                                                                    style={{ width: `${percent}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-4 py-2">
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[7px] font-black uppercase tracking-widest ${isFull ? "border-rojo/30 text-rojo bg-rojo/5" : "border-celeste/30 text-celeste bg-celeste/5"
                                                            }`}>
                                                            {isFull ? "Agotado" : "Abierto"}
                                                        </span>
                                                    </td>

                                                    {/* Quick Actions */}
                                                    <td className="px-4 py-2 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {/* View Participants trigger */}
                                                            <button
                                                                onClick={(e) => handleOpenParticipants(e, event.id, event.name)}
                                                                className="h-7 px-2 bg-carbon-900 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1"
                                                                title="Ver Inscriptos"
                                                            >
                                                                <Users className="w-3 h-3 text-celeste" />
                                                                Inscriptos ({event.registrationCount})
                                                            </button>

                                                            {/* Quick message trigger */}
                                                            {isLoggedIn && (event.creatorId || event.club?.ownerId) && currentUserId !== (event.creatorId || event.club?.ownerId) && (
                                                                <button
                                                                    onClick={(e) => handleMessage(e, (event.creatorId || event.club.ownerId) as string)}
                                                                    className="h-7 w-7 bg-carbon-900 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-azul-primary rounded flex items-center justify-center transition-all"
                                                                    title="Enviar Mensaje"
                                                                >
                                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {upcomingEvents.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center">
                                                    <Search className="w-8 h-8 text-slate-400/10 mx-auto mb-2" />
                                                    <h4 className="text-xs font-black uppercase tracking-tighter italic text-slate-500">Sin eventos disponibles</h4>
                                                    <p className="text-[8px] font-bold text-slate-400/30 uppercase tracking-widest">Intentá con otra ciudad o filtro</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Past Events / Recent Results Section */}
                {pastEvents.length > 0 && (
                    <div className="pt-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                        <div className="flex items-center gap-4 px-2">
                            <div className="h-px flex-1 bg-border" />
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-celeste" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 whitespace-nowrap">Resultados Recientes</h2>
                            </div>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        {viewMode === "grid" ? (
                            /* Grid view of past events */
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 opacity-80 hover:opacity-100 transition-opacity">
                                {pastEvents.map((event) => (
                                    <PublicOpenCourtCard
                                        key={event.id}
                                        event={event}
                                        isRegistered={userRegistrations.includes(event.id)}
                                        isLoggedIn={isLoggedIn}
                                        currentUserId={currentUserId}
                                        onMessage={handleMessage}
                                        onOpenParticipants={handleOpenParticipants}
                                        onOpenResults={handleOpenResults}
                                    />
                                ))}
                            </div>
                        ) : (
                            /* Live Console Table view of past events */
                            <div className="bg-carbon-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl opacity-90">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[600px]">
                                        <thead>
                                            <tr className="border-b border-white/10 bg-white/5 text-[8px] font-black tracking-widest uppercase text-slate-400/80 h-9">
                                                <th className="px-4 py-2">Cancha / Club</th>
                                                <th className="px-4 py-2">Fecha y Hora</th>
                                                <th className="px-4 py-2">Asistencia</th>
                                                <th className="px-4 py-2">Estado</th>
                                                <th className="px-4 py-2 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pastEvents.map((event) => {
                                                const isRegistered = userRegistrations.includes(event.id);
                                                return (
                                                    <tr key={event.id} className="border-b border-white/10 hover:bg-white/5 transition-colors h-14 text-xs">
                                                        <td className="px-4 py-2">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-[10px] font-black uppercase text-slate-400 overflow-hidden">
                                                                    {event.club.image ? (
                                                                        <img src={event.club.image} alt={event.club.name || ""} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        (event.club.name || "C").charAt(0)
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-[11px] font-black uppercase italic truncate text-slate-400 line-through decoration-muted-foreground/40">
                                                                        {event.name}
                                                                    </h4>
                                                                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400/45 truncate">
                                                                        {event.club.name}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 font-mono text-[10px] text-slate-500">
                                                            <div className="flex flex-col">
                                                                <span className="flex items-center gap-1 text-[10px]">
                                                                    <Calendar className="w-3 h-3 shrink-0 text-slate-500" />
                                                                    {formatDate(event.date)}
                                                                </span>
                                                                <span className="flex items-center gap-1 text-[9px] mt-0.5">
                                                                    <Clock className="w-3 h-3 shrink-0 text-slate-500" />
                                                                    {event.time} HS
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 font-mono text-[10px] text-slate-500">
                                                            <span className="font-bold">{event.registrationCount}</span> asistencias
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-white/15 text-slate-400 bg-white/5 text-[7px] font-black uppercase tracking-widest">
                                                                Finalizado
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {/* Ver Inscriptos */}
                                                                <button
                                                                    onClick={(e) => handleOpenParticipants(e, event.id, event.name)}
                                                                    className="h-7 px-2 bg-carbon-900 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1"
                                                                >
                                                                    <Users className="w-3 h-3 text-celeste" />
                                                                    Ver Inscriptos
                                                                </button>
                                                                {/* Ver Resultados */}
                                                                <button
                                                                    onClick={(e) => handleOpenResults(e, event.id, event.name)}
                                                                    className="h-7 px-2 bg-celeste/10 hover:bg-celeste text-celeste hover:text-white border border-celeste/20 hover:border-transparent rounded text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1 shadow-md shadow-celeste/5"
                                                                >
                                                                    <Trophy className="w-3 h-3" />
                                                                    Resultados
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Info Tiles */}
            <div className="max-w-[1600px] mx-auto px-4 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-6">
                    {[
                        { icon: Zap, title: "Formato Ágil", color: "text-orange-500", desc: "No necesitás equipo. Vení solo y nosotros rotamos los jugadores." },
                        { icon: Trophy, title: "Subí de Nivel", color: "text-azul-primary", desc: "Mejorá tu ranking interno y subí de categoría más rápido ganando partidos." },
                        { icon: LayoutGrid, title: "Gestión en Vivo", color: "text-celeste", desc: "Los clubes gestionan las canchas en vivo para evitar esperas." }
                    ].map((item, i) => (
                        <div key={i} className="group relative bg-carbon-900 hover:bg-azul-primary/[0.02] border border-white/10 rounded-xl p-4 flex items-center gap-3 transition-all duration-300 shadow-sm hover:shadow-md hover:border-azul-primary/20">
                            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/15 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/15 pointer-events-none" />
                            <div className={`w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${item.color}`}>
                                <item.icon className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-white">{item.title}</h4>
                                <p className="text-[9px] font-bold text-slate-400 leading-snug italic">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modals Container */}
            <AnimatePresence>
                {/* 1. Participants Modal */}
                {isParticipantsModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsParticipantsModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        />

                        {/* Modal Panel */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            className="relative w-full max-w-2xl bg-carbon-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
                        >
                            {/* HUD Corners decorative borders */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-celeste pointer-events-none" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-celeste pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-celeste pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-celeste pointer-events-none" />

                            {/* Header */}
                            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                                <div>
                                    <span className="text-[7px] font-black uppercase tracking-[0.3em] text-celeste">LISTADO DE ASISTENCIA</span>
                                    <h3 className="text-sm font-black uppercase tracking-tight italic text-white truncate max-w-md mt-0.5">
                                        {selectedEventName}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setIsParticipantsModalOpen(false)}
                                    className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-white/5"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Live Search inside modal */}
                            <div className="p-3 bg-white/5 border-b border-white/10 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <input
                                        type="text"
                                        value={regSearchQuery}
                                        onChange={(e) => setRegSearchQuery(e.target.value)}
                                        placeholder="Buscar inscripto por nombre..."
                                        className="w-full rounded-lg border border-white/10 bg-carbon-900 py-2 pl-9 pr-4 text-[10px] font-bold uppercase tracking-widest text-white focus:outline-none focus:ring-1 focus:ring-azul-primary/30 placeholder-muted-foreground/50 h-8.5 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Participants List - High Density Card Grid */}
                            <div className="flex-1 overflow-y-auto p-4 min-h-[250px]">
                                {isLoadingRegistrations ? (
                                    <div className="h-full flex flex-col items-center justify-center py-16 space-y-3">
                                        <div className="w-6 h-6 border-2 border-celeste border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cargando inscriptos...</span>
                                    </div>
                                ) : filteredRegistrations.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {filteredRegistrations.map((reg, idx) => {
                                            const isMe = reg.userId === currentUserId;
                                            const isReves = reg.side === "reves";
                                            const isDrive = reg.side === "drive";
                                            const sideLabel = isReves ? "REVÉS" : isDrive ? "DRIVE" : "AMBOS";
                                            const initials = reg.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                                            const nameParts = reg.name.trim().split(" ");
                                            const firstName = nameParts[0] || reg.name;
                                            const lastName = nameParts.slice(1).join(" ") || "";

                                            return (
                                                <motion.div
                                                    key={reg.id}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.04 }}
                                                    className="relative group"
                                                >
                                                    {/* Outer gradient border */}
                                                    <div
                                                        className={`relative w-full p-[2px] transition-all duration-300 ${
                                                            isMe
                                                                ? "bg-red-500"
                                                                : "bg-gradient-to-br from-azul-primary via-celeste to-azul-primary"
                                                        }`}
                                                        style={{ clipPath: "polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)" }}
                                                    >
                                                        <div
                                                            className="relative w-full overflow-hidden"
                                                            style={{
                                                                backgroundColor: "#030712",
                                                                clipPath: "polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)",
                                                                aspectRatio: "3/4"
                                                            }}
                                                        >
                                                            {/* Grid texture */}
                                                            <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')] invert pointer-events-none" />

                                                            {/* Top gradient overlay */}
                                                            <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-azul-primary/30 to-transparent z-20 pointer-events-none" />

                                                            {/* Branding */}
                                                            <div className="absolute top-3 left-3 z-40 flex flex-col leading-none">
                                                                <span className="text-[8px] font-black italic text-white tracking-tighter">
                                                                    PADEL<span className="text-celeste">WEB</span>
                                                                </span>
                                                                <span className="text-[5px] font-black text-white/30 tracking-[0.2em] uppercase">Series 2026</span>
                                                            </div>

                                                            {/* Side ribbon top-right */}
                                                            <div className="absolute top-2 right-2 z-40">
                                                                <div className="bg-azul-primary px-1.5 py-0.5 transform skew-x-[-15deg] shadow-[0_0_12px_rgba(30,64,175,0.5)] border border-celeste/30">
                                                                    <span className="text-[7px] font-black text-white uppercase tracking-widest inline-block transform skew-x-[15deg]">
                                                                        {sideLabel}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Avatar — full bleed */}
                                                            <div className="absolute inset-0 z-10">
                                                                {reg.image ? (
                                                                    <img src={reg.image} alt={reg.name} className="w-full h-full object-cover object-top" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                                                                        <span className="text-4xl font-black italic text-celeste/30">{initials}</span>
                                                                    </div>
                                                                )}
                                                                <div className="absolute inset-0 bg-black/20 z-10" />
                                                            </div>

                                                            {/* Bottom stats area */}
                                                            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-slate-950 via-slate-900 to-transparent pt-8 px-3 pb-3">
                                                                {/* Name plate */}
                                                                <div className="relative mb-2">
                                                                    <div className="bg-white py-1 transform -skew-x-12 border-r-4 border-azul-primary shadow-xl">
                                                                        <p className="text-[9px] font-black uppercase italic tracking-tighter text-slate-950 text-center transform skew-x-12 truncate px-2">
                                                                            {firstName} <span className="text-azul-primary">{lastName}</span>
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-16 flex flex-col items-center justify-center space-y-3 bg-white/5 border border-dashed border-white/10 rounded-xl">
                                        <Search className="w-8 h-8 text-slate-400/20" />
                                        <div className="text-center">
                                            <h4 className="text-xs font-black uppercase tracking-tight italic text-slate-500">Sin inscriptos</h4>
                                            <p className="text-[8px] font-bold text-slate-400/45 uppercase tracking-widest mt-0.5">Ningún inscripto coincide con la búsqueda</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-3 border-t border-white/10 bg-white/5 text-right shrink-0 flex items-center justify-between">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 font-mono">
                                    Total: {filteredRegistrations.length} / {registrations.length} inscriptos
                                </span>
                                <button
                                    onClick={() => setIsParticipantsModalOpen(false)}
                                    className="h-8 px-4 bg-azul-primary hover:bg-azul-dark text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                    Cerrar panel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* 2. Results Modal */}
                {isResultsModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsResultsModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        />

                        {/* Modal Panel */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            className="relative w-full max-w-2xl bg-carbon-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
                        >
                            {/* HUD Corners */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-celeste pointer-events-none" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-celeste pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-celeste pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-celeste pointer-events-none" />

                            {/* Header */}
                            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                                <div>
                                    <span className="text-[7px] font-black uppercase tracking-[0.3em] text-celeste">REPORTE TÁCTICO DE PARTIDOS</span>
                                    <h3 className="text-sm font-black uppercase tracking-tight italic text-white truncate max-w-md mt-0.5">
                                        {resultsEventName}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setIsResultsModalOpen(false)}
                                    className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-white/5"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Live Search inside results */}
                            <div className="p-3 bg-white/5 border-b border-white/10 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <input
                                        type="text"
                                        value={resultsSearchQuery}
                                        onChange={(e) => setResultsSearchQuery(e.target.value)}
                                        placeholder="Buscar resultados por nombre de jugador..."
                                        className="w-full rounded-lg border border-white/10 bg-carbon-900 py-2 pl-9 pr-4 text-[10px] font-bold uppercase tracking-widest text-white focus:outline-none focus:ring-1 focus:ring-azul-primary/30 placeholder-muted-foreground/50 h-8.5 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Matches content list */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[250px]">
                                {isLoadingResults ? (
                                    <div className="h-full flex flex-col items-center justify-center py-16 space-y-3">
                                        <div className="w-6 h-6 border-2 border-celeste border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cargando reporte de partidos...</span>
                                    </div>
                                ) : filteredMatches.length > 0 ? (
                                    <>
                                        {/* Dynamic Player Statistics widget */}
                                        {resultsSearchQuery && (
                                            <div className="relative p-3 bg-azul-primary/5 border border-azul-primary/20 rounded-xl overflow-hidden shadow-inner">
                                                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-azul-primary pointer-events-none" />
                                                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-azul-primary pointer-events-none" />

                                                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-azul-primary block">Métricas del Jugador</span>
                                                {resultsPlayers
                                                    .filter((p) => p.name.toLowerCase().includes(resultsSearchQuery.toLowerCase()))
                                                    .slice(0, 1)
                                                    .map((player) => {
                                                        const pId = player.userId;
                                                        const stat = pId && resultsPlayerStats[pId] ? resultsPlayerStats[pId] : { played: 0, won: 0, points: 0 };
                                                        const winRate = stat.played > 0 ? Math.round((stat.won / stat.played) * 100) : 0;

                                                        return (
                                                            <div key={player.userId || "inv"} className="flex items-center justify-between mt-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center text-[10px] font-black uppercase text-azul-primary overflow-hidden">
                                                                        {player.image ? (
                                                                            <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            player.name.substring(0, 2)
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <h5 className="text-[10px] font-black uppercase italic leading-none">{player.name}</h5>
                                                                        <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">Monitoreo de rendimiento</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <div className="text-center">
                                                                        <span className="text-[8px] font-black text-slate-400 uppercase block leading-none">PARTIDOS</span>
                                                                        <span className="text-[11px] font-black font-mono text-white mt-0.5 block">{stat.played}</span>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <span className="text-[8px] font-black text-slate-400 uppercase block leading-none">VICTORIAS</span>
                                                                        <span className="text-[11px] font-black font-mono text-emerald-400 mt-0.5 block">{stat.won}</span>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <span className="text-[8px] font-black text-slate-400 uppercase block leading-none">EFICACIA</span>
                                                                        <span className="text-[11px] font-black font-mono text-celeste mt-0.5 block">{winRate}%</span>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <span className="text-[8px] font-black text-slate-400 uppercase block leading-none">PUNTOS</span>
                                                                        <span className="text-[11px] font-black font-mono text-orange-400 mt-0.5 block">{stat.points}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        )}

                                        {/* Scoreboard Matches Grid */}
                                        <div className="grid grid-cols-1 gap-2.5">
                                            {filteredMatches.map((match) => (
                                                <div
                                                    key={match.id}
                                                    className="bg-carbon-900/70 border border-white/10 p-3.5 rounded-xl flex flex-col gap-2.5 relative overflow-hidden transition-all duration-300 hover:border-celeste/35"
                                                    style={{
                                                        clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))"
                                                    }}
                                                >
                                                    <div className="absolute top-0 right-2 w-1.5 h-1.5 border-t border-r border-muted-foreground/15 pointer-events-none" />
                                                    <div className="absolute bottom-2 left-1.5 w-1.5 h-1.5 border-b border-l border-muted-foreground/15 pointer-events-none" />

                                                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                                                        <span className="text-[7px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-1">
                                                            <Zap className="w-2.5 h-2.5 text-orange-500" />
                                                            Cancha {match.courtNumber || 1}
                                                        </span>
                                                        {match.finishedAt && (
                                                            <span className="text-[7px] font-bold font-mono text-slate-500">
                                                                {new Date(match.finishedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} HS
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Profile Cards Layout */}
                                                    <div className="flex items-center gap-2">
                                                        {/* Team 1 */}
                                                        <div className="flex flex-1 gap-1.5 justify-end">
                                                            <ResultsMatchPlayerCard
                                                                name={getResultsPlayerName(match.team1Player1Id)}
                                                                image={getResultsPlayerImage(match.team1Player1Id)}
                                                                side={getResultsPlayerSide(match.team1Player1Id)}
                                                                isWinner={(match.score1 ?? 0) > (match.score2 ?? 0)}
                                                            />
                                                            <ResultsMatchPlayerCard
                                                                name={getResultsPlayerName(match.team1Player2Id)}
                                                                image={getResultsPlayerImage(match.team1Player2Id)}
                                                                side={getResultsPlayerSide(match.team1Player2Id)}
                                                                isWinner={(match.score1 ?? 0) > (match.score2 ?? 0)}
                                                            />
                                                        </div>

                                                        {/* Score Plate */}
                                                        <div className="flex flex-col items-center shrink-0 gap-0.5">
                                                            <div
                                                                className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-700/60 px-3 py-1 text-xs font-black font-mono skew-x-[-12deg] shadow-inner text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] min-w-[60px] h-7"
                                                            >
                                                                <span>{match.score1 ?? 0}</span>
                                                                <span className="text-[9px] text-slate-500">:</span>
                                                                <span>{match.score2 ?? 0}</span>
                                                            </div>
                                                        </div>

                                                        {/* Team 2 */}
                                                        <div className="flex flex-1 gap-1.5 justify-start">
                                                            <ResultsMatchPlayerCard
                                                                name={getResultsPlayerName(match.team2Player1Id)}
                                                                image={getResultsPlayerImage(match.team2Player1Id)}
                                                                side={getResultsPlayerSide(match.team2Player1Id)}
                                                                isWinner={(match.score2 ?? 0) > (match.score1 ?? 0)}
                                                            />
                                                            <ResultsMatchPlayerCard
                                                                name={getResultsPlayerName(match.team2Player2Id)}
                                                                image={getResultsPlayerImage(match.team2Player2Id)}
                                                                side={getResultsPlayerSide(match.team2Player2Id)}
                                                                isWinner={(match.score2 ?? 0) > (match.score1 ?? 0)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-16 flex flex-col items-center justify-center space-y-3 bg-white/5 border border-dashed border-white/10 rounded-xl">
                                        <Trophy className="w-8 h-8 text-slate-400/20" />
                                        <div className="text-center">
                                            <h4 className="text-xs font-black uppercase tracking-tight italic text-slate-500">Sin partidos registrados</h4>
                                            <p className="text-[8px] font-bold text-slate-400/45 uppercase tracking-widest mt-0.5">No hay partidos finalizados cargados en este evento</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-3 border-t border-white/10 bg-white/5 text-right shrink-0 flex items-center justify-between">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 font-mono">
                                    Total: {filteredMatches.length} / {resultsMatches.length} partidos jugados
                                </span>
                                <button
                                    onClick={() => setIsResultsModalOpen(false)}
                                    className="h-8 px-4 bg-azul-primary hover:bg-azul-dark text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                    Cerrar panel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ResultsMatchPlayerCard({
    name,
    image,
    side,
    isWinner,
}: {
    name: string;
    image: string | null;
    side: string | null;
    isWinner: boolean;
}) {
    const cardStyle = { clipPath: "polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)" };
    const firstName = name.split(" ")[0] ?? name;
    const lastName = name.split(" ").slice(1).join(" ");

    return (
        <div className="flex flex-col items-center gap-1 w-[68px] shrink-0">
            <div
                className="relative w-[68px] h-[80px] overflow-hidden"
                style={{
                    ...cardStyle,
                    border: isWinner
                        ? "1.5px solid rgba(52,211,153,0.7)"
                        : "1.5px solid rgba(255,255,255,0.08)",
                    boxShadow: isWinner ? "0 0 12px rgba(52,211,153,0.25)" : "none",
                    background: "#020617",
                }}
            >
                {image ? (
                    <img
                        src={image}
                        alt={name}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ filter: isWinner ? "none" : "grayscale(30%)" }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        <span className="text-xl font-black text-slate-600 uppercase">{name[0]}</span>
                    </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/90 via-[#020617]/20 to-transparent" />
                {/* Side badge */}
                {side && (
                    <div className="absolute top-1 right-1 px-1 py-0.5 bg-black/70 border border-white/10 rounded text-[6px] font-black uppercase tracking-wider text-slate-300">
                        {side}
                    </div>
                )}
                {/* Winner star */}
                {isWinner && (
                    <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-emerald-500/90 flex items-center justify-center">
                        <span className="text-[7px] text-white font-black">★</span>
                    </div>
                )}
                {/* Name plate */}
                <div
                    className="absolute bottom-0 left-0 right-0 px-1 py-0.5"
                    style={{
                        background: isWinner
                            ? "linear-gradient(135deg, rgba(52,211,153,0.85) 0%, rgba(16,185,129,0.75) 100%)"
                            : "linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.85) 100%)",
                        transform: "skewX(-6deg)",
                    }}
                >
                    <p className="text-[7px] font-black uppercase tracking-wider text-white truncate leading-none" style={{ transform: "skewX(6deg)" }}>
                        {firstName}
                    </p>
                    {lastName && (
                        <p className="text-[6px] font-bold uppercase tracking-wider text-white/70 truncate leading-none mt-0.5" style={{ transform: "skewX(6deg)" }}>
                            {lastName}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
