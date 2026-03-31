"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Trophy, Edit, LayoutDashboard, Calendar as CalendarIcon, Lock, Search, ChevronDown, MoreVertical, MapPin } from "lucide-react";
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
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Barra de Filtros */}
            <div className="bg-background border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">

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
            </div>

            {/* Grid de Torneos (6 columnas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
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

                        return (
                            <div
                                key={tournament.id}
                                className="group relative bg-card border border-border/60 rounded-[2.5rem] overflow-hidden flex flex-col transition-all duration-300 hover:border-indigo-500/30 hover:shadow-[0_20px_50px_-12px_rgba(79,70,229,0.12)] active:scale-[0.98] h-full"
                            >
                                {/* Media Section */}
                                <div className="aspect-[5/4] w-full bg-muted/30 relative overflow-hidden">
                                    {tournament.imageUrl ? (
                                        <img src={tournament.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={tournament.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/5 to-blue-500/5">
                                            <Trophy className="w-12 h-12 text-indigo-500/10 group-hover:scale-110 transition-transform duration-700" />
                                        </div>
                                    )}
                                    
                                    {/* Status Overlay */}
                                    <div className="absolute top-4 left-4">
                                        <div className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md border shadow-sm ${
                                            isFinished 
                                            ? 'bg-slate-900/40 text-slate-300 border-white/5' 
                                            : 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20'
                                        }`}>
                                            {!isFinished && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                            {isFinished ? 'Cerrado' : 'Abierto'}
                                        </div>
                                    </div>
                                </div>

                                {/* Content Section */}
                                <div className="p-6 flex flex-col flex-1 gap-5">
                                    <div className="space-y-4">
                                        <h3 className="text-base font-black uppercase italic tracking-tight text-foreground leading-[1.1] line-clamp-2 group-hover:text-indigo-500 transition-colors">
                                            {tournament.name}
                                        </h3>
                                        
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground">
                                                <CalendarIcon className="w-4 h-4 stroke-[2.5]" />
                                                <span className="text-[10px] font-black uppercase tracking-widest truncate">
                                                    {tournament.startDate || "TBD"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground">
                                                <MapPin className="w-4 h-4 stroke-[2.5]" />
                                                <span className="text-[10px] font-black uppercase tracking-widest truncate">
                                                    {club?.name || "Global"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Section */}
                                    <div className="mt-auto space-y-2">
                                        {!isFinished ? (
                                            <>
                                                <Link href={`/tournaments/${tournament.id}/manage`} className="block w-full">
                                                    <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.97] shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2">
                                                        <LayoutDashboard className="w-3.5 h-3.5" />
                                                        Gestionar
                                                    </button>
                                                </Link>
                                                <div className="flex items-center gap-2">
                                                    <Link href={`/tournaments/${tournament.id}/edit`} className="flex-1">
                                                        <button className="w-full py-3 bg-muted/40 hover:bg-muted/60 border border-border/40 rounded-xl text-foreground transition-all flex items-center justify-center group/edit">
                                                            <Edit className="w-4 h-4 opacity-40 group-hover/edit:opacity-100 transition-opacity" />
                                                        </button>
                                                    </Link>
                                                    <FinalizeTournamentButton
                                                        tournamentId={tournament.id}
                                                        tournamentName={tournament.name}
                                                        compact
                                                    />
                                                    <DeleteTournamentButton
                                                        tournamentId={tournament.id}
                                                        tournamentName={tournament.name}
                                                        compact
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                <div className="w-full py-3 bg-muted/20 rounded-xl text-muted-foreground/40 text-[9px] font-black uppercase tracking-widest text-center border border-border/40 italic">
                                                    Evento Finalizado
                                                </div>
                                                <DeleteTournamentButton
                                                    tournamentId={tournament.id}
                                                    tournamentName={tournament.name}
                                                    compact
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}