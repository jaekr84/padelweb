"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Edit, LayoutDashboard, Calendar as CalendarIcon, Lock, Search, ChevronDown, MoreVertical, MapPin, Plus, Activity, Zap, Clock, CheckCircle, User, Users2, DollarSign } from "lucide-react";
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

function formatDate(dateStr: string | null) {
    if (!dateStr) return "Por confirmar";
    // Si ya viene formateada o no es el formato YYYY-MM-DD
    if (typeof dateStr === 'string' && dateStr.includes("-") && dateStr.length === 10) {
        const [year, month, day] = dateStr.split("-").map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
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
        const [year, month] = yearMonth.split("-").map(Number);
        const date = new Date(year, month - 1, 1);
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10 pb-10">
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
                    filteredTournaments.map(({ tournament, club }) => (
                        <TournamentCard
                            key={tournament.id}
                            tournament={tournament}
                            club={club}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function TournamentCard({ tournament, club }: {
    tournament: any;
    club: typeof clubs.$inferSelect | null;
}) {
    const [imageError, setImageError] = useState(false);
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

    // Safe parse modalidad and categories because MySQL JSON can come as string
    let mod = tournament.modalidad as any;
    if (typeof mod === 'string') {
        try { mod = JSON.parse(mod); } catch (e) { mod = null; }
    }

    // Improved check for imageUrl to handle cases like empty strings or "null" strings
    const hasImage = tournament.imageUrl &&
        tournament.imageUrl !== "" &&
        tournament.imageUrl !== "null" &&
        tournament.imageUrl !== "undefined";

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="group block glass-card rounded-[2.5rem] overflow-hidden transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col relative border border-border/50"
        >

            {/* Header / Image Area */}
            <div className="relative aspect-[16/9] w-full overflow-hidden">
                {hasImage && !imageError ? (
                    <img
                        src={tournament.imageUrl!}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        alt={tournament.name}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/20 via-blue-500/10 to-indigo-500/20 transition-all duration-500 group-hover:opacity-80`}>
                        <div className="relative">
                            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-150 animate-pulse" />
                            <Trophy className={`w-12 h-12 ${statusConfig.text} relative z-10 drop-shadow-lg`} />
                        </div>
                    </div>
                )}

                {/* Overlay Status Badge */}
                <div className="absolute top-4 left-4 z-20">
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${statusConfig.pill} backdrop-blur-md shadow-lg border border-white/20`}>
                        {statusConfig.dot && (
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white">
                            {statusConfig.label}
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-6 flex flex-col flex-1 relative z-10">
                {/* Highlight glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {/* Title Section */}
                <div className="mb-6">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80 mb-1.5">
                        {club?.name || "Club ACAP"}
                    </div>
                    <h3 className="text-xl font-black uppercase italic tracking-tight text-foreground leading-tight transition-colors group-hover:text-emerald-500">
                        {tournament.name}
                    </h3>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-8">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 opacity-40">
                            <CalendarIcon className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Fecha Inicio</span>
                        </div>
                        <div className="text-sm font-bold text-foreground/90 pl-4.5">
                            {formatDate(tournament.startDate)}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 opacity-40">
                            <LayoutDashboard className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Tipo</span>
                        </div>
                        <div className="text-sm font-bold text-foreground/90 pl-4.5">
                            {tournament.type === 'americano' ? 'Americano' : 'Round Robin'}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 opacity-40">
                            <Trophy className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Categorías</span>
                        </div>
                        <div className="text-sm font-bold text-foreground/90 truncate pl-4.5">
                            {(() => {
                                let cats = tournament.categories;
                                if (typeof cats === 'string') {
                                    try { cats = JSON.parse(cats); } catch (e) { cats = []; }
                                }
                                return (Array.isArray(cats) && cats.length > 0) ? (cats[0] === "libre" ? "Libre" : cats.join(", ")) : "N/A";
                            })()}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 opacity-40">
                            <Zap className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Género</span>
                        </div>
                        <div className="text-sm font-bold text-foreground/90 pl-4.5 capitalize">
                            {mod?.genero === 'hombre' ? 'Masculino' : mod?.genero === 'mujer' ? 'Femenino' : 'Mixto'}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 opacity-40">
                            {mod?.participacion === 'individual' ? <User className="w-3 h-3" /> : <Users2 className="w-3 h-3" />}
                            <span className="text-[9px] font-black uppercase tracking-widest">Modalidad</span>
                        </div>
                        <div className="text-sm font-bold text-foreground/90 pl-4.5">
                            {mod?.participacion === 'individual' ? "Individual" : "En Parejas"}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 opacity-40">
                            <DollarSign className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Inscripción</span>
                        </div>
                        <div className="text-sm font-bold text-foreground/90 pl-4.5">
                            {tournament.registrationFee ? `$${tournament.registrationFee.toLocaleString('es-ES')}` : "Gratis"}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 opacity-40">
                            <MapPin className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Ubicación</span>
                        </div>
                        <div className="text-sm font-bold text-foreground/90 pl-4.5 truncate">
                            {tournament.surface || club?.name || "Por definir"}
                        </div>
                    </div>
                </div>

                {/* Registration Opening (Stylized Box) */}
                {(tournament.openDateClub || tournament.openDateGeneral) && (
                    <div className="mt-auto bg-muted/30 rounded-2xl p-4 border border-border/40 mb-6">
                        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2 content-center text-center">Inscripciones</div>
                        <div className="flex justify-between items-center gap-2">
                            {tournament.openDateClub && (
                                <div className="flex flex-col items-center">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-blue-500/80 mb-0.5 whitespace-nowrap">Apertura Club</span>
                                    <span className="text-[11px] font-black text-foreground">{formatDate(tournament.openDateClub)}</span>
                                </div>
                            )}
                            {tournament.openDateClub && tournament.openDateGeneral && <div className="h-6 w-px bg-border/50" />}
                            {tournament.openDateGeneral && (
                                <div className="flex flex-col items-center">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-emerald-500/80 mb-0.5 whitespace-nowrap">Apertura General</span>
                                    <span className="text-[11px] font-black text-foreground">{formatDate(tournament.openDateGeneral)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions Section */}
                <div className="pt-4 border-t border-border/50 flex flex-col gap-3">
                    {!isFinished ? (
                        <>
                            <Link href={`/tournaments/${tournament.id}/manage`} className="block w-full">
                                <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">
                                    <LayoutDashboard className="w-4 h-4" />
                                    Gestionar Torneo
                                </button>
                            </Link>
                            <div className="grid grid-cols-3 gap-2">
                                <Link href={`/tournaments/${tournament.id}/edit`} className="block w-full">
                                    <button className="w-full h-11 bg-card border border-border hover:bg-muted rounded-2xl text-foreground flex items-center justify-center transition-all active:scale-90">
                                        <Edit className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                </Link>
                                <div className="w-full h-11">
                                    <FinalizeTournamentButton
                                        tournamentId={tournament.id}
                                        tournamentName={tournament.name}
                                        compact={false}
                                    />
                                </div>
                                <div className="w-full h-11">
                                    <DeleteTournamentButton
                                        tournamentId={tournament.id}
                                        tournamentName={tournament.name}
                                        compact={false}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 rounded-2xl border border-border/50">
                                <Trophy className="w-4 h-4 text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Finalizado</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Link href={`/tournaments/${tournament.id}/edit`}>
                                    <button className="w-11 h-11 bg-card border border-border hover:bg-muted rounded-2xl text-foreground flex items-center justify-center transition-colors">
                                        <Edit className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                </Link>
                                <DeleteTournamentButton
                                    tournamentId={tournament.id}
                                    tournamentName={tournament.name}
                                    compact={false}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
