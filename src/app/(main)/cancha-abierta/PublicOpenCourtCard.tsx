"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar, MapPin, Trophy, Zap,
    CheckCircle, Clock, User, Users2, DollarSign, LayoutGrid, Plus, Shield, MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";

interface PublicOpenCourtCardProps {
    event: any;
    isRegistered?: boolean;
    isLoggedIn?: boolean;
    currentUserId?: string;
    onMessage?: (e: React.MouseEvent, recipientId: string) => void;
    onOpenParticipants?: (e: React.MouseEvent, eventId: string, eventName: string) => void;
    onOpenResults?: (e: React.MouseEvent, eventId: string, eventName: string) => void;
}

export default function PublicOpenCourtCard({ event, isRegistered, isLoggedIn, currentUserId, onMessage, onOpenParticipants, onOpenResults }: PublicOpenCourtCardProps) {
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
        ? { label: "Finalizado", pill: "border-muted-foreground/30 text-muted-foreground bg-muted-foreground/5", text: "text-muted-foreground" }
        : isFull
            ? { label: "Agotado", pill: "border-rojo/30 text-rojo bg-rojo/5", text: "text-rojo" }
            : { label: "Abierto", pill: "border-celeste/30 text-celeste bg-celeste/5", text: "text-celeste" };

    const href = `/cancha-abierta/${event.id}`;

    function formatDate(dateStr: string | null) {
        if (!dateStr) return "Por confirmar";
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    const handleCardClick = (e: React.MouseEvent) => {
        if (isFinished && onOpenResults) {
            e.preventDefault();
            e.stopPropagation();
            onOpenResults(e, event.id, event.name);
        } else {
            router.push(href);
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className="group block h-full focus:outline-none cursor-pointer select-none"
        >
            <div className="bg-card/65 backdrop-blur-sm border border-border/70 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-azul-primary/5 hover:border-celeste/40 flex flex-col h-full relative group/card">
                {/* Tactical HUD Corner Elements */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-muted-foreground/20 z-20 pointer-events-none" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-muted-foreground/20 z-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-muted-foreground/20 z-20 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-muted-foreground/20 z-20 pointer-events-none" />

                {/* Compact Tech Image Area */}
                <div className="relative h-16 w-full overflow-hidden bg-muted/20 border-b border-border/40 shrink-0">
                    {/* Futuristic Grid Overlay on image */}
                    <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:6px_6px] mix-blend-overlay z-10 pointer-events-none" />
                    
                    {!showFallback ? (
                        <img
                            src={event.club.image}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                            alt={event.name}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-celeste/5 to-azul-primary/5">
                            <Zap className={`w-6 h-6 ${statusConfig.text} opacity-25`} />
                        </div>
                    )}

                    {/* Compact Status Pills */}
                    <div className="absolute top-2.5 left-2.5 flex gap-1.5 z-20">
                        <span className={`px-2 py-0.5 rounded border text-[7px] font-black uppercase tracking-wider shadow-sm backdrop-blur-sm ${statusConfig.pill}`}>
                            {statusConfig.label}
                        </span>
                        {isRegistered && (
                            <span className="px-2 py-0.5 rounded border border-celeste bg-white text-celeste font-black text-[7px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                                <CheckCircle className="w-2.5 h-2.5 fill-current opacity-20" />
                                <CheckCircle className="absolute w-2.5 h-2.5" /> Inscripto
                            </span>
                        )}
                    </div>
                </div>

                {/* High Density Card Body */}
                <div className="p-3 flex flex-col flex-1">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5 truncate">
                                {event.club?.name || "Club Padel"}
                            </p>
                            <h3 className="text-[11px] font-black uppercase italic tracking-tight text-foreground leading-tight group-hover/card:text-azul-primary transition-colors truncate">
                                {event.name}
                            </h3>
                            {event.city && (
                                <p className="text-[8px] font-bold text-celeste uppercase tracking-wider mt-0.5 flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5" /> {event.city}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col items-end text-right shrink-0">
                            <span className="text-[6px] font-black uppercase tracking-widest text-muted-foreground/75 mb-0.5">Fecha / Hora</span>
                            <span className="text-[9px] font-black text-foreground/80">{formatDate(event.date)}</span>
                            {event.time && (
                                <span className="text-[8px] font-bold text-azul-primary uppercase tracking-tighter flex items-center gap-0.5 mt-0.5">
                                    <Clock className="w-2 h-2" /> {event.time}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Compact Metadata Dashboard Grid */}
                    <div className="grid grid-cols-2 gap-1.5 my-1.5 border-y border-border/40 py-2 bg-muted/5 -mx-3 px-3 shrink-0">
                        <div className="flex flex-col">
                            <span className="text-[6px] font-black uppercase tracking-widest text-muted-foreground/70 mb-0.5">Inscripción</span>
                            <span className="text-[9px] font-black font-mono text-foreground/90">
                                {event.registrationFee ? `$${event.registrationFee.toLocaleString('es-ES')}` : <span className="text-emerald-500 font-bold uppercase text-[7px]">Gratis</span>}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[6px] font-black uppercase tracking-widest text-muted-foreground/70 mb-0.5">Cupos</span>
                            <span className="text-[9px] font-black font-mono text-foreground/90">
                                {event.registrationCount} / {event.totalSlots || '∞'}
                            </span>
                        </div>
                    </div>

                    {/* Slots Progress Bar - High Density Slim */}
                    {!isFinished && (
                        <div className="my-2 space-y-1 shrink-0">
                            <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-widest text-muted-foreground/70 font-mono">
                                <span>Capacidad Asignada</span>
                                <span className={isFull ? "text-rojo" : "text-celeste"}>{Math.round(percent)}%</span>
                            </div>
                            <div className="h-1 w-full bg-muted rounded-full overflow-hidden border border-border/30">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(percent, 100)}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className={`h-full rounded-full ${percent > 80 ? 'bg-rojo' : 'bg-celeste'}`}
                                />
                            </div>
                        </div>
                    )}

                    {/* Address Panel */}
                    <div className="my-1 flex items-start gap-1.5 shrink-0">
                        <MapPin className="w-3 h-3 mt-0.5 text-muted-foreground/75" />
                        <div className="flex-1 min-w-0">
                            <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/70 block">Dirección de Sede</span>
                            {event.address ? (
                                <span
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address + " " + event.city)}`, "_blank");
                                    }}
                                    className="text-[10px] font-bold text-foreground/75 hover:text-azul-primary underline decoration-azul-primary/20 underline-offset-2 cursor-pointer truncate block"
                                >
                                    {event.address}
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold text-muted-foreground/60 italic block">Por confirmar</span>
                            )}
                        </div>
                    </div>
                    
                    {/* View Participants Trigger */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenParticipants?.(e, event.id, event.name);
                        }}
                        className="w-full h-7 bg-card border border-border/70 hover:bg-muted/50 text-muted-foreground hover:text-foreground rounded-lg text-[7px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 shrink-0 my-1"
                    >
                        <Users2 className="w-3.5 h-3.5 text-celeste" />
                        Ver Inscriptos ({event.registrationCount})
                    </button>
                    
                    {/* Action Panel */}
                    <div className="mt-auto space-y-2 pt-3 shrink-0">
                        {isLoggedIn && (event.creatorId || event.club?.ownerId) && currentUserId !== (event.creatorId || event.club?.ownerId) && (
                            <button
                                onClick={(e) => onMessage?.(e, event.creatorId || event.club.ownerId)}
                                className="w-full h-8 bg-azul-primary/5 border border-azul-primary/10 text-azul-primary hover:bg-azul-primary hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 group/msg"
                            >
                                <MessageSquare className="w-3 h-3 group-hover/msg:scale-110 transition-transform" />
                                Mensaje al Organizador
                            </button>
                        )}
                        
                        {isFinished ? (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onOpenResults?.(e, event.id, event.name);
                                }}
                                className="w-full h-7 bg-celeste/10 hover:bg-celeste text-celeste hover:text-white border border-celeste/20 hover:border-transparent rounded-lg text-[7px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 shadow-md shadow-celeste/5 hover:scale-[1.01] active:scale-98 cursor-pointer"
                            >
                                <Trophy className="w-3 h-3" />
                                Ver Resultados
                            </button>
                        ) : (
                            <div className={`w-full py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all duration-300 font-black uppercase tracking-widest text-[7px] h-7 border ${
                                isRegistered ? "bg-celeste text-white shadow-md shadow-celeste/10 border-transparent" :
                                isFull ? "bg-rojo/10 text-rojo border-rojo/20" :
                                "bg-azul-primary hover:bg-azul-dark text-white shadow-md shadow-azul-primary/10 hover:scale-[1.01] active:scale-98 transition-transform border-transparent"
                            }`}>
                                {isRegistered ? <CheckCircle className="w-3 h-3" /> :
                                 isFull ? <Users2 className="w-3 h-3" /> :
                                 <Plus className="w-3 h-3" />}
                                
                                {isRegistered ? "Mi Inscripción" :
                                 isFull ? "Cupos Completos" : 
                                 "Unirse a Cancha"}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
