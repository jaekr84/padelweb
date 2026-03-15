import { db } from "@/db";
import { tournaments, tournamentGroups, groupMatches, bracketMatches, registrations, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import TournamentManager from "../fixture/TournamentManager";
import { Trophy, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";


interface Props {
    params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function TournamentDisplayPage({ params }: Props) {
    const { id } = await params;

    const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, id))
        .limit(1);

    if (!tournament) notFound();
    
    // Check authorization for management
    const session = await getSession();
    const isSuperAdmin = session?.role === 'superadmin';
    const isOwner = tournament.createdByUserId === session?.userId;
    const canManage = isSuperAdmin || isOwner;

    if (tournament.status === "published" || tournament.status === "draft") {
        if (canManage) {
            redirect(`/tournaments/${id}/fixture`);
        }
        
        // For players, show registrants list
        const dbRegistrations = await db
            .select({
                id: registrations.id,
                userId: registrations.userId,
                partnerName: registrations.partnerName,
                category: registrations.category,
            })
            .from(registrations)
            .where(eq(registrations.tournamentId, id));

        const registrantIds = dbRegistrations.length > 0 ? dbRegistrations.map(r => r.userId) : [];
        const dbUsers = registrantIds.length > 0 
            ? await db.select().from(users).where(inArray(users.id, registrantIds))
            : [];

        const initialPlayers = dbRegistrations.map(reg => {
            const user = dbUsers.find(u => u.id === reg.userId);
            const namePart1 = user 
                ? ([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0])
                : "Jugador";
            const namePart2 = reg.partnerName || "Invitado";
            return {
                id: reg.id,
                name: `${namePart1} / ${namePart2}`,
                category: reg.category || "Libre",
            };
        });

        return (
            <div className="min-h-screen bg-background text-foreground pb-24 font-sans">
                <div className="max-w-3xl mx-auto px-4 pt-12">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-blue-600/10 border border-blue-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Trophy className="w-10 h-10 text-blue-500" />
                        </div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tight text-white mb-2">{tournament.name}</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Las llaves se generarán cuando cierren las inscripciones</p>
                    </div>

                    <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="px-8 py-6 border-b border-border bg-muted/30 flex items-center justify-between">
                            <h2 className="text-sm font-black uppercase tracking-widest text-white">Jugadores Inscriptos</h2>
                            <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                                {initialPlayers.length} Parejas
                            </span>
                        </div>
                        
                        {initialPlayers.length === 0 ? (
                            <div className="p-12 text-center">
                                <p className="text-slate-500 text-sm font-bold">Aún no hay parejas inscriptas.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {initialPlayers.map((p, i) => (
                                    <div key={p.id} className="px-8 py-5 flex items-center justify-between hover:bg-muted/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black text-slate-600 w-4">{i + 1}</span>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white uppercase tracking-tight">{p.name}</span>
                                                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-0.5">{p.category}</span>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-8 text-center">
                        <Link 
                            href="/tournaments" 
                            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Volver a Torneos
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Fetch existing setup
    const dbGroups = await db.select().from(tournamentGroups).where(eq(tournamentGroups.tournamentId, id));
    const dbMatches = await db.select().from(groupMatches).where(eq(groupMatches.tournamentId, id));
    const dbBracket = await db.select().from(bracketMatches).where(eq(bracketMatches.tournamentId, id));

    const initialGroups = dbGroups.map(g => ({
        id: g.id,
        name: g.name,
        players: (g.players as { id: string, name: string }[]) || [],
    }));

    // Mapping for match teams
    const allPlayers = initialGroups.flatMap(g => g.players);
    const getPlayerByName = (name: string) => allPlayers.find(p => p.name === name) || { id: name, name };

    const mappedMatches = dbMatches.map(m => ({
        id: m.id,
        groupId: m.groupId,
        team1: getPlayerByName(m.team1Name),
        team2: getPlayerByName(m.team2Name),
        score1: m.score1 ?? undefined,
        score2: m.score2 ?? undefined,
        played: m.confirmed,
        confirmed: m.confirmed,
    }));

    const mappedBracket = dbBracket.map(bm => ({
        id: bm.id,
        round: bm.round,
        slot: bm.slot,
        team1: bm.team1Name ? getPlayerByName(bm.team1Name) : null,
        team2: bm.team2Name ? getPlayerByName(bm.team2Name) : null,
        score1: bm.score1 ?? undefined,
        score2: bm.score2 ?? undefined,
        confirmed: bm.confirmed,
        winnerId: bm.winnerId ?? undefined,
    }));

    return (
        <TournamentManager
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            initialGroups={initialGroups}
            initialMatches={mappedMatches}
            initialBracket={mappedBracket}
            initialStatus={tournament.status}
            readOnly={!canManage}
        />
    );
}
