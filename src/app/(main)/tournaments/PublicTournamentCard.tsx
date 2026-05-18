"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Calendar, MapPin, Trophy, Zap,
    CheckCircle, Clock, User, Users2, DollarSign, LayoutGrid, Plus, Shield,
    Edit3, LayoutDashboard, Settings, X, MessageSquare, Info, Activity
} from "lucide-react";
import ClubEnrollmentModal from "./ClubEnrollmentModal";
import AccessDeniedModal from "./AccessDeniedModal";
import TournamentPublishButton from "@/components/TournamentPublishButton";
import RegisterTournamentModal from "./RegisterTournamentModal";
import { getPlayerProfileData } from "@/app/actions/players";
import PlayerCard from "@/components/PlayerCard";
import { motion, AnimatePresence } from "framer-motion";
import { startConversation } from "@/app/(main)/mensajes/actions";

interface PublicTournamentCardProps {
    tournament: any;
    userClubId?: string | null;
    userDbRole?: string | null;
    userGender?: string | null;
    userCategory?: string | null;
    currentUserId?: string | null;
    isUserRegistered?: boolean;
}

export default function PublicTournamentCard({ tournament, userClubId, userDbRole, userGender, userCategory, currentUserId, isUserRegistered }: PublicTournamentCardProps) {
    const router = useRouter();
    const [isClubModalOpen, setIsClubModalOpen] = useState(false);
    const [deniedModal, setDeniedModal] = useState<{ isOpen: boolean; reason: "gender" | "category" | "membership" | "role" | null; message: string }>({
        isOpen: false,
        reason: null,
        message: ""
    });
    const [showRegModal, setShowRegModal] = useState(false);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [profileData, setProfileData] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

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

    const hasImage = tournament.imageUrl &&
        tournament.imageUrl !== "" &&
        tournament.imageUrl !== "null" &&
        tournament.imageUrl !== "undefined";

    const [imageError, setImageError] = useState(false);
    const showFallback = !hasImage || imageError;

    let mod = tournament.modalidad as any;
    if (typeof mod === 'string') {
        try { mod = JSON.parse(mod); } catch (e) { mod = null; }
    }

    const isLive = tournament.status === "en_curso" || tournament.status === "en_eliminatorias";
    const today = (() => {
        const now = new Date();
        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ].join('-');
    })();

    // Permissions for the management buttons
    const isCreator = Boolean(currentUserId && tournament.createdByUserId && currentUserId === tournament.createdByUserId);
    const isClubOwner = Boolean(currentUserId && tournament.club?.ownerId && currentUserId === tournament.club.ownerId);

    // Strict membership check: superadmins also need to be members if it's members only (per user request)
    const isExplicitClubMember = Boolean(userClubId && tournament.clubId && userClubId === tournament.clubId);
    const isClubMember = isExplicitClubMember; // Removed superadmin bypass for membership check
    const canManage = userDbRole === "superadmin" || userDbRole === "admin" || isCreator || isClubOwner;

    let isOpen = false;
    let openDate: string | null = null;

    if (tournament.status === "published" || tournament.status === "open") {
        if (isClubMember) {
            isOpen = tournament.openDateClub ? today >= tournament.openDateClub : false;
            openDate = tournament.openDateClub;
        } else {
            isOpen = tournament.openDateGeneral ? today >= tournament.openDateGeneral : false;
            openDate = tournament.openDateGeneral;
        }
    }

    const isPreregistration = tournament.status === "published" && !isOpen;
    const isFinished = tournament.status === "finalizado";
    const maxSlots = Number(mod?.maxSlots || 0);
    const isFull = maxSlots > 0 && (tournament.occupiedSlots || 0) >= maxSlots;

    const statusConfig = isLive
        ? { label: "En Vivo", dot: true, pill: "bg-rojo text-white shadow-rojo/20", text: "text-rojo" }
        : isOpen
            ? (isFull
                ? { label: "Lleno", dot: false, pill: "bg-rojo text-white shadow-rojo/20", text: "text-rojo" }
                : { label: "Inscripción", dot: false, pill: "bg-celeste text-white shadow-celeste/20", text: "text-celeste" }
            )
            : isPreregistration
                ? { label: "Próximamente", dot: false, pill: "bg-azul-primary text-white shadow-azul-primary/20", text: "text-azul-primary" }
                : isFinished
                    ? { label: "Finalizado", dot: false, pill: "bg-muted-foreground/20 text-muted-foreground", text: "text-muted-foreground" }
                    : { label: "Borrador", dot: false, pill: "bg-muted-foreground/10 text-muted-foreground", text: "text-muted-foreground" };

    const isClubUser = userDbRole === "club" || userDbRole === "superadmin";
    const canDoMassInsc = isOpen && !isFull && isClubUser && (!tournament.isMembersOnly || isClubMember) && !isFinished && !isLive;

    const href = isUserRegistered || isLive || isFinished || isFull
        ? `/tournaments/${tournament.id}`
        : isOpen
            ? `/tournaments/register?id=${tournament.id}`
            : `/tournaments/${tournament.id}`;

    function formatDate(dateStr: string | null) {
        if (!dateStr) return "Por confirmar";
        if (typeof dateStr === 'string' && dateStr.includes("-") && dateStr.length === 10) {
            const [year, month, day] = dateStr.split("-").map(Number);
            const d = new Date(year, month - 1, day);
            return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
        }
        const d = new Date(dateStr);
        return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    const checkEligibility = () => {
        if (!currentUserId) {
            router.push("/login");
            return false;
        }

        // 1. Membership Check
        if (tournament.isMembersOnly && tournament.clubId && userClubId !== tournament.clubId) {
            setDeniedModal({
                isOpen: true,
                reason: "membership",
                message: "Este torneo es exclusivo para miembros del club organizador. Tu perfil no está asociado a este club."
            });
            return false;
        }

        // 2. Gender Check
        const reqGender = mod?.genero?.toLowerCase();
        const uGender = userGender?.toLowerCase();

        if (reqGender && reqGender !== "mixto") {
            const isMaleTournament = reqGender.startsWith("hombre");
            const isFemaleTournament = reqGender.startsWith("mujer");
            const isMalePlayer = uGender === "masculino";
            const isFemalePlayer = uGender === "femenino";

            if ((isMaleTournament && !isMalePlayer) || (isFemaleTournament && !isFemalePlayer)) {
                setDeniedModal({
                    isOpen: true,
                    reason: "gender",
                    message: `Este torneo es exclusivo para ${isMaleTournament ? "hombres" : "mujeres"}. Tu perfil indica que no cumples con este requisito.`
                });
                return false;
            }
        }

        // 3. Category Check
        let tCats: string[] = [];
        try {
            if (Array.isArray(tournament.categories)) {
                tCats = tournament.categories;
            } else if (typeof tournament.categories === 'string') {
                tCats = JSON.parse(tournament.categories);
            }
        } catch (e) { tCats = []; }

        if (tCats.length > 0 && !tCats.includes("libre")) {
            const uCat = userCategory?.trim().toLowerCase();
            const isEligible = tCats.some(tc => tc.trim().toLowerCase() === uCat);

            if (!isEligible) {
                setDeniedModal({
                    isOpen: true,
                    reason: "category",
                    message: `Tu categoría (${userCategory || "no definida"}) no está permitida para este torneo. Categorías habilitadas: ${tCats.join(", ")}.`
                });
                return false;
            }
        }

        return true;
    };

    const [isFlipped, setIsFlipped] = useState(false);
    const [participants, setParticipants] = useState<any[]>([]);
    const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);

    const toggleFlip = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const newFlipped = !isFlipped;
        setIsFlipped(newFlipped);

        if (newFlipped && participants.length === 0) {
            setIsLoadingParticipants(true);
            try {
                const { getTournamentParticipants } = await import("./actions");
                const data = await getTournamentParticipants(tournament.id);
                setParticipants(data);
            } catch (error) {
                console.error("Error loading participants:", error);
            } finally {
                setIsLoadingParticipants(false);
            }
        }
    };

    const handleCardClick = (e: React.MouseEvent) => {
        if (isFlipped) return; // Don't navigate if flipped

        if (canDoMassInsc) {
            e.preventDefault();
            e.stopPropagation();
            setIsClubModalOpen(true);
        } else if (isOpen) {
            e.preventDefault();
            e.stopPropagation();

            // If it's registration, open modal
            if (!isFull && !isUserRegistered && !isLive && !isFinished) {
                setShowRegModal(true);
            } else {
                router.push(href);
            }
        } else {
            router.push(href);
        }
    };

    return (
        <>
            <div
                className="group block h-[495px] perspective-1000"
                style={{ perspective: "2000px" }}
            >
                <div
                    className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
                >
                    {/* FRONT FACE */}
                    <div
                        className="absolute inset-0 [backface-visibility:hidden] z-10"
                        onClick={handleCardClick}
                    >
                        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-azul-primary/10 hover:border-azul-primary/40 flex flex-col h-full relative group/card shadow-sm cursor-pointer">
                            {/* Cinematic Image Area */}
                            <div className="relative h-28 w-full overflow-hidden bg-muted/20 shrink-0">
                                {!showFallback ? (
                                    <img
                                        src={tournament.imageUrl}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                                        alt={tournament.name}
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-azul-primary/10 to-celeste/10">
                                        <Trophy className={`w-8 h-8 ${statusConfig.text} opacity-20`} />
                                    </div>
                                )}

                                {/* Floating Glass Badges */}
                                <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10 max-w-[85%]">
                                    <span className={`px-2 py-0.5 rounded-md ${statusConfig.pill} font-black text-[8px] uppercase tracking-[0.1em] shadow-lg backdrop-blur-md bg-opacity-95`}>
                                        {statusConfig.label}
                                    </span>
                                    {isUserRegistered && (
                                        <span className="px-2 py-0.5 rounded-md bg-green-500 backdrop-blur-md text-white font-bold text-[8px] uppercase tracking-[0.1em] flex items-center gap-1 shadow-lg border border-emerald-400/20">
                                            Inscripto
                                        </span>
                                    )}
                                    {tournament.isMembersOnly && (
                                        <span className="px-2 py-0.5 rounded-md bg-azul-primary/95 backdrop-blur-md text-white font-black text-[8px] uppercase tracking-[0.1em] flex items-center gap-1 shadow-lg">
                                            <Shield className="w-2.5 h-2.5" /> Miembros
                                        </span>
                                    )}
                                </div>

                                {/* Admin Overlays */}
                                {canManage && (
                                    <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                router.push(`/tournaments/${tournament.id}/edit`);
                                            }}
                                            className="w-6 h-6 rounded-lg bg-black/60 backdrop-blur-xl text-white hover:bg-azul-primary flex items-center justify-center transition-all shadow-md border border-white/10"
                                            title="Editar Torneo"
                                        >
                                            <Edit3 className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                router.push(`/tournaments/${tournament.id}/manage`);
                                            }}
                                            className="w-6 h-6 rounded-lg bg-black/60 backdrop-blur-xl text-white hover:bg-azul-primary flex items-center justify-center transition-all shadow-md border border-white/10"
                                            title="Gestionar Torneo"
                                        >
                                            <Settings className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}

                                {/* Bottom Image Gradient Overlay - Improved for text contrast */}
                                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

                                <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
                                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-celeste/95 mb-0.5 drop-shadow-md">
                                        {tournament.surface || tournament.location || "Sede ACAP"}
                                    </p>
                                    <h3 className="text-xs font-black uppercase italic tracking-tighter leading-snug line-clamp-1 drop-shadow-lg text-white">
                                        {tournament.name}
                                    </h3>
                                </div>
                            </div>

                            <div className="p-2.5 flex flex-col flex-1 bg-gradient-to-b from-background to-muted/5 justify-between min-h-0">
                                {/* Quick Stats Header */}
                                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border/30">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 rounded-lg bg-azul-primary/5 border border-azul-primary/10">
                                            <Calendar className="w-3.5 h-3.5 text-azul-primary" />
                                        </div>
                                        <div>
                                            <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-0.5">Comienza</p>
                                            <p className="text-[10px] font-black text-foreground leading-none">{formatDate(tournament.startDate)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-0.5">Hora</p>
                                        <p className="text-[10px] font-black text-azul-primary leading-none">{tournament.time || "--:--"}</p>
                                    </div>
                                </div>

                                {/* Metadata Grid - Premium Cells */}
                                <div className="grid grid-cols-2 gap-1.5 mb-2">
                                    <div className="p-1.5 px-2 rounded-xl bg-muted/20 border border-border/40 flex flex-col justify-center group/meta hover:border-azul-primary/20 transition-colors h-[42px] space-y-0.5">
                                        <div className="flex items-center gap-1">
                                            <Trophy className="w-3 h-3 text-azul-primary/60" />
                                            <span className="text-[6.5px] font-black uppercase tracking-widest text-muted-foreground/70">Categoría</span>
                                        </div>
                                        <p className="text-[9px] font-black text-foreground truncate leading-none">
                                            {(() => {
                                                let cats = tournament.categories;
                                                if (typeof cats === 'string') {
                                                    try { cats = JSON.parse(cats); } catch (e) { cats = []; }
                                                }
                                                return (Array.isArray(cats) && cats.length > 0) ? (cats[0] === "libre" ? "Libre" : cats.join(", ")) : "No definido";
                                            })()}
                                        </p>
                                    </div>
                                    <div className="p-1.5 px-2 rounded-xl bg-muted/20 border border-border/40 flex flex-col justify-center group/meta hover:border-azul-primary/20 transition-colors h-[42px] space-y-0.5">
                                        <div className="flex items-center gap-1">
                                            <Users2 className="w-3 h-3 text-azul-primary/60" />
                                            <span className="text-[6.5px] font-black uppercase tracking-widest text-muted-foreground/70">Género</span>
                                        </div>
                                        <p className="text-[9px] font-black text-foreground capitalize leading-none">
                                            {mod?.genero === 'mujer' ? 'Femenino' : mod?.genero === 'hombre' ? 'Masculino' : mod?.genero === 'mixto' ? 'Mixto' : 'No definido'}
                                        </p>
                                    </div>
                                    <div className="p-1.5 px-2 rounded-xl bg-muted/20 border border-border/40 flex flex-col justify-center group/meta hover:border-azul-primary/20 transition-colors h-[42px] space-y-0.5">
                                        <div className="flex items-center gap-1">
                                            <Zap className="w-3 h-3 text-azul-primary/60" />
                                            <span className="text-[6.5px] font-black uppercase tracking-widest text-muted-foreground/70">Formato</span>
                                        </div>
                                        <p className="text-[9px] font-black text-foreground truncate leading-none">
                                            {tournament.type === 'americano' ? 'Americano' : 'Round Robin'}
                                        </p>
                                    </div>
                                    <div className="p-1.5 px-2 rounded-xl bg-muted/20 border border-border/40 flex flex-col justify-center group/meta hover:border-azul-primary/20 transition-colors h-[42px] space-y-0.5">
                                        <div className="flex items-center gap-1">
                                            <DollarSign className="w-3 h-3 text-azul-primary/60" />
                                            <span className="text-[6.5px] font-black uppercase tracking-widest text-muted-foreground/70">Precio</span>
                                        </div>
                                        <div className="flex flex-col justify-center gap-0.5">
                                            <div className="flex items-center justify-between leading-none">
                                                <span className="text-[6px] font-bold text-muted-foreground uppercase">Gral:</span>
                                                <span className="text-[8.5px] font-black text-foreground">
                                                    {tournament.registrationFee != null ? `$${Number(tournament.registrationFee).toLocaleString('es-ES')}` : "Consultar"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-azul-primary/10 pt-0.5 leading-none">
                                                <span className="text-[6px] font-black text-azul-primary uppercase tracking-tighter">Socio:</span>
                                                <span className="text-[8.5px] font-black text-azul-primary">
                                                    {tournament.memberRegistrationFee != null ? `$${Number(tournament.memberRegistrationFee).toLocaleString('es-ES')}` : "Consultar"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* New Column for Registration Dates */}
                                    <div className="col-span-2 p-1.5 px-2 rounded-xl bg-azul-primary/5 border border-azul-primary/15 flex flex-col justify-center group/meta hover:border-azul-primary/30 transition-colors h-[42px] space-y-0.5">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-azul-primary" />
                                            <span className="text-[6.5px] font-black uppercase tracking-widest text-azul-primary leading-none">Inscripciones</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex justify-between items-center leading-none">
                                                <span className="text-[6.5px] font-bold uppercase text-muted-foreground/60">Socio:</span>
                                                <span className="text-[8.5px] font-black text-foreground">{formatDate(tournament.openDateClub)}</span>
                                            </div>
                                            <div className="flex justify-between items-center leading-none">
                                                <span className="text-[6.5px] font-bold uppercase text-muted-foreground/60">Gral:</span>
                                                <span className="text-[8.5px] font-black text-foreground">{formatDate(tournament.openDateGeneral)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sede del Evento Telemetry Pill - Extremely light & clickable */}
                                <div
                                    onClick={(e) => {
                                        const addr = tournament.surface || tournament.location;
                                        if (addr) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, "_blank");
                                        }
                                    }}
                                    className="mb-2 p-1.5 px-2 rounded-xl border border-border/40 bg-muted/20 hover:border-azul-primary/40 transition-all cursor-pointer flex items-center gap-2 group/loc"
                                >
                                    <div className="p-1 rounded-lg bg-azul-primary/10 shrink-0">
                                        <MapPin className="w-3.5 h-3.5 text-azul-primary group-hover/loc:scale-110 transition-transform" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="block text-[6px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-0.5">Sede del Evento</span>
                                        <p className="text-[9px] font-black text-foreground group-hover/loc:text-azul-primary transition-colors leading-tight truncate">
                                            {tournament.surface || tournament.location || "Sede por confirmar"}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Area */}
                                <div className="flex gap-1.5 shrink-0">
                                    <button
                                        onClick={toggleFlip}
                                        className="flex-1 py-1.5 rounded-lg bg-muted/50 text-muted-foreground border border-border/40 hover:bg-muted transition-all font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-1 px-1 h-8"
                                    >
                                        <Users2 className="w-3 h-3" />
                                        <span className="truncate">Inscriptos</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isOpen && !isFull && !isUserRegistered) {
                                                setShowRegModal(true);
                                            } else {
                                                router.push(href);
                                            }
                                        }}
                                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all duration-300 font-black uppercase tracking-widest text-[8px] shadow-md h-8 ${isLive ? "bg-rojo text-white shadow-rojo/30 hover:bg-rojo/90" :
                                            isUserRegistered ? "bg-azul-primary text-white shadow-azul-primary/30" :
                                                isOpen ? (
                                                    isFull ? "bg-rojo/60 text-white/80 shadow-none cursor-not-allowed opacity-70 grayscale-[1] pointer-events-none" :
                                                        (tournament.isMembersOnly ? "bg-azul-primary text-white shadow-azul-primary/40 hover:bg-azul-primary/90" : "bg-celeste text-white shadow-celeste/40 hover:bg-celeste/90")
                                                ) :
                                                    isPreregistration ? "bg-celeste text-white shadow-celeste/30" :
                                                        "bg-muted text-muted-foreground shadow-none"
                                            }`}>
                                        {isLive ? <Zap className="w-3.5 h-3.5" /> :
                                            isUserRegistered ? <CheckCircle className="w-3.5 h-3.5" /> :
                                                isOpen ? (isFull ? <Users2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />) :
                                                    <Clock className="w-3.5 h-3.5" />}

                                        <span className="truncate">
                                            {isLive ? "En Vivo" :
                                                isUserRegistered ? "Inscripto" :
                                                    canDoMassInsc ? "Masiva" :
                                                        isOpen ? (
                                                            isFull ? "Lleno" :
                                                                (tournament.isMembersOnly && !isClubMember ? "Miembros" : "Inscribirme")
                                                        ) :
                                                            isPreregistration ? "Pronto" : "Cerrado"}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BACK FACE */}
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] z-20">
                        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden flex flex-col h-full shadow-lg border-azul-primary/20">
                            <div className="p-3 bg-gradient-to-br from-azul-primary to-azul-dark text-white relative">
                                <div className="flex items-center justify-between mb-1">
                                    <Trophy className="w-4 h-4 opacity-50" />
                                    <button
                                        onClick={toggleFlip}
                                        className="p-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                                    >
                                        <Plus className="w-4 h-4 rotate-45" />
                                    </button>
                                </div>
                                <h3 className="text-xs font-black uppercase italic tracking-tighter leading-none mb-0.5">Inscriptos</h3>
                                <p className="text-[8px] font-black uppercase tracking-widest text-white/70 truncate">{tournament.name}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 no-scrollbar min-h-0">
                                {isLoadingParticipants ? (
                                    <div className="flex flex-col items-center justify-center h-full space-y-2">
                                        <div className="w-5 h-5 border-2 border-azul-primary border-t-transparent rounded-full animate-spin" />
                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Cargando...</p>
                                    </div>
                                ) : participants.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center space-y-1.5 opacity-40">
                                        <Users2 className="w-8 h-8" />
                                        <p className="text-[8px] font-black uppercase tracking-widest">Sin inscriptos</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-1">
                                        {participants.map((reg) => (
                                            <div
                                                key={reg.id}
                                                className="flex items-center justify-between border-b border-border/10 pb-0.5 group/p"
                                            >
                                                <div className="min-w-0 flex-1 flex flex-wrap items-center gap-1">
                                                    <span 
                                                        onClick={() => {
                                                            if (reg.userId) {
                                                                handleShowProfile(reg.userId);
                                                            }
                                                        }}
                                                        className={`text-[9px] font-black text-foreground uppercase tracking-tight leading-normal ${reg.userId ? "cursor-pointer hover:underline hover:text-azul-primary transition-all duration-300" : ""}`}
                                                    >
                                                        {reg.user?.firstName} {reg.user?.lastName?.charAt(0)}.
                                                    </span>
                                                    {reg.partnerName && (
                                                        <span className="text-muted-foreground font-bold italic ml-1 lowercase tracking-normal text-[8.5px] flex items-center gap-0.5">
                                                            +{" "}
                                                            {reg.partnerUserId ? (
                                                                <span
                                                                    onClick={() => handleShowProfile(reg.partnerUserId)}
                                                                    className="cursor-pointer hover:underline hover:text-azul-primary text-muted-foreground transition-all duration-300 font-bold italic tracking-normal"
                                                                >
                                                                    {reg.partnerName.split(' ')[0]}
                                                                </span>
                                                            ) : (
                                                                <span>{reg.partnerName.split(' ')[0]}</span>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="shrink-0 ml-1">
                                                    <span className="text-[7px] font-black text-azul-primary uppercase">
                                                        {reg.category || reg.user?.category || "Cat"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-2.5 border-t border-border/40 bg-muted/10 shrink-0">
                                <button
                                    onClick={toggleFlip}
                                    className="w-full py-1.5 rounded-lg bg-azul-primary text-white font-black uppercase tracking-[0.2em] text-[8px] hover:bg-azul-dark transition-all flex items-center justify-center gap-1.5 h-8"
                                >
                                    Volver al Torneo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ClubEnrollmentModal
                isOpen={isClubModalOpen}
                onClose={() => setIsClubModalOpen(false)}
                tournament={tournament}
            />

            <AccessDeniedModal
                isOpen={deniedModal.isOpen}
                onClose={() => setDeniedModal({ ...deniedModal, isOpen: false })}
                reason={deniedModal.reason}
                message={deniedModal.message}
                tournamentName={tournament.name}
            />

            <RegisterTournamentModal
                tournamentId={tournament.id}
                isOpen={showRegModal}
                onClose={() => setShowRegModal(false)}
                onSuccess={() => {
                    router.refresh();
                }}
            />

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
                                className="absolute top-3 right-3 w-7 h-7 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-white/60 hover:text-white border border-white/5 backdrop-blur-md transition-all z-50 animate-fade-in"
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
                                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/5 bg-white/5 shrink-0">
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
                                                                            {m.type === 'Torneo' ? <Zap className="w-3 h-3" /> : m.type === 'Cancha Abierta' ? <Users2 className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
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
                            ) : null}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

