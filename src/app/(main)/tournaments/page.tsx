import { getSession } from "@/lib/auth-server";
import { eq, desc, notInArray, or, inArray, count } from "drizzle-orm";
import { db } from "@/db";
import { tournaments, registrations, users, clubs } from "@/db/schema";

import Link from "next/link";
import { Plus, Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import PublicTournamentCard from "./PublicTournamentCard";
import TournamentFiltersClient from "./TournamentFiltersClient";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const dynamic = "force-dynamic";

// ─── Helpers ───────────────────────────────────────────────────────────────
function getMonthLabel(monthStr: string): string {
    const [year, month] = monthStr.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleString("es-ES", { month: "long", year: "numeric" });
}

function shiftMonth(monthStr: string, delta: number): string {
    const [year, month] = monthStr.split("-").map(Number);
    const d = new Date(year, month - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthUrl(
    sp: Record<string, string | string[] | undefined>,
    month: string
): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
        if (typeof value === "string" && key !== "month") params.set(key, value);
    }
    params.set("month", month);
    return `/tournaments?${params.toString()}`;
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return "Por confirmar";
    if (typeof dateStr === 'string' && dateStr.includes("-") && dateStr.length === 10) {
        const [year, month, day] = dateStr.split("-").map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default async function TournamentsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const sp = await searchParams;
    const currentFilter = typeof sp.filter === "string" ? sp.filter : "todos";
    const selectedCategory = typeof sp.category === "string" ? sp.category : "todas";
    const selectedLocation = typeof sp.location === "string" ? sp.location : "todas";
    const selectedClub = typeof sp.club === "string" ? sp.club : "todos";

    // Default to current month in Argentina timezone
    const nowAR = new Date().toLocaleString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).split(",")[0];
    const currentYearMonth = nowAR.slice(0, 7); // "YYYY-MM"
    const selectedMonth = typeof sp.month === "string" ? sp.month : currentYearMonth;

    let userId: string | null = null;
    let dbUser: any = null;
    let allTournaments: any[] = [];
    let availableCategories: any[] = [];
    let availableLocations: string[] = [];
    let availableClubs: { id: string; name: string }[] = [];
    let session: any = null;
    let finalClubId: string | null = null;

    try {
        session = await getSession();
        userId = session?.userId || null;

        // Fetch categories for filtering
        const { categoriesTable } = require("@/db/schema");
        availableCategories = await db.select().from(categoriesTable).where(eq(categoriesTable.isActive, true)).orderBy(categoriesTable.categoryOrder);

        // Fetch tournaments with joins manually
        const tournamentsRes = await db
            .select({
                tournament: {
                    id: tournaments.id,
                    name: tournaments.name,
                    status: tournaments.status,
                    startDate: tournaments.startDate,
                    endDate: tournaments.endDate,
                    imageUrl: tournaments.imageUrl,
                    clubId: tournaments.clubId,
                    openDateClub: tournaments.openDateClub,
                    openDateGeneral: tournaments.openDateGeneral,
                    createdByUserId: tournaments.createdByUserId,
                    categories: tournaments.categories,
                    modalidad: tournaments.modalidad,
                    createdAt: tournaments.createdAt,
                    surface: tournaments.surface,
                    location: tournaments.location,
                    time: tournaments.time,
                    registrationFee: tournaments.registrationFee,
                    memberRegistrationFee: tournaments.memberRegistrationFee,
                    type: tournaments.type,
                    isMembersOnly: tournaments.isMembersOnly,
                },
                club: clubs,
            })
            .from(tournaments)
            .leftJoin(clubs, eq(tournaments.clubId, clubs.id))
            .orderBy(desc(tournaments.startDate));

        // Map to the structure expected by the component
        const userRegs = userId ? await db.select({ tournamentId: registrations.tournamentId }).from(registrations).where(eq(registrations.userId, userId)) : [];
        const registeredSet = new Set(userRegs.map(r => r.tournamentId));

        // Fetch registration counts for all tournaments to show "cupos" percentage
        const regCounts = await db
            .select({
                tournamentId: registrations.tournamentId,
                occupiedSlots: count(),
            })
            .from(registrations)
            .groupBy(registrations.tournamentId);

        const countsMap = new Map(regCounts.map(rc => [rc.tournamentId, rc.occupiedSlots]));

        allTournaments = tournamentsRes.map(r => ({
            ...r.tournament,
            club: r.club,
            isRegistered: registeredSet.has(r.tournament.id),
            occupiedSlots: countsMap.get(r.tournament.id) || 0,
        }));

        const locationMap = new Map<string, string>();
        allTournaments.forEach(t => {
            if (typeof t.location === 'string') {
                const normalized = t.location.trim();
                const key = normalized.toLowerCase();
                if (normalized && !locationMap.has(key)) {
                    locationMap.set(key, normalized);
                }
            }
        });

        availableLocations = Array.from(locationMap.values()).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

        // Extract available clubs
        const clubMap = new Map<string, string>();
        allTournaments.forEach(t => {
            if (t.club?.id && t.club?.name) {
                clubMap.set(t.club.id, t.club.name);
            }
        });
        availableClubs = Array.from(clubMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));

        if (userId) {
            [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
            
            const ownedClub = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, userId)).limit(1);
            finalClubId = dbUser?.clubId || ownedClub[0]?.id || null;
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
        const today = new Date().toLocaleString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).split(',')[0];
        const hasClub = dbUser?.clubId != null;

        if (hasClub && t.openDateClub) {
            return today >= t.openDateClub;
        }
        if (t.openDateGeneral) {
            return today >= t.openDateGeneral;
        }

        return false;
    });
    openC = registrable.length;

    const active = allTournaments.filter(t => t.status !== "draft");
    totalActiveC = active.length;

    // Apply Filter Pipeline
    // 1. Status Filter
    let baseFiltered = [];
    if (currentFilter === "todos") {
        baseFiltered = active;
    } else if (currentFilter === "abiertas") {
        baseFiltered = registrable;
    } else if (currentFilter === "envivo") {
        baseFiltered = live;
    } else if (currentFilter === "terminados") {
        baseFiltered = finished;
    } else if (currentFilter === "mios" && userId) {
        // Show only tournaments where user is registered or is the creator
        baseFiltered = allTournaments.filter(t => t.createdByUserId === userId || t.isRegistered);
    } else if (currentFilter === "mi_club" && finalClubId) {
        // Show only tournaments belonging to the user's club
        baseFiltered = allTournaments.filter(t => t.clubId === finalClubId);
    } else if (currentFilter === "clubes") {
        baseFiltered = allTournaments.filter(t => t.clubId !== null);
    } else {
        baseFiltered = active;
    }

    // 2. Category Filter
    if (selectedCategory && selectedCategory !== "todas") {
        filteredTournaments = baseFiltered.filter(t => {
            let cats: string[] = [];
            try {
                if (Array.isArray(t.categories)) {
                    cats = t.categories;
                } else if (typeof t.categories === 'string') {
                    cats = JSON.parse(t.categories);
                }
            } catch (e) { cats = []; }

            // Check if selectedCategory matches any category in the tournament (case insensitive and trimmed)
            return cats.some(c => c.trim().toLowerCase() === selectedCategory.trim().toLowerCase() || c.trim().toLowerCase() === "libre");
        });
    } else {
        filteredTournaments = baseFiltered;
    }

    // 3. Location Filter
    if (selectedLocation && selectedLocation !== "todas") {
        filteredTournaments = filteredTournaments.filter(t => {
            return typeof t.location === 'string' && t.location.trim().toLowerCase() === selectedLocation.trim().toLowerCase();
        });
    }

    // 4. Club Filter
    if (selectedClub && selectedClub !== "todos") {
        filteredTournaments = filteredTournaments.filter(t => t.clubId === selectedClub);
    }

    // 5. Month Filter (skip for "en vivo" and "mios" — those cross month boundaries)
    const skipMonthFilter = currentFilter === "envivo" || currentFilter === "mios";
    if (!skipMonthFilter && selectedMonth && selectedMonth !== "todos") {
        filteredTournaments = filteredTournaments.filter(t => {
            if (!t.startDate || typeof t.startDate !== "string") return false;
            return t.startDate.startsWith(selectedMonth);
        });
    }

    // Navigation helpers
    const prevMonthStr = shiftMonth(selectedMonth !== "todos" ? selectedMonth : currentYearMonth, -1);
    const nextMonthStr = shiftMonth(selectedMonth !== "todos" ? selectedMonth : currentYearMonth, 1);
    const prevMonthUrl = buildMonthUrl(sp, prevMonthStr);
    const nextMonthUrl = buildMonthUrl(sp, nextMonthStr);
    const currentMonthUrl = buildMonthUrl(sp, currentYearMonth);
    const allMonthsUrl = buildMonthUrl(sp, "todos");
    const isMonthView = selectedMonth !== "todos" && !skipMonthFilter;

    return (
        <>
            <div className="min-h-screen bg-grid-carbon text-foreground pb-24 font-sans selection:bg-volt/30">

                {/* Public Header (unauthenticated) */}
                {!userId && (
                    <div className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-xl border-b border-hairline">
                        <div className="w-full max-w-[1800px] mx-auto px-6 h-14 flex items-center justify-between">
                            <Link href="/" className="flex items-center gap-2 group">
                                <div className="w-7 h-7 rounded-full border border-hairline-strong overflow-hidden shrink-0">
                                    <img src="/img/stickers 1.jpg" alt="Logo" className="w-full h-full object-cover" />
                                </div>
                                <span className="heading-sport text-sm text-foreground">A.C.A.P.</span>
                            </Link>
                            <div className="flex items-center gap-3">
                                <ThemeToggle variant="icon" />
                                <Link href="/login" className="label-tech text-[9px] text-muted-foreground hover:text-foreground transition-colors">Login</Link>
                                <Link href="/" className="px-3.5 py-1.5 bg-azul-primary text-white rounded-lg label-tech text-[9px] hover:bg-azul-dark transition-all">Volver</Link>
                            </div>
                        </div>
                    </div>
                )}

                <div className="relative z-10 w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-5">

                    {/* ── HERO HEADER (Match Night) ── */}
                    <div className="relative mb-5 overflow-hidden clip-notch bg-background border border-hairline">
                        {/* Speed stripes */}
                        <div className="absolute inset-y-0 right-0 w-1/2 bg-stripes text-foreground opacity-[0.03] pointer-events-none" />
                        {/* Glow orbs */}
                        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-azul-primary/15 blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 -left-10 w-56 h-40 rounded-full bg-volt/5 blur-3xl pointer-events-none" />

                        <div className="relative px-5 pt-5 pb-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-[3px] h-5 bg-volt rounded-full" />
                                        <span className="label-tech text-[9px] text-volt-ink">A.C.A.P.</span>
                                        <span className="label-tech text-[9px] text-subtle">· Circuito Oficial</span>
                                    </div>
                                    <h1 className="heading-sport text-5xl md:text-6xl text-foreground">
                                        Torneos
                                    </h1>
                                </div>

                                {(session?.role === 'superadmin' || session?.role === 'admin' || session?.role === 'club') && (
                                    <Link
                                        href="/tournaments/create"
                                        className="shrink-0 flex items-center gap-1.5 clip-notch bg-rojo hover:bg-rojo-dark text-white px-4 py-2 label-tech text-[9px] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-rojo/30 h-9 mt-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Crear Torneo</span>
                                    </Link>
                                )}
                            </div>

                            {/* KPI strip */}
                            <div className="flex items-center gap-5 md:gap-8 mt-4 pt-4 border-t border-hairline">
                                <div>
                                    <p className="label-tech text-[7px] text-subtle leading-none mb-1.5">Total</p>
                                    <p className="text-scoreboard text-2xl text-foreground leading-none">{totalC}</p>
                                </div>
                                <div className="w-px h-8 bg-surface-raised shrink-0" />
                                <div>
                                    <p className="label-tech text-[7px] text-live/80 leading-none mb-1.5 flex items-center gap-1.5">
                                        {liveC > 0 && <span className="live-dot !w-1.5 !h-1.5" />}
                                        En Vivo
                                    </p>
                                    <p className={`text-scoreboard text-2xl leading-none ${liveC > 0 ? 'text-live' : 'text-subtle'}`}>{liveC}</p>
                                </div>
                                <div className="w-px h-8 bg-surface-raised shrink-0" />
                                <div>
                                    <p className="label-tech text-[7px] text-volt-ink/80 leading-none mb-1.5">Inscripción</p>
                                    <p className={`text-scoreboard text-2xl leading-none ${openC > 0 ? 'text-volt-ink' : 'text-subtle'}`}>{openC}</p>
                                </div>
                                <div className="w-px h-8 bg-surface-raised shrink-0" />
                                <div>
                                    <p className="label-tech text-[7px] text-subtle leading-none mb-1.5">Finalizados</p>
                                    <p className="text-scoreboard text-2xl text-subtle leading-none">{finishedC}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Filters ── */}
                    <TournamentFiltersClient
                        userId={userId}
                        userClubId={finalClubId}
                        currentFilter={currentFilter}
                        selectedCategory={selectedCategory}
                        selectedLocation={selectedLocation}
                        selectedClub={selectedClub}
                        availableCategories={availableCategories}
                        availableLocations={availableLocations}
                        availableClubs={availableClubs}
                    />

                    {/* ── Month Navigator ── */}
                    <div className="flex items-center justify-between mb-4">
                        {isMonthView ? (
                            <>
                                {/* Prev / current label / Next */}
                                <div className="flex items-center gap-1">
                                    <Link
                                        href={prevMonthUrl}
                                        className="w-8 h-8 rounded-lg border border-hairline bg-surface flex items-center justify-center text-muted-foreground hover:border-volt/50 hover:text-volt-ink hover:bg-volt/5 transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Link>
                                    <div className="px-3 h-8 rounded-lg border border-volt/30 bg-volt/10 flex items-center">
                                        <span className="label-tech text-[10px] text-volt-ink capitalize">
                                            {getMonthLabel(selectedMonth)}
                                        </span>
                                    </div>
                                    <Link
                                        href={nextMonthUrl}
                                        className="w-8 h-8 rounded-lg border border-hairline bg-surface flex items-center justify-center text-muted-foreground hover:border-volt/50 hover:text-volt-ink hover:bg-volt/5 transition-all"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>
                                {/* Ver todos link */}
                                <Link
                                    href={allMonthsUrl}
                                    className="label-tech text-[9px] text-subtle hover:text-volt-ink transition-colors"
                                >
                                    Ver todos
                                </Link>
                            </>
                        ) : (
                            /* "Todos" mode: show link to go back to current month */
                            <div className="flex items-center gap-3 w-full">
                                <div className="w-[3px] h-4 bg-volt/60 rounded-full shrink-0" />
                                <span className="label-tech text-[9px] text-subtle">
                                    Todos los torneos
                                </span>
                                <div className="h-px flex-1 bg-surface-raised" />
                                <Link
                                    href={currentMonthUrl}
                                    className="label-tech text-[9px] text-volt-ink hover:text-volt-dark transition-colors shrink-0"
                                >
                                    Mes actual
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* ── Tournament list ── */}
                    {filteredTournaments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-14 h-14 bg-card border border-hairline clip-notch flex items-center justify-center mb-4">
                                <Trophy className="w-6 h-6 text-subtle" />
                            </div>
                            <h3 className="heading-sport text-sm text-muted-foreground mb-1.5">Sin torneos</h3>
                            <p className="text-subtle text-xs max-w-[200px] leading-relaxed mb-4">
                                {isMonthView
                                    ? `No hay torneos en ${getMonthLabel(selectedMonth)}.`
                                    : `No hay torneos con estos filtros.`}
                            </p>
                            {isMonthView && (
                                <div className="flex items-center gap-2">
                                    <Link href={prevMonthUrl} className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-hairline bg-surface label-tech text-[9px] text-muted-foreground hover:border-volt/40 hover:text-volt-ink transition-all">
                                        <ChevronLeft className="w-3 h-3" /> Anterior
                                    </Link>
                                    <Link href={nextMonthUrl} className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-hairline bg-surface label-tech text-[9px] text-muted-foreground hover:border-volt/40 hover:text-volt-ink transition-all">
                                        Siguiente <ChevronRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            )}
                        </div>
                    ) : isMonthView ? (
                        /* ── Flat grid for specific month ── */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredTournaments.map((t) => (
                                <PublicTournamentCard
                                    key={t.id}
                                    tournament={t}
                                    userClubId={dbUser?.clubId}
                                    userDbRole={session?.role}
                                    userGender={dbUser?.gender}
                                    userCategory={dbUser?.category}
                                    currentUserId={session?.userId}
                                    isUserRegistered={t.isRegistered}
                                />
                            ))}
                        </div>
                    ) : (
                        /* ── Grouped by month for "todos" view ── */
                        <div className="space-y-8">
                            {(() => {
                                const groups: { [key: string]: any[] } = {};
                                filteredTournaments.forEach(t => {
                                    const dateStr = t.startDate;
                                    let monthKey = "Próximamente / Fecha a definir";
                                    if (dateStr && typeof dateStr === "string" && dateStr.includes("-") && dateStr.length === 10) {
                                        const [year, month, day] = dateStr.split("-").map(Number);
                                        const d = new Date(year, month - 1, day);
                                        monthKey = d.toLocaleString("es-ES", { month: "long", year: "numeric" });
                                    }
                                    if (!groups[monthKey]) groups[monthKey] = [];
                                    groups[monthKey].push(t);
                                });

                                const sortedMonthKeys = Object.keys(groups).sort((a, b) => {
                                    if (a.includes("definir")) return 1;
                                    if (b.includes("definir")) return -1;
                                    const dateA = new Date(groups[a][0].startDate);
                                    const dateB = new Date(groups[b][0].startDate);
                                    return dateB.getTime() - dateA.getTime(); // newest first
                                });

                                return sortedMonthKeys.map(month => (
                                    <div key={month} className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-[3px] h-4 bg-volt/60 rounded-full shrink-0" />
                                            <h2 className="label-tech text-[9px] text-subtle whitespace-nowrap capitalize">
                                                {month}
                                            </h2>
                                            <div className="h-px flex-1 bg-surface-raised" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {groups[month].map((t) => (
                                                <PublicTournamentCard
                                                    key={t.id}
                                                    tournament={t}
                                                    userClubId={dbUser?.clubId}
                                                    userDbRole={session?.role}
                                                    userGender={dbUser?.gender}
                                                    userCategory={dbUser?.category}
                                                    currentUserId={session?.userId}
                                                    isUserRegistered={t.isRegistered}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ));
                            })()}
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