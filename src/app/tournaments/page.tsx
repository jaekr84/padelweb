import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { tournaments, registrations } from "@/db/schema";
import FeedLayout from "@/app/feed/layout";
import Link from "next/link";
import { Search, Plus, Calendar, MapPin, Activity, Trophy, ChevronRight, LayoutGrid } from "lucide-react";

// --- Helpers de Formato ---
function formatDate(dateStr: string | null) {
    if (!dateStr) return "Por confirmar";
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleDateString("es-ES", { month: "short" });
    return `${day} ${month.charAt(0).toUpperCase() + month.slice(1)}`;
}

export default async function TournamentsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
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
        allTournaments = await db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
    } catch (e) { console.error(e); }

    let filteredTournaments = allTournaments;
    if (currentFilter === "abiertas") {
        filteredTournaments = allTournaments.filter(t => t.status === "published");
    } else if (currentFilter === "envivo") {
        filteredTournaments = allTournaments.filter(t => t.status === "en_curso" || t.status === "en_eliminatorias");
    } else if (currentFilter === "mios" && userId) {
        let userRegs: any[] = [];
        try {
            userRegs = await db.select().from(registrations).where(eq(registrations.userId, userId));
        } catch (e) { console.error(e); }
        filteredTournaments = allTournaments.filter(t => t.createdByUserId === userId || userRegs.some(r => r.tournamentId === t.id));
    } else if (currentFilter === "mios" && !userId) {
        filteredTournaments = [];
    }

    return (
        <FeedLayout>
            {/* Fondo general con gradiente sutil */}
            <div className="min-h-screen bg-slate-50 dark:bg-[#090A0F] text-slate-900 dark:text-slate-100 pb-24 font-sans selection:bg-blue-500/30">

                {/* Decoración de fondo */}
                <div className="absolute top-0 left-0 right-0 h-[30vh] bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-transparent pointer-events-none -z-0" />
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none -z-0" />

                <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col pt-6 md:pt-12 md:px-6">

                    {/* Header Mobile First */}
                    <div className="px-5 flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                Torneos
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">Compite y mejora tu nivel</p>
                        </div>

                        <Link href="/tournaments/create">
                            <button className="flex items-center justify-center w-12 h-12 md:w-auto md:px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl md:rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-95">
                                <Plus className="w-6 h-6 md:w-5 md:h-5 md:mr-2" />
                                <span className="hidden md:inline font-bold">Crear Torneo</span>
                            </button>
                        </Link>
                    </div>

                    {/* Controles: Filtros Scrollables (iOS style) */}
                    <div className="px-5 mb-6 sticky top-0 z-20 py-2 bg-slate-50/90 dark:bg-[#090A0F]/90 border-b border-transparent dark:border-white/5 backdrop-blur-xl -mx-5 px-5 md:mx-0 md:px-0 md:bg-transparent md:border-none">
                        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1">
                            {['todos', 'abiertas', 'envivo', 'mios'].map((f) => {
                                let label = f.charAt(0).toUpperCase() + f.slice(1);
                                if (f === 'abiertas') label = 'Abiertas';
                                if (f === 'envivo') label = 'En Vivo';
                                if (f === 'mios') label = 'Mis Torneos';

                                const isActive = currentFilter === f;
                                return (
                                    <Link key={f} href={`/tournaments?filter=${f}`} scroll={false} className="shrink-0 block">
                                        <button className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 whitespace-nowrap outline-none ${isActive
                                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                                            : "bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            }`}>
                                            {label}
                                        </button>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>

                    {/* Grid de Torneos */}
                    <div className="px-5 md:px-0">
                        {filteredTournaments.length === 0 ? (
                            <div className="py-24 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-slate-800/20 rounded-[2rem] border border-slate-200/50 dark:border-white/5 backdrop-blur-md">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-5">
                                    <Trophy className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                                </div>
                                <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-200 mb-2">No hay torneos</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-[260px] text-[15px] leading-relaxed">No encontramos resultados para tu búsqueda actual.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filteredTournaments.map((t) => (
                                    <TournamentCard key={t.id} tournament={t} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Utilidad para esconder scrollbar en Firefox/Chrome */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </FeedLayout>
    );
}

// COMPONENTE DE TARJETA ESTILO APP NATIVA
function TournamentCard({ tournament }: { tournament: any }) {
    const isLive = tournament.status === "en_curso" || tournament.status === "en_eliminatorias";
    const isOpen = tournament.status === "published";
    const isFinished = tournament.status === "finalizado";

    return (
        <div className="bg-white dark:bg-[#13161F] rounded-[24px] overflow-hidden border border-slate-200/50 dark:border-slate-800/60 flex flex-col shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 sm:hover:-translate-y-1 group relative">

            {/* Imagen Header */}
            <div className="relative h-[160px] w-full shrink-0 bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
                {tournament.imageUrl ? (
                    <img src={tournament.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-purple-600/10" />
                        <LayoutGrid className="w-12 h-12 text-slate-300 dark:text-white/10" />
                    </div>
                )}

                {/* Badges Flotantes */}
                <div className="absolute top-4 left-4 flex gap-2">
                    {isLive ? (
                        <div className="bg-red-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Live
                        </div>
                    ) : isOpen ? (
                        <div className="bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                            Inscripciones Abiertas
                        </div>
                    ) : (
                        <div className="bg-slate-900/70 backdrop-blur-md text-white border border-white/10 text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                            {isFinished ? "Finalizado" : "Borrador"}
                        </div>
                    )}
                </div>
            </div>

            {/* Contenido / Info */}
            <div className="p-5 flex flex-col flex-1">
                <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white line-clamp-2 leading-tight mb-4">
                    {tournament.name}
                </h3>

                <div className="space-y-2.5 mb-6 mt-auto">
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[13px] font-medium">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        {formatDate(tournament.startDate)}
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[13px] font-medium">
                        <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="truncate">{tournament.location || "Padel Club"}</span>
                    </div>
                </div>

                {/* Call To Action */}
                <div className="mt-auto">
                    {isLive ? (
                        <Link href={`/tournaments/${tournament.id}/manage`} className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]">
                            Ver Resultados
                        </Link>
                    ) : isOpen ? (
                        <Link href={`/tournaments/register?id=${tournament.id}`} className="flex items-center justify-center w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]">
                            Inscribirse
                        </Link>
                    ) : (
                        <Link href={`/tournaments/${tournament.id}/manage`} className="flex items-center justify-center w-full bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-[0.98]">
                            Ver Torneo
                        </Link>
                    )}
                </div>
            </div>

            {/* Enlace que cubre toda la tarjeta si no interactúas con los botones */}
            <Link href={isLive ? `/tournaments/${tournament.id}/manage` : isOpen ? `/tournaments/register?id=${tournament.id}` : `/tournaments/${tournament.id}/manage`} className="absolute inset-0 z-0" aria-label={`Ir al torneo ${tournament.name}`} />
            <div className="relative z-10 pointer-events-none absolute inset-0" />
        </div>
    );
}