"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar, MapPin, Trophy, Zap,
    CheckCircle, Clock, User, Users2, DollarSign, LayoutGrid, Plus, Shield
} from "lucide-react";
import { motion } from "framer-motion";

interface PublicOpenCourtCardProps {
    event: any;
    isRegistered?: boolean;
    isLoggedIn?: boolean;
}

export default function PublicOpenCourtCard({ event, isRegistered, isLoggedIn }: PublicOpenCourtCardProps) {
    const router = useRouter();
    const [imageError, setImageError] = useState(false);

    const hasImage = event.club?.image && 
                    event.club.image !== "" && 
                    event.club.image !== "null" && 
                    event.club.image !== "undefined";
    
    const showFallback = !hasImage || imageError;

    const isFinished = event.status === "completed";
    const isFull = event.totalSlots && event.registrationCount >= event.totalSlots;
    const percent = event.totalSlots ? (event.registrationCount / event.totalSlots) * 100 : 0;

    const statusConfig = isFinished
        ? { label: "Finalizado", pill: "bg-muted-foreground/40", text: "text-muted-foreground" }
        : isFull
            ? { label: "Agotado", pill: "bg-rojo", text: "text-rojo" }
            : { label: "Abierto", pill: "bg-celeste", text: "text-celeste" };

    const href = `/cancha-abierta/${event.id}`;

    function formatDate(dateStr: string | null) {
        if (!dateStr) return "Por confirmar";
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    const handleCardClick = () => {
        router.push(href);
    };

    return (
        <div
            onClick={handleCardClick}
            className="group block h-full focus:outline-none cursor-pointer"
        >
            <div className="bg-card border border-border/60 rounded-[1.5rem] overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-celeste/20 flex flex-col h-full relative group/card">
                {/* Compact Image Area */}
                <div className="relative h-32 w-full overflow-hidden bg-muted/20">
                    {!showFallback ? (
                        <img
                            src={event.club.image}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                            alt={event.name}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-celeste/5 to-azul-primary/5">
                            <Zap className={`w-8 h-8 ${statusConfig.text} opacity-20`} />
                        </div>
                    )}

                    {/* Compact Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                        <span className={`px-2 py-0.5 rounded-md ${statusConfig.pill} text-white font-black text-[9px] uppercase tracking-wider shadow-sm`}>
                            {statusConfig.label}
                        </span>
                        {isRegistered && (
                            <span className="px-2 py-0.5 rounded-md bg-white border border-celeste/20 text-celeste font-black text-[9px] uppercase tracking-wider shadow-sm flex items-center gap-1">
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
                                {event.club?.name || "Club Padel"}
                            </p>
                            <h3 className="text-lg font-black uppercase italic tracking-tight text-foreground leading-tight group-hover/card:text-azul-primary transition-colors truncate">
                                {event.name}
                            </h3>
                            {event.city && (
                                <p className="text-[10px] font-bold text-celeste uppercase tracking-widest mt-1 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {event.city}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col items-end text-right">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Fecha / Hora</span>
                            <span className="text-xs font-bold text-foreground/80">{formatDate(event.date)}</span>
                            {event.time && (
                                <span className="text-[10px] font-black text-azul-primary uppercase tracking-tighter flex items-center gap-1 mt-0.5">
                                    <Clock className="w-2.5 h-2.5" /> {event.time}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Compact Metadata Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5 border-y border-border/40 py-4 bg-muted/5 -mx-5 px-5">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Inscripción</span>
                            <span className="text-[11px] font-bold text-foreground/90">
                                {event.registrationFee ? `$${event.registrationFee.toLocaleString('es-ES')}` : "Gratis"}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Cupos</span>
                            <span className="text-[11px] font-bold text-foreground/90">
                                {event.registrationCount} / {event.totalSlots || '∞'}
                            </span>
                        </div>
                    </div>

                    {/* Slots Progress Bar - Specialized for Open Court */}
                    {!isFinished && (
                        <div className="mb-5 space-y-1.5">
                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-muted-foreground/70">
                                <span>Ocupación</span>
                                <span className={isFull ? "text-rojo" : "text-celeste"}>{Math.round(percent)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(percent, 100)}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-full rounded-full ${percent > 80 ? 'bg-rojo' : 'bg-celeste'}`}
                                />
                            </div>
                        </div>
                    )}

                    <div className="mb-5 flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/70" />
                        <div className="flex-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 block mb-0.5">Dirección</span>
                            {event.address ? (
                                <span
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address + " " + event.city)}`, "_blank");
                                    }}
                                    className="text-xs font-bold text-foreground/80 hover:text-azul-primary underline decoration-azul-primary/20 underline-offset-4 cursor-pointer"
                                >
                                    {event.address}
                                </span>
                            ) : (
                                <span className="text-xs font-bold text-muted-foreground/70 italic">Por confirmar</span>
                            )}
                        </div>
                    </div>

                    {/* Ultra Compact Map */}
                    <div className="mb-6 w-full h-24 rounded-xl overflow-hidden border border-border/50 bg-muted/10 relative">
                        {event.address ? (
                            <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0, opacity: 0.6, filter: 'grayscale(0.2)' }}
                                loading="lazy"
                                allowFullScreen
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(event.address + " " + event.city)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                            ></iframe>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-20">
                                <MapPin className="w-4 h-4 mr-2" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Sin mapa disponible</span>
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <div className="mt-auto">
                        <div className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 font-black uppercase tracking-widest text-[10px] ${
                            isFinished ? "bg-muted text-muted-foreground shadow-none" :
                            isRegistered ? "bg-celeste text-white shadow-lg shadow-celeste/20" :
                            isFull ? "bg-rojo/10 text-rojo border border-rojo/20" :
                            "bg-azul-primary text-white shadow-lg shadow-azul-primary/20 hover:scale-[1.02] active:scale-95 transition-transform"
                        }`}>
                            {isFinished ? <Trophy className="w-3.5 h-3.5" /> :
                             isRegistered ? <CheckCircle className="w-3.5 h-3.5" /> :
                             isFull ? <Users2 className="w-3.5 h-3.5" /> :
                             <Plus className="w-3.5 h-3.5" />}
                            
                            {isFinished ? "Evento Finalizado" :
                             isRegistered ? "Mi Inscripción" :
                             isFull ? "Cupos Agotados" : 
                             "Inscribirse"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
