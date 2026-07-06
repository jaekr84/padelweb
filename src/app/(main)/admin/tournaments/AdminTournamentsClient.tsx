"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Trophy, Edit, LayoutDashboard, Calendar as CalendarIcon,
    Search, ChevronDown, MoreVertical, MapPin, Plus, Activity,
    Zap, Clock, CheckCircle, User, Users2, DollarSign, Settings, Trash2, Flag, BarChart3
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
    const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("open");
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
        <div className="space-y-3">
            {/* Minimalist Admin Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/60 pb-2">
                <div>
                    <h1 className="text-lg md:text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                        <Settings className="w-4 h-4 text-azul-primary" />
                        Gestión de Torneos
                    </h1>
                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-0.5 text-balance">
                        Control centralizado de competiciones y fixtures.
                    </p>
                </div>
                <Link href="/tournaments/create">
                    <button className="flex items-center gap-2 bg-azul-primary hover:bg-azul-dark text-white font-black uppercase tracking-widest text-[7px] h-7 px-3 rounded-lg shadow-lg shadow-azul-primary/10 transition-all active:scale-95">
                        <Plus className="w-2.5 h-2.5" />
                        Crear Torneo
                    </button>
                </Link>
            </div>

            {/* Practical Filter Bar */}
            <div className="flex flex-col md:flex-row gap-2 items-center bg-card/30 backdrop-blur-sm p-1 rounded-xl border border-border/40">
                <div className="relative flex-1 group">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Filtrar por nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none py-1 pl-8 pr-3 text-[10px] focus:outline-none focus:ring-0 uppercase font-bold tracking-tight"
                    />
                </div>

                <div className="flex bg-muted/50 p-0.5 rounded-lg">
                    {["all", "open", "closed"].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s as any)}
                            className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${statusFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {s === "all" ? "Todos" : s === "open" ? "Abiertos" : "Cerrados"}
                        </button>
                    ))}
                </div>

                <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="bg-muted/50 border-none rounded-lg py-1 px-2 text-[8px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer outline-none"
                >
                    <option value="all">Cualquier Mes</option>
                    {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                </select>
            </div>

            {/* List View - 1 fila por torneo */}
            <div className="bg-card/40 border border-border/50 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border/50 text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground/70">
                                <th className="px-3 py-2">Torneo</th>
                                <th className="px-3 py-2 w-[130px]">Club</th>
                                <th className="px-3 py-2 w-[92px]">Tipo</th>
                                <th className="px-3 py-2 w-[66px]">Género</th>
                                <th className="px-3 py-2 w-[84px]">Modalidad</th>
                                <th className="px-3 py-2 w-[72px]">Inicio</th>
                                <th className="px-3 py-2 w-[236px] text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {filteredTournaments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center text-muted-foreground text-xs font-medium italic">
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
    );
}

function TournamentRow({ tournament, club }: { tournament: any; club: any }) {
    const isFinished = tournament.status === 'finalizado';

    let mod = tournament.modalidad as any;
    if (typeof mod === 'string') {
        try { mod = JSON.parse(mod); } catch (e) { mod = null; }
    }

    return (
        <tr className="hover:bg-muted/5 transition-colors group align-middle">
            <td className="px-3 py-2">
                <span className="text-[12px] font-black uppercase italic text-foreground leading-tight group-hover:text-azul-primary transition-colors truncate block max-w-[240px]">
                    {tournament.name}
                </span>
            </td>
            <td className="px-3 py-2">
                <span className="text-[11px] font-bold text-muted-foreground/90 truncate block">{club?.name || "Acap"}</span>
            </td>
            <td className="px-3 py-2">
                <span className="text-[11px] font-black uppercase tracking-tight text-foreground/80">
                    {tournament.type === 'americano' ? 'Americano' : 'R. Robin'}
                </span>
            </td>
            <td className="px-3 py-2">
                <span className="text-[11px] font-black uppercase tracking-tight text-foreground/80">
                    {mod?.genero === 'mujer' ? 'Fem' : mod?.genero === 'hombre' ? 'Masc' : 'Mix'}
                </span>
            </td>
            <td className="px-3 py-2">
                <span className="text-[11px] font-black uppercase tracking-tight text-foreground/80">
                    {mod?.participacion === 'individual' ? "Indiv" : "Parejas"}
                </span>
            </td>
            <td className="px-3 py-2">
                <span className="text-[11px] font-black text-azul-primary/90 tabular-nums">{formatDate(tournament.startDate)}</span>
            </td>
            <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                    {!isFinished && (
                        <Link href={`/tournaments/${tournament.id}/manage`}>
                            <button className="h-7 flex items-center justify-center gap-1 px-2.5 bg-azul-primary hover:bg-azul-dark text-white border border-azul-primary/20 rounded-lg transition-all active:scale-95 group/btn shadow-sm">
                                <Activity className="w-2.5 h-2.5" />
                                <span className="text-[7px] font-black uppercase tracking-widest">Gestionar</span>
                            </button>
                        </Link>
                    )}
                    <Link href={`/tournaments/${tournament.id}/edit`}>
                        <button className="w-7 h-7 flex items-center justify-center bg-muted/40 hover:bg-celeste hover:text-white text-muted-foreground border border-border/50 rounded-lg transition-all active:scale-95 group/btn" title="Editar">
                            <Edit className="w-3 h-3" />
                        </button>
                    </Link>
                    {isFinished && (
                        <>
                            <Link href={`/tournaments/${tournament.id}`}>
                                <button className="h-7 flex items-center justify-center gap-1 px-2.5 bg-azul-primary hover:bg-azul-dark text-white border border-azul-primary/20 rounded-lg transition-all active:scale-95 group/btn shadow-sm" title="Ver Resultados">
                                    <Trophy className="w-2.5 h-2.5" />
                                    <span className="text-[7px] font-black uppercase tracking-widest leading-none">Resultados</span>
                                </button>
                            </Link>
                            <Link href={`/tournaments/${tournament.id}/stats`} target="_blank" rel="noopener noreferrer">
                                <button className="h-7 flex items-center justify-center gap-1 px-2.5 bg-celeste/10 hover:bg-celeste text-celeste hover:text-white border border-celeste/20 rounded-lg transition-all active:scale-95 group/btn shadow-sm" title="Ver Estadísticas (nueva ventana)">
                                    <BarChart3 className="w-2.5 h-2.5" />
                                    <span className="text-[7px] font-black uppercase tracking-widest leading-none">Estadísticas</span>
                                </button>
                            </Link>
                            <TournamentPublishButton
                                tournamentId={tournament.id}
                                tournamentName={tournament.name}
                            />
                        </>
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


