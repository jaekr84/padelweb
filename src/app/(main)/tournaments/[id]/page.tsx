import { db } from "@/db";
import { tournaments, tournamentGroups, groupMatches, bracketMatches, registrations, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { sortGroupsByName } from "@/lib/group-order";
import TournamentManager from "../fixture/TournamentManager";
import AmericanoManager from "../fixture/AmericanoManager";
import { Trophy, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import UnregisterButton from "./UnregisterButton";

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
    const isActivePlayer = session?.role === 'jugador';
    const canManage = (isSuperAdmin || isOwner) && !isActivePlayer;
    const isLoggedIn = !!session?.userId;

    const publicHeader = !isLoggedIn && (
        <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-hairline">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-full border border-azul-primary/30 overflow-hidden shrink-0 relative">
                        <Image src="/img/stickers 1.jpg" alt="Logo" fill className="object-cover" sizes="32px" />
                    </div>
                    <span className="font-black italic tracking-tighter text-sm uppercase">A.C.A.P.</span>
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Login</Link>
                    <Link href="/tournaments" className="px-4 py-2 bg-azul-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-azul-dark/20">Ver Más Torneos</Link>
                </div>
            </div>
        </div>
    );

    if (tournament.status === "published" || tournament.status === "draft") {
        if (canManage) {
            redirect(`/tournaments/${id}/fixture`);
        }
        
        // For players, show registrants list
        const dbRegistrations = await db
            .select({
                id: registrations.id,
                userId: registrations.userId,
                partnerUserId: registrations.partnerUserId,
                partnerName: registrations.partnerName,
                category: registrations.category,
            })
            .from(registrations)
            .where(eq(registrations.tournamentId, id));

        const allUserIds = [...new Set([
            ...dbRegistrations.map(r => r.userId),
            ...dbRegistrations.map(r => r.partnerUserId).filter(Boolean) as string[]
        ])];

        const dbUsers = allUserIds.length > 0 
            ? await db.select().from(users).where(inArray(users.id, allUserIds))
            : [];

        // Safely parse tournament modalidad
        let mod: any = tournament.modalidad;
        try {
            if (typeof tournament.modalidad === 'string' && tournament.modalidad.trim().startsWith('{')) {
                mod = JSON.parse(tournament.modalidad);
            }
        } catch (e) {
            console.error("Error parsing modalidad:", e);
        }

        const isIndividual = mod?.participacion === "individual";

        const initialPlayers = dbRegistrations.map(reg => {
            const user = dbUsers.find(u => u.id === reg.userId);
            const namePart1 = user 
                ? ([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0])
                : "Jugador";
            
            if (isIndividual) {
                return {
                    id: reg.id,
                    name: namePart1,
                    category: reg.category || "Libre",
                };
            }

            // For doubles, resolve partner name from DB lookup or reg field
            let namePart2 = reg.partnerName;
            if (reg.partnerUserId) {
                const partnerUser = dbUsers.find(u => u.id === reg.partnerUserId);
                if (partnerUser) {
                    namePart2 = [partnerUser.firstName, partnerUser.lastName].filter(Boolean).join(" ");
                }
            }

            if (!namePart2) namePart2 = "Invitado";

            return {
                id: reg.id,
                name: `${namePart1} / ${namePart2}`,
                category: reg.category || "Libre",
            };
        });

        const isUserRegistered = dbRegistrations.some(r => r.userId === session?.userId || r.partnerUserId === session?.userId);

        return (
            <>
                {publicHeader}
                <div className="min-h-screen bg-background text-foreground pb-24 font-sans">
                    <div className="max-w-3xl mx-auto px-4 pt-12">
                        <div className="text-center mb-10">
                            <div className="w-20 h-20 bg-azul-primary/10 border border-azul-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Trophy className="w-10 h-10 text-azul-primary" />
                            </div>
                            <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground mb-2">{tournament.name}</h1>
                            <p className="text-foreground/70 font-bold uppercase tracking-widest text-[10px]">Las llaves se generarán cuando cierren las inscripciones</p>
                        </div>

                        <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <div className="px-8 py-6 border-b border-border bg-muted/30 flex items-center justify-between">
                                <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Jugadores Inscriptos</h2>
                                <div className="flex items-center gap-3">
                                    {tournament.registrationFee !== null && (
                                        <span className="px-3 py-1 bg-azul-primary/10 border border-azul-primary/20 text-azul-primary text-[10px] font-black rounded-full uppercase tracking-widest">
                                            $ {tournament.registrationFee.toLocaleString('es-ES')}
                                        </span>
                                    )}
                                    <span className="px-3 py-1 bg-azul-primary text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-md shadow-azul-dark/20">
                                        {initialPlayers.length}{mod?.maxSlots && mod.maxSlots > 0 ? ` / ${mod.maxSlots}` : ""} {isIndividual ? "Jugadores" : "Parejas"}
                                    </span>
                                </div>
                            </div>
                            
                            {initialPlayers.length === 0 ? (
                                <div className="p-12 text-center">
                                    <p className="text-muted-foreground text-sm font-bold">Aún no hay {isIndividual ? "jugadores inscriptos" : "parejas inscriptas"}.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {initialPlayers.map((p, i) => (
                                        <div key={p.id} className="px-6 py-2.5 flex items-center justify-between hover:bg-muted/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <span className="text-[9px] font-black text-muted-foreground w-4">{i + 1}</span>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-foreground uppercase tracking-tight">{p.name}</span>
                                                    <span className="text-[8px] font-black text-azul-primary uppercase tracking-widest mt-0.5">{p.category}</span>
                                                </div>
                                            </div>
                                            <div className="w-7 h-7 rounded-full bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center">
                                                <CheckCircle className="w-3.5 h-3.5 text-azul-primary" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {!isUserRegistered && isLoggedIn && (
                            <Link 
                                href={`/tournaments/register?id=${id}`}
                                className="w-full mt-8 py-6 bg-azul-primary text-white rounded-[2.5rem] font-black uppercase italic tracking-widest shadow-[0_20px_50px_rgba(0,119,255,0.3)] hover:bg-azul-dark hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 border border-azul-primary/20"
                            >
                                Inscribirme Ahora
                                <CheckCircle className="w-6 h-6" />
                            </Link>
                        )}

                        {!isLoggedIn && (
                            <Link 
                                href="/login"
                                className="w-full mt-8 py-6 bg-azul-primary/5 text-azul-primary border-2 border-dashed border-azul-primary/20 rounded-[2.5rem] font-black uppercase italic tracking-widest hover:bg-azul-primary/10 transition-all flex items-center justify-center gap-3"
                            >
                                Inicia Sesión para Inscribirte
                            </Link>
                        )}

                        {isUserRegistered && (
                            <div className="mt-8">
                                <div className="p-6 bg-azul-primary/5 border border-azul-primary/10 rounded-[2rem] text-center mb-6">
                                    <p className="text-azul-primary font-bold text-sm">Ya estás inscripto en este torneo.</p>
                                </div>
                                <UnregisterButton 
                                    tournamentId={id} 
                                    tournamentName={tournament.name} 
                                />
                            </div>
                        )}

                        <div className="mt-8 text-center">
                            <Link 
                                href="/tournaments" 
                                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Volver a Torneos
                            </Link>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Fetch existing setup
    const dbGroups = await db.select().from(tournamentGroups).where(eq(tournamentGroups.tournamentId, id));
    const dbMatches = await db.select().from(groupMatches).where(eq(groupMatches.tournamentId, id));
    const dbBracket = await db.select().from(bracketMatches).where(eq(bracketMatches.tournamentId, id));

    const initialGroups = sortGroupsByName(dbGroups.map(g => {
        let players = [];
        if (typeof g.players === 'string') {
            try {
                players = JSON.parse(g.players);
            } catch {
                players = [];
            }
        } else if (Array.isArray(g.players)) {
            players = g.players;
        }
        return {
            id: g.id,
            name: g.name,
            players: (players as { id: string, name: string }[]) || [],
            courtNumber: g.courtNumber ?? null,
        };
    }));

    // Mapping for match teams
    const allPlayers = initialGroups.flatMap(g => g.players);
    const getPlayerByIdOrName = (id: string | null, name: string) => {
        const isUUID = (str: string) => str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        if (id) {
            const found = allPlayers.find(p => p.id === id);
            if (found) return found;
        }

        // Handle case where name might be a UUID from previous bug
        if (isUUID(name)) {
            const foundByIdAsName = allPlayers.find(p => p.id === name);
            if (foundByIdAsName) return foundByIdAsName;
        }

        return allPlayers.find(p => p.name === name) || { id: id || name, name: isUUID(name) ? "Jugador" : name };
    };

    const mappedMatches = dbMatches.map(m => ({
        id: m.id,
        groupId: m.groupId,
        team1: getPlayerByIdOrName(m.team1Id ?? null, m.team1Name),
        team2: getPlayerByIdOrName(m.team2Id ?? null, m.team2Name),
        score1: m.score1 ?? undefined,
        score2: m.score2 ?? undefined,
        played: m.confirmed,
        confirmed: m.confirmed,
        roundIndex: m.roundIndex ?? undefined,
        courtNumber: m.courtNumber ?? undefined,
    }));

    const mappedBracket = dbBracket.map(bm => ({
        id: bm.id,
        round: bm.round,
        slot: bm.slot,
        team1: bm.team1Name ? getPlayerByIdOrName(bm.team1Id ?? null, bm.team1Name) : null,
        team2: bm.team2Name ? getPlayerByIdOrName(bm.team2Id ?? null, bm.team2Name) : null,
        score1: bm.score1 ?? undefined,
        score2: bm.score2 ?? undefined,
        confirmed: bm.confirmed,
        winnerId: bm.winnerId ?? undefined,
        winnerName: bm.winnerName ?? undefined,
    }));

    // Non-managers (jugadores, público) ven la página de resultados pública
    if (!canManage) {
        redirect(`/tournaments/${id}/resultados`);
    }

    const isFinished = tournament.status === "finalizado";

    const initialUpdatedAt = tournament.updatedAt?.toISOString() ?? new Date().toISOString();

    // JSON columns may come back as a parsed array or (defensively) a JSON string.
    const parsePlayers = (data: any): string[] => {
        if (!data) return [];
        if (typeof data === 'string') {
            try { return JSON.parse(data); } catch { return []; }
        }
        return Array.isArray(data) ? data : [];
    };
    const initialPresent = parsePlayers(tournament.presentPlayerIds);
    const initialPaid = parsePlayers(tournament.paidPlayerIds);

    if (tournament.type === 'americano') {
        return (
            <AmericanoManager
                tournamentId={tournament.id}
                tournamentName={tournament.name}
                initialGroups={initialGroups}
                initialMatches={mappedMatches}
                initialBracket={mappedBracket}
                initialStatus={tournament.status}
                initialPresent={initialPresent}
                initialPaid={initialPaid}
                initialUpdatedAt={initialUpdatedAt}
                readOnly={isFinished}
                isLoggedIn={isLoggedIn}
            />
        );
    }

    return (
        <TournamentManager
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            initialGroups={initialGroups}
            initialMatches={mappedMatches}
            initialBracket={mappedBracket}
            initialStatus={tournament.status}
            initialPresent={initialPresent}
            initialPaid={initialPaid}
            initialUpdatedAt={initialUpdatedAt}
            readOnly={isFinished}
            isLoggedIn={isLoggedIn}
        />
    );
}
