"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Calendar, MapPin, Trophy, Zap,
    CheckCircle, Clock, User, Users2, DollarSign, LayoutGrid, Plus
} from "lucide-react";

interface PublicTournamentCardProps {
    tournament: any;
    userClubId?: string | null;
    isUserRegistered?: boolean;
}

export default function PublicTournamentCard({ tournament, userClubId, isUserRegistered }: PublicTournamentCardProps) {
    const hasImage = tournament.imageUrl &&
        tournament.imageUrl !== "" &&
        tournament.imageUrl !== "null" &&
        tournament.imageUrl !== "undefined";

    const [imageError, setImageError] = useState(false);
    const showFallback = !hasImage || imageError;

    // Safe parse modalidad and categories because MySQL JSON can come as string
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
        ? { label: "En Vivo", dot: true, bg: "bg-red-500/10 border-red-500/20", pill: "bg-red-500", text: "text-red-500" }
        : isOpen
            ? { label: "Abierto", dot: false, bg: "bg-emerald-500/10 border-emerald-500/20", pill: "bg-emerald-500", text: "text-emerald-500" }
            : isPreregistration
                ? { label: "Próximamente", dot: false, bg: "bg-blue-500/10 border-blue-500/20", pill: "bg-blue-500", text: "text-blue-500" }
                : isFinished
                    ? { label: "Finalizado", dot: false, bg: "bg-muted border-border", pill: "bg-muted-foreground/40", text: "text-muted-foreground" }
                    : { label: "Borrador", dot: false, bg: "bg-muted border-border", pill: "bg-muted-foreground/20", text: "text-muted-foreground" };

    const href = isUserRegistered || isLive || isFinished
        ? `/tournaments/${tournament.id}`
        : isOpen
            ? `/tournaments/register?id=${tournament.id}`
            : `/tournaments/${tournament.id}`;

    function formatDate(dateStr: string | null) {
        if (!dateStr) return "Por confirmar";
        const d = new Date(dateStr);
        if (typeof dateStr === 'string' && dateStr.length === 10) {
            d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        }
        return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    return (
        <Link href={href} className="group block h-full">
            <div className="bg-card border border-border/50 rounded-[2.5rem] overflow-hidden transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col relative h-full">

                {/* Header / Image Area */}
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                    {!showFallback ? (
                        <img
                            src={tournament.imageUrl}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            alt={tournament.name}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600/20 via-blue-600/10 to-emerald-600/20 transition-all duration-500 group-hover:opacity-90`}>
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/30 blur-2xl rounded-full scale-150 animate-pulse" />
                                <Trophy className={`w-14 h-14 ${statusConfig.text} relative z-10 drop-shadow-xl filter brightness-110`} />
                            </div>
                        </div>
                    )}

                    {/* Status Badge Overlays */}
                    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${statusConfig.pill} backdrop-blur-md shadow-lg border border-white/20`}>
                            {statusConfig.dot && (
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            )}
                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white">
                                {statusConfig.label}
                            </span>
                        </div>
                        {isUserRegistered && (
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-indigo-500/20 self-start">
                                <CheckCircle className="w-3 h-3 text-indigo-600" />
                                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-indigo-600">Inscripto</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-7 flex flex-col flex-1 relative z-10">

                    {/* Highlight glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Title Section */}
                    <div className="mb-6">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 mb-2">
                            {tournament.club?.name || tournament.createdBy?.clubs?.[0]?.name || "Club ACAP"}
                        </div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tight text-foreground leading-tight transition-colors group-hover:text-indigo-600">
                            {tournament.name}
                        </h3>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-y-5 gap-x-4 mb-8">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 opacity-40">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Fecha Inicio</span>
                            </div>
                            <div className="text-base font-bold text-foreground/90 pl-5.5">
                                {formatDate(tournament.startDate)}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 opacity-40">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Ubicación</span>
                            </div>
                            <div className="text-base font-bold text-foreground/90 truncate pl-5.5">
                                {tournament.location || "Por confirmar"}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 opacity-40">
                                <Trophy className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Categorías</span>
                            </div>
                            <div className="text-base font-bold text-foreground/90 truncate pl-5.5">
                                {(() => {
                                    let cats = tournament.categories;
                                    if (typeof cats === 'string') {
                                        try { cats = JSON.parse(cats); } catch (e) { cats = []; }
                                    }
                                    return (Array.isArray(cats) && cats.length > 0) ? (cats[0] === "libre" ? "Libre" : cats.join(", ")) : "A definir";
                                })()}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 opacity-40">
                                <Zap className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Género</span>
                            </div>
                            <div className="text-base font-bold text-foreground/90 pl-5.5 capitalize">
                                {mod?.genero === 'hombre' ? 'Masculino' : mod?.genero === 'mujer' ? 'Femenino' : 'Mixto'}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 opacity-40">
                                {mod?.participacion === 'individual' ? <User className="w-3.5 h-3.5" /> : <Users2 className="w-3.5 h-3.5" />}
                                <span className="text-[10px] font-black uppercase tracking-widest">Modalidad</span>
                            </div>
                            <div className="text-base font-bold text-foreground/90 pl-5.5">
                                {mod?.participacion === 'individual' ? "Individual" : "En Parejas"}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 opacity-40">
                                <DollarSign className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Inscripción</span>
                            </div>
                            <div className="text-base font-bold text-foreground/90 pl-5.5">
                                {tournament.registrationFee ? `$${tournament.registrationFee.toLocaleString('es-ES')}` : "Gratis"}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 opacity-40">
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Tipo</span>
                            </div>
                            <div className="text-base font-bold text-foreground/90 pl-5.5">
                                {tournament.type === 'americano' ? 'Americano' : 'Round Robin'}
                            </div>
                        </div>
                    </div>

                    {/* Registration Dates (Styled Box) */}
                    {(tournament.openDateClub || tournament.openDateGeneral) && (
                        <div className="bg-muted/30 rounded-3xl p-5 border border-border/40 mb-8 mt-auto">
                            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 mb-4 text-center">Fases de Inscripción</div>
                            <div className="grid grid-cols-2 divide-x divide-border/50">
                                {tournament.openDateClub && (
                                    <div className="flex flex-col items-center px-2">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-blue-500 mb-1.5">Habilitados Club</span>
                                        <span className="text-sm font-black text-foreground">{formatDate(tournament.openDateClub)}</span>
                                    </div>
                                )}
                                {tournament.openDateGeneral && (
                                    <div className="flex flex-col items-center px-2">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 mb-1.5">Inscripción General</span>
                                        <span className="text-sm font-black text-foreground">{formatDate(tournament.openDateGeneral)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* CTA Button */}
                    <div className="mt-auto">
                        <div className={`w-full py-4 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all duration-300 font-black uppercase tracking-[0.15em] text-[11px] shadow-lg active:scale-95 ${isLive ? "bg-red-500 text-white shadow-red-500/20" :
                            isUserRegistered ? "bg-indigo-600 text-white shadow-indigo-600/20" :
                                isOpen ? "bg-emerald-600 text-white shadow-emerald-600/20" :
                                    isPreregistration ? "bg-blue-600 text-white shadow-blue-600/20" :
                                        "bg-muted text-muted-foreground shadow-none"
                            }`}>
                            {isLive ? <Zap className="w-4 h-4 animate-pulse" /> :
                                isUserRegistered ? <CheckCircle className="w-4 h-4" /> :
                                    isOpen ? <Plus className="w-4 h-4" /> :
                                        isPreregistration ? <Clock className="w-4 h-4" /> :
                                            <Trophy className="w-4 h-4" />}

                            {isLive ? "Ver resultados en vivo" :
                                isUserRegistered ? "Ver mi inscripción" :
                                    isOpen ? "Inscribirse ahora" :
                                        isPreregistration ? (openDate ? `Abre el ${formatDate(openDate)}` : "Próximamente") :
                                            isFinished ? "Ver resultados finales" : "Ver detalles"}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
