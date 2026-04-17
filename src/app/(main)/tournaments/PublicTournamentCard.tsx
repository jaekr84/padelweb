"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Calendar, MapPin, Trophy, Zap,
    CheckCircle, Clock, User, Users2, DollarSign, LayoutGrid, Plus, Shield,
    Edit3, LayoutDashboard, Settings
} from "lucide-react";
import ClubEnrollmentModal from "./ClubEnrollmentModal";
import AccessDeniedModal from "./AccessDeniedModal";
import TournamentPublishButton from "@/components/TournamentPublishButton";

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
    const today = new Date().toISOString().split("T")[0];

    // Permissions for the management buttons
    const isCreator = Boolean(currentUserId && tournament.createdByUserId && currentUserId === tournament.createdByUserId);
    const isClubOwner = Boolean(currentUserId && tournament.club?.ownerId && currentUserId === tournament.club.ownerId);
    
    // Strict membership check: superadmins also need to be members if it's members only (per user request)
    const isExplicitClubMember = Boolean(userClubId && tournament.clubId && userClubId === tournament.clubId);
    const isClubMember = isExplicitClubMember; // Removed superadmin bypass for membership check
    const canManage = userDbRole === "superadmin";

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

    const statusConfig = isLive
        ? { label: "En Vivo", dot: true, pill: "bg-rojo text-white shadow-rojo/20", text: "text-rojo" }
        : isOpen
            ? { label: "Abierto", dot: false, pill: "bg-celeste text-white shadow-celeste/20", text: "text-celeste" }
            : isPreregistration
                ? { label: "Próximamente", dot: false, pill: "bg-azul-primary text-white shadow-azul-primary/20", text: "text-azul-primary" }
                : isFinished
                    ? { label: "Finalizado", dot: false, pill: "bg-muted-foreground/20 text-muted-foreground", text: "text-muted-foreground" }
                    : { label: "Borrador", dot: false, pill: "bg-muted-foreground/10 text-muted-foreground", text: "text-muted-foreground" };

    const isClubUser = userDbRole === "club" || userDbRole === "superadmin";
    const canDoMassInsc = isOpen && isClubUser && (!tournament.isMembersOnly || isClubMember) && !isFinished && !isLive;

    const href = isUserRegistered || isLive || isFinished
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

    const handleCardClick = (e: React.MouseEvent) => {
        if (canDoMassInsc) {
            e.preventDefault();
            e.stopPropagation();
            setIsClubModalOpen(true);
        } else if (isOpen) {
            e.preventDefault();
            e.stopPropagation();
            if (checkEligibility()) {
                router.push(href);
            }
        } else {
            router.push(href);
        }
    };

    return (
        <>
            <div
            onClick={handleCardClick}
            className="group block h-full focus:outline-none cursor-pointer"
        >
            <div className="bg-card border border-border/60 rounded-[1.5rem] overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-celeste/20 flex flex-col h-full relative group/card">
                {/* Compact Image Area */}
                <div className="relative h-32 w-full overflow-hidden bg-muted/20">
                    {!showFallback ? (
                        <img
                            src={tournament.imageUrl}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                            alt={tournament.name}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-azul-primary/5 to-azul-primary/10">
                            <Trophy className={`w-8 h-8 ${statusConfig.text} opacity-20`} />
                        </div>
                    )}

                    {/* Compact Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                        <span className={`px-2 py-0.5 rounded-md ${statusConfig.pill} font-black text-[9px] uppercase tracking-wider shadow-sm`}>
                            {statusConfig.label}
                        </span>
                        {tournament.isMembersOnly && (
                            <span className="px-2 py-0.5 rounded-md bg-azul-primary text-white font-black text-[9px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                                <Shield className="w-2.5 h-2.5" /> Exclusivo Miembros
                            </span>
                        )}
                        {isUserRegistered && (
                            <span className="px-2 py-0.5 rounded-md bg-white border border-celeste/10 text-celeste font-black text-[9px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                                <CheckCircle className="w-2.5 h-2.5" /> Inscripto
                            </span>
                        )}
                    </div>

                    {/* Admin/Club Actions Overlay */}
                    {canManage && (
                        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    router.push(`/tournaments/${tournament.id}/edit`);
                                }}
                                className="p-2 rounded-lg bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors shadow-lg border border-white/10 group/btn"
                                title="Editar Torneo"
                            >
                                <Edit3 className="w-4 h-4 group-hover/btn:text-celeste transition-colors" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    router.push(`/tournaments/${tournament.id}/manage`);
                                }}
                                className="p-2 rounded-lg bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors shadow-lg border border-white/10 group/btn"
                                title="Gestionar Torneo"
                            >
                                <Settings className="w-4 h-4 group-hover/btn:text-celeste transition-colors" />
                            </button>

                            {tournament.status === 'finalizado' && (
                                <TournamentPublishButton 
                                    tournamentId={tournament.id} 
                                    tournamentName={tournament.name} 
                                    variant="card"
                                />
                            )}
                        </div>
                    )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                    {/* Header StatsRow */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 mb-1 truncate">
                                {tournament.club?.name || tournament.createdBy?.clubs?.[0]?.name || "Club ACAP"}
                            </p>
                            <h3 className="text-lg font-black uppercase italic tracking-tight text-foreground leading-tight group-hover/card:text-azul-primary transition-colors truncate">
                                {tournament.name}
                            </h3>
                            {tournament.location && (
                                <p className="text-[10px] font-bold text-azul-primary uppercase tracking-widest mt-1 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {tournament.location}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col items-end text-right">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Fecha / Hora</span>
                            <span className="text-xs font-bold text-foreground/80">{formatDate(tournament.startDate)}</span>
                            {tournament.time && (
                                <span className="text-[10px] font-black text-azul-primary uppercase tracking-tighter flex items-center gap-1 mt-0.5">
                                    <Clock className="w-2.5 h-2.5" /> {tournament.time}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Compact Metadata Grid (3 columns for seriousness) */}
                    <div className="grid grid-cols-3 gap-3 mb-5 border-y border-border/40 py-4 bg-muted/5 -mx-5 px-5">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Categorías</span>
                            <span className="text-[11px] font-bold text-foreground/90 truncate">
                                {(() => {
                                    let cats = tournament.categories;
                                    if (typeof cats === 'string') {
                                        try { cats = JSON.parse(cats); } catch (e) { cats = []; }
                                    }
                                    return (Array.isArray(cats) && cats.length > 0) ? (cats[0] === "libre" ? "Libre" : cats.join(", ")) : "N/A";
                                })()}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Género</span>
                            <span className="text-[11px] font-bold text-foreground/90 capitalize">
                                {mod?.genero === 'mujer' ? 'Femenino' : mod?.genero === 'hombre' ? 'Masculino' : 'Mixto'}
                            </span>
                        </div>
                        <div className="flex flex-col col-span-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Inscripción</span>
                            <div className="flex flex-col gap-0.5">
                                {tournament.memberRegistrationFee !== null && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[7px] font-black text-azul-primary uppercase tracking-tighter">Socio:</span>
                                        <span className="text-[10px] font-bold text-foreground/90">
                                            ${tournament.memberRegistrationFee.toLocaleString('es-ES')}
                                        </span>
                                    </div>
                                )}
                                {tournament.registrationFee !== null && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[7px] font-black text-muted-foreground uppercase tracking-tighter">Gral:</span>
                                        <span className="text-[10px] font-bold text-foreground/90">
                                            ${tournament.registrationFee.toLocaleString('es-ES')}
                                        </span>
                                    </div>
                                )}
                                {tournament.memberRegistrationFee === null && tournament.registrationFee === null && (
                                    <span className="text-[11px] font-black text-celeste uppercase tracking-widest">Gratis</span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Modalidad</span>
                            <span className="text-[11px] font-bold text-foreground/90">
                                {mod?.participacion === 'individual' ? "Individual" : "En Parejas"}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Tipo</span>
                            <span className="text-[11px] font-bold text-foreground/90">
                                {tournament.type === 'americano' ? 'Americano' : 'Round Robin'}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Cupos</span>
                            <span className="text-[11px] font-bold text-foreground/90">{mod?.maxSlots && mod.maxSlots !== 0 ? mod.maxSlots : "Sin límite"}</span>
                        </div>
                    </div>

                    <div className="mb-5 flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/70" />
                        <div className="flex-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 block mb-0.5">Ubicación Exacta</span>
                            {tournament.surface ? (
                                <span
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tournament.surface)}`, "_blank");
                                    }}
                                    className="text-xs font-bold text-foreground/80 hover:text-azul-primary underline decoration-azul-primary/20 underline-offset-4 cursor-pointer"
                                >
                                    {tournament.surface}
                                </span>
                            ) : (
                                <span className="text-xs font-bold text-muted-foreground/70 italic">Por confirmar</span>
                            )}
                        </div>
                    </div>

                    {/* Ultra Compact Map */}
                    <div className="mb-6 w-full h-24 rounded-xl overflow-hidden border border-border/50 bg-muted/10 relative">
                        {tournament.surface ? (
                            <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0, opacity: 0.6, filter: 'grayscale(0.2)' }}
                                loading="lazy"
                                allowFullScreen
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(tournament.surface)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                            ></iframe>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-20">
                                <MapPin className="w-4 h-4 mr-2" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Sin mapa disponible</span>
                            </div>
                        )}
                    </div>

                    {/* Registration Progress Bar */}
                    {mod?.maxSlots > 0 && (
                        <div className="mb-6 space-y-2">
                            <div className="flex justify-between items-end px-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">Cupos Confirmados</span>
                                <span className="text-[10px] font-bold text-foreground/80">
                                    {tournament.occupiedSlots || 0} / {mod.maxSlots} {mod.participacion === 'pareja' ? 'Parejas' : 'Jugadores'}
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/10">
                                {(() => {
                                    const occupied = tournament.occupiedSlots || 0;
                                    const max = mod.maxSlots;
                                    const percentage = Math.min((occupied / max) * 100, 100);
                                    
                                    let barColor = "bg-celeste";
                                    if (percentage >= 95) barColor = "bg-rojo shadow-[0_0_12px_rgba(255,51,102,0.4)]";
                                    else if (percentage >= 75) barColor = "bg-celeste shadow-[0_0_12px_rgba(0,157,224,0.4)]";
                                    
                                    return (
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    );
                                })()}
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[8px] font-bold text-muted-foreground/50 italic capitalize">
                                    {mod.maxSlots - (tournament.occupiedSlots || 0) <= 0 ? 'Sin lugares' : `${mod.maxSlots - (tournament.occupiedSlots || 0)} libres`}
                                </span>
                                <span className="text-[9px] font-black italic text-azul-primary/80">
                                    {Math.round(Math.min(((tournament.occupiedSlots || 0) / mod.maxSlots) * 100, 100))}%
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Enrollment Section - Minimalist */}
                    <div className="mt-auto pt-4 border-t border-border/40">

                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70">Club</span>
                                <span className="text-[10px] font-bold text-foreground/80">{formatDate(tournament.openDateClub)}</span>
                            </div>
                            <div className="w-px h-6 bg-border/40" />
                            <div className="flex flex-col text-right">
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70">General</span>
                                <span className="text-[10px] font-bold text-foreground/80">{formatDate(tournament.openDateGeneral)}</span>
                            </div>
                        </div>

                        <div className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 font-black uppercase tracking-widest text-[10px] ${isLive ? "bg-rojo text-white shadow-lg shadow-rojo/20" :
                                isUserRegistered ? "bg-azul-primary text-white shadow-lg shadow-azul-primary/20" :
                                    isOpen ? (tournament.isMembersOnly && !isClubMember ? "bg-azul-primary/80 text-white shadow-lg shadow-azul-primary/10" : "bg-azul-primary text-white shadow-lg shadow-azul-primary/20") :
                                        tournament.isMembersOnly ? "bg-azul-primary/80 text-white shadow-lg shadow-azul-primary/10" :
                                            isPreregistration ? "bg-celeste text-white shadow-lg shadow-celeste/20" :
                                                "bg-muted text-muted-foreground shadow-none"
                            }`}>
                            {isLive ? <Zap className="w-3.5 h-3.5" /> :
                                isUserRegistered ? <CheckCircle className="w-3.5 h-3.5" /> :
                                    isOpen ? (tournament.isMembersOnly && !isClubMember ? <Shield className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />) :
                                        tournament.isMembersOnly ? <Shield className="w-3.5 h-3.5" /> :
                                            isPreregistration ? <Clock className="w-3.5 h-3.5" /> :
                                                <Trophy className="w-3.5 h-3.5" />}

                            {isLive ? "En Vivo" :
                                isUserRegistered ? "Mi Inscripción" :
                                    canDoMassInsc ? "Inscripción Masiva" :
                                        isOpen ? (tournament.isMembersOnly && !isClubMember ? "Solo Miembros" : "Inscribirse") :
                                            tournament.isMembersOnly ? "Solo Miembros" :
                                                isPreregistration ? "Muy Pronto" : "Próximamente"}
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
        </>
    );
}
