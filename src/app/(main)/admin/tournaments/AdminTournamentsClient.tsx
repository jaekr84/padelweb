"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Trophy, Edit, LayoutDashboard, Calendar as CalendarIcon,
    Search, ChevronDown, MoreVertical, MapPin, Plus, Activity,
    Zap, Clock, CheckCircle, User, Users2, DollarSign, Settings, Trash2, Flag
} from "lucide-react";
import DeleteTournamentButton from "./DeleteTournamentButton";
import TournamentPublishButton from "@/components/TournamentPublishButton";
import { tournaments, clubs } from "@/db/schema";

type Tournament = typeof tournaments.$inferSelect;
type Club = typeof clubs.$inferSelect;

export interface TournamentWithClub {
    tournament: Tournament;
    club: Club | null;
}

interface Props {
    initialTournaments: TournamentWithClub[];
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return "N/A";
    if (typeof dateStr === 'string' && dateStr.includes("-") && dateStr.length === 10) {
        const [year, month, day] = dateStr.split("-").map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
    }
    return "N/A";
}

export default function AdminTournamentsClient({ initialTournaments }: Props) {
    const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
    const [monthFilter, setMonthFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        initialTournaments.forEach(({ tournament }) => {
            if (tournament.startDate) {
                const [year, month] = tournament.startDate.split("-");
                if (year && month) months.add(`${year}-${month}`);
            }
        });
        return Array.from(months).sort().reverse();
    }, [initialTournaments]);

    const formatMonth = (yearMonth: string) => {
        const [year, month] = yearMonth.split("-").map(Number);
        const date = new Date(year, month - 1, 1);
        const formatted = date.toLocaleDateString("es-ES", { month: "long" });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1) + " " + year;
    };

    const filteredTournaments = useMemo(() => {
        return initialTournaments.filter(({ tournament }) => {
            const isFinished = tournament.status === 'finalizado';
            if (statusFilter === "open" && isFinished) return false;
            if (statusFilter === "closed" && !isFinished) return false;
            if (monthFilter !== "all" && !tournament.startDate?.startsWith(monthFilter)) return false;
            if (searchQuery && !tournament.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [initialTournaments, statusFilter, monthFilter, searchQuery]);

    return (
        <div className="space-y-4">
            {/* Minimalist Admin Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/60 pb-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                        <Settings className="w-5 h-5 text-azul-primary" />
                        Gestión de Torneos
                    </h1>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1 text-balance">
                        Control centralizado de competiciones y fixtures.
                    </p>
                </div>
                <Link href="/tournaments/create">
                    <button className="flex items-center gap-2 bg-azul-primary hover:bg-azul-dark text-white font-black uppercase tracking-widest text-[8px] h-8 px-4 rounded-lg shadow-lg shadow-azul-primary/10 transition-all active:scale-95">
                        <Plus className="w-3 h-3" />
                        Crear Torneo
                    </button>
                </Link>
            </div>

            {/* Practical Filter Bar */}
            <div className="flex flex-col md:flex-row gap-3 items-center bg-card/30 backdrop-blur-sm p-1.5 rounded-xl border border-border/40">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Filtrar por nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-0"
                    />
                </div>

                <div className="flex bg-muted/50 p-1 rounded-lg">
                    {["all", "open", "closed"].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s as any)}
                            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${statusFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {s === "all" ? "Todos" : s === "open" ? "Abiertos" : "Cerrados"}
                        </button>
                    ))}
                </div>

                <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="bg-muted/50 border-none rounded-lg py-1.5 px-3 text-[9px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer outline-none"
                >
                    <option value="all">Cualquier Mes</option>
                    {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                </select>
            </div>

            {/* List View - Optimized for Admin - Responsive High Density */}
            <div className="bg-card/40 border border-border/50 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border/50 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                                <th className="px-4 py-2 w-[100px]">Estado</th>
                                <th className="px-4 py-2">Torneo / Club</th>
                                <th className="px-4 py-2 w-[180px]">Info Técnica</th>
                                <th className="px-4 py-2 w-[130px]">Inscripciones</th>
                                <th className="px-4 py-2 w-[180px] text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {filteredTournaments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground text-xs font-medium italic">
                                        No se encontraron torneos con los filtros aplicados.
                                    </td>
                                </tr>
                            ) : (
                                filteredTournaments.map(({ tournament, club }) => (
                                    <TournamentRow key={tournament.id} tournament={tournament} club={club} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function TournamentRow({ tournament, club }: { tournament: any; club: any }) {
    const isFinished = tournament.status === 'finalizado';
    const isLive = tournament.status === "en_curso" || tournament.status === "en_eliminatorias";
    const isDraft = tournament.status === "draft";

    const statusStyle = isLive
        ? "text-rojo bg-rojo/10 border-rojo/20"
        : isFinished
            ? "text-muted-foreground bg-muted/10 border-border"
            : isDraft
                ? "text-foreground bg-muted border-border"
                : "text-celeste bg-celeste/10 border-celeste/20";

    const statusLabel = isLive ? "En Vivo" : isFinished ? "Cerrado" : isDraft ? "Borrador" : "Abierto";

    let mod = tournament.modalidad as any;
    if (typeof mod === 'string') {
        try { mod = JSON.parse(mod); } catch (e) { mod = null; }
    }

    return (
        <tr className="hover:bg-muted/5 transition-colors group">
            <td className="px-4 py-1.5">
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider ${statusStyle}`}>
                    <span className={`w-1 h-1 rounded-full fill-current ${isLive ? "animate-pulse bg-rojo" : "bg-current opacity-60"}`} />
                    {statusLabel}
                </div>
            </td>
            <td className="px-4 py-1.5">
                <div className="flex flex-col">
                    <span className="text-xs font-black uppercase italic text-foreground leading-tight group-hover:text-azul-primary transition-colors truncate max-w-[250px]">
                        {tournament.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-1">
                            <span className="text-[7px] text-muted-foreground/60">Club:</span>
                            <span className="text-[9px] text-muted-foreground/80">{club?.name || "Acap"}</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground/40">•</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[7px] text-muted-foreground/60">Inicio:</span>
                            <span className="text-[9px] text-azul-primary/80">{formatDate(tournament.startDate)}</span>
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-1.5">
                <div className="flex flex-wrap gap-2">
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/60">Tipo</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/80">
                            {tournament.type === 'americano' ? 'Americano' : 'R. Robin'}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/60">Género</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/80">
                            {mod?.genero === 'mujer' ? 'Fem' : mod?.genero === 'hombre' ? 'Masc' : 'Mix'}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/60">Mod</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/80">
                            {mod?.participacion === 'individual' ? "Indiv" : "Parejas"}
                        </span>
                    </div>
                </div>
            </td>
            <td className="px-4 py-1.5">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/60">Club</span>
                        <span className="text-[9px] font-black text-foreground/80">{formatDate(tournament.openDateClub)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/60">Gral</span>
                        <span className="text-[9px] font-black text-foreground/80">{formatDate(tournament.openDateGeneral)}</span>
                    </div>
                </div>
            </td>
            <td className="px-4 py-1.5 text-right">
                <div className="flex items-center justify-end gap-1.5">
                    {!isFinished && (
                        <Link href={`/tournaments/${tournament.id}/manage`}>
                            <button className="h-8 flex items-center justify-center gap-1.5 px-3 bg-azul-primary hover:bg-azul-dark text-white border border-azul-primary/20 rounded-lg transition-all active:scale-95 group/btn shadow-sm">
                                <Activity className="w-3 h-3" />
                                <span className="text-[8px] font-black uppercase tracking-widest">Gestionar</span>
                            </button>
                        </Link>
                    )}
                    <Link href={`/tournaments/${tournament.id}/edit`}>
                        <button className="w-8 h-8 flex items-center justify-center bg-muted/40 hover:bg-celeste hover:text-white text-muted-foreground border border-border/50 rounded-lg transition-all active:scale-95 group/btn" title="Editar">
                            <Edit className="w-3.5 h-3.5" />
                        </button>
                    </Link>
                    {isFinished && (
                        <TournamentPublishButton 
                            tournamentId={tournament.id} 
                            tournamentName={tournament.name} 
                        />
                    )}
                    <div className={isFinished ? "hidden" : "block"}>
                        <DeleteTournamentButton
                            tournamentId={tournament.id}
                            tournamentName={tournament.name}
                            compact={true}
                            showLabel={false}
                        />
                    </div>
                </div>
            </td>
        </tr>
    );
}


