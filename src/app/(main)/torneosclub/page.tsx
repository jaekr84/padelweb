import { getSession } from "@/lib/auth-server";
import { eq, desc, and, or, count } from "drizzle-orm";
import { db } from "@/db";
import { tournaments, users, clubs, registrations } from "@/db/schema";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    Plus, Trophy, LayoutGrid, Calendar, ChevronRight, MapPin, 
    Settings, Activity, Search, Shield
} from "lucide-react";
import PublicTournamentCard from "../tournaments/PublicTournamentCard";

export const dynamic = "force-dynamic";

export default async function ClubTournamentsPage() {
    const session = await getSession();
    if (!session?.userId) redirect("/login");

    const [dbUser] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (dbUser?.role !== "club" && dbUser?.role !== "superadmin") {
        redirect("/home");
    }

    // Filter by clubId
    // If club role, their own userId acts as the club identifier. 
    // If superadmin, we also allow them to see the context associated with their ID.
    let clubId = dbUser?.clubId;
    if (!clubId && (dbUser?.role === 'club' || dbUser?.role === 'superadmin')) {
        clubId = session.userId;
    }

    if (!clubId) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-10 text-center">
                <h2 className="text-xl font-bold">Sin club asociado</h2>
                <p className="text-muted-foreground mt-2">No tienes un club asociado a tu perfil para gestionar torneos.</p>
                <Link href="/home" className="mt-4 inline-block text-indigo-600 font-bold">Volver al inicio</Link>
            </div>
        );
    }

    const tournamentsRes = await db
        .select({
            tournament: tournaments,
            club: clubs,
        })
        .from(tournaments)
        .leftJoin(clubs, eq(tournaments.clubId, clubs.id))
        .where(eq(tournaments.clubId, clubId))
        .orderBy(desc(tournaments.createdAt));

    // Fetch registration counts for all tournaments to show "cupos" percentage
    const regCounts = await db
        .select({
            tournamentId: registrations.tournamentId,
            occupiedSlots: count(),
        })
        .from(registrations)
        .groupBy(registrations.tournamentId);

    const countsMap = new Map(regCounts.map(rc => [rc.tournamentId, rc.occupiedSlots]));

    const allMyTournaments = tournamentsRes.map(r => ({
        ...r.tournament,
        club: r.club,
        occupiedSlots: countsMap.get(r.tournament.id) || 0,
    }));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">
                                Gestión de Torneos
                            </h1>
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-indigo-500/60 flex items-center gap-2">
                                <Shield className="w-3 h-3" /> Panel del Club
                            </p>
                        </div>
                    </div>
                </div>

                <Link
                    href="/tournaments/create"
                    className="group bg-indigo-600 hover:bg-indigo-500 text-white pl-6 pr-4 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-indigo-600/20 flex items-center gap-4"
                >
                    Organizar Nuevo Torneo
                    <div className="w-8 h-8 rounded-xl bg-surface-raised flex items-center justify-center group-hover:bg-surface-raised transition-colors">
                        <Plus className="w-4 h-4" />
                    </div>
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Torneos", value: allMyTournaments.length, icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" },
                    { label: "En Curso", value: allMyTournaments.filter(t => t.status === 'en_curso').length, icon: Activity, color: "text-red-500", bg: "bg-red-500/10" },
                    { label: "Abiertos", value: allMyTournaments.filter(t => !t.isMembersOnly).length, icon: Search, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { label: "Exclusivos", value: allMyTournaments.filter(t => t.isMembersOnly).length, icon: Shield, color: "text-purple-500", bg: "bg-purple-500/10" },
                ].map((stat, i) => (
                    <div key={i} className="bg-card/50 border border-border/60 p-6 rounded-3xl backdrop-blur-sm flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{stat.label}</p>
                            <p className="text-3xl font-black italic tracking-tighter text-foreground">{stat.value}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* List */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground italic flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4" /> Mis Competencias
                    </h2>
                    <span className="text-[10px] font-bold text-muted-foreground/50">
                        {allMyTournaments.length} torneos encontrados
                    </span>
                </div>

                {allMyTournaments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {allMyTournaments.map((tournament) => (
                            <PublicTournamentCard 
                                key={tournament.id} 
                                tournament={tournament} 
                                userDbRole={dbUser.role}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-card/40 border-2 border-dashed border-border rounded-[3rem] p-20 flex flex-col items-center text-center space-y-6">
                        <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center">
                            <Trophy className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-2 max-w-sm">
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">No hay torneos aún</h3>
                            <p className="text-muted-foreground text-sm font-medium italic">
                                Tu club todavía no ha organizado ningún torneo. ¡Empezá hoy mismo y hacé crecer tu comunidad!
                            </p>
                        </div>
                        <Link
                            href="/tournaments/create"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20"
                        >
                            Crear mi primer torneo
                        </Link>
                    </div>
                )}
            </div>

        </div>
    );
}
