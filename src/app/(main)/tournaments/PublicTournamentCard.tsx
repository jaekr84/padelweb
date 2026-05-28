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

    const isCreator = Boolean(currentUserId && tournament.createdByUserId && currentUserId === tournament.createdByUserId);
    const isClubOwner = Boolean(currentUserId && tournament.club?.ownerId && currentUserId === tournament.club.ownerId);
    const isExplicitClubMember = Boolean(userClubId && tournament.clubId && userClubId === tournament.clubId);
    const isClubMember = isExplicitClubMember;
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
                : { label: "Inscripción", dot: false, pill: "bg-green-600 text-white shadow-green-600/20", text: "text-green-500" }
            )
            : isPreregistration
                ? { label: "Próximamente", dot: false, pill: "bg-azul-primary text-white shadow-azul-primary/20", text: "text-azul-primary" }
                : isFinished
                    ? { label: "Finalizado", dot: false, pill: "bg-slate-500 text-white", text: "text-slate-500" }
                    : { label: "Borrador", dot: false, pill: "bg-slate-300 text-slate-700", text: "text-slate-500" };

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

        if (tournament.isMembersOnly && tournament.clubId && userClubId !== tournament.clubId) {
            setDeniedModal({
                isOpen: true,
                reason: "membership",
                message: "Este torneo es exclusivo para miembros del club organizador. Tu perfil no está asociado a este club."
            });
            return false;
        }

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
        if (isFlipped) return;

        if (canDoMassInsc) {
            e.preventDefault();
            e.stopPropagation();
            setIsClubModalOpen(true);
        } else if (isOpen) {
            e.preventDefault();
            e.stopPropagation();

            if (!isFull && !isUserRegistered && !isLive && !isFinished) {
                setShowRegModal(true);
            } else {
                router.push(href);
            }
        } else {
            router.push(href);
        }
    };

    // Border color by status
    const cardBorder = isLive
        ? "border-rojo/40 hover:border-rojo/70 shadow-rojo/10"
        : isOpen
            ? "border-green-300 hover:border-green-500 shadow-green-200/40"
            : isPreregistration
                ? "border-azul-primary/30 hover:border-azul-primary/60 shadow-azul-primary/10"
                : "border-slate-200 hover:border-slate-300";

    // Top accent gradient
    const accentBar = isLive
        ? "bg-gradient-to-r from-rojo via-red-400 to-transparent"
        : isOpen
            ? "bg-gradient-to-r from-green-500 via-green-400 to-transparent"
            : isPreregistration
                ? "bg-gradient-to-r from-azul-primary via-blue-400 to-transparent"
                : isFinished
                    ? "bg-gradient-to-r from-slate-600 to-transparent"
                    : "bg-gradient-to-r from-slate-700 to-transparent";

    return (
        <>
            <div
                className="group block h-[495px]"
                style={{ perspective: "2000px" }}
            >
                <div
                    className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
                >
                    {/* ══════════════ FRONT FACE ══════════════ */}
                    <div
                        className="absolute inset-0 [backface-visibility:hidden] z-10"
                        onClick={handleCardClick}
                    >
                        <div className={`flex flex-col h-full cursor-pointer rounded-2xl overflow-hidden bg-white border shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.01] relative group/card ${cardBorder}`}>

                            {/* Top status accent bar */}
                            <div className={`h-[3px] w-full shrink-0 ${accentBar}`} />

                            {/* ── Cinematic image ── */}
                            <div className="relative h-44 w-full overflow-hidden bg-slate-100 shrink-0">
                                {!showFallback ? (
                                    <img
                                        src={tournament.imageUrl}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                                        alt={tournament.name}
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-slate-100 via-slate-150 to-slate-200 flex items-center justify-center">
                                        <Trophy className="w-12 h-12 text-slate-300" />
                                    </div>
                                )}

                                {/* Cinematic gradient for title contrast */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/20 to-transparent" />

                                {/* Status badges — top left */}
                                <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10 max-w-[78%]">
                                    {isLive ? (
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rojo text-white text-[8px] font-black uppercase tracking-[0.1em] shadow-lg">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                                            En Vivo
                                        </span>
                                    ) : (
                                        <span className={`px-2 py-0.5 rounded-md ${statusConfig.pill} text-[8px] font-black uppercase tracking-[0.1em] shadow-lg`}>
                                            {statusConfig.label}
                                        </span>
                                    )}
                                    {isUserRegistered && (
                                        <span className="px-2 py-0.5 rounded-md bg-green-600 text-white text-[8px] font-black uppercase tracking-[0.1em] shadow-lg flex items-center gap-1">
                                            <CheckCircle className="w-2 h-2" /> Inscripto
                                        </span>
                                    )}
                                    {tournament.isMembersOnly && (
                                        <span className="px-2 py-0.5 rounded-md bg-azul-primary text-white text-[8px] font-black uppercase tracking-[0.1em] flex items-center gap-1 shadow-lg">
                                            <Shield className="w-2 h-2" /> Socios
                                        </span>
                                    )}
                                </div>

                                {/* Admin controls — top right */}
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

                                {/* Tournament title overlaid on image */}
                                <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
                                    <p className="text-[7px] font-black uppercase tracking-[0.25em] text-azul-primary/90 leading-none mb-1 drop-shadow-md">
                                        {tournament.club?.name || "A.C.A.P."}
                                    </p>
                                    <h3 className="text-sm font-black uppercase italic tracking-tight leading-tight text-white line-clamp-2 drop-shadow-lg">
                                        {tournament.name}
                                    </h3>
                                </div>
                            </div>

                            {/* ── Bottom info area (light) ── */}
                            <div className="flex flex-col flex-1 min-h-0 px-2.5 pt-2.5 pb-2 gap-2 bg-white">

                                {/* Date / time / slots */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3 text-azul-primary shrink-0" />
                                        <span className="text-[10px] font-black text-slate-900">{formatDate(tournament.startDate)}</span>
                                        {tournament.time && (
                                            <span className="text-[9px] text-slate-400 font-bold">· {tournament.time}</span>
                                        )}
                                    </div>
                                    {maxSlots > 0 && (
                                        <span className={`text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md border shrink-0
                                            ${isFull
                                                ? 'bg-rojo/10 text-rojo border-rojo/20'
                                                : 'bg-azul-primary/10 text-azul-primary border-azul-primary/20'
                                            }`}>
                                            {tournament.occupiedSlots}/{maxSlots}
                                        </span>
                                    )}
                                </div>

                                {/* Metadata 2×2 grid */}
                                <div className="grid grid-cols-2 gap-1.5">
                                    {/* Category */}
                                    <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                                        <div className="flex items-center gap-1">
                                            <Trophy className="w-2.5 h-2.5 text-azul-primary/60" />
                                            <span className="text-[6px] font-black uppercase tracking-widest text-slate-400">Categoría</span>
                                        </div>
                                        <p className="text-[9px] font-black text-slate-900 truncate leading-none">
                                            {(() => {
                                                let cats = tournament.categories;
                                                if (typeof cats === 'string') {
                                                    try { cats = JSON.parse(cats); } catch { cats = []; }
                                                }
                                                return (Array.isArray(cats) && cats.length > 0) ? (cats[0] === "libre" ? "Libre" : cats.join(", ")) : "—";
                                            })()}
                                        </p>
                                    </div>

                                    {/* Gender */}
                                    <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                                        <div className="flex items-center gap-1">
                                            <Users2 className="w-2.5 h-2.5 text-azul-primary/60" />
                                            <span className="text-[6px] font-black uppercase tracking-widest text-slate-400">Género</span>
                                        </div>
                                        <p className="text-[9px] font-black text-slate-900 leading-none">
                                            {mod?.genero === 'mujer' ? 'Femenino' : mod?.genero === 'hombre' ? 'Masculino' : mod?.genero === 'mixto' ? 'Mixto' : '—'}
                                        </p>
                                    </div>

                                    {/* Format */}
                                    <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                                        <div className="flex items-center gap-1">
                                            <Zap className="w-2.5 h-2.5 text-azul-primary/60" />
                                            <span className="text-[6px] font-black uppercase tracking-widest text-slate-400">Formato</span>
                                        </div>
                                        <p className="text-[9px] font-black text-slate-900 leading-none">
                                            {tournament.type === 'americano' ? 'Americano' : 'Round Robin'}
                                        </p>
                                    </div>

                                    {/* Price */}
                                    <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                                        <div className="flex items-center gap-1">
                                            <DollarSign className="w-2.5 h-2.5 text-azul-primary/60" />
                                            <span className="text-[6px] font-black uppercase tracking-widest text-slate-400">Precio</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[9px] font-black text-slate-900 leading-none">
                                                {tournament.registrationFee != null ? `$${Number(tournament.registrationFee).toLocaleString('es-ES')}` : "—"}
                                            </span>
                                            {tournament.memberRegistrationFee != null && (
                                                <span className="text-[7px] font-black text-azul-primary leading-none">
                                                    · ${Number(tournament.memberRegistrationFee).toLocaleString('es-ES')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Inscription dates */}
                                <div className="px-2 py-1.5 rounded-xl bg-azul-primary/5 border border-azul-primary/20 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Clock className="w-2.5 h-2.5 text-azul-primary" />
                                        <span className="text-[6px] font-black uppercase tracking-widest text-azul-primary">Inscripciones</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="text-right">
                                            <p className="text-[6px] uppercase text-slate-400 font-bold leading-none mb-0.5">Socio</p>
                                            <p className="text-[8px] font-black text-slate-900 leading-none">{formatDate(tournament.openDateClub)}</p>
                                        </div>
                                        <div className="w-px h-5 bg-slate-200 shrink-0" />
                                        <div className="text-right">
                                            <p className="text-[6px] uppercase text-slate-400 font-bold leading-none mb-0.5">Gral</p>
                                            <p className="text-[8px] font-black text-slate-900 leading-none">{formatDate(tournament.openDateGeneral)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Location */}
                                <div
                                    onClick={(e) => {
                                        const addr = tournament.surface || tournament.location;
                                        if (addr) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, "_blank");
                                        }
                                    }}
                                    className="flex items-center gap-1.5 cursor-pointer group/loc"
                                >
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 group-hover/loc:text-azul-primary transition-colors" />
                                    <span className="text-[9px] font-bold text-slate-500 truncate group-hover/loc:text-azul-primary transition-colors">
                                        {tournament.surface || tournament.location || "Sede por confirmar"}
                                    </span>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-1.5 mt-auto shrink-0">
                                    <button
                                        onClick={toggleFlip}
                                        className="flex-1 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 transition-all font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-1 px-1"
                                    >
                                        <Users2 className="w-3 h-3 shrink-0" />
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
                                        className={`flex-1 h-8 rounded-lg flex items-center justify-center gap-1 transition-all duration-300 font-black uppercase tracking-widest text-[8px] shadow-md px-1
                                            ${isLive
                                                ? "bg-rojo text-white shadow-rojo/30 hover:bg-rojo/90"
                                                : isUserRegistered
                                                    ? "bg-azul-primary text-white shadow-azul-primary/30 hover:bg-azul-dark"
                                                    : isOpen
                                                        ? isFull
                                                            ? "bg-slate-200 text-slate-400 cursor-not-allowed pointer-events-none shadow-none"
                                                            : tournament.isMembersOnly
                                                                ? "bg-azul-primary text-white shadow-azul-primary/30 hover:bg-azul-dark"
                                                                : "bg-green-600 text-white shadow-green-600/30 hover:bg-green-500"
                                                        : isPreregistration
                                                            ? "bg-azul-primary/70 text-white shadow-none"
                                                            : "bg-slate-100 text-slate-400 border border-slate-200 shadow-none"
                                            }`}
                                    >
                                        {isLive ? <Zap className="w-3.5 h-3.5 shrink-0" /> :
                                            isUserRegistered ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> :
                                                isOpen ? (isFull ? <Users2 className="w-3.5 h-3.5 shrink-0" /> : <Plus className="w-3.5 h-3.5 shrink-0" />) :
                                                    <Clock className="w-3.5 h-3.5 shrink-0" />}
                                        <span className="truncate">
                                            {isLive ? "En Vivo" :
                                                isUserRegistered ? "Inscripto" :
                                                    canDoMassInsc ? "Masiva" :
                                                        isOpen ? (isFull ? "Lleno" : (tournament.isMembersOnly && !isClubMember ? "Socios" : "Inscribirme")) :
                                                            isPreregistration ? "Pronto" : "Cerrado"}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ══════════════ BACK FACE (light) ══════════════ */}
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] z-20">
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-full shadow-sm">

                            {/* Header — colored band */}
                            <div className="p-3 bg-gradient-to-r from-azul-primary to-blue-500 relative overflow-hidden shrink-0">
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),_transparent_65%)] pointer-events-none" />
                                <div className="relative flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <Users2 className="w-3.5 h-3.5 text-white/80" />
                                        <h3 className="text-xs font-black uppercase italic text-white tracking-tight">Inscriptos</h3>
                                    </div>
                                    <button
                                        onClick={toggleFlip}
                                        className="w-6 h-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5 text-white" />
                                    </button>
                                </div>
                                <p className="text-[8px] font-bold uppercase tracking-widest text-white/70 truncate relative">{tournament.name}</p>
                            </div>

                            {/* Participants list */}
                            <div className="flex-1 overflow-y-auto p-2.5 no-scrollbar min-h-0">
                                {isLoadingParticipants ? (
                                    <div className="flex flex-col items-center justify-center h-full space-y-2">
                                        <div className="w-5 h-5 border-2 border-azul-primary border-t-transparent rounded-full animate-spin" />
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Cargando...</p>
                                    </div>
                                ) : participants.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                                        <Users2 className="w-8 h-8 text-slate-300" />
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Sin inscriptos aún</p>
                                    </div>
                                ) : (
                                    <div className="space-y-0">
                                        {participants.map((reg, i) => (
                                            <div
                                                key={reg.id}
                                                className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 group/p"
                                            >
                                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                    <span className="text-[7px] font-black text-slate-300 w-4 shrink-0 tabular-nums">{i + 1}.</span>
                                                    <div className="min-w-0 flex flex-wrap items-center gap-1">
                                                        <span
                                                            onClick={() => { if (reg.userId) handleShowProfile(reg.userId); }}
                                                            className={`text-[9px] font-black text-slate-900 uppercase tracking-tight leading-none ${reg.userId ? "cursor-pointer hover:text-azul-primary transition-colors" : ""}`}
                                                        >
                                                            {reg.user?.firstName} {reg.user?.lastName?.charAt(0)}.
                                                        </span>
                                                        {reg.partnerName && (
                                                            <span className="text-slate-400 font-bold italic text-[8px] leading-none">
                                                                +{" "}
                                                                {reg.partnerUserId ? (
                                                                    <span
                                                                        onClick={() => handleShowProfile(reg.partnerUserId)}
                                                                        className="cursor-pointer hover:text-azul-primary text-slate-500 transition-colors"
                                                                    >
                                                                        {reg.partnerName.split(' ')[0]}
                                                                    </span>
                                                                ) : (
                                                                    <span>{reg.partnerName.split(' ')[0]}</span>
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-[7px] font-black text-azul-primary uppercase ml-1 shrink-0">
                                                    {reg.category || reg.user?.category || "—"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Back button */}
                            <div className="p-2 border-t border-slate-200 shrink-0">
                                <button
                                    onClick={toggleFlip}
                                    className="w-full h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-azul-primary hover:text-white hover:border-transparent font-black uppercase tracking-widest text-[8px] transition-all flex items-center justify-center gap-1.5"
                                >
                                    Volver al Torneo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Modals ── */}
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

            {/* ── Player Profile Modal ── */}
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
                                            {/* Player Card (scaled) */}
                                            <div className="shrink-0 flex items-center justify-center scale-[0.82] origin-center -my-11 -mx-7 md:-my-10 md:-mx-6">
                                                <PlayerCard player={profileData.player} stats={profileData.stats} isCurrentUser={profileData.player.userId === currentUserId} />
                                            </div>

                                            {/* Summary KPIs */}
                                            <div className="flex-1 space-y-3 py-1 w-full flex flex-col justify-between min-h-0">
                                                <div className="space-y-3 min-h-0 flex flex-col">
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
