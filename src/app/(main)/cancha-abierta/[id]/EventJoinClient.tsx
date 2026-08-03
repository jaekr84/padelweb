"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Trophy, Users, CheckCircle2, XCircle, ArrowRight, ShieldCheck, Zap, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

export default function EventJoinClient({ event, club, participants, isLoggedIn, currentUserId, userRegistration, defaultSidePreference, matches = [] }: EventJoinClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const isFull = event.totalSlots && participants.length >= event.totalSlots;
    const isCompleted = event.status === "completed";
    const [activeTab, setActiveTab] = useState<"results" | "players">(isCompleted ? "results" : "players");
    const [searchQuery, setSearchQuery] = useState("");

    const handleJoin = async () => {
        if (!isLoggedIn) { toast.error("Debes iniciar sesión para inscribirte"); return; }
        startTransition(async () => {
            const res = await joinOpenCourtEventAction(event.id, defaultSidePreference);
            if (res.success) { toast.success("¡Inscripción exitosa!"); router.refresh(); }
            else toast.error(res.error || "Error al inscribirse");
        });
    };

    const handleLeave = async () => {
        if (!confirm("¿Cancelar inscripción?")) return;
        startTransition(async () => {
            const res = await leaveOpenCourtEventAction(event.id);
            if (res.success) { toast.success("Inscripción cancelada"); router.refresh(); }
            else toast.error(res.error || "Error al cancelar");
        });
    };

    const getPlayerName = (id: string) => {
        const p = participants.find(p => p.userId === id);
        return p ? p.name : "Invitado";
    };

    const getPlayerImage = (id: string): string | null => {
        const p = participants.find(p => p.userId === id);
        return p?.image ?? null;
    };

    const getPlayerSide = (id: string): string | null => {
        const p = participants.find(p => p.userId === id);
        return p?.side ?? null;
    };

    const q = searchQuery.trim().toLowerCase();

    const highlightQuery = (name: string) => {
        if (!q) return <>{name}</>;
        const parts = name.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
        return <>{parts.map((part, i) => part.toLowerCase() === q ? <span key={i} className="bg-celeste/20 text-celeste rounded px-0.5">{part}</span> : <span key={i}>{part}</span>)}</>;
    };

    const matchingIds = q ? new Set(participants.filter(p => p.name.toLowerCase().includes(q)).map(p => p.userId)) : new Set<string>();

    const filteredMatches = q
        ? matches.filter(m => [m.team1Player1Id, m.team1Player2Id, m.team2Player1Id, m.team2Player2Id].some(id => getPlayerName(id).toLowerCase().includes(q)))
        : matches;

    const stats = { played: 0, won: 0, lost: 0, drawn: 0 };
    if (q && matchingIds.size > 0) {
        matches.forEach(m => {
            const t1 = [m.team1Player1Id, m.team1Player2Id].some(id => matchingIds.has(id));
            const t2 = [m.team2Player1Id, m.team2Player2Id].some(id => matchingIds.has(id));
            if (!t1 && !t2) return;
            stats.played++;
            const s1 = Number(m.score1 ?? 0), s2 = Number(m.score2 ?? 0);
            if (s1 === s2) stats.drawn++;
            else if ((t1 && s1 > s2) || (t2 && s2 > s1)) stats.won++;
            else stats.lost++;
        });
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 bg-background text-foreground min-h-screen">

            {/* Enrollment / Status Panel */}
            <div className="relative bg-card border border-border/80 rounded-xl p-5 overflow-hidden shadow-md">
                {/* HUD corners */}
                <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-celeste pointer-events-none" />
                <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-celeste pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-celeste pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-celeste pointer-events-none" />

                <div className="space-y-1 mb-4">
                    <span className="text-[7px] font-black uppercase tracking-[0.3em] text-celeste">Estado de Inscripción</span>
                    <h3 className="text-sm font-black uppercase italic tracking-tight text-foreground">
                        {isCompleted ? "Evento Finalizado" : userRegistration ? "¡Estás Inscripto!" : isFull ? "Lista de Espera" : "Reserva tu Lugar"}
                    </h3>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                        {isCompleted ? "Gracias por participar en esta jornada" : userRegistration ? `Nos vemos el ${event.date}` : "Confirmá tu asistencia al evento"}
                    </p>
                </div>

                {isCompleted ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-celeste/8 border border-celeste/20 rounded-lg px-4 py-3">
                            <Trophy className="w-4 h-4 text-celeste shrink-0" />
                            <p className="text-[9px] font-bold text-celeste uppercase italic leading-relaxed">Este evento ya ha concluido. Podés consultar los resultados históricos.</p>
                        </div>
                        <Link href="/cancha-abierta" className="w-full bg-foreground text-background font-black uppercase tracking-widest text-[8px] py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                            Ver otros eventos <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                ) : userRegistration ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-celeste/8 border border-celeste/20 rounded-lg px-4 py-3">
                            <CheckCircle2 className="w-4 h-4 text-celeste shrink-0" />
                            <p className="text-[9px] font-bold text-celeste uppercase italic">Tu lugar está asegurado. Recordá llegar 15 minutos antes.</p>
                        </div>
                        <button onClick={handleLeave} disabled={isPending} className="w-full text-muted-foreground hover:text-rojo font-black uppercase tracking-widest text-[8px] transition-colors py-2.5 flex items-center justify-center gap-1.5 group/leave">
                            <XCircle className="w-3 h-3 opacity-0 group-hover/leave:opacity-100 transition-opacity" />
                            Cancelar Inscripción
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="bg-surface border border-hairline rounded-lg px-4 py-2.5 flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Preferencia de Lado</span>
                            <span className="text-[10px] font-black uppercase italic text-celeste">{defaultSidePreference}</span>
                        </div>
                        <button onClick={handleJoin} disabled={isPending || !!isFull}
                            className="w-full bg-celeste hover:bg-celeste-light disabled:opacity-50 text-carbon-950 font-black uppercase tracking-widest text-[9px] py-3.5 rounded-lg shadow-lg shadow-celeste/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group/btn">
                            {isPending ? "Procesando..." : isFull ? "Lista de Espera" : "Inscribirme"}
                            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                )}

                {!isLoggedIn && (
                    <div className="mt-3 flex items-start gap-2.5 bg-rojo/5 border border-rojo/20 rounded-lg px-3 py-2.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-rojo shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[8px] font-black uppercase text-rojo">Inicio de Sesión Requerido</p>
                            <p className="text-[7px] font-bold text-rojo/50 uppercase italic mt-0.5">Debes estar registrado para participar.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Data Panel: Tabs + Content */}
            <div className="relative bg-card border border-border/80 rounded-xl overflow-hidden shadow-md">
                <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-muted-foreground/30 pointer-events-none" />
                <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-muted-foreground/30 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-muted-foreground/30 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-muted-foreground/30 pointer-events-none" />

                {/* Tab Bar */}
                <div className="flex items-center border-b border-border/70 bg-surface px-1 pt-1">
                    {(["results", "players"] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`relative px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-colors ${activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-muted-foreground"}`}>
                            {tab === "results" ? "Resultados" : "Jugadores"}
                            {activeTab === tab && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-celeste rounded-full" />}
                        </button>
                    ))}
                    <div className="ml-auto pr-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground font-mono">
                        {activeTab === "results" ? `${matches.length} partidos` : `${participants.length} jugadores`}
                    </div>
                </div>

                <div className="p-4">
                    <AnimatePresence mode="wait">
                        {activeTab === "results" ? (
                            <motion.div key="results" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Buscar por jugador..."
                                        className="w-full rounded-lg border border-hairline bg-surface pl-8 pr-3 py-2 text-[9px] font-bold uppercase tracking-widest text-foreground focus:outline-none focus:ring-1 focus:ring-celeste/30 placeholder-muted-foreground/40 transition-all" />
                                </div>

                                {/* Player stats widget */}
                                {q && matchingIds.size > 0 && (
                                    <div className="grid grid-cols-4 gap-1.5 p-2 bg-celeste/5 border border-celeste/15 rounded-lg">
                                        {[
                                            { label: "Jugados", val: stats.played, color: "text-foreground" },
                                            { label: "Ganados", val: stats.won, color: "text-emerald-400" },
                                            { label: "Perdidos", val: stats.lost, color: "text-rojo" },
                                            { label: "Empates", val: stats.drawn, color: "text-orange-400" },
                                        ].map(s => (
                                            <div key={s.label} className="text-center py-1.5">
                                                <p className="text-[6px] font-black uppercase tracking-widest text-muted-foreground">{s.label}</p>
                                                <p className={`text-base font-black font-mono ${s.color}`}>{s.val}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Match cards */}
                                {!isCompleted ? (
                                    <div className="py-8 text-center border border-dashed border-hairline rounded-lg">
                                        <Trophy className="w-7 h-7 text-muted-foreground/15 mx-auto mb-2" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Los resultados aparecerán cuando finalice el evento.</p>
                                    </div>
                                ) : filteredMatches.length === 0 ? (
                                    <div className="py-8 text-center border border-dashed border-hairline rounded-lg">
                                        <Search className="w-7 h-7 text-muted-foreground/15 mx-auto mb-2" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Sin partidos que coincidan con «{searchQuery}».</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredMatches.map((match, i) => {
                                            const s1 = match.score1 ?? 0, s2 = match.score2 ?? 0;
                                            const t1wins = s1 > s2, t2wins = s2 > s1;
                                            return (
                                                <div key={match.id} className="bg-[#020617] border border-hairline rounded-xl overflow-hidden shadow-xl">
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-hairline bg-surface">
                                                        <span className="text-[6px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                                            <Zap className="w-2 h-2 text-orange-400" /> Partido {i + 1}
                                                        </span>
                                                        {match.finishedAt && (
                                                            <span className="text-[6px] font-mono text-muted-foreground">
                                                                {new Date(match.finishedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} HS
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Match body */}
                                                    <div className="flex items-center justify-between gap-2 px-3 py-3">
                                                        {/* Team 1 */}
                                                        <div className={`flex gap-2 transition-opacity ${t1wins ? "opacity-100" : "opacity-50"}`}>
                                                            <MatchPlayerCard
                                                                name={getPlayerName(match.team1Player1Id)}
                                                                image={getPlayerImage(match.team1Player1Id)}
                                                                side={getPlayerSide(match.team1Player1Id)}
                                                                isWinner={t1wins}
                                                                highlight={q ? getPlayerName(match.team1Player1Id).toLowerCase().includes(q) : false}
                                                            />
                                                            <MatchPlayerCard
                                                                name={getPlayerName(match.team1Player2Id)}
                                                                image={getPlayerImage(match.team1Player2Id)}
                                                                side={getPlayerSide(match.team1Player2Id)}
                                                                isWinner={t1wins}
                                                                highlight={q ? getPlayerName(match.team1Player2Id).toLowerCase().includes(q) : false}
                                                            />
                                                        </div>

                                                        {/* Score */}
                                                        <div className="flex flex-col items-center gap-1 shrink-0">
                                                            <div className="bg-background border border-slate-700/60 px-3 py-1.5 skew-x-[-8deg] flex items-center gap-2 shadow-inner">
                                                                <span className={`text-base font-black font-mono ${t1wins ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "text-muted-foreground"}`}>{s1}</span>
                                                                <span className="text-[8px] text-subtle font-black">:</span>
                                                                <span className={`text-base font-black font-mono ${t2wins ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "text-muted-foreground"}`}>{s2}</span>
                                                            </div>
                                                            <span className="text-[7px] font-black uppercase tracking-widest text-rojo italic">VS</span>
                                                        </div>

                                                        {/* Team 2 */}
                                                        <div className={`flex gap-2 transition-opacity ${t2wins ? "opacity-100" : "opacity-50"}`}>
                                                            <MatchPlayerCard
                                                                name={getPlayerName(match.team2Player1Id)}
                                                                image={getPlayerImage(match.team2Player1Id)}
                                                                side={getPlayerSide(match.team2Player1Id)}
                                                                isWinner={t2wins}
                                                                highlight={q ? getPlayerName(match.team2Player1Id).toLowerCase().includes(q) : false}
                                                            />
                                                            <MatchPlayerCard
                                                                name={getPlayerName(match.team2Player2Id)}
                                                                image={getPlayerImage(match.team2Player2Id)}
                                                                side={getPlayerSide(match.team2Player2Id)}
                                                                isWinner={t2wins}
                                                                highlight={q ? getPlayerName(match.team2Player2Id).toLowerCase().includes(q) : false}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div key="players" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                {participants.length === 0 ? (
                                    <div className="py-8 text-center border border-dashed border-hairline rounded-lg">
                                        <Users className="w-7 h-7 text-muted-foreground/15 mx-auto mb-2" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Todavía no hay jugadores inscriptos.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {participants.map((p, idx) => {
                                            const isMe = p.userId === currentUserId;
                                            const sideLabel = p.side === "reves" ? "REVÉS" : p.side === "drive" ? "DRIVE" : "AMBOS";
                                            const initials = p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                                            const nameParts = p.name.trim().split(" ");
                                            const firstName = nameParts[0] || p.name;
                                            const lastName = nameParts.slice(1).join(" ") || "";

                                            return (
                                                <motion.div
                                                    key={p.id}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.04 }}
                                                    className="relative group"
                                                >
                                                    {/* Outer gradient border */}
                                                    <div
                                                        className={`relative z-10 w-full p-[2px] transition-all duration-300 ${isMe
                                                                ? "bg-red-500"
                                                                : "bg-gradient-to-br from-celeste via-celeste to-celeste"
                                                            }`}
                                                        style={{ clipPath: "polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)" }}
                                                    >
                                                        <div
                                                            className="relative w-full overflow-hidden"
                                                            style={{
                                                                backgroundColor: "#030712",
                                                                clipPath: "polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)",
                                                                aspectRatio: "3/4"
                                                            }}
                                                        >
                                                            {/* Grid texture */}
                                                            <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')] invert pointer-events-none" />

                                                            {/* Top gradient overlay */}
                                                            <div className={`absolute top-0 inset-x-0 h-20 bg-gradient-to-b ${isMe ? "from-celeste/30" : "from-celeste/30"} to-transparent z-20 pointer-events-none`} />

                                                            {/* Branding */}
                                                            <div className="absolute top-3 left-3 z-40 flex flex-col leading-none">
                                                                <span className="text-[8px] font-black italic text-foreground tracking-tighter">
                                                                    PADEL<span className={isMe ? "text-celeste" : "text-celeste"}>WEB</span>
                                                                </span>
                                                                <span className="text-[5px] font-black text-foreground/30 tracking-[0.2em] uppercase">Series 2026</span>
                                                            </div>

                                                            {/* Side ribbon top-right */}
                                                            <div className="absolute top-2 right-2 z-40">
                                                                <div className={`px-1.5 py-0.5 transform skew-x-[-15deg] border ${isMe ? "bg-celeste border-celeste/50 shadow-[0_0_12px_rgba(14,165,233,0.7)]" : "bg-celeste border-celeste/30 shadow-[0_0_10px_rgba(30,64,175,0.4)]"}`}>
                                                                    <span className="text-[7px] font-black text-foreground uppercase tracking-widest inline-block transform skew-x-[15deg]">
                                                                        {sideLabel}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Avatar — full bleed */}
                                                            <div className="absolute inset-0 z-10">
                                                                {p.image ? (
                                                                    <Image src={p.image} alt={p.name} fill className="object-cover object-top" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-background/50">
                                                                        <span className={`text-4xl font-black italic ${isMe ? "text-celeste/40" : "text-celeste/25"}`}>{initials}</span>
                                                                    </div>
                                                                )}
                                                                <div className="absolute inset-0 bg-black/20 z-10" />
                                                            </div>

                                                            {/* Bottom info area */}
                                                            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-slate-950 via-slate-900 to-transparent pt-8 px-3 pb-3">
                                                                {/* Name plate */}
                                                                <div className="relative mb-1.5">
                                                                    <div className={`bg-background/90 py-1 transform -skew-x-12 shadow-xl border-r-4 ${isMe ? "border-volt" : "border-celeste"}`}>
                                                                        <p className="text-[9px] font-black uppercase italic tracking-tighter text-foreground text-center transform skew-x-12 truncate px-2">
                                                                            {firstName} <span className={isMe ? "text-celeste" : "text-celeste"}>{lastName}</span>
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Status */}
                                                                <div className="flex justify-center">
                                                                    <span className="text-[6px] font-black uppercase tracking-widest text-muted-foreground">
                                                                        {isCompleted ? "✓ Finalizó" : "● Confirmado"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// ─── Match Player Card ────────────────────────────────────────────────────────

function MatchPlayerCard({
    name,
    image,
    side,
    isWinner,
    highlight,
}: {
    name: string;
    image: string | null;
    side: string | null;
    isWinner: boolean;
    highlight: boolean;
}) {
    const cardStyle = { clipPath: "polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)" };
    const isGuest = name.toUpperCase().includes("INVITADO");
    const shortName = name.replace(/INVITADO/gi, "").trim() || "PLAYER";

    return (
        <div className="relative group/card transition-all duration-300 w-[68px] hover:scale-105 hover:z-10">
            <div
                className={`p-[1px] transition-all duration-500 ${isWinner ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" : highlight ? "bg-celeste shadow-[0_0_10px_rgba(30,64,175,0.4)]" : "bg-surface-raised"}`}
                style={cardStyle}
            >
                <div className="relative h-[100px] overflow-hidden bg-[#020617] flex flex-col" style={cardStyle}>
                    {/* Background image */}
                    <div className="absolute inset-0 z-0">
                        {image ? (
                            <img src={image} alt={name} className="w-full h-full object-cover transition-all duration-500 group-hover/card:scale-110" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center p-4 bg-[#0f172a]">
                                <img src="/img/acap%20logo%20svg%20blanco%20sombra.svg" alt="logo" className="w-full h-full object-contain opacity-20" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-[#020617]/20 group-hover/card:bg-transparent transition-colors duration-500" />
                    </div>

                    {/* Side badge */}
                    {side && side !== "ambos" && (
                        <div className="absolute top-1.5 right-1.5 z-10 opacity-50 group-hover/card:opacity-100 transition-opacity">
                            <span className={`text-[5px] font-black uppercase tracking-[0.2em] ${side === "drive" ? "text-celeste" : "text-rojo"}`}>
                                {side === "drive" ? "DRV" : "RVS"}
                            </span>
                        </div>
                    )}

                    {/* Guest badge */}
                    {isGuest && (
                        <div className="absolute top-1.5 left-1.5 z-20 px-1 py-0.5 bg-celeste border border-hairline-strong rounded-sm flex items-center gap-0.5">
                            <div className="w-1 h-1 rounded-full bg-white" />
                            <span className="text-[4px] font-black italic text-foreground uppercase tracking-[0.1em]">GUEST</span>
                        </div>
                    )}

                    {/* Winner glow ring */}
                    {isWinner && (
                        <div className="absolute inset-0 pointer-events-none ring-1 ring-emerald-500/60 z-20" style={cardStyle} />
                    )}

                    {/* Name plate */}
                    <div className="mt-auto p-1 z-10 bg-[#020617]">
                        <div className={`py-0.5 px-1.5 transform -skew-x-12 border-r-2 shadow-lg ${isWinner ? "bg-emerald-500 border-emerald-200" : "bg-background/90 border-celeste"}`}>
                            <div className="transform skew-x-12 text-center">
                                <span className={`block text-[7px] font-black uppercase italic leading-none truncate ${isWinner ? "text-carbon-950" : "text-foreground"}`}>
                                    {shortName}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
