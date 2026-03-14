import { getSession } from "@/lib/auth-server";
import { eq, desc, notInArray, or, inArray } from "drizzle-orm";
import { db } from "@/db";
import { tournaments, registrations, users, clubs } from "@/db/schema";

import Link from "next/link";
import {
    Plus, Calendar, MapPin, Trophy, Activity,
    Zap, CheckCircle, Clock, LayoutGrid
} from "lucide-react";

export const dynamic = "force-dynamic";

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatDate(dateStr: string | null) {
    if (!dateStr) return "Por confirmar";
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function getDaysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tournamentDate = new Date(dateStr);
    // Adjust for timezone if string is YYYY-MM-DD to avoid offset issues
    if (dateStr.length === 10) {
        tournamentDate.setMinutes(tournamentDate.getMinutes() + tournamentDate.getTimezoneOffset());
    }
    tournamentDate.setHours(0, 0, 0, 0);
    const diffTime = tournamentDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default async function TournamentsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const sp = await searchParams;
    const currentFilter = typeof sp.filter === "string" ? sp.filter : "todos";

    let userId: string | null = null;
    let dbUser: any = null;
    let allTournaments: any[] = [];

    try {
        const session = await getSession() as { userId: string, role: string, email: string } | null;
        userId = session?.userId || null;

        // Fetch tournaments with joins manually
        const tournamentsRes = await db
            .select({
                tournament: tournaments,
                club: clubs,
            })
            .from(tournaments)
            .leftJoin(clubs, eq(tournaments.clubId, clubs.id))
            .orderBy(desc(tournaments.createdAt));
        
        // Map to the structure expected by the component
        allTournaments = tournamentsRes.map(r => ({
            ...r.tournament,
            club: r.club,
        }));

        if (userId) {
            [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }

    let filteredTournaments: any[] = [];
    let liveC = 0, openC = 0, finishedC = 0, totalActiveC = 0, totalC = 0;

    totalC = allTournaments.length;

    const live = allTournaments.filter(t => t.status === "en_curso" || t.status === "en_eliminatorias");
    liveC = live.length;

    const finished = allTournaments.filter(t => t.status === "finalizado");
    finishedC = finished.length;

    const published = allTournaments.filter(t => t.status === "published");
    const registrable = published.filter(t => {
        const days = getDaysUntil(t.startDate);
        return days !== null && days <= 7;
    });
    openC = registrable.length;

    const active = allTournaments.filter(t => t.status !== "finalizado" && t.status !== "draft");
    totalActiveC = active.length;

    if (currentFilter === "todos") {
        filteredTournaments = active;
    } else if (currentFilter === "abiertas") {
        filteredTournaments = registrable;
    } else if (currentFilter === "envivo") {
        filteredTournaments = live;
    } else if (currentFilter === "terminados") {
        filteredTournaments = finished;
    } else if (currentFilter === "mios" && userId) {
        try {
            const userRegs = await db.select({ tournamentId: registrations.tournamentId }).from(registrations).where(eq(registrations.userId, userId));
            const regIds = new Set(userRegs.map(r => r.tournamentId));
            filteredTournaments = allTournaments.filter(t => t.createdByUserId === userId || regIds.has(t.id));
        } catch (e) {
            console.error("Mios filter error:", e);
        }
    }

    const filters = [
        { key: "todos", label: "Activos", count: totalActiveC },
        { key: "abiertas", label: "Inscripción", count: openC },
        { key: "envivo", label: "En Vivo", count: liveC },
        { key: "terminados", label: "Finalizados", count: finishedC },
        // { key: "mios", label: "Mis Torneos", count: null },
    ];

    return (
        <>
            <div className="min-h-screen bg-background text-foreground pb-24 font-sans selection:bg-blue-500/30">

                {/* ── Ambient glow ── */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                    <div className="absolute top-[10%] right-[-15%] w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-1">
                                ACAP
                            </p>
                            <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground">
                                Torneos
                            </h1>
                        </div>
                    </div>

                    {/* ── Stats pills ── */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-card border border-border rounded-2xl p-3 flex flex-col items-center gap-1 shadow-sm">
                            <Trophy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xl font-black text-foreground">{totalC}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Total</span>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-3 flex flex-col items-center gap-1 shadow-sm">
                            <Zap className="w-4 h-4 text-red-500" />
                            <span className="text-xl font-black text-foreground">{liveC}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">En Vivo</span>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-3 flex flex-col items-center gap-1 shadow-sm">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className="text-xl font-black text-foreground">{openC}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Abiertos</span>
                        </div>
                    </div>

                    {/* ── Filter pills ── */}
                    <div className="flex gap-2 overflow-x-auto pb-1 mb-6 no-scrollbar">
                        {filters.map(f => {
                            const isActive = currentFilter === f.key;
                            return (
                                <Link key={f.key} href={`/tournaments?filter=${f.key}`} scroll={false} className="shrink-0">
                                    <button className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${isActive
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                                        : "bg-card border border-border text-muted-foreground hover:border-indigo-500/30 hover:text-foreground"
                                        }`}>
                                        {f.label}
                                        {f.count !== null && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${isActive ? "bg-white/20" : "bg-muted"}`}>
                                                {f.count}
                                            </span>
                                        )}
                                    </button>
                                </Link>
                            );
                        })}
                    </div>

                    {/* ── Tournament list ── */}
                    {filteredTournaments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-16 h-16 bg-card border border-border rounded-3xl flex items-center justify-center mb-5">
                                <Trophy className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                            <h3 className="text-lg font-black uppercase italic text-muted-foreground mb-2">Sin torneos</h3>
                            <p className="text-slate-600 text-sm max-w-[220px] leading-relaxed">
                                No encontramos torneos en esta categoría.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredTournaments.map((t) => (
                                <TournamentCard key={t.id} tournament={t} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`
            }} />
        </>
    );
}

// ─── Tournament Card ────────────────────────────────────────────────────────
function TournamentCard({ tournament }: { tournament: any }) {
    const isLive = tournament.status === "en_curso" || tournament.status === "en_eliminatorias";
    const daysUntil = getDaysUntil(tournament.startDate);
    const isWithin7Days = daysUntil !== null && daysUntil <= 7;
    const isOpen = tournament.status === "published" && isWithin7Days;
    const isPreregistration = tournament.status === "published" && !isWithin7Days;
    const isFinished = tournament.status === "finalizado";

    const statusConfig = isLive
        ? { label: "En Vivo", dot: true, bg: "bg-red-500/10 border-red-500/20 dark:bg-red-950 dark:border-red-900", pill: "bg-red-500", text: "text-red-600 dark:text-red-400" }
        : isOpen
            ? { label: "Abierto", dot: false, bg: "bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-950 dark:border-emerald-900", pill: "bg-emerald-600", text: "text-emerald-600 dark:text-emerald-400" }
            : isPreregistration
                ? { label: "Próximamente", dot: false, bg: "bg-blue-500/10 border-blue-500/20 dark:bg-blue-950 dark:border-blue-900", pill: "bg-blue-600", text: "text-blue-600 dark:text-blue-400" }
                : isFinished
                    ? { label: "Finalizado", dot: false, bg: "bg-muted border-border", pill: "bg-muted-foreground/20", text: "text-muted-foreground" }
                    : { label: "Borrador", dot: false, bg: "bg-muted border-border", pill: "bg-muted-foreground/10", text: "text-muted-foreground" };

    const href = isOpen
        ? `/tournaments/register?id=${tournament.id}`
        : `/tournaments/${tournament.id}`;

    return (
        <Link href={href} className="group block">
            <div className="bg-card border border-border rounded-3xl overflow-hidden transition-all duration-200 hover:border-indigo-500/30 active:scale-[0.99] shadow-sm">
                <div className="p-4 flex items-start gap-4">

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
                                <h3 className="text-sm font-black uppercase italic tracking-tight text-foreground leading-tight line-clamp-2 group-hover:text-indigo-500 transition-colors">
                                    {tournament.name}
                                </h3>
                                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
                                    CLUB ORGANIZADOR: {tournament.club?.name || tournament.createdBy?.clubs?.[0]?.name || "Club ACAP"}
                                </div>
                            </div>

                            {/* Status pill */}
                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full shrink-0 ${statusConfig.pill} shadow-sm shadow-black/10`}>
                                {statusConfig.dot && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                )}
                                <span className="text-[9px] font-black uppercase tracking-widest text-white">
                                    {statusConfig.label}
                                </span>
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-bold">
                                <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                                {formatDate(tournament.startDate)}
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-bold min-w-0">
                                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span className="truncate">{tournament.location || "Por definir"}</span>
                            </div>
                            {tournament.category && (
                                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-bold">
                                    <Activity className="w-3 h-3 text-purple-500 shrink-0" />
                                    {tournament.category}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CTA footer */}
                <div className={`px-4 py-3 border-t flex items-center justify-between transition-colors ${isLive ? "border-red-500/20 bg-red-500/5 dark:bg-red-500/10" :
                    isOpen ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10" :
                        isPreregistration ? "border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10" :
                            "border-border bg-muted/30"
                    }`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isLive ? "text-red-600 dark:text-red-400" : isOpen ? "text-emerald-600 dark:text-emerald-400" : isPreregistration ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                        }`}>
                        {isLive ? "Ver resultados en vivo" :
                            isOpen ? "Inscribirse ahora" :
                                isPreregistration ? `Inscripción abre en ${daysUntil! - 7} días` :
                                    isFinished ? "Torneo finalizado" : "Ver detalles"}
                    </span>
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all group-hover:translate-x-0.5 ${isLive ? "bg-red-500/10 dark:bg-red-500/20" : isOpen ? "bg-emerald-500/10 dark:bg-emerald-500/20" : "bg-muted"
                        }`}>
                        <Clock className={`w-3.5 h-3.5 ${isLive ? "text-red-600 dark:text-red-400" : isOpen ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                    </div>
                </div>
            </div>
        </Link>
    );
}