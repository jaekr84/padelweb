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
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Minimalist Admin Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                        <Settings className="w-6 h-6 text-emerald-600" />
                        Gestión de Torneos
                    </h1>
                    <p className="text-xs font-medium text-muted-foreground mt-1 text-balance">
                        Control centralizado de competiciones y fixtures.
                    </p>
                </div>
                <Link href="/tournaments/create">
                    <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/10 transition-all active:scale-95">
                        <Plus className="w-4 h-4" />
                        Crear Torneo
                    </button>
                </Link>
            </div>

            {/* Practical Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-card/30 backdrop-blur-sm p-2 rounded-2xl border border-border/40">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Filtrar por nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-0"
                    />
                </div>
                
                <div className="flex bg-muted/50 p-1 rounded-xl">
                    {["all", "open", "closed"].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s as any)}
                            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                statusFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {s === "all" ? "Todos" : s === "open" ? "Abiertos" : "Cerrados"}
                        </button>
                    ))}
                </div>

                <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="bg-muted/50 border-none rounded-xl py-2 px-4 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer outline-none"
                >
                    <option value="all">Cualquier Mes</option>
                    {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                </select>
            </div>

            {/* List View - Optimized for Admin - Responsive High Density */}
            <div className="bg-card/40 border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border/50 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                                <th className="px-6 py-4 w-[100px]">Estado</th>
                                <th className="px-4 py-4">Torneo / Club</th>
                                <th className="px-4 py-4 w-[200px]">Info Técnica</th>
                                <th className="px-4 py-4 w-[140px]">Inscripciones</th>
                                <th className="px-6 py-4 w-[180px] text-right">Acciones</th>
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
        ? "text-red-500 bg-red-500/10 border-red-500/20" 
        : isFinished 
            ? "text-muted-foreground bg-muted/10 border-border" 
            : isDraft 
                ? "text-amber-500 bg-amber-500/10 border-amber-500/20" 
                : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";

    const statusLabel = isLive ? "En Vivo" : isFinished ? "Cerrado" : isDraft ? "Borrador" : "Abierto";

    let mod = tournament.modalidad as any;
    if (typeof mod === 'string') {
        try { mod = JSON.parse(mod); } catch (e) { mod = null; }
    }

    return (
        <tr className="hover:bg-muted/10 transition-colors group">
            <td className="px-6 py-4">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${statusStyle}`}>
                    <span className={`w-1.5 h-1.5 rounded-full fill-current ${isLive ? "animate-pulse bg-red-500" : "bg-current opacity-60"}`} />
                    {statusLabel}
                </div>
            </td>
            <td className="px-4 py-4">
                <div className="flex flex-col">
                    <span className="text-[15px] font-black uppercase italic text-foreground leading-tight group-hover:text-emerald-600 transition-colors truncate">
                        {tournament.name}
                    </span>
                    <div className="flex items-center gap-2.5 mt-1.5 font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-muted-foreground/70">Club:</span>
                            <span className="text-[10px] text-muted-foreground/80">{club?.name || "Acap"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/60">•</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-muted-foreground/70">Inicio:</span>
                            <span className="text-[10px] text-emerald-600/80">{formatDate(tournament.startDate)}</span>
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4">
                <div className="flex flex-wrap gap-3">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Tipo</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted/60 text-[9px] font-black uppercase tracking-widest text-foreground/80">
                            {tournament.type === 'americano' ? 'Americano' : 'R. Robin'}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Género</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted/60 text-[9px] font-black uppercase tracking-widest text-foreground/80 capitalize">
                            {mod?.genero === 'mujer' ? 'Fem' : mod?.genero === 'hombre' ? 'Masc' : 'Mix'}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Mod</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted/60 text-[9px] font-black uppercase tracking-widest text-foreground/80">
                            {mod?.participacion === 'individual' ? "Indiv" : "Parejas"}
                        </span>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Club</span>
                        <span className="text-[11px] font-black text-foreground/80">{formatDate(tournament.openDateClub)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Gral</span>
                        <span className="text-[11px] font-black text-foreground/80">{formatDate(tournament.openDateGeneral)}</span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="grid grid-cols-2 gap-1.5 min-w-[170px] justify-end">
                    {!isFinished && (
                        <Link href={`/tournaments/${tournament.id}/manage`} className="col-span-2">
                            <button className="w-full h-10 flex items-center justify-center gap-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-700/20 rounded-xl transition-all active:scale-95 group/btn shadow-sm">
                                <Activity className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Iniciar Torneo</span>
                            </button>
                        </Link>
                    )}
                    <Link href={`/tournaments/${tournament.id}/edit`} className={isFinished ? "col-span-2" : "w-full"}>
                        <button className="w-full h-8 flex items-center justify-center gap-1 px-2 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-600/20 rounded-lg transition-all active:scale-95 group/btn">
                            <Edit className="w-3 h-3" />
                            <span className="text-[8px] font-black uppercase tracking-widest leading-none">Editar</span>
                        </button>
                    </Link>
                    <div className={isFinished ? "hidden" : "w-full"}>
                        <DeleteTournamentButton
                            tournamentId={tournament.id}
                            tournamentName={tournament.name}
                            compact={true}
                            showLabel={true}
                        />
                    </div>
                </div>
            </td>
        </tr>
    );
}
