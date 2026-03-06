import { auth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { tournaments, registrations } from "@/db/schema";
import FeedLayout from "@/app/feed/layout";
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

// ─── Page ──────────────────────────────────────────────────────────────────
export default async function TournamentsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const sp = await searchParams;
    const currentFilter = typeof sp.filter === "string" ? sp.filter : "todos";

    let userId: string | null = null;
    try {
        const authData = await auth();
        userId = authData.userId;
    } catch (e) { console.error(e); }

    let allTournaments: any[] = [];
    try {
        allTournaments = await db.query.tournaments.findMany({
            with: {
                club: true,
                createdBy: {
                    with: {
                        clubs: true
                    }
                }
            },
            orderBy: [desc(tournaments.createdAt)]
        });
    } catch (e) {
        // Fallback or basic query if relationship fails
        console.error(e);
        try {
            const raw = await db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
            // Map to mock the relations shape temporarily if needed
            allTournaments = raw.map(t => ({ ...t, club: null, createdBy: null }));
        } catch (err) { }
    }

    let filteredTournaments = allTournaments;
    if (currentFilter === "todos") {
        filteredTournaments = allTournaments.filter(t => t.status !== "finalizado" && t.status !== "draft");
    } else if (currentFilter === "abiertas") {
        filteredTournaments = allTournaments.filter(t => t.status === "published");
    } else if (currentFilter === "envivo") {
        filteredTournaments = allTournaments.filter(t => t.status === "en_curso" || t.status === "en_eliminatorias");
    } else if (currentFilter === "terminados") {
        filteredTournaments = allTournaments.filter(t => t.status === "finalizado");
    } else if (currentFilter === "mios" && userId) {
        let userRegs: any[] = [];
        try {
            userRegs = await db.select().from(registrations).where(eq(registrations.userId, userId));
        } catch (e) { console.error(e); }
        filteredTournaments = allTournaments.filter(t =>
            t.createdByUserId === userId || userRegs.some(r => r.tournamentId === t.id)
        );
    } else if (currentFilter === "mios" && !userId) {
        filteredTournaments = [];
    }

    // Stats summary
    const live = allTournaments.filter(t => t.status === "en_curso" || t.status === "en_eliminatorias").length;
    const open = allTournaments.filter(t => t.status === "published").length;
    const finished = allTournaments.filter(t => t.status === "finalizado").length;
    const totalActive = allTournaments.filter(t => t.status !== "finalizado" && t.status !== "draft").length;
    const total = allTournaments.length;

    const filters = [
        { key: "todos", label: "Activos", count: totalActive },
        { key: "abiertas", label: "Inscripción", count: open },
        { key: "envivo", label: "En Vivo", count: live },
        { key: "terminados", label: "Finalizados", count: finished },
        { key: "mios", label: "Mis Torneos", count: null },
    ];

    return (
        <FeedLayout>
            <div className="min-h-screen bg-[#090A0F] text-white pb-24 font-sans selection:bg-blue-500/30">

                {/* ── Ambient glow ── */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                    <div className="absolute top-[10%] right-[-15%] w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-1">
                                ACAP
                            </p>
                            <h1 className="text-3xl font-black uppercase italic tracking-tight text-white">
                                Torneos
                            </h1>
                        </div>

                        <Link href="/tournaments/create">
                            <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-2xl text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/30">
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Crear</span>
                            </button>
                        </Link>
                    </div>

                    {/* ── Stats pills ── */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center gap-1">
                            <Trophy className="w-4 h-4 text-blue-400" />
                            <span className="text-xl font-black text-white">{total}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center gap-1">
                            <Zap className="w-4 h-4 text-red-400" />
                            <span className="text-xl font-black text-white">{live}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">En Vivo</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span className="text-xl font-black text-white">{open}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Abiertos</span>
                        </div>
                    </div>

                    {/* ── Filter pills ── */}
                    <div className="flex gap-2 overflow-x-auto pb-1 mb-6 no-scrollbar">
                        {filters.map(f => {
                            const isActive = currentFilter === f.key;
                            return (
                                <Link key={f.key} href={`/tournaments?filter=${f.key}`} scroll={false} className="shrink-0">
                                    <button className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                                        }`}>
                                        {f.label}
                                        {f.count !== null && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${isActive ? "bg-white/20" : "bg-slate-800"}`}>
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
                            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mb-5">
                                <Trophy className="w-8 h-8 text-slate-600" />
                            </div>
                            <h3 className="text-lg font-black uppercase italic text-slate-400 mb-2">Sin torneos</h3>
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
        </FeedLayout>
    );
}

// ─── Tournament Card ────────────────────────────────────────────────────────
function TournamentCard({ tournament }: { tournament: any }) {
    const isLive = tournament.status === "en_curso" || tournament.status === "en_eliminatorias";
    const isOpen = tournament.status === "published";
    const isFinished = tournament.status === "finalizado";

    const statusConfig = isLive
        ? { label: "En Vivo", dot: true, bg: "bg-red-950 border-red-900", pill: "bg-red-500", text: "text-red-400" }
        : isOpen
            ? { label: "Abierto", dot: false, bg: "bg-emerald-950 border-emerald-900", pill: "bg-emerald-600", text: "text-emerald-400" }
            : isFinished
                ? { label: "Finalizado", dot: false, bg: "bg-slate-900 border-slate-800", pill: "bg-slate-700", text: "text-slate-500" }
                : { label: "Borrador", dot: false, bg: "bg-slate-900 border-slate-800", pill: "bg-slate-700", text: "text-slate-500" };

    const href = isOpen
        ? `/tournaments/register?id=${tournament.id}`
        : `/tournaments/${tournament.id}`;

    return (
        <Link href={href} className="group block">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden transition-all duration-200 hover:border-slate-700 active:scale-[0.99]">
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
                                <h3 className="text-sm font-black uppercase italic tracking-tight text-white leading-tight line-clamp-2 group-hover:text-blue-300 transition-colors">
                                    {tournament.name}
                                </h3>
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">
                                    CLUB ORGANIZADOR: {tournament.club?.name || tournament.createdBy?.clubs?.[0]?.name || "Club ACAP"}
                                </div>
                            </div>

                            {/* Status pill */}
                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full shrink-0 ${statusConfig.pill}`}>
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
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold">
                                <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                                {formatDate(tournament.startDate)}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold min-w-0">
                                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span className="truncate">{tournament.location || "Por definir"}</span>
                            </div>
                            {tournament.category && (
                                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold">
                                    <Activity className="w-3 h-3 text-purple-500 shrink-0" />
                                    {tournament.category}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CTA footer */}
                <div className={`px-4 py-3 border-t flex items-center justify-between ${isLive ? "border-red-900 bg-red-950/50" :
                    isOpen ? "border-emerald-900 bg-emerald-950/50" :
                        "border-slate-800 bg-slate-800/30"
                    }`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isLive ? "text-red-400" : isOpen ? "text-emerald-400" : "text-slate-500"
                        }`}>
                        {isLive ? "Ver resultados en vivo" :
                            isOpen ? "Inscribirse ahora" :
                                isFinished ? "Torneo finalizado" : "Ver detalles"}
                    </span>
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform group-hover:translate-x-0.5 ${isLive ? "bg-red-800" : isOpen ? "bg-emerald-800" : "bg-slate-700"
                        }`}>
                        <Clock className={`w-3.5 h-3.5 ${isLive ? "text-red-300" : isOpen ? "text-emerald-300" : "text-slate-400"}`} />
                    </div>
                </div>
            </div>
        </Link>
    );
}