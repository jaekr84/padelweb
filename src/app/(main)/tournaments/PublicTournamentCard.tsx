"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Calendar, MapPin, Trophy, Zap,
    CheckCircle, Clock, User, Users2, DollarSign, LayoutGrid, Plus
} from "lucide-react";
import ClubEnrollmentModal from "./ClubEnrollmentModal";

interface PublicTournamentCardProps {
    tournament: any;
    userClubId?: string | null;
    userDbRole?: string | null;
    isUserRegistered?: boolean;
}

export default function PublicTournamentCard({ tournament, userClubId, userDbRole, isUserRegistered }: PublicTournamentCardProps) {
    const [isClubModalOpen, setIsClubModalOpen] = useState(false);
    
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
    const hasClub = !!userClubId;

    let isOpen = false;
    let openDate: string | null = null;

    if (tournament.status === "published" || tournament.status === "open") {
        if (hasClub) {
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
        ? { label: "En Vivo", dot: true, pill: "bg-red-500", text: "text-red-500" }
        : isOpen
            ? { label: "Abierto", dot: false, pill: "bg-emerald-600", text: "text-emerald-600" }
            : isPreregistration
                ? { label: "Próximamente", dot: false, pill: "bg-blue-500", text: "text-blue-500" }
                : isFinished
                    ? { label: "Finalizado", dot: false, pill: "bg-muted-foreground/40", text: "text-muted-foreground" }
                    : { label: "Borrador", dot: false, pill: "bg-muted-foreground/20", text: "text-muted-foreground" };

    const isClubUser = userDbRole === "club" || userDbRole === "superadmin";
    const canDoMassInsc = isOpen && isClubUser && !isFinished && !isLive;

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

    return (
        <>
            <Link 
                href={canDoMassInsc ? "#" : href} 
                className="group block h-full focus:outline-none"
                onClick={(e) => {
                   if (canDoMassInsc) {
                       e.preventDefault();
                       setIsClubModalOpen(true);
                   }
                }}
            >
                <div className="bg-card border border-border/60 rounded-[1.5rem] overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-indigo-500/20 flex flex-col h-full relative group/card">
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
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50/50 to-indigo-100/50">
                                <Trophy className={`w-8 h-8 ${statusConfig.text} opacity-20`} />
                            </div>
                        )}
                        
                        {/* Compact Badges */}
                        <div className="absolute top-3 left-3 flex gap-2">
                            <span className={`px-2 py-0.5 rounded-md ${statusConfig.pill} text-white font-black text-[9px] uppercase tracking-wider shadow-sm`}>
                                {statusConfig.label}
                            </span>
                            {isUserRegistered && (
                                <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-100 text-indigo-600 font-black text-[9px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                                    <CheckCircle className="w-2.5 h-2.5" /> Inscripto
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                        {/* Header StatsRow */}
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 mb-1 truncate">
                                    {tournament.club?.name || tournament.createdBy?.clubs?.[0]?.name || "Club ACAP"}
                                </p>
                                <h3 className="text-lg font-black uppercase italic tracking-tight text-foreground leading-tight group-hover/card:text-indigo-600 transition-colors truncate">
                                    {tournament.name}
                                </h3>
                            </div>
                            <div className="flex flex-col items-end text-right">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Fecha</span>
                                <span className="text-xs font-bold text-foreground/80">{formatDate(tournament.startDate)}</span>
                            </div>
                        </div>

                        {/* Compact Metadata Grid (3 columns for seriousness) */}
                        <div className="grid grid-cols-3 gap-3 mb-5 border-y border-border/40 py-4 bg-muted/5 -mx-5 px-5">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Categorías</span>
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
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Género</span>
                                <span className="text-[11px] font-bold text-foreground/90 capitalize">
                                    {mod?.genero === 'mujer' ? 'Femenino' : mod?.genero === 'hombre' ? 'Masculino' : 'Mixto'}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Inscripción</span>
                                <span className="text-[11px] font-bold text-foreground/90">
                                    {tournament.registrationFee ? `$${tournament.registrationFee.toLocaleString('es-ES')}` : "Gratis"}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Modalidad</span>
                                <span className="text-[11px] font-bold text-foreground/90">
                                    {mod?.participacion === 'individual' ? "Individual" : "En Parejas"}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Tipo</span>
                                <span className="text-[11px] font-bold text-foreground/90">
                                    {tournament.type === 'americano' ? 'Americano' : 'Round Robin'}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Cupos</span>
                                <span className="text-[11px] font-bold text-foreground/90">{tournament.maxSlots || "Sin límite"}</span>
                            </div>
                        </div>

                        {/* Location Block - More Pro List Style */}
                        <div className="mb-5 flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/50" />
                            <div className="flex-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-0.5">Ubicación</span>
                                {tournament.location ? (
                                    <span 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tournament.location)}`, "_blank");
                                        }}
                                        className="text-xs font-bold text-foreground/80 hover:text-indigo-600 underline decoration-indigo-500/20 underline-offset-4 cursor-pointer"
                                    >
                                        {tournament.location}
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold text-muted-foreground/40 italic">Por confirmar</span>
                                )}
                            </div>
                        </div>

                        {/* Ultra Compact Map */}
                        <div className="mb-6 w-full h-24 rounded-xl overflow-hidden border border-border/50 bg-muted/10 relative">
                            {tournament.location ? (
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    style={{ border: 0, opacity: 0.6, filter: 'grayscale(0.2)' }} 
                                    loading="lazy" 
                                    allowFullScreen 
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(tournament.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                ></iframe>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-20">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Sin mapa disponible</span>
                                </div>
                            )}
                        </div>

                        {/* Enrollment Section - Minimalist */}
                        <div className="mt-auto pt-4 border-t border-border/40">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50">Club</span>
                                    <span className="text-[10px] font-bold text-foreground/80">{formatDate(tournament.openDateClub)}</span>
                                </div>
                                <div className="w-px h-6 bg-border/40" />
                                <div className="flex flex-col text-right">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50">General</span>
                                    <span className="text-[10px] font-bold text-foreground/80">{formatDate(tournament.openDateGeneral)}</span>
                                </div>
                            </div>

                            <div className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 font-black uppercase tracking-widest text-[10px] ${
                                isLive ? "bg-red-500 text-white shadow-lg shadow-red-500/20" :
                                isUserRegistered ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" :
                                isOpen ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" :
                                isPreregistration ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" :
                                "bg-muted text-muted-foreground shadow-none"
                            }`}>
                                {isLive ? <Zap className="w-3.5 h-3.5" /> :
                                    isUserRegistered ? <CheckCircle className="w-3.5 h-3.5" /> :
                                        isOpen ? <Plus className="w-3.5 h-3.5" /> :
                                            isPreregistration ? <Clock className="w-3.5 h-3.5" /> :
                                                <Trophy className="w-3.5 h-3.5" />}
                                
                                {isLive ? "En Vivo" :
                                    isUserRegistered ? "Mi Inscripción" :
                                        canDoMassInsc ? "Inscripción Masiva" :
                                            isOpen ? "Inscribirse" :
                                                isPreregistration ? "Muy Pronto" : "Próximamente"}
                            </div>
                        </div>
                    </div>
                </div>
            </Link>

            <ClubEnrollmentModal 
                isOpen={isClubModalOpen}
                onClose={() => setIsClubModalOpen(false)}
                tournament={tournament}
            />
        </>
    );
}
