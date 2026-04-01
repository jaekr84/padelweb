"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Edit, LayoutDashboard, Calendar as CalendarIcon, Lock, Search, ChevronDown, MoreVertical, MapPin, Plus } from "lucide-react";
import DeleteTournamentButton from "./DeleteTournamentButton";
import FinalizeTournamentButton from "./FinalizeTournamentButton";
import { tournaments, clubs } from "@/db/schema";

type TournamentWithClub = {
    tournament: typeof tournaments.$inferSelect;
    club: typeof clubs.$inferSelect | null;
};

interface Props {
    initialTournaments: TournamentWithClub[];
}

export default function AdminTournamentsClient({ initialTournaments }: Props) {
    const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
    const [monthFilter, setMonthFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Extract unique months from tournaments
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        initialTournaments.forEach(({ tournament }) => {
            if (tournament.startDate) {
                const [year, month] = tournament.startDate.split("-");
                if (year && month) {
                    months.add(`${year}-${month}`);
                }
            }
        });
        return Array.from(months).sort().reverse();
    }, [initialTournaments]);

    const formatMonth = (yearMonth: string) => {
        const [year, month] = yearMonth.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1);
        // "es-ES" capitalizes the first letter nicely when used carefully, but let's manually ensure it looks clean
        const formatted = date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    };

    const filteredTournaments = useMemo(() => {
        return initialTournaments.filter(({ tournament }) => {
            const isFinished = tournament.status === 'finalizado';
            if (statusFilter === "open" && isFinished) return false;
            if (statusFilter === "closed" && !isFinished) return false;

            if (monthFilter !== "all") {
                if (!tournament.startDate?.startsWith(monthFilter)) return false;
            }

            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const name = tournament.name.toLowerCase();
                if (!name.includes(query)) return false;
            }

            return true;
        });
    }, [initialTournaments, statusFilter, monthFilter, searchQuery]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto relative font-sans selection:bg-emerald-500/30">
            {/* CSS KEYFRAMES */}
            <style>{`
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .text-gradient-animate {
                    background: linear-gradient(to right, #10b981, #3b82f6, #06b6d4, #10b981);
                    background-size: 300% 300%;
                    -webkit-background-clip: text;
                    color: transparent;
                    animation: gradient-x 6s ease infinite;
                }
                .glass-card {
                    background-color: color-mix(in srgb, var(--card) 90%, transparent);
                    backdrop-filter: blur(20px);
                    border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
                }
                .glass-card:hover {
                    border-color: rgba(16, 185, 129, 0.5);
                }
                .glow-button {
                    position: relative;
                }
                .glow-button::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: 2rem;
                    background: linear-gradient(45deg, #10b981, #3b82f6);
                    z-index: -1;
                    filter: blur(8px);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .glow-button:hover::before {
                    opacity: 1;
                }
            `}</style>

            {/* Ambient glow */}
            <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px]" />
                <div className="absolute top-[30%] right-[-15%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 w-full flex flex-col space-y-6 pt-2">
                {/* Header Animado */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4"
                >
                    <div className="flex flex-col">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500/80 mb-1">
                            A.C.A.P. Control Panel
                        </p>
                        <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-foreground mb-1">
                            Gestión de <span className="text-gradient-animate drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">Torneos</span>
                        </h1>
                    </div>
                    
                    <Link href="/tournaments/create">
                        <button className="glow-button flex items-center justify-center gap-2 bg-foreground hover:bg-foreground/90 text-background font-black uppercase tracking-widest text-[10px] py-3 px-6 rounded-2xl shadow-xl shadow-emerald-900/20 transition-all active:scale-95 border border-border">
                            <Plus className="w-4 h-4" />
                            Nuevo Torneo
                        </button>
                    </Link>
                </motion.div>

                {/* Barra de Filtros */}
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-[2rem] p-4 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between"
                >

                {/* Buscador */}
                <div className="relative w-full md:max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar torneo..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border border-input rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    />
                </div>

                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4 items-center">
                    {/* Filtro de Estado (Tabs) */}
                    <div className="flex bg-muted p-1 rounded-lg w-full sm:w-auto">
                        {[
                            { id: "all", label: "Todos" },
                            { id: "open", label: "Abiertos" },
                            { id: "closed", label: "Cerrados" }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setStatusFilter(tab.id as any)}
                                className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${statusFilter === tab.id
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Filtro de Mes */}
                    <div className="relative w-full sm:w-[200px]">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <select
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            className="w-full bg-transparent border border-input rounded-lg py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all appearance-none cursor-pointer"
                        >
                            <option value="all">Todos los meses</option>
                            {availableMonths.map(m => (
                                <option key={m} value={m}>{formatMonth(m)}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                </div>
                </motion.div>
            </div>

            {/* Grid de Torneos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10">
                {filteredTournaments.length === 0 ? (
                    <div className="col-span-full border border-dashed border-border p-20 rounded-[2rem] text-center flex flex-col items-center justify-center bg-muted/5">
                        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-6">
                            <Trophy className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                        <h3 className="text-xl font-black uppercase italic tracking-tight text-foreground mb-1">
                            {initialTournaments.length === 0 ? "Sin Torneos Activos" : "Sin Resultados"}
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 max-w-[200px] leading-relaxed">
                            {initialTournaments.length === 0
                                ? "Comenzá creando tu primer torneo oficial."
                                : "Intentá ajustar los filtros aplicados."}
                        </p>
                    </div>
                ) : (
                    filteredTournaments.map(({ tournament, club }) => {
                        const isFinished = tournament.status === 'finalizado';
                        const isLive = tournament.status === "en_curso" || tournament.status === "en_eliminatorias";
                        const isDraft = tournament.status === "draft";
                        
                        const statusConfig = isLive
                            ? { label: "En Vivo", dot: true, bg: "bg-red-500/10 border-red-500/20  ", pill: "bg-red-500", text: "text-red-600 " }
                            : !isFinished && !isDraft
                                ? { label: "Publicado", dot: false, bg: "bg-emerald-500/10 border-emerald-500/20  ", pill: "bg-emerald-600", text: "text-emerald-600 " }
                                : isDraft
                                    ? { label: "Borrador", dot: false, bg: "bg-muted border-border", pill: "bg-muted-foreground/20", text: "text-muted-foreground" }
                                    : { label: "Finalizado", dot: false, bg: "bg-muted border-border", pill: "bg-muted-foreground/20", text: "text-muted-foreground" };

                        return (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                key={tournament.id}
                                className="group block glass-card rounded-[2rem] overflow-hidden transition-all duration-300 shadow-sm flex flex-col relative"
                            >
                                {/* Highlight glow for post card */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                
                                <div className="p-4 sm:p-5 flex items-start gap-4 z-10">
                                    {/* Icon / Image */}
                                    <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 overflow-hidden ${statusConfig.bg}`}>
                                        {tournament.imageUrl ? (
                                            <img src={tournament.imageUrl} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <Trophy className={`w-6 h-6 ${statusConfig.text}`} />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <div className="flex flex-col">
                                                <h3 className="text-sm font-black uppercase italic tracking-tight text-foreground leading-tight line-clamp-2 transition-colors group-hover:text-indigo-500">
                                                    {tournament.name}
                                                </h3>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
                                                    CLUB ORGANIZADOR: {club?.name || "Club ACAP"}
                                                </div>
                                            </div>

                                            {/* Status pill */}
                                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${statusConfig.pill} shadow-sm shadow-black/10`}>
                                                    {statusConfig.dot && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                    )}
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-white">
                                                        {statusConfig.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Meta */}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-bold">
                                                <CalendarIcon className="w-3 h-3 text-blue-500 shrink-0" />
                                                <span className="opacity-60 font-black uppercase text-[8px] tracking-widest mr-0.5">Fecha:</span>
                                                {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "Por confirmar"}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-bold min-w-0">
                                                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                                <span className="opacity-60 font-black uppercase text-[8px] tracking-widest mr-0.5">Lugar:</span>
                                                <span className="truncate">{club?.name || "Por definir"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions footer */}
                                <div className="mt-auto px-4 py-3 border-t border-border bg-muted/30 grid grid-cols-[1fr_auto] items-center gap-3">
                                    {!isFinished ? (
                                        <>
                                            <Link href={`/tournaments/${tournament.id}/manage`} className="block w-full">
                                                <button className="w-full h-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all shadow-sm flex items-center justify-center gap-1.5">
                                                    <LayoutDashboard className="w-3.5 h-3.5" />
                                                    Gestionar
                                                </button>
                                            </Link>
                                            <div className="flex items-center gap-1">
                                                <Link href={`/tournaments/${tournament.id}/edit`}>
                                                    <button className="w-8 h-8 bg-card border border-border hover:bg-muted rounded-xl text-foreground flex items-center justify-center transition-colors">
                                                        <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                                                    </button>
                                                </Link>
                                                <div className="flex items-center">
                                                    <FinalizeTournamentButton
                                                        tournamentId={tournament.id}
                                                        tournamentName={tournament.name}
                                                        compact
                                                    />
                                                </div>
                                                <div className="flex items-center">
                                                    <DeleteTournamentButton
                                                        tournamentId={tournament.id}
                                                        tournamentName={tournament.name}
                                                        compact
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic flex items-center h-8">
                                                <Trophy className="w-3 h-3 mr-1.5" /> Evento Finalizado
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Link href={`/tournaments/${tournament.id}/edit`}>
                                                    <button className="w-8 h-8 bg-card border border-border hover:bg-muted rounded-xl text-foreground flex items-center justify-center transition-colors">
                                                        <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                                                    </button>
                                                </Link>
                                                <div className="flex items-center">
                                                    <DeleteTournamentButton
                                                        tournamentId={tournament.id}
                                                        tournamentName={tournament.name}
                                                        compact
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}