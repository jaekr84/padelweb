"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, MapPin, Calendar, Clock, Trophy, Users, CheckCircle2, XCircle, ArrowRight, ShieldCheck, Zap, ChevronRight } from "lucide-react";
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
    matches: any[];
}

export default function EventJoinClient({
    event,
    club,
    participants,
    isLoggedIn,
    currentUserId,
    userRegistration,
    defaultSidePreference,
    matches = []
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
    const isCompleted = event.status === "completed";
    const [activeTab, setActiveTab] = useState<'results' | 'players'>(isCompleted ? 'results' : 'players');
    const [searchQuery, setSearchQuery] = useState("");

    // Helper to get player name by id
    const getPlayerName = (id: string) => {
        const p = participants.find(p => p.userId === id);
        return p ? p.name : "Invitado";
    };

    const highlightQuery = (name: string, query: string) => {
        if (!query.trim()) return name;
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(${escaped})`, "gi");
        return name.split(regex).map((part, index) =>
            part.toLowerCase() === query.toLowerCase() ? (
                <span key={index} className="bg-orange-500/10 text-orange-500 rounded px-0.5">
                    {part}
                </span>
            ) : (
                <span key={index}>{part}</span>
            )
        );
    };

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchingPlayerIds = normalizedQuery
        ? new Set(participants
            .filter(p => p.name.toLowerCase().includes(normalizedQuery))
            .map(p => p.userId))
        : new Set<string>();

    const filteredMatches = normalizedQuery
        ? matches.filter(match => {
            const players = [
                getPlayerName(match.team1Player1Id),
                getPlayerName(match.team1Player2Id),
                getPlayerName(match.team2Player1Id),
                getPlayerName(match.team2Player2Id),
            ];
            return players.some(name => name.toLowerCase().includes(normalizedQuery));
        })
        : matches;

    const playerSearchStats = {
        played: 0,
        won: 0,
        lost: 0,
        drawn: 0,
    };

    if (normalizedQuery && matchingPlayerIds.size > 0) {
        matches.forEach(match => {
            const team1Ids = [match.team1Player1Id, match.team1Player2Id];
            const team2Ids = [match.team2Player1Id, match.team2Player2Id];
            const team1HasMatch = team1Ids.some(id => matchingPlayerIds.has(id));
            const team2HasMatch = team2Ids.some(id => matchingPlayerIds.has(id));

            if (!team1HasMatch && !team2HasMatch) return;

            playerSearchStats.played += 1;
            const score1 = Number(match.score1 ?? 0);
            const score2 = Number(match.score2 ?? 0);

            if (score1 === score2) {
                playerSearchStats.drawn += 1;
            } else if ((team1HasMatch && score1 > score2) || (team2HasMatch && score2 > score1)) {
                playerSearchStats.won += 1;
            } else {
                playerSearchStats.lost += 1;
            }
        });
    }

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
                <div className="lg:col-span-5">
                    <div className="sticky top-24 space-y-6">
                        <div className={`bg-card border-2 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group transition-all ${isCompleted ? 'border-orange-500/20' : 'border-border/50'}`}>
                            <div className={`absolute top-0 right-0 w-32 h-32 -translate-y-16 translate-x-16 rounded-full blur-2xl transition-all duration-700 ${isCompleted ? 'bg-orange-500/10' : 'bg-emerald-500/5 group-hover:bg-emerald-500/10'}`} />
                            
                            {/* Right Column: Enrollment or Event Info */}
                            <div className="relative z-10 space-y-8">
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                                        {isCompleted ? "Evento Finalizado" : (userRegistration ? "¡Estás Inscripto!" : (isFull ? "Lista de Espera" : "Reserva tu Lugar"))}
                                    </h3>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        {isCompleted ? "Gracias por participar en esta jornada" : (userRegistration ? "Nos vemos en la cancha el " + event.date : "Confirmá tu asistencia al evento")}
                                    </p>
                                </div>

                                {isCompleted ? (
                                    <div className="space-y-6">
                                        <div className="bg-orange-500/10 rounded-2xl p-6 border border-orange-500/20 flex flex-col items-center gap-3 text-center">
                                            <Trophy className="w-10 h-10 text-orange-500" />
                                            <p className="text-xs font-bold text-orange-600 uppercase italic leading-relaxed">
                                                Este evento ya ha concluido. Podés consultar los resultados históricos.
                                            </p>
                                        </div>
                                        <Link
                                            href="/cancha-abierta"
                                            className="w-full bg-foreground text-background font-black uppercase tracking-widest text-[9px] py-5 rounded-[1.5rem] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Ver otros eventos
                                            <ChevronRight className="w-3 h-3" />
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        {userRegistration ? (
                                            <div className="space-y-6">
                                                <div className="bg-emerald-500/10 rounded-2xl p-6 border border-emerald-500/20 flex flex-col items-center gap-3">
                                                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                                    <p className="text-xs font-bold text-emerald-600 uppercase italic text-center leading-relaxed">
                                                        Tu lugar está asegurado. Recordá llegar 15 minutos antes.
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
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="bg-muted/30 rounded-2xl p-6 border border-border/40 space-y-2 text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Preferencia de Lado</p>
                                                    <p className="text-sm font-black uppercase italic text-foreground tracking-tighter">
                                                        Jugás de: <span className="text-emerald-500">{defaultSidePreference}</span>
                                                    </p>
                                                    <p className="text-[8px] font-bold text-muted-foreground/30 uppercase leading-none mt-2">
                                                        (De tu perfil de jugador)
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleJoin}
                                                    disabled={isPending || isFull}
                                                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black uppercase tracking-widest text-sm py-6 rounded-[2rem] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 group/btn"
                                                >
                                                    {isPending ? "Procesando..." : (isFull ? "Lista de Espera" : "Inscribirme")}
                                                    <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {!isLoggedIn && (
                            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex items-start gap-4">
                                <ShieldCheck className="w-5 h-5 text-red-500 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-red-600">Inicio de Sesión Requerido</p>
                                    <p className="text-[9px] font-medium text-red-900/40 uppercase italic leading-tight">Debes estar registrado para participar.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Left Column: Match History (If completed) or Participants */}
                <div className="lg:col-span-12 space-y-12">
                    <div className="bg-card border border-border/50 rounded-[2.5rem] shadow-2xl p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-2 bg-muted/70 rounded-full p-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('results')}
                                    className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'results' ? 'bg-foreground text-background shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Resultados
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('players')}
                                    className={`px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition ${activeTab === 'players' ? 'bg-foreground text-background shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Jugadores
                                </button>
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                                {activeTab === 'results'
                                    ? isCompleted
                                        ? `${matches.length} partidos` : 'Resultados disponibles cuando termine el evento'
                                    : `${participants.length} jugadores`}
                            </div>
                        </div>

                        <div className="mt-6">
                            {activeTab === 'results' ? (
                                <>
                                    <div className="mb-6">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Buscar por jugador</label>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Apellido o nombre"
                                            className="w-full rounded-2xl border border-border/40 bg-muted px-4 py-3 text-sm font-bold text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                        />
                                    </div>

                                    {normalizedQuery && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                            <div className="rounded-3xl border border-border/40 bg-muted p-4 text-center">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Jugados</p>
                                                <p className="text-2xl font-black text-foreground">{playerSearchStats.played}</p>
                                            </div>
                                            <div className="rounded-3xl border border-border/40 bg-muted p-4 text-center">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Ganados</p>
                                                <p className="text-2xl font-black text-foreground">{playerSearchStats.won}</p>
                                            </div>
                                            <div className="rounded-3xl border border-border/40 bg-muted p-4 text-center">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Perdidos</p>
                                                <p className="text-2xl font-black text-foreground">{playerSearchStats.lost}</p>
                                            </div>
                                            <div className="rounded-3xl border border-border/40 bg-muted p-4 text-center">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Empatados</p>
                                                <p className="text-2xl font-black text-foreground">{playerSearchStats.drawn}</p>
                                            </div>
                                        </div>
                                    )}

                                    {isCompleted ? (
                                        filteredMatches.length > 0 ? (
                                            <div className="space-y-4">
                                                {filteredMatches.map((match, i) => (
                                                    <div key={match.id} className="bg-card border border-border/40 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="bg-muted/30 px-6 py-2 border-b border-border/20 flex justify-between items-center">
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Cancha {match.courtId || (i + 1)}</span>
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-orange-500 italic">Oficial</span>
                                                        </div>
                                                        <div className="p-6 grid grid-cols-3 items-center gap-4 text-center">
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-black uppercase tracking-tighter truncate">{highlightQuery(getPlayerName(match.team1Player1Id), searchQuery)}</p>
                                                                <p className="text-[10px] font-black uppercase tracking-tighter truncate">{highlightQuery(getPlayerName(match.team1Player2Id), searchQuery)}</p>
                                                            </div>
                                                            <div className="bg-foreground text-background rounded-2xl py-3 px-4 flex flex-col items-center justify-center shadow-lg">
                                                                <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Score</span>
                                                                <span className="text-2xl font-black italic tracking-tighter font-mono">
                                                                    {match.score1 ?? 0} <span className="text-orange-500">:</span> {match.score2 ?? 0}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-black uppercase tracking-tighter truncate">{highlightQuery(getPlayerName(match.team2Player1Id), searchQuery)}</p>
                                                                <p className="text-[10px] font-black uppercase tracking-tighter truncate">{highlightQuery(getPlayerName(match.team2Player2Id), searchQuery)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-[2rem] border border-border/40 bg-muted/50 p-8 text-center text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                                No se encontraron partidos que coincidan con "{searchQuery}".
                                            </div>
                                        )
                                    ) : (
                                        <div className="rounded-[2rem] border border-border/40 bg-muted/50 p-8 text-center text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                            Los resultados se mostrarán cuando el evento finalice.
                                        </div>
                                    )}
                                </>
                            ) : (
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
                                                            {p.name.split(' ').map((n: any) => n[0]).join('')}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black uppercase italic tracking-tight text-foreground truncate">{p.name}</p>
                                                    <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                                        {isCompleted ? 'Finalizó Jornada' : 'Jugador Confirmado'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${p.side === 'drive' ? 'bg-blue-500/10 border-blue-500/20 text-blue-600' :
                                                    p.side === 'reves' ? 'bg-orange-500/10 border-orange-500/20 text-orange-600' :
                                                        'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                                                    }`}>
                                                    {p.side}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
    );
}
