import { db } from "@/db";
import { users, tournaments, tournamentGroups, groupMatches, bracketMatches } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import AmericanoPlayoffs from "@/app/(main)/tournaments/fixture/AmericanoPlayoffs";

interface Props {
    params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AmericanoManagePlayoffsPage({ params }: Props) {
    const { id } = await params;

    const [tournament] = await db
        .select({
            id: tournaments.id,
            name: tournaments.name,
            status: tournaments.status,
            createdByUserId: tournaments.createdByUserId,
            type: tournaments.type,
            modalidad: tournaments.modalidad,
            presentPlayerIds: tournaments.presentPlayerIds,
            paidPlayerIds: tournaments.paidPlayerIds,
            updatedAt: tournaments.updatedAt,
        })
        .from(tournaments)
        .where(eq(tournaments.id, id))
        .limit(1);

    if (!tournament) notFound();

    // Only allow Americano tournaments
    if (tournament.type !== 'americano') {
        notFound();
    }

    // Authorization check
    const session = await getSession();
    const isSuperAdmin = session?.role === 'superadmin';
    const isAdmin = session?.role === 'admin';
    const isClub = session?.role === 'club';
    const isOwner = tournament.createdByUserId === session?.userId;
    const isActivePlayer = session?.role === 'jugador';

    const canManage = isSuperAdmin || isAdmin || isClub || isOwner;

    if (!canManage || (isActivePlayer && !isOwner)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-6">
                <div className="bg-card border border-border p-8 rounded-3xl text-center shadow-xl">
                    <h1 className="text-2xl font-black uppercase text-red-500 mb-4">No autorizado</h1>
                    <p className="text-white/60">No tenés permisos para gestionar este torneo.</p>
                </div>
            </div>
        );
    }

    // Fetch existing setup
    const dbGroups = await db.select().from(tournamentGroups).where(eq(tournamentGroups.tournamentId, id));
    const dbMatches = await db.select().from(groupMatches).where(eq(groupMatches.tournamentId, id));
    const dbBracket = await db.select().from(bracketMatches).where(eq(bracketMatches.tournamentId, id));

    const parsePlayers = (data: any) => {
        if (!data) return [];
        if (typeof data === 'string') {
            try { return JSON.parse(data); } catch { return []; }
        }
        return Array.isArray(data) ? data : [];
    };

    const rawGroups = dbGroups.map(g => ({
        id: g.id,
        name: g.name,
        players: parsePlayers(g.players) as any[],
    }));

    // Enrich players with images from DB
    const allPlayerIds = [...new Set(rawGroups.flatMap(g => g.players.flatMap(p => [p.userId, p.partnerUserId, p.id].filter(Boolean))))];
    const dbUsers = allPlayerIds.length > 0
        ? await db.select({ id: users.id, imageUrl: users.imageUrl }).from(users).where(inArray(users.id, allPlayerIds as string[]))
        : [];
    
    const userImageMap = new Map(dbUsers.map(u => [u.id, u.imageUrl]));

    const initialGroups = rawGroups.map(g => ({
        ...g,
        players: g.players.map(p => ({
            ...p,
            image: p.image || userImageMap.get(p.userId || p.id) || null,
            partnerImage: p.partnerImage || (p.partnerUserId ? userImageMap.get(p.partnerUserId) : null) || null,
        }))
    }));

    const allPlayersInGroups = initialGroups.flatMap(g => g.players);
    
    const getPlayerByIdOrName = (playerId: string | null, name: string) => {
        const isUUID = (str: string) => str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        
        if (playerId) {
            const found = allPlayersInGroups.find(p => p.id === playerId);
            if (found) return found;
        }
        
        if (isUUID(name)) {
            const foundByIdAsName = allPlayersInGroups.find(p => p.id === name);
            if (foundByIdAsName) return foundByIdAsName;
        }

        const foundByName = allPlayersInGroups.find(p => p.name === name);
        if (foundByName) return foundByName;

        return { id: playerId || name, name: isUUID(name) ? "Jugador" : name };
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
        status: m.status || (m.confirmed ? "finished" : "pending"),
        roundIndex: m.roundIndex ?? undefined,
        courtNumber: m.courtNumber ?? undefined,
    }));

    const mappedBracket = dbBracket.map(bm => ({
        id: bm.id,
        round: bm.round,
        slot: bm.slot,
        team1: (bm.team1Name === "BYE" ? "BYE" : bm.team1Name ? getPlayerByIdOrName(bm.team1Id ?? null, bm.team1Name) : null) as any,
        team2: (bm.team2Name === "BYE" ? "BYE" : bm.team2Name ? getPlayerByIdOrName(bm.team2Id ?? null, bm.team2Name) : null) as any,
        score1: bm.score1 ?? undefined,
        score2: bm.score2 ?? undefined,
        confirmed: bm.confirmed,
        status: bm.status || (bm.confirmed ? 'completed' : 'pending'),
        winnerId: bm.winnerId ?? undefined,
        winnerName: bm.winnerName ?? undefined,
    }));

    let parsedModalidad: any = tournament.modalidad;
    try {
        if (typeof tournament.modalidad === 'string' && tournament.modalidad.trim().startsWith('{')) {
            parsedModalidad = JSON.parse(tournament.modalidad);
        }
    } catch (e) {
        console.error("Error parsing modality:", e);
    }

    return (
        <AmericanoPlayoffs
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            initialGroups={initialGroups}
            initialMatches={mappedMatches}
            initialBracket={mappedBracket}
            initialStatus={tournament.status}
            initialPresent={parsePlayers(tournament.presentPlayerIds)}
            initialPaid={parsePlayers(tournament.paidPlayerIds)}
            initialUpdatedAt={tournament.updatedAt?.toISOString()}
            readOnly={false}
            modality={parsedModalidad}
        />
    );
}
