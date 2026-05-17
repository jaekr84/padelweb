"use client";

import { useState, useMemo } from "react";
import { Search, MapPin, Calendar, Clock, Users, Zap, User, ChevronRight, Check, Plus, Star, X, ArrowLeft, Info, ExternalLink, MessageSquare, Trophy } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { joinPublicMatch, leavePublicMatch } from "./actions";
import { startConversation } from "@/app/(main)/mensajes/actions";
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
    onShowProfile,
    onMessageCreator
}: {
    match: MatchWithData;
    currentUserId?: string;
    isLoggedIn: boolean;
    handleJoin: (id: string) => void;
    handleLeave: (id: string) => void;
    loadingId: string | null;
    formatDate: (d: string) => string;
    onShowProfile: (id: string) => void;
    onMessageCreator: (creatorId: string) => void;
}) {
    const [isFlipped, setIsFlipped] = useState(false);
    const isJoined = match.registrations.some(r => r.userId === currentUserId);
    const isCreator = match.creatorId === currentUserId;
    const spotsFull = match.registrations.length;
    const totalSpots = match.totalSlots || 4;
    const remaining = Math.max(0, totalSpots - spotsFull);

    return (
        <div className="relative h-[570px] w-full [perspective:1000px] group/card mb-2">
            <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                className="relative w-full h-full [transform-style:preserve-3d]"
            >
                {/* FRONT SIDE */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
                    <div className="h-full bg-card border border-border/60 rounded-2xl overflow-hidden hover:shadow-lg hover:border-azul-primary/40 transition-all duration-300 flex flex-col justify-between">
                        {/* Header info */}
                        <button
                            type="button"
                            onClick={() => onShowProfile(match.creatorId)}
                            className="p-2.5 pb-1.5 flex items-center gap-2 border-b border-border/30 shrink-0 w-full text-left hover:bg-muted/30 transition-colors group/header"
                        >
                            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border/60 bg-muted shrink-0 flex items-center justify-center group-hover/header:border-azul-primary/45 transition-colors">
                                {match.creator.imageUrl ? (
                                    <Image
                                        src={match.creator.imageUrl}
                                        alt={match.creator.firstName || "User"}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <User className="w-4 h-4 text-muted-foreground/60" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[7px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none mb-0.5 group-hover/header:text-azul-primary transition-colors">Organiza</p>
                                <h3 className="text-[10px] font-black text-foreground truncate leading-none group-hover/header:text-azul-primary transition-colors">
                                    {match.creator.firstName} {match.creator.lastName}
                                </h3>
                            </div>
                            <div className="ml-auto bg-azul-primary/10 text-azul-primary px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-azul-primary/20 shrink-0">
                                Cat {match.category}
                            </div>
                        </button>

                        {/* Body content */}
                        <div className="p-2.5 flex-grow flex flex-col justify-between min-h-0">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-foreground leading-none">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-azul-primary" />
                                        <span className="text-[10px] font-black">{formatDate(match.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-azul-primary" />
                                        <span className="text-[10px] font-black">{match.time}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-muted/20 border border-border/40 relative group/loc min-w-0">
                                    <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <span className="block text-[6px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-0.5">Sede / Ubicación</span>
                                        <h4 className="text-[9px] font-black text-foreground truncate leading-none">{match.location}</h4>
                                    </div>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${match.location}, ${match.city}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-background px-1.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-1 shrink-0 h-6"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <ExternalLink className="w-2.5 h-2.5" />
                                        <span className="text-[7px] font-black tracking-widest uppercase">GPS</span>
                                    </a>
                                </div>
                            </div>

                            <div className="space-y-1 mt-1">
                                <div className="flex items-center justify-between leading-none mb-1">
                                    <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">Jugadores ({spotsFull}/{totalSpots})</p>
                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded leading-none ${remaining === 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                        {remaining === 0 ? 'COMPLETO' : `FALTAN ${remaining}`}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 py-0.5">
                                    {match.registrations.map((reg, i) => {
                                        const hasUserId = !!reg.userId;
                                        const isOwnPlayer = reg.userId === currentUserId;
                                        const isPlayerFemale = match.gender === 'femenino';
                                        const firstName = reg.user ? reg.user.firstName : reg.guestName || "Invitado";
                                        const lastName = reg.user ? reg.user.lastName || "" : "";
                                        const category = reg.userId === match.creatorId ? (match.creator.category || match.category || "D") : (match.category || "D");

                                        // Theme Colors matching PlayerCard
                                        const theme = {
                                            primary: isOwnPlayer ? 'red-600' : isPlayerFemale ? 'rojo' : 'azul-primary',
                                            accent: isOwnPlayer ? 'red-400' : isPlayerFemale ? 'rosa' : 'celeste',
                                            gradient: isOwnPlayer
                                                ? 'from-red-500 via-red-600 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.35)] border-red-500'
                                                : isPlayerFemale
                                                    ? 'from-rojo via-rosa to-rojo shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                                                    : 'from-azul-primary via-celeste to-azul-primary shadow-[0_0_10px_rgba(0,119,255,0.2)]',
                                            cardBg: isOwnPlayer ? '#0a0102' : isPlayerFemale ? '#0d0102' : '#030712'
                                        };

                                        return (
                                            <button
                                                key={reg.userId || `guest-${i}`}
                                                type="button"
                                                disabled={!hasUserId}
                                                onClick={hasUserId ? () => onShowProfile(reg.userId!) : undefined}
                                                className={`relative w-full h-[185px] bg-gradient-to-br ${theme.gradient} p-[1.5px] rounded-lg overflow-hidden shrink-0 transition-all ${hasUserId
                                                    ? 'cursor-pointer hover:scale-[1.03] active:scale-95 hover:z-10'
                                                    : 'cursor-default'
                                                    }`}
                                                style={{ clipPath: 'polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)' }}
                                                title={reg.user ? `${reg.user.firstName} ${reg.user.lastName}` : reg.guestName || "Invitado"}
                                            >
                                                <div
                                                    className="relative w-full h-full overflow-hidden flex flex-col justify-between"
                                                    style={{
                                                        backgroundColor: theme.cardBg,
                                                        clipPath: 'polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)'
                                                    }}
                                                >
                                                    {/* Background grid */}
                                                    <div className="absolute inset-0 opacity-[0.04] bg-[url('/grid.svg')] invert pointer-events-none" />

                                                    {/* Branding (Top Left) */}
                                                    <div className="absolute top-1.5 left-2.5 z-20 flex flex-col items-start leading-none scale-[0.75] origin-top-left">
                                                        <span className="text-[5.5px] font-black italic text-white tracking-tighter leading-none">
                                                            PADEL<span className={isPlayerFemale ? "text-rosa" : "text-celeste"}>WEB</span>
                                                        </span>
                                                        <span className="text-[3px] font-black text-white/30 tracking-[0.2em] uppercase mt-[1px] leading-none">Series 2026</span>
                                                    </div>

                                                    {/* Category & Side skew label (Top Right) */}
                                                    <div className="absolute top-1.5 right-2.5 z-20 flex flex-col items-end leading-none scale-[0.75] origin-top-right">
                                                        <span className={`text-xl font-black italic text-transparent bg-clip-text bg-gradient-to-b ${isPlayerFemale ? 'from-rosa to-rojo' : 'from-white to-celeste'} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}>
                                                            {category}
                                                        </span>
                                                        <div className={`mt-0.5 px-1 py-[0.5px] rounded-[1.5px] transform skew-x-[-15deg] border border-${theme.accent}/20 bg-black/60`}>
                                                            <span className="text-[4px] font-black text-white uppercase tracking-wider inline-block transform skew-x-[15deg]">
                                                                REVÉS
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Player Image Full Background */}
                                                    <div className="absolute inset-0 z-0">
                                                        {reg.user?.imageUrl ? (
                                                            <Image src={reg.user.imageUrl} alt="Player" fill className="object-cover object-top" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                                                                <User className="w-6 h-6 text-white/10" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/25" />
                                                    </div>

                                                    {/* Logros (Micro Ribbon) */}
                                                    <div className="absolute bottom-[56px] left-2.5 z-20 scale-[0.75] origin-bottom-left">
                                                        <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-500/90 to-transparent backdrop-blur-md pl-1.5 pr-4 py-[1px] transform -skew-x-12 border-l-2 border-yellow-400">
                                                            <span className="text-[4px] font-black text-white uppercase italic transform skew-x-12">Logros</span>
                                                            <Trophy className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400/20 transform skew-x-12" />
                                                        </div>
                                                    </div>

                                                    {/* Player Name skew banner */}
                                                    <div className="absolute bottom-[28px] inset-x-2 z-20 scale-[0.9] origin-bottom">
                                                        <div className="bg-white py-0.5 px-1 transform -skew-x-12 relative border-r-2 border-azul-primary shadow-lg flex items-center justify-center h-[16px]">
                                                            <h4 className="text-[7.5px] font-black uppercase italic tracking-tighter text-slate-950 text-center transform skew-x-12 truncate leading-none w-full">
                                                                {firstName} <span className="text-azul-primary">{lastName}</span>
                                                            </h4>
                                                        </div>
                                                    </div>

                                                    {/* Bottom Bar info */}
                                                    <div className="absolute bottom-0 inset-x-0 h-[20px] bg-slate-950/80 backdrop-blur-[1px] border-t border-white/5 flex items-center justify-center px-1 z-10">
                                                        <span className="text-[5.2px] font-black text-slate-400 uppercase tracking-widest leading-none truncate max-w-full text-center">
                                                            CLUB: <span className="text-celeste">SOCIO INDEPENDIENTE</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {Array.from({ length: remaining }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-full h-[185px] rounded-lg border-2 border-dashed border-green-500/20 bg-green-500/[0.01] flex flex-col items-center justify-center p-3 text-center transition-all hover:bg-green-500/[0.02]"
                                            style={{ clipPath: 'polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)' }}
                                        >
                                            <div className="w-8 h-8 rounded-full border border-dashed border-green-500/30 flex items-center justify-center mb-1.5 bg-green-500/[0.02]">
                                                <Users className="w-4 h-4 text-green-500/40" />
                                            </div>
                                            <p className="text-[8px] font-black text-green-500/50 uppercase tracking-widest leading-none mb-0.5">Cupo Libre</p>
                                            <p className="text-[6px] font-bold text-green-500/30 uppercase tracking-widest leading-none">Buscando...</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Actions footer */}
                        <div className="p-2 flex items-center gap-1 bg-muted/10 border-t border-border/40 shrink-0">
                            <button
                                onClick={() => setIsFlipped(true)}
                                className="w-8 h-8 rounded-lg bg-background border border-border text-muted-foreground hover:bg-muted transition-all flex items-center justify-center shrink-0"
                                title="Ver Jugadores"
                            >
                                <Users className="w-3.5 h-3.5" />
                            </button>
                            {isLoggedIn && !isCreator && (
                                <button
                                    onClick={() => onMessageCreator(match.creatorId)}
                                    className="w-8 h-8 rounded-lg bg-azul-primary/5 border border-azul-primary/20 text-azul-primary hover:bg-azul-primary hover:text-white transition-all flex items-center justify-center shrink-0"
                                    title="Mensaje al Organizador"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {isJoined ? (
                                <button
                                    onClick={() => handleLeave(match.id)}
                                    disabled={loadingId === match.id}
                                    className="flex-grow h-8 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                                >
                                    {loadingId === match.id ? "PROCESANDO..." : "ABANDONAR"}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleJoin(match.id)}
                                    disabled={loadingId === match.id || remaining === 0}
                                    className={`flex-grow h-8 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${remaining === 0
                                        ? 'bg-muted text-muted-foreground/60 cursor-not-allowed border border-border'
                                        : 'bg-slate-900 text-white hover:bg-blue-600 shadow-sm'
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
                    <div className="h-full bg-slate-900 text-white border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
                        <div className="p-2.5 pb-1.5 flex items-center justify-between border-b border-white/5">
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-tighter italic">Participantes</h3>
                                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{spotsFull} Confirmados / {totalSpots} Cupos</p>
                            </div>
                            <button
                                onClick={() => setIsFlipped(false)}
                                className="w-6 h-6 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center transition-all"
                            >
                                <ArrowLeft className="w-3.5 h-3.5 text-white" />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-2.5 space-y-1.5 no-scrollbar min-h-0">
                            {match.registrations.map((reg, i) => (
                                <div key={reg.userId || `guest-${i}`} className="flex items-center justify-between group/row">
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                                            {reg.user?.imageUrl ? (
                                                <Image
                                                    src={reg.user.imageUrl}
                                                    alt="Player"
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <User className="w-3 h-3 text-slate-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black uppercase italic tracking-tight truncate leading-none mb-0.5">
                                                {reg.user ? `${reg.user.firstName} ${reg.user.lastName?.charAt(0)}.` : reg.guestName}
                                            </p>
                                            <div className="flex items-center gap-1.5">
                                                {reg.userId === match.creatorId && <span className="text-[6px] font-black uppercase tracking-[0.1em] px-1 bg-azul-primary text-white rounded">Org</span>}
                                                <span className="text-[6.5px] font-bold text-slate-500 uppercase tracking-widest italic">{reg.user ? "Jugador" : "Invitado"}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {reg.userId && (
                                        <button
                                            onClick={() => onShowProfile(reg.userId!)}
                                            className="w-6 h-6 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-blue-600 hover:border-azul-primary transition-all shrink-0"
                                        >
                                            <User className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {Array.from({ length: remaining }).map((_, i) => (
                                <div key={i} className="flex items-center gap-2 opacity-30 italic">
                                    <div className="w-6 h-6 rounded-full border border-dashed border-white/20 flex items-center justify-center shrink-0">
                                        <Plus className="w-3 h-3" />
                                    </div>
                                    <span className="text-[8px] font-bold uppercase tracking-widest">Buscando...</span>
                                </div>
                            ))}
                        </div>

                        <div className="p-2 border-t border-white/5 bg-slate-950 shrink-0">
                            <button
                                onClick={() => setIsFlipped(false)}
                                className="w-full h-8 rounded-lg bg-azul-primary text-white text-[8px] font-black uppercase tracking-widest hover:bg-azul-dark transition-all flex items-center justify-center gap-1"
                            >
                                Volver al Partido
                            </button>
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

    const handleMessageCreator = async (creatorId: string) => {
        try {
            const { conversationId } = await startConversation(creatorId);
            router.push(`/mensajes?conv=${conversationId}`);
        } catch (e) {
            console.error(e);
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
        <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 relative z-10">
            {/* Ambient background glows */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-azul-primary/5 rounded-full blur-[120px]" />
                <div className="absolute top-[10%] right-[-15%] w-[400px] h-[400px] bg-celeste/5 rounded-full blur-[100px]" />
            </div>

            {/* Widescreen Cyber-Sports HUD Header */}
            <div className="relative rounded-2xl overflow-hidden bg-foreground p-6 lg:p-8 text-background flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-white/5">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-azul-primary rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-azul-primary rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
                </div>

                <div className="relative z-10 space-y-3 max-w-3xl text-center md:text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-background/10 border border-background/20 rounded-full text-[8px] font-black uppercase tracking-[0.2em] text-celeste">
                        <Users className="w-2.5 h-2.5 fill-current" />
                        Completá tu partido
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none italic">
                        Armá tu <span className="text-celeste">Match</span>
                    </h1>
                    <p className="text-xs text-background/60 font-bold leading-normal max-w-xl">
                        ¿Te falta gente? Creá un partido público o unite a uno ya existente. Encontrá jugadores de tu zona y categoría al instante.
                    </p>
                </div>

                <div className="relative z-10 shrink-0">
                    <Link
                        href="/partidos/nuevo"
                        className="bg-azul-primary text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-azul-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 h-10"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Crear Partido
                    </Link>
                </div>
            </div>

            {/* Horizontal HUD Filter Bar */}
            <div className="p-3 bg-card border border-border/60 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm relative z-20">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-grow">
                    {/* City Selector */}
                    <div className="flex items-center gap-2 flex-grow max-w-xs min-w-[200px]">
                        <span className="text-[7.5px] font-black uppercase tracking-widest text-muted-foreground/60 shrink-0">Zona:</span>
                        <Select.Root value={searchCity} onValueChange={setSearchCity}>
                            <Select.Trigger className="w-full h-9 rounded-xl bg-muted/30 border border-border/40 px-3 text-[10px] font-black uppercase tracking-widest text-foreground flex items-center justify-between">
                                <Select.Value placeholder="Todas las zonas" />
                                <Select.Icon><ChevronRight className="w-3.5 h-3.5 rotate-90 text-muted-foreground/60" /></Select.Icon>
                            </Select.Trigger>
                            <Select.Portal>
                                <Select.Content className="z-[9999] bg-popover border border-border rounded-xl overflow-hidden shadow-2xl">
                                    <Select.Viewport className="p-1">
                                        <Select.Item value="all" className="p-2.5 text-[9px] font-black uppercase text-popover-foreground outline-none hover:bg-primary/10 cursor-pointer">
                                            <Select.ItemText>Todas las zonas</Select.ItemText>
                                        </Select.Item>
                                        {cities.map(city => (
                                            <Select.Item key={city} value={city} className="p-2.5 text-[9px] font-black uppercase text-popover-foreground outline-none hover:bg-primary/10 cursor-pointer">
                                                <Select.ItemText>{city}</Select.ItemText>
                                            </Select.Item>
                                        ))}
                                    </Select.Viewport>
                                </Select.Content>
                            </Select.Portal>
                        </Select.Root>
                    </div>

                    {/* Category Selector */}
                    <div className="flex items-center gap-2 flex-grow max-w-xs min-w-[200px]">
                        <span className="text-[7.5px] font-black uppercase tracking-widest text-muted-foreground/60 shrink-0">Categoría:</span>
                        <Select.Root value={filterCategory} onValueChange={setFilterCategory}>
                            <Select.Trigger className="w-full h-9 rounded-xl bg-muted/30 border border-border/40 px-3 text-[10px] font-black uppercase tracking-widest text-foreground flex items-center justify-between">
                                <Select.Value placeholder="Todas las categorías" />
                                <Select.Icon><ChevronRight className="w-3.5 h-3.5 rotate-90 text-muted-foreground/60" /></Select.Icon>
                            </Select.Trigger>
                            <Select.Portal>
                                <Select.Content className="z-[9999] bg-popover border border-border rounded-xl overflow-hidden shadow-2xl">
                                    <Select.Viewport className="p-1">
                                        <Select.Item value="all" className="p-2.5 text-[9px] font-black uppercase text-popover-foreground outline-none hover:bg-primary/10 cursor-pointer">
                                            <Select.ItemText>Todas las categorías</Select.ItemText>
                                        </Select.Item>
                                        {categories.map(cat => (
                                            <Select.Item key={cat} value={cat} className="p-2.5 text-[9px] font-black uppercase text-popover-foreground outline-none hover:bg-primary/10 cursor-pointer">
                                                <Select.ItemText>{cat === "Libre" ? "Libre" : `Categoría ${cat}`}</Select.ItemText>
                                            </Select.Item>
                                        ))}
                                    </Select.Viewport>
                                </Select.Content>
                            </Select.Portal>
                        </Select.Root>
                    </div>
                </div>

                {/* User Matches Filter */}
                {isLoggedIn && (
                    <div className="shrink-0 flex items-center">
                        <button
                            onClick={() => setShowMyMatches(!showMyMatches)}
                            className={`px-4 h-9 rounded-xl flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${showMyMatches
                                ? "bg-azul-primary text-white shadow-md shadow-azul-primary/30"
                                : "bg-muted/50 border border-border/40 text-muted-foreground hover:bg-muted"
                                }`}
                        >
                            <Star className={`w-3 h-3 ${showMyMatches ? "fill-current" : ""}`} />
                            Mis Partidos {showMyMatches && `(${filteredMatches.length})`}
                        </button>
                    </div>
                )}
            </div>

            {/* Match List - 4 Columns Widescreen Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                            onMessageCreator={handleMessageCreator}
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
                            className="relative z-10 w-full max-w-3xl"
                        >
                            <button
                                onClick={() => setSelectedPlayerId(null)}
                                className="absolute top-3 right-3 w-7 h-7 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-white/60 hover:text-white border border-white/5 backdrop-blur-md transition-all z-50"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {loadingProfile ? (
                                <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-14 flex flex-col items-center justify-center border border-white/10">
                                    <div className="w-9 h-9 border-4 border-azul-primary/20 border-t-azul-primary rounded-full animate-spin mb-3" />
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Cargando Perfil...</p>
                                </div>
                            ) : profileData ? (
                                <div className={`bg-slate-950/95 backdrop-blur-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[540px] transition-all duration-500 ${profileData.player.userId === currentUserId ? 'border-red-500/80 shadow-red-500/10' : 'border-white/10'}`}>
                                    {/* Modal Header */}
                                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/5 bg-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-azul-primary animate-pulse" />
                                            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/90">Resumen del Jugador</span>
                                        </div>
                                        <div className="hidden sm:flex items-center gap-3 pr-8">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[6.5px] font-black uppercase text-white/20 tracking-widest leading-none mb-[2px]">Nivel Proyectado</span>
                                                <span className="text-[9px] font-black text-celeste italic leading-none">CATEGORÍA {profileData.player.category}</span>
                                            </div>
                                            <div className="w-7 h-7 rounded-lg bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center">
                                                <Zap className="w-3.5 h-3.5 text-azul-primary" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 overflow-y-auto md:overflow-hidden flex-1 min-h-0 flex flex-col">
                                        <div className="flex flex-col md:flex-row gap-6 items-center md:items-stretch flex-1 min-h-0">
                                            {/* Player Card (High Density Scaled) */}
                                            <div className="shrink-0 flex items-center justify-center scale-[0.82] origin-center -my-11 -mx-7 md:-my-10 md:-mx-6">
                                                <PlayerCard player={profileData.player} stats={profileData.stats} isCurrentUser={profileData.player.userId === currentUserId} />
                                            </div>

                                            {/* Summary KPIs */}
                                            <div className="flex-1 space-y-3 py-1 w-full flex flex-col justify-between min-h-0">
                                                <div className="space-y-3 min-h-0 flex flex-col">
                                                    {/* KPIs grid */}
                                                    <div className="grid grid-cols-2 gap-2.5 shrink-0">
                                                        <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl space-y-0.5">
                                                            <p className="text-[7.5px] font-black text-white/30 uppercase tracking-widest">PJ Totales</p>
                                                            <p className="text-xl font-black text-white italic leading-none">{profileData.stats.pj}</p>
                                                        </div>
                                                        <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl space-y-0.5">
                                                            <p className="text-[7.5px] font-black text-white/30 uppercase tracking-widest">Win Rate</p>
                                                            <p className="text-xl font-black text-blue-400 italic leading-none">{profileData.stats.wr}%</p>
                                                        </div>
                                                    </div>

                                                    {/* Últimos Resultados (Horizontal capsule bar) */}
                                                    <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl space-y-2.5 w-full shrink-0">
                                                        <h4 className="text-[7.5px] font-black text-white/30 uppercase tracking-[0.25em] leading-none">Últimos Resultados</h4>
                                                        <div className="flex gap-2">
                                                            {profileData.history.slice(0, 5).map((h: any, i: number) => (
                                                                <div
                                                                    key={i}
                                                                    className={`flex-1 h-7 rounded-lg flex items-center justify-center text-[9px] font-black transition-all ${h.isWin === true ? 'bg-green-500/20 border border-green-500/30 text-green-400' : h.isWin === false ? 'bg-red-500/20 border border-red-500/30 text-red-400' : 'bg-white/5 border border-white/10 text-white/30'}`}
                                                                    title={h.tournament}
                                                                >
                                                                    {h.isWin === true ? 'G' : h.isWin === false ? 'P' : '-'}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Dense Últimos 10 Partidos List */}
                                                    <div className="space-y-1.5 min-h-0 flex flex-col flex-1">
                                                        <h4 className="text-[7.5px] font-black text-white/45 uppercase tracking-[0.2em] px-1 shrink-0">Últimos 10 Partidos</h4>
                                                        <div className="space-y-1.5 overflow-y-auto max-h-[250px] pr-1 no-scrollbar flex-1">
                                                            {profileData.history.slice(0, 10).map((m: any) => (
                                                                <div key={m.id} className="group relative bg-white/3 hover:bg-white/6 border border-white/5 p-2 rounded-xl flex items-center justify-between transition-all">
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${m.type === 'Torneo' ? 'bg-azul-primary/10 text-azul-primary' : m.type === 'Cancha Abierta' ? 'bg-celeste/10 text-celeste' : 'bg-slate-500/10 text-slate-500'}`}>
                                                                            {m.type === 'Torneo' ? <Zap className="w-3 h-3" /> : m.type === 'Cancha Abierta' ? <Users className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                                                                        </div>
                                                                        <div className="flex flex-col min-w-0">
                                                                            <div className="flex items-center gap-1 leading-none">
                                                                                <span className={`text-[5.5px] font-black px-1 py-[0.1px] rounded uppercase tracking-widest ${m.isWin === true ? 'bg-green-500/20 text-green-400' : m.isWin === false ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/30'}`}>
                                                                                    {m.isWin === true ? 'G' : m.isWin === false ? 'P' : '-'}
                                                                                </span>
                                                                                <span className="text-[6px] font-black text-white/20 uppercase tracking-widest truncate">{m.type} • {m.subType}</span>
                                                                            </div>
                                                                            <h4 className="text-[10px] font-black text-white truncate italic uppercase tracking-tight leading-none my-1">{m.tournament}</h4>
                                                                            <p className="text-[6.5px] font-bold text-white/40 uppercase tracking-tight leading-none">vs {m.opponent}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right shrink-0 pr-1 leading-none">
                                                                        <div className="text-xs font-black italic text-white leading-none mb-0.5 tracking-tighter">{m.score}</div>
                                                                        {m.isWin === true ? (
                                                                            <span className="text-[6.5px] font-black uppercase text-green-400 tracking-widest italic">Win</span>
                                                                        ) : m.isWin === false ? (
                                                                            <span className="text-[6.5px] font-black uppercase text-red-400 tracking-widest italic">Loss</span>
                                                                        ) : (
                                                                            <span className="text-[6.5px] font-black uppercase text-white/20 tracking-widest italic">Fin</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {profileData.history.length === 0 && (
                                                                <div className="flex flex-col items-center justify-center py-6 opacity-30">
                                                                    <Info className="w-5 h-5 mb-1.5 text-white/40" />
                                                                    <p className="text-[6.5px] font-black uppercase tracking-widest text-white/40">Sin partidos registrados</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Message Button */}
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const { conversationId } = await startConversation(selectedPlayerId!);
                                                            router.push(`/mensajes?conv=${conversationId}`);
                                                        } catch (e) {
                                                            alert("Error al iniciar conversación");
                                                        }
                                                    }}
                                                    className="w-full h-9 bg-azul-primary/10 border border-azul-primary/30 text-azul-primary hover:bg-azul-primary hover:text-white rounded-xl text-[8.5px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shrink-0"
                                                >
                                                    <MessageSquare className="w-3 h-3" />
                                                    Enviar Mensaje
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-900 border border-white/10 rounded-2xl p-10 text-center">
                                    <p className="text-slate-400 font-black uppercase tracking-wider text-xs">No se encontró el perfil del jugador.</p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
