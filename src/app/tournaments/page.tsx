import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tournaments, registrations } from "@/db/schema";
import { desc } from "drizzle-orm";
import FeedLayout from "@/app/feed/layout";
import Link from "next/link";

function formatDate(dateStr: string | null) {
    if (!dateStr) return "Fecha por confirmar";
    return dateStr;
}

function getSurfaceLabel(surface: string | null) {
    const map: Record<string, string> = {
        cesped: "Césped Verde", cesped_azul: "Césped Azul",
        cemento: "Hormigón", indoor: "Indoor",
    };
    return surface ? (map[surface] || surface) : "";
}

type TournamentStatus = "draft" | "published" | "en_curso" | "en_eliminatorias" | "finalizado" | string;

function getStatusLabel(status: TournamentStatus) {
    switch (status) {
        case "published": return "Inscripción Abierta";
        case "en_curso": return "🔴 En Juego – Fase de Grupos";
        case "en_eliminatorias": return "🔴 En Juego – Eliminatorias";
        case "finalizado": return "🏆 Finalizado";
        default: return status;
    }
}

export default async function TournamentsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const sp = await searchParams;
    const currentFilter = typeof sp.filter === "string" ? sp.filter : "todos";

    // Auth context for "Mis Torneos"
    let userId: string | null = null;
    try {
        const authData = await auth();
        userId = authData.userId;
    } catch (e) {
        console.error("Auth error:", e);
    }

    let allTournaments: any[] = [];
    try {
        allTournaments = await db
            .select()
            .from(tournaments)
            .orderBy(desc(tournaments.createdAt));
    } catch (e) {
        console.error("Error fetching tournaments:", e);
    }

    // Filter Logic
    let filteredTournaments = allTournaments;

    if (currentFilter === "abiertas") {
        filteredTournaments = allTournaments.filter(t => t.status === "published");
    } else if (currentFilter === "envivo") {
        filteredTournaments = allTournaments.filter(t => t.status === "en_curso" || t.status === "en_eliminatorias");
    } else if (currentFilter === "mios" && userId) {
        // Fetch user registrations to also show tournaments they're playing in
        let userRegs: any[] = [];
        try {
            userRegs = await db.select().from(registrations).where(eq(registrations.userId, userId));
        } catch (e) {
            console.error("Error fetching registrations:", e);
        }

        filteredTournaments = allTournaments.filter(t =>
            t.createdByUserId === userId || userRegs.some(r => r.tournamentId === t.id)
        );
    } else if (currentFilter === "mios" && !userId) {
        // If they chose 'Mis Torneos' but are logged out, show nothing (or redirect to signin)
        filteredTournaments = [];
    }

    return (
        <FeedLayout>
            <div className="w-full px-4 py-8 md:px-8 max-w-[1400px] mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Torneos</h1>

                    <Link href="/tournaments/create" className="shrink-0">
                        <button className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold py-3 px-6 rounded-full shadow-xl shadow-zinc-900/10 dark:shadow-white/10 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2">
                            <span className="text-xl leading-none font-medium">+</span>
                            Crear Torneo
                        </button>
                    </Link>
                </div>

                <div className="flex overflow-x-auto gap-3 mb-8 pb-3 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                    <Link href="/tournaments?filter=todos" scroll={false} className="shrink-0">
                        <button className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 border ${currentFilter === "todos"
                            ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/25 dark:bg-amber-400 dark:border-amber-400 dark:text-zinc-900 dark:shadow-amber-400/20"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}>Todos</button>
                    </Link>
                    <Link href="/tournaments?filter=abiertas" scroll={false} className="shrink-0">
                        <button className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 border ${currentFilter === "abiertas"
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}>Inscripciones Abiertas</button>
                    </Link>
                    <Link href="/tournaments?filter=envivo" scroll={false} className="shrink-0">
                        <button className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 border ${currentFilter === "envivo"
                            ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/25"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}>🔴 En Vivo</button>
                    </Link>
                    <Link href="/tournaments?filter=mios" scroll={false} className="shrink-0">
                        <button className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 border ${currentFilter === "mios"
                            ? "bg-zinc-800 border-zinc-800 text-white shadow-lg dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}>Mis Torneos</button>
                    </Link>
                </div>

                {filteredTournaments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl mt-8">
                        <div className="text-6xl mb-6 drop-shadow-sm">🏆</div>
                        <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white mb-3">No hay torneos por aquí</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto text-base">Al parecer no encontramos resultados para este filtro. Sé el primero en crear y publicar un torneo espectacular.</p>
                        <Link href="/tournaments/create">
                            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-full shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-1">
                                Crear tu primer Torneo
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredTournaments.map((t) => {
                            const cats = t.categories ?? [];
                            const isLive = t.status === "en_curso" || t.status === "en_eliminatorias";
                            const isFinished = t.status === "finalizado";
                            const isOpen = t.status === "published";
                            const isDraft = t.status === "draft";

                            return (
                                <div key={t.id} className="group relative flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] overflow-hidden hover:shadow-2xl hover:shadow-zinc-500/10 dark:hover:shadow-black/40 hover:-translate-y-1 transition-all duration-300">
                                    <div className="relative h-56 w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                        {t.imageUrl ? (
                                            <img
                                                src={t.imageUrl}
                                                alt={t.name}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                                                <span className="text-6xl drop-shadow-2xl transition-transform duration-500 group-hover:scale-110">🎾</span>
                                            </div>
                                        )}
                                        {/* Live badge overlay */}
                                        {isLive && (
                                            <div className="absolute top-4 right-4 bg-red-600/95 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider flex items-center gap-2 shadow-xl shadow-red-900/50">
                                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                EN VIVO
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 flex flex-col flex-grow">
                                        <div className="mb-5">
                                            <h3 className="text-xl font-black text-zinc-900 dark:text-white line-clamp-1 mb-1.5 group-hover:text-blue-600 dark:group-hover:text-amber-300 transition-colors">
                                                {t.name}
                                            </h3>
                                            {t.surface && (
                                                <p className="text-sm font-bold text-blue-600 dark:text-amber-400/90 flex items-center gap-1.5">
                                                    <span className="text-base">🏟️</span> {getSurfaceLabel(t.surface)}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-3.5 mb-8">
                                            <div className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                <span className="text-lg leading-none mt-0.5">📅</span>
                                                <span className="font-medium leading-tight">{formatDate(t.startDate)} {t.endDate && t.endDate !== t.startDate ? `→ ${formatDate(t.endDate)}` : ""}</span>
                                            </div>

                                            {cats.length > 0 && (
                                                <div className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                    <span className="text-lg leading-none mt-0.5">👥</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {cats.map((cat: string) => (
                                                            <span key={cat} className="font-semibold bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 text-xs">
                                                                {cat === "libre" ? "Libre" : cat}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {t.description && (
                                                <div className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                                    <span className="text-lg leading-none mt-0.5">📝</span>
                                                    <span className="line-clamp-2 leading-snug">{t.description}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto flex flex-col gap-4">
                                            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-5 mb-1">
                                                <span className="text-xs font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Estado</span>
                                                <span className={`text-[0.7rem] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${isOpen ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50" :
                                                    isLive ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800/50" :
                                                        isDraft ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50" :
                                                            "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                                                    }`}>
                                                    {getStatusLabel(t.status)}
                                                </span>
                                            </div>

                                            {isLive && (
                                                <Link href={`/tournaments/${t.id}/live`} className="w-full">
                                                    <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all hover:shadow-lg hover:shadow-red-600/25 active:scale-[0.98] flex justify-center items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" /> Ver Resultados en Vivo
                                                    </button>
                                                </Link>
                                            )}
                                            {isOpen && (
                                                <Link href={`/tournaments/register?id=${t.id}`} className="w-full">
                                                    <button className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-amber-400 dark:hover:bg-amber-500 dark:text-zinc-900 text-white font-bold py-3.5 px-4 rounded-xl transition-all hover:shadow-lg hover:shadow-blue-600/25 dark:hover:shadow-amber-400/20 active:scale-[0.98]">
                                                        Inscribirse Ahora
                                                    </button>
                                                </Link>
                                            )}
                                            {isFinished && (
                                                <Link href={`/tournaments/${t.id}/live`} className="w-full">
                                                    <button className="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold py-3.5 px-4 rounded-xl transition-all border border-zinc-300 dark:border-zinc-700 active:scale-[0.98]">
                                                        🏆 Ver Resultados Finales
                                                    </button>
                                                </Link>
                                            )}
                                            {isDraft && userId === t.createdByUserId && (
                                                <Link href={`/tournaments/${t.id}/management`} className="w-full">
                                                    <button className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-zinc-900/10 dark:shadow-white/10 active:scale-[0.98]">
                                                        ⚙️ Continuar Armado
                                                    </button>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </FeedLayout>
    );
}
