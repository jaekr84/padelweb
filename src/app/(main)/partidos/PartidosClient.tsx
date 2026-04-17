"use client";

import { useState, useMemo } from "react";
import { Search, MapPin, Calendar, Clock, Users, Zap, User, ChevronRight, Check, Plus, Star, X, ArrowLeft, Info, ExternalLink } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { joinPublicMatch, leavePublicMatch } from "./actions";
import { getPlayerProfileData } from "@/app/actions/players";
import PlayerCard from "@/components/PlayerCard";
import { useRouter } from "next/navigation";

// ── MatchCard Component ───────────────────────────────────────────────────────
function MatchCard({
    match,
    currentUserId,
    isLoggedIn,
    handleJoin,
    handleLeave,
    loadingId,
    formatDate,
    onShowProfile
}: {
    match: MatchWithData;
    currentUserId?: string;
    isLoggedIn: boolean;
    handleJoin: (id: string) => void;
    handleLeave: (id: string) => void;
    loadingId: string | null;
    formatDate: (d: string) => string;
    onShowProfile: (id: string) => void;
}) {
    const [isFlipped, setIsFlipped] = useState(false);
    const isJoined = match.registrations.some(r => r.userId === currentUserId);
    const isCreator = match.creatorId === currentUserId;
    const spotsFull = match.registrations.length;
    const totalSpots = match.totalSlots || 4;
    const remaining = Math.max(0, totalSpots - spotsFull);

    return (
        <div className="relative h-[650px] w-full [perspective:1000px] group/card mb-8">
            <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                className="relative w-full h-full [transform-style:preserve-3d]"
            >
                {/* FRONT SIDE */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
                    <div className="h-full bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 flex flex-col">
                        <div className="p-8 pb-4 flex items-center gap-4">
                            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 flex-shrink-0 bg-slate-50 flex items-center justify-center">
                                {match.creator.imageUrl ? (
                                    <Image
                                        src={match.creator.imageUrl}
                                        alt={match.creator.firstName || "User"}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <User className="w-6 h-6 text-slate-300" />
                                )}
                            </div>
                            <div className="min-w-0 text-left">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Organiza</p>
                                <h3 className="text-sm font-black text-slate-900 truncate">
                                    {match.creator.firstName} {match.creator.lastName}
                                </h3>
                            </div>
                            <div className="ml-auto bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                Cat {match.category}
                            </div>
                        </div>

                        <div className="px-8 flex-grow space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-slate-900">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-azul-primary" />
                                        <span className="text-sm font-bold">{formatDate(match.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-azul-primary" />
                                        <span className="text-sm font-bold">{match.time}</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 group/loc relative">
                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0 text-left flex-grow">
                                        <h4 className="text-sm font-black text-slate-900 truncate">{match.location}</h4>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">{match.city}</p>
                                    </div>
                                    <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${match.location}, ${match.city}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                        title="Abrir GPS"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span className="text-[8px] font-black tracking-widest uppercase">GPS</span>
                                    </a>
                                </div>

                                {/* MAP THUMBNAIL */}
                                <div className="w-full h-32 rounded-2xl overflow-hidden border border-slate-100 shadow-inner bg-slate-50 relative group/mini-map">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        scrolling="no"
                                        marginHeight={0}
                                        marginWidth={0}
                                        loading="lazy"
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(`${match.location}, ${match.city}`)}&z=14&ie=UTF8&iwloc=&output=embed`}
                                        className="opacity-70 group-hover/mini-map:opacity-100 transition-opacity duration-500 grayscale-[0.5] hover:grayscale-0"
                                    />
                                    <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-slate-900/5 rounded-2xl" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jugadores ({spotsFull}/{totalSpots})</p>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${remaining === 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {remaining === 0 ? 'COMPLETO' : `FALTAN ${remaining}`}
                                    </span>
                                </div>
                                <div className="flex -space-x-2">
                                    {match.registrations.map((reg, i) => (
                                        <div key={reg.userId || `guest-${i}`} className="w-8 h-8 rounded-full border-2 border-white bg-blue-50 overflow-hidden relative flex items-center justify-center">
                                            {reg.user?.imageUrl ? (
                                                <Image src={reg.user.imageUrl} alt="Player" fill className="object-cover" />
                                            ) : (
                                                <User className="w-4 h-4 text-azul-primary" />
                                            )}
                                        </div>
                                    ))}
                                    {Array.from({ length: Math.min(6, remaining) }).map((_, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-green-50 flex items-center justify-center">
                                            <Users className="w-4 h-4 text-green-500" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 pt-4 space-y-3">
                            <button
                                onClick={() => setIsFlipped(true)}
                                className="w-full h-12 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <Users className="w-3 h-3" />
                                Ver Jugadores
                            </button>
                            {isCreator ? (
                                <Link
                                    href={`/partidos/${match.id}`}
                                    className="w-full h-14 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center hover:bg-blue-600 transition-all"
                                >
                                    Administrar Partido
                                </Link>
                            ) : isJoined ? (
                                <button
                                    onClick={() => handleLeave(match.id)}
                                    disabled={loadingId === match.id}
                                    className="w-full h-14 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    {loadingId === match.id ? "PROCESANDO..." : "ABANDONAR PARTIDO"}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleJoin(match.id)}
                                    disabled={loadingId === match.id || remaining === 0}
                                    className={`w-full h-14 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${remaining === 0
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-slate-900 text-white hover:bg-blue-600 shadow-xl hover:shadow-azul-primary/20 active:scale-95'
                                        }`}
                                >
                                    {loadingId === match.id ? "PROCESANDO..." : remaining === 0 ? "PARTIDO LLENO" : "UNIRME A JUGAR"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* BACK SIDE */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="h-full bg-slate-900 text-white border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-8 pb-4 flex items-center justify-between border-b border-white/5">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter italic">Participantes</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{spotsFull} Confirmados / {totalSpots} Cupos</p>
                            </div>
                            <button
                                onClick={() => setIsFlipped(false)}
                                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-all"
                            >
                                <ArrowLeft className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-8 space-y-4 no-scrollbar">
                            {match.registrations.map((reg, i) => (
                                <div key={reg.userId || `guest-${i}`} className="flex items-center justify-between group/row">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                                            {reg.user?.imageUrl ? (
                                                <Image
                                                    src={reg.user.imageUrl}
                                                    alt="Player"
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <User className="w-5 h-5 text-slate-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black uppercase italic tracking-tight truncate leading-none mb-1">
                                                {reg.user ? `${reg.user.firstName} ${reg.user.lastName}` : reg.guestName}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                {reg.userId === match.creatorId && <span className="text-[7px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 bg-azul-primary text-white rounded">Org</span>}
                                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest italic">{reg.user ? "Jugador" : "Invitado"}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {reg.userId && (
                                        <button
                                            onClick={() => onShowProfile(reg.userId!)}
                                            className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-blue-600 hover:border-azul-primary transition-all"
                                        >
                                            <User className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {Array.from({ length: remaining }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 opacity-30 italic">
                                    <div className="w-10 h-10 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest">Buscando...</span>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 pt-4">
                            <Link
                                href={`/partidos/${match.id}`}
                                className="w-full h-12 bg-blue-600 hover:bg-azul-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-azul-primary/20"
                            >
                                <Info className="w-3 h-3" />
                                Ver detalle completo
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}


type MatchWithData = {
    id: string;
    creatorId: string;
    date: string;
    time: string;
    location: string;
    city: string;
    category: string | null;
    gender: string | null;
    description: string | null;
    totalSlots: number | null;
    status: string;
    creator: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        imageUrl: string | null;
        category: string | null;
    };
    registrations: {
        userId: string | null;
        guestName: string | null;
        user: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            imageUrl: string | null;
        } | null;
    }[];
};

interface PartidosClientProps {
    initialMatches: MatchWithData[];
    isLoggedIn: boolean;
    currentUserId?: string;
    cities: string[];
    categories: string[];
}

export default function PartidosClient({ initialMatches, isLoggedIn, currentUserId, cities, categories }: PartidosClientProps) {
    const [searchCity, setSearchCity] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [showMyMatches, setShowMyMatches] = useState(false);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [profileData, setProfileData] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [activeTab, setActiveTab] = useState<'resumen' | 'historial'>('resumen');
    const router = useRouter();

    const handleShowProfile = async (id: string) => {
        setSelectedPlayerId(id);
        setLoadingProfile(true);
        try {
            const data = await getPlayerProfileData(id);
            setProfileData(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingProfile(false);
        }
    };

    const filteredMatches = useMemo(() => {
        if (!Array.isArray(initialMatches)) return [];

        return initialMatches.filter(m => {
            if (!m) return false;

            // 1. Filtrar por Ciudad (Zona)
            if (searchCity && searchCity !== 'all') {
                const matchCity = m.city?.toLowerCase() || "";
                if (!matchCity.includes(searchCity.toLowerCase())) return false;
            }

            // 2. Filtrar por Categoría
            if (filterCategory && filterCategory !== 'all') {
                if (m.category !== filterCategory) return false;
            }

            // 3. Filtrar por "Mis Partidos"
            if (showMyMatches && currentUserId) {
                const isRegistered = m.registrations?.some(r => r.userId === currentUserId) || false;
                const isCreator = m.creatorId === currentUserId;
                if (!isRegistered && !isCreator) return false;
            }

            return true;
        });
    }, [initialMatches, searchCity, filterCategory, showMyMatches, currentUserId]);

    const handleJoin = async (matchId: string) => {
        if (!isLoggedIn) {
            router.push("/login");
            return;
        }
        try {
            setLoadingId(matchId);
            const res = await joinPublicMatch(matchId);
            if (res.success) {
                router.refresh();
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoadingId(null);
        }
    };

    const handleLeave = async (matchId: string) => {
        try {
            setLoadingId(matchId);
            const res = await leavePublicMatch(matchId);
            if (res.success) {
                router.refresh();
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoadingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    };

    const dropdownTriggerStyles = "flex h-14 w-full items-center justify-between rounded-2xl border border-border bg-background px-4 py-2 text-sm font-bold uppercase tracking-tight text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all";
    const dropdownContentStyles = "z-50 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl";
    const dropdownItemStyles = "relative flex cursor-default select-none items-center rounded-xl px-4 py-3 text-sm font-bold tracking-tight uppercase text-popover-foreground outline-none transition-colors data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground";

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
            {/* Hero Section */}
            <div className="relative rounded-[3rem] overflow-hidden bg-foreground p-12 lg:p-16 text-background flex flex-col lg:flex-row items-center justify-between gap-12 shadow-2xl">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-azul-primary rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-azul-primary rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
                </div>

                <div className="relative z-10 space-y-6 max-w-2xl text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-background/10 border border-background/20 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-celeste">
                        <Users className="w-3 h-3 fill-current" />
                        Completá tu partido
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black uppercase tracking-tighter leading-none italic">
                        Armá tu <span className="text-celeste">Match</span>
                    </h1>
                    <p className="text-lg text-background/60 font-medium leading-relaxed">
                        ¿Te falta gente? Creá un partido público o unite a uno ya existente. Encontrá jugadores de tu zona y categoría al instante.
                    </p>
                    <div className="flex flex-wrap gap-4 pt-4 justify-center lg:justify-start">
                        <Link
                            href="/partidos/nuevo"
                            className="bg-azul-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-azul-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Crear Partido
                        </Link>
                    </div>
                </div>

                <div className="relative z-10 w-full lg:w-80 space-y-4">
                    <div className="bg-background/10 backdrop-blur-md border border-background/20 rounded-3xl p-6 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-celeste">Filtrar Partidos</p>

                        {/* City Filter */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-background/40">Zona / Localidad</label>
                            <Select.Root value={searchCity} onValueChange={setSearchCity}>
                                <Select.Trigger className="w-full h-12 rounded-xl bg-background/5 border border-background/10 px-4 text-xs font-bold text-white flex items-center justify-between">
                                    <Select.Value placeholder="Todas las zonas" />
                                    <Select.Icon><ChevronRight className="w-4 h-4 rotate-90" /></Select.Icon>
                                </Select.Trigger>
                                <Select.Portal>
                                    <Select.Content className="z-[9999] bg-foreground border border-background/20 rounded-xl overflow-hidden shadow-2xl">
                                        <Select.Viewport className="p-1">
                                            <Select.Item value="all" className="p-3 text-xs font-bold uppercase text-background outline-none hover:bg-background/10 cursor-pointer">
                                                <Select.ItemText>Todas las zonas</Select.ItemText>
                                            </Select.Item>
                                            {cities.map(city => (
                                                <Select.Item key={city} value={city} className="p-3 text-xs font-bold uppercase text-background outline-none hover:bg-background/10 cursor-pointer">
                                                    <Select.ItemText>{city}</Select.ItemText>
                                                </Select.Item>
                                            ))}
                                        </Select.Viewport>
                                    </Select.Content>
                                </Select.Portal>
                            </Select.Root>
                        </div>

                        {/* Category Filter */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-background/40">Categoría</label>
                            <Select.Root value={filterCategory} onValueChange={setFilterCategory}>
                                <Select.Trigger className="w-full h-12 rounded-xl bg-background/5 border border-background/10 px-4 text-xs font-bold text-white flex items-center justify-between">
                                    <Select.Value placeholder="Todas las categorías" />
                                    <Select.Icon><ChevronRight className="w-4 h-4 rotate-90" /></Select.Icon>
                                </Select.Trigger>
                                <Select.Portal>
                                    <Select.Content className="z-[9999] bg-foreground border border-background/20 rounded-xl overflow-hidden shadow-2xl">
                                        <Select.Viewport className="p-1">
                                            <Select.Item value="all" className="p-3 text-xs font-bold uppercase text-background outline-none hover:bg-background/10 cursor-pointer">
                                                <Select.ItemText>Todas las categorías</Select.ItemText>
                                            </Select.Item>
                                            {categories.map(cat => (
                                                <Select.Item key={cat} value={cat} className="p-3 text-xs font-bold uppercase text-background outline-none hover:bg-background/10 cursor-pointer">
                                                    <Select.ItemText>{cat === "Libre" ? "Libre" : `Categoría ${cat}`}</Select.ItemText>
                                                </Select.Item>
                                            ))}
                                        </Select.Viewport>
                                    </Select.Content>
                                </Select.Portal>
                            </Select.Root>
                        </div>

                        {/* User Matches Filter */}
                        {isLoggedIn && (
                            <div className="pt-2">
                                <button
                                    onClick={() => setShowMyMatches(!showMyMatches)}
                                    className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${showMyMatches
                                        ? "bg-azul-primary text-white shadow-lg shadow-azul-primary/30"
                                        : "bg-white/5 border border-white/10 text-white/40 hover:bg-white/10"
                                        }`}
                                >
                                    <Star className={`w-3.5 h-3.5 ${showMyMatches ? "fill-current" : ""}`} />
                                    Mis Partidos {showMyMatches && `(${filteredMatches.length})`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Match List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                    {filteredMatches.map((match) => (
                        <MatchCard
                            key={match.id}
                            match={match}
                            currentUserId={currentUserId}
                            isLoggedIn={isLoggedIn}
                            handleJoin={handleJoin}
                            handleLeave={handleLeave}
                            loadingId={loadingId}
                            formatDate={formatDate}
                            onShowProfile={handleShowProfile}
                        />
                    ))}
                </AnimatePresence>

                {filteredMatches.length === 0 && (
                    <div className="col-span-full py-20 text-center opacity-40">
                        <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <h3 className="text-xl font-black uppercase italic tracking-tighter">No hay partidos disponibles</h3>
                        <p className="text-sm font-bold text-slate-500">Intentá con otros filtros o creá uno nuevo.</p>
                    </div>
                )}
            </div>

            {/* Profile Modal */}
            <AnimatePresence>
                {selectedPlayerId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedPlayerId(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative z-10 w-full max-w-5xl"
                        >
                            <button
                                onClick={() => setSelectedPlayerId(null)}
                                className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-all z-50"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {loadingProfile ? (
                                <div className="bg-slate-900/80 backdrop-blur-xl rounded-[3rem] p-20 flex flex-col items-center justify-center border border-white/10">
                                    <div className="w-12 h-12 border-4 border-azul-primary/20 border-t-azul-primary rounded-full animate-spin mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Cargando Perfil...</p>
                                </div>
                            ) : profileData ? (
                                <div className="bg-slate-950/90 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                                    {/* Tabs Header */}
                                    <div className="flex items-center justify-between px-10 py-6 border-b border-white/5 bg-white/5">
                                        <div className="flex items-center gap-8">
                                            <button
                                                onClick={() => setActiveTab('resumen')}
                                                className={`relative py-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'resumen' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
                                            >
                                                Resumen
                                                {activeTab === 'resumen' && <motion.div layoutId="activeTab" className="absolute -bottom-6 left-0 right-0 h-1 bg-azul-primary rounded-full" />}
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('historial')}
                                                className={`relative py-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'historial' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
                                            >
                                                Últimos 20 partidos
                                                {activeTab === 'historial' && <motion.div layoutId="activeTab" className="absolute -bottom-6 left-0 right-0 h-1 bg-azul-primary rounded-full" />}
                                            </button>
                                        </div>
                                        <div className="hidden lg:flex items-center gap-4">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">Nivel Proyectado</span>
                                                <span className="text-sm font-black text-celeste italic">CATEGORÍA {profileData.player.category}</span>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center">
                                                <Zap className="w-5 h-5 text-azul-primary" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 lg:p-10">
                                        <AnimatePresence mode="wait">
                                            {activeTab === 'resumen' ? (
                                                <motion.div
                                                    key="resumen"
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    className="flex flex-col lg:flex-row gap-10 items-center lg:items-stretch"
                                                >
                                                    {/* Player Card */}
                                                    <div className="shrink-0 flex items-center justify-center">
                                                        <PlayerCard player={profileData.player} stats={profileData.stats} />
                                                    </div>

                                                    {/* Summary KPIs */}
                                                    <div className="flex-1 space-y-8 py-4 w-full">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="bg-white/5 border border-white/5 p-6 rounded-3xl space-y-1">
                                                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">PJ Totales</p>
                                                                <p className="text-3xl font-black text-white italic">{profileData.stats.pj}</p>
                                                            </div>
                                                            <div className="bg-white/5 border border-white/5 p-6 rounded-3xl space-y-1">
                                                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Win Rate</p>
                                                                <p className="text-3xl font-black text-blue-400 italic">{profileData.stats.wr}%</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Últimos Resultados</h4>
                                                            <div className="flex gap-2">
                                                                {profileData.history.slice(0, 5).map((h: any, i: number) => (
                                                                    <div
                                                                        key={i}
                                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${h.isWin === true ? 'bg-green-500 text-white' : h.isWin === false ? 'bg-red-500 text-white' : 'bg-white/10 text-white/40'}`}
                                                                        title={h.tournament}
                                                                    >
                                                                        {h.isWin === true ? 'G' : h.isWin === false ? 'P' : '-'}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="bg-blue-600/10 border border-azul-primary/20 p-8 rounded-[2rem] relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                                                <Zap className="w-20 h-20 text-azul-primary" />
                                                            </div>
                                                            <h4 className="text-lg font-black text-white uppercase italic tracking-tighter mb-1 relative z-10">Potencial del Jugador</h4>
                                                            <p className="text-xs text-blue-200/60 font-medium leading-relaxed max-w-sm relative z-10">
                                                                Basado en su historial de torneos y win rate actual, este jugador muestra un rendimiento sólido en {profileData.player.category}.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="historial"
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    className="space-y-6"
                                                >
                                                    <div className="flex items-center justify-between pb-2">
                                                        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Registro Cronológico</h4>
                                                        <div className="flex gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-azul-primary" />
                                                                <span className="text-[10px] font-bold text-white/40 uppercase">Torneo</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-celeste" />
                                                                <span className="text-[10px] font-bold text-white/40 uppercase">Cancha Abierta</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 overflow-y-auto max-h-[550px] pr-2 no-scrollbar">
                                                        {profileData.history.map((m: any) => (
                                                            <div key={m.id} className="group relative bg-white/5 hover:bg-white/10 border border-white/5 p-5 rounded-[2rem] flex items-center justify-between transition-all">
                                                                <div className="flex items-center gap-6">
                                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${m.type === 'Torneo' ? 'bg-azul-primary/10 text-azul-primary' : m.type === 'Cancha Abierta' ? 'bg-celeste/10 text-celeste' : 'bg-slate-500/10 text-slate-500'}`}>
                                                                        {m.type === 'Torneo' ? <Zap className="w-6 h-6" /> : m.type === 'Cancha Abierta' ? <Users className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                                                                    </div>
                                                                    <div className="flex flex-col gap-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${m.isWin === true ? 'bg-green-500/20 text-green-400' : m.isWin === false ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/30'}`}>
                                                                                {m.isWin === true ? 'G' : m.isWin === false ? 'P' : '-'}
                                                                            </span>
                                                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{m.type} • {m.subType}</span>
                                                                        </div>
                                                                        <h4 className="text-base font-black text-white truncate italic uppercase tracking-tight">{m.tournament}</h4>
                                                                        <div className="flex items-center gap-3">
                                                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-tight">vs {m.opponent}</p>
                                                                            <span className="text-white/10">•</span>
                                                                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{new Date(m.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right shrink-0 pr-2">
                                                                    <div className="text-2xl font-black italic text-white leading-none mb-1 tracking-tighter">{m.score}</div>
                                                                    {m.isWin === true ? (
                                                                        <span className="text-[9px] font-black uppercase text-green-400 tracking-widest italic">Victoria</span>
                                                                    ) : m.isWin === false ? (
                                                                        <span className="text-[9px] font-black uppercase text-red-400 tracking-widest italic">Derrota</span>
                                                                    ) : (
                                                                        <span className="text-[9px] font-black uppercase text-white/20 tracking-widest italic">Finalizado</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {profileData.history.length === 0 && (
                                                            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                                                <Info className="w-10 h-10 mb-4" />
                                                                <p className="text-xs font-bold uppercase tracking-widest">Sin actividad registrada</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-[3rem] p-12 text-center">
                                    <p className="text-slate-500 font-bold tracking-tight">No se encontró el perfil del jugador.</p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
