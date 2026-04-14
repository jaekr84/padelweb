"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, MapPin, Calendar, Clock, DollarSign, Users, CheckCircle2, XCircle, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { joinOpenCourtEventAction, leaveOpenCourtEventAction } from "@/app/(main)/admin/cancha-abierta/actions";
import { useRouter } from "next/navigation";

interface EventJoinClientProps {
    event: any;
    club: any;
    participants: any[];
    isLoggedIn: boolean;
    currentUserId?: string;
    userRegistration: any;
    defaultSidePreference: string;
}

export default function EventJoinClient({ 
    event, 
    club, 
    participants, 
    isLoggedIn, 
    currentUserId,
    userRegistration,
    defaultSidePreference
}: EventJoinClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleJoin = async () => {
        if (!isLoggedIn) {
            toast.error("Debes iniciar sesión para inscribirte");
            return;
        }

        startTransition(async () => {
            const res = await joinOpenCourtEventAction(event.id, defaultSidePreference);
            if (res.success) {
                toast.success("¡Inscripción exitosa! Te esperamos.");
                router.refresh();
            } else {
                toast.error(res.error || "Error al inscribirse");
            }
        });
    };

    const handleLeave = async () => {
        if (!confirm("¿Seguro que deseas cancelar tu inscripción?")) return;

        startTransition(async () => {
            const res = await leaveOpenCourtEventAction(event.id);
            if (res.success) {
                toast.success("Inscripción cancelada");
                router.refresh();
            } else {
                toast.error(res.error || "Error al cancelar");
            }
        });
    };

    const isFull = event.totalSlots && participants.length >= event.totalSlots;

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
            {/* Header / Back Link */}
            <div className="flex items-center justify-between">
                <Link 
                    href="/cancha-abierta"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Volver al listado</span>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left Column: Event Details */}
                <div className="lg:col-span-12 space-y-12">
                    <div className="relative rounded-[3rem] overflow-hidden bg-card border border-border/50 shadow-2xl p-12 lg:p-16 flex flex-col md:flex-row items-center gap-12">
                        {/* Club Identity */}
                        <div className="relative w-40 h-40 shrink-0">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                            <div className="relative w-full h-full rounded-[2.5rem] bg-muted border border-border/40 overflow-hidden shadow-xl">
                                {club?.logoUrl ? (
                                    <Image src={club.logoUrl} alt={club.name || ""} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-black text-muted-foreground/30">
                                        {club?.name?.charAt(0)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Event Core Info */}
                        <div className="flex-1 space-y-6 text-center md:text-left">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                    <Zap className="w-3 h-3 fill-current" />
                                    Evento de Rotación
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter leading-tight">
                                    {event.name}
                                </h1>
                                <p className="text-lg font-bold text-muted-foreground uppercase">{club?.name}</p>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-6 text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-emerald-500" />
                                    {event.date}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-emerald-500" />
                                    {event.time}
                                </div>
                                <div className="flex items-center gap-2 underline underline-offset-4 decoration-emerald-500/30">
                                    <MapPin className="w-4 h-4 text-emerald-500" />
                                    {event.address}, {event.city}
                                </div>
                            </div>
                        </div>

                        {/* Price Tag */}
                        <div className="bg-foreground text-background rounded-[2rem] p-8 flex flex-col items-center justify-center min-w-[180px] shadow-2xl skew-x-1">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Precio</span>
                            <span className="text-4xl font-black italic tracking-tighter">${event.registrationFee}</span>
                        </div>
                    </div>
                </div>

                {/* Left Side: Participants & Rules */}
                <div className="lg:col-span-7 space-y-12">
                    {/* Participants List */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                <Users className="w-5 h-5 text-emerald-500" />
                                Jugadores Anotados
                            </h3>
                            <span className="bg-muted px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {participants.length} / {event.totalSlots || "?"}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {participants.map((p, idx) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={p.id} 
                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${p.userId === currentUserId ? 'bg-emerald-500/5 border-emerald-500/20 ring-1 ring-emerald-500/10' : 'bg-card border-border/40 hover:border-border hover:shadow-md'}`}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 rounded-2xl bg-muted overflow-hidden relative border border-border/20 shrink-0 shadow-sm">
                                            {p.image ? (
                                                <Image src={p.image} alt={p.name} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-black text-muted-foreground/40">
                                                    {p.name.split(' ').map((n: string) => n[0]).join('')}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black uppercase italic tracking-tight text-foreground truncate">{p.name}</p>
                                            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Jugador Confirmado</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                                            p.side === 'drive' ? 'bg-blue-500/10 border-blue-500/20 text-blue-600' :
                                            p.side === 'reves' ? 'bg-orange-500/10 border-orange-500/20 text-orange-600' :
                                            'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                                        }`}>
                                            {p.side}
                                        </div>
                                        {p.status === "playing" && (
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-lg">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[8px] font-black text-emerald-600 uppercase">En Juego</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            
                            {[...Array(Math.max(0, (event.totalSlots || 0) - participants.length))].map((_, i) => (
                                <div key={`empty-${i}`} className="flex items-center justify-between p-4 rounded-2xl bg-muted/10 border border-dashed border-border/40 opacity-30">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-muted/40" />
                                        <div className="h-4 w-32 bg-muted/50 rounded-full" />
                                    </div>
                                    <div className="h-6 w-16 bg-muted/40 rounded-full" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* How it works Information */}
                    <div className="bg-muted/40 rounded-[2.5rem] p-8 border border-border/40 space-y-6">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            ¿Cómo funciona este evento?
                        </h4>
                        <ul className="space-y-4">
                            {[
                                "Inscripción individual o en parejas (mismo precio por persona).",
                                "Rotación constante para jugar con y contra todos los participantes.",
                                "Aseguramos un mínimo de 1.5 horas de juego real.",
                                "El sistema de ranking local se actualiza según tus resultados.",
                                "Cualquier cancelación debe hacerse con 24hs de antelación."
                            ].map((text, i) => (
                                <li key={i} className="flex gap-3 text-[11px] font-medium text-muted-foreground leading-relaxed italic">
                                    <span className="text-emerald-500 font-black">•</span>
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Right Side: Join Widget */}
                <div className="lg:col-span-5">
                    <div className="sticky top-24 space-y-6">
                        <div className="bg-card border-2 border-border/50 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
                            {/* Decorative background info */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 -translate-y-16 translate-x-16 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-700" />
                            
                            <div className="relative z-10 space-y-8">
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                                        {userRegistration ? "¡Estás Inscripto!" : (isFull ? "Lista de Espera" : "Reserva tu Lugar")}
                                    </h3>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        {userRegistration ? "Nos vemos en la cancha el " + event.date : "Confirmá tu asistencia al evento"}
                                    </p>
                                </div>

                                {!userRegistration ? (
                                    <div className="space-y-6">
                                        <div className="bg-muted/30 rounded-2xl p-6 border border-border/40 space-y-2 text-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Preferencia de Lado</p>
                                            <p className="text-sm font-black uppercase italic text-foreground tracking-tighter">
                                                Jugás de: <span className="text-emerald-500">{defaultSidePreference}</span>
                                            </p>
                                            <p className="text-[8px] font-bold text-muted-foreground/30 uppercase leading-none mt-2">
                                                (Se toma de tu perfil de jugador)
                                            </p>
                                        </div>

                                        <button 
                                            onClick={handleJoin}
                                            disabled={isPending || (isFull && !userRegistration)}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:scale-100 text-white font-black uppercase tracking-widest text-sm py-6 rounded-[2rem] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 group/btn"
                                        >
                                            {isPending ? "Procesando..." : (isFull ? "Cupos Agotados" : "Confirmar Inscripción")}
                                            <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="bg-emerald-500/10 rounded-2xl p-6 border border-emerald-500/20 flex flex-col items-center gap-3">
                                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                            <p className="text-xs font-bold text-emerald-600 uppercase italic text-center leading-relaxed">
                                                Tu lugar está asegurado. Recordá llegar 15 minutos antes para el armado de partidos.
                                            </p>
                                        </div>
                                        <button 
                                            onClick={handleLeave}
                                            disabled={isPending}
                                            className="w-full text-muted-foreground/40 hover:text-red-500 font-black uppercase tracking-widest text-[9px] transition-colors py-4 flex items-center justify-center gap-2 group/leave"
                                        >
                                            <XCircle className="w-3 h-3 opacity-0 group-hover/leave:opacity-100 transition-opacity" />
                                            Cancelar Inscripción
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Login requirement notification if not logged in */}
                        {!isLoggedIn && (
                            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex items-start gap-4">
                                <ShieldCheck className="w-5 h-5 text-red-500 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-red-600">Inicio de Sesión Requerido</p>
                                    <p className="text-[9px] font-medium text-red-900/40 uppercase italic leading-tight">Debes estar registrado para participar. Inicia sesión para continuar.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
