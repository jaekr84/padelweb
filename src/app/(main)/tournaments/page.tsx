import { getSession } from "@/lib/auth-server";
import { eq, desc, notInArray, or, inArray } from "drizzle-orm";
import { db } from "@/db";
import { tournaments, registrations, users, clubs } from "@/db/schema";

import Link from "next/link";
import {
    Plus, Calendar, MapPin, Trophy, Activity,
    Zap, CheckCircle, Clock, LayoutGrid, User, Users2, DollarSign
} from "lucide-react";
import PublicTournamentCard from "./PublicTournamentCard";
import TournamentFiltersClient from "./TournamentFiltersClient";

export const dynamic = "force-dynamic";

// ─── Helpers ───────────────────────────────────────────────────────────────
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

function getDaysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tournamentDate = new Date(dateStr);
    // Adjust for timezone if string is YYYY-MM-DD to avoid offset issues
    if (typeof dateStr === 'string' && dateStr.length === 10) {
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
    const selectedCategory = typeof sp.category === "string" ? sp.category : "todas";
    const selectedLocation = typeof sp.location === "string" ? sp.location : "todas";
    const selectedClub = typeof sp.club === "string" ? sp.club : "todos";

    let userId: string | null = null;
    let dbUser: any = null;
    let allTournaments: any[] = [];
    let availableCategories: any[] = [];
    let availableLocations: string[] = [];
    let availableClubs: { id: string; name: string }[] = [];
    let session: any = null;

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
            .orderBy(desc(tournaments.createdAt));

        // Map to the structure expected by the component
        const userRegs = userId ? await db.select({ tournamentId: registrations.tournamentId }).from(registrations).where(eq(registrations.userId, userId)) : [];
        const registeredSet = new Set(userRegs.map(r => r.tournamentId));

        allTournaments = tournamentsRes.map(r => ({
            ...r.tournament,
            club: r.club,
            isRegistered: registeredSet.has(r.tournament.id),
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
        const today = new Date().toISOString().split("T")[0];
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

    const active = allTournaments.filter(t => t.status !== "finalizado" && t.status !== "draft");
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
        const isSuperAdmin = dbUser?.role === 'superadmin';
        if (isSuperAdmin) {
            baseFiltered = allTournaments;
        } else {
            const userRegs = await db.select({ tournamentId: registrations.tournamentId }).from(registrations).where(eq(registrations.userId, userId));
            const regIds = new Set(userRegs.map(r => r.tournamentId));
            baseFiltered = allTournaments.filter(t => t.createdByUserId === userId || regIds.has(t.id));
        }
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

    const statusFilters = [
        { key: "todos", label: "Activos", count: totalActiveC },
        { key: "abiertas", label: "Inscripción", count: openC },
        { key: "envivo", label: "En Vivo", count: liveC },
        { key: "clubes", label: "Clubes", count: allTournaments.filter(t => t.clubId !== null).length },
        { key: "terminados", label: "Finalizados", count: finishedC },
    ];

    return (
        <>
            <div className="min-h-screen bg-background text-foreground pb-24 font-sans selection:bg-blue-500/30">

                {/* ── Ambient glow ── */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                    <div className="absolute top-[10%] right-[-15%] w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[100px]" />
                </div>

                {/* Public Header */}
                {!userId && (
                    <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-white/5">
                        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                            <Link href="/" className="flex items-center gap-2 group">
                                <div className="w-8 h-8 rounded-full border border-emerald-500/30 overflow-hidden shrink-0 relative">
                                    <img src="/img/stickers 1.jpg" alt="Logo" className="w-full h-full object-cover" />
                                </div>
                                <span className="font-black italic tracking-tighter text-sm uppercase">A.C.A.P.</span>
                            </Link>
                            <div className="flex items-center gap-4">
                                <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Login</Link>
                                <Link href="/" className="px-4 py-2 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Volver</Link>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${!userId ? "pt-6" : "pt-6"}`}>

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

                        {(session?.role === 'club' || session?.role === 'superadmin') && (
                            <Link
                                href="/tournaments/create"
                                className="group bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-indigo-600/20 flex items-center gap-3 shrink-0"
                            >
                                <span className="hidden sm:inline">Crear Torneo</span>
                                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                    <Plus className="w-4 h-4" />
                                </div>
                            </Link>
                        )}
                    </div>

                    {/* ── Stats pills ── */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-card border border-border rounded-2xl p-3 flex flex-col items-center gap-1 shadow-sm">
                            <Trophy className="w-4 h-4 text-indigo-600 " />
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

                    {/* ── Filters ── */}
                    <TournamentFiltersClient
                        currentFilter={currentFilter}
                        selectedCategory={selectedCategory}
                        selectedLocation={selectedLocation}
                        selectedClub={selectedClub}
                        availableCategories={availableCategories}
                        availableLocations={availableLocations}
                        availableClubs={availableClubs}
                    />

                    {/* ── Tournament list grouped by month ── */}
                    {filteredTournaments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-16 h-16 bg-card border border-border rounded-3xl flex items-center justify-center mb-5">
                                <Trophy className="w-8 h-8 text-muted-foreground/60" />
                            </div>
                            <h3 className="text-lg font-black uppercase italic text-muted-foreground mb-2">Sin torneos</h3>
                            <p className="text-slate-600 text-sm max-w-[220px] leading-relaxed">
                                No encontramos torneos {selectedCategory !== "todas" ? `en la categoría ${selectedCategory}` : ""} con los filtros actuales.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {(() => {
                                // Group by month logic
                                const groups: { [key: string]: any[] } = {};
                                filteredTournaments.forEach(t => {
                                    const dateStr = t.startDate;
                                    let monthKey = "Próximamente / Fecha a definir";

                                    if (dateStr && typeof dateStr === 'string' && dateStr.includes("-") && dateStr.length === 10) {
                                        const [year, month, day] = dateStr.split("-").map(Number);
                                        const d = new Date(year, month - 1, day);
                                        monthKey = d.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                                    }

                                    if (!groups[monthKey]) groups[monthKey] = [];
                                    groups[monthKey].push(t);
                                });

                                // Sort months chronologically
                                const sortedMonthKeys = Object.keys(groups).sort((a, b) => {
                                    if (a.includes("definir")) return 1;
                                    if (b.includes("definir")) return -1;
                                    const dateA = new Date(groups[a][0].startDate);
                                    const dateB = new Date(groups[b][0].startDate);
                                    return dateA.getTime() - dateB.getTime();
                                });

                                return sortedMonthKeys.map(month => (
                                    <div key={month} className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="h-px flex-1 bg-border" />
                                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 whitespace-nowrap">
                                                {month}
                                            </h2>
                                            <div className="h-px flex-1 bg-border" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {groups[month].map((t) => (
                                                <PublicTournamentCard
                                                    key={t.id}
                                                    tournament={t}
                                                    userClubId={dbUser?.clubId}
                                                    userDbRole={session?.role}
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