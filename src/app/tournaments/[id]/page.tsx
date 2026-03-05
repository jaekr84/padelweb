import { db } from "@/db";
import { tournaments, tournamentGroups, groupMatches, bracketMatches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import TournamentManager from "../fixture/TournamentManager";
import FeedLayout from "@/app/feed/layout";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function TournamentDisplayPage({ params }: Props) {
    const { id } = await params;

    const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, id))
        .limit(1);

    if (!tournament) notFound();

    if (tournament.status === "published" || tournament.status === "draft") {
        redirect(`/tournaments/${id}/fixture`);
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
        <FeedLayout>
            <TournamentManager
                tournamentId={tournament.id}
                tournamentName={tournament.name}
                initialGroups={initialGroups}
                initialMatches={mappedMatches}
                initialBracket={mappedBracket}
                initialStatus={tournament.status}
                readOnly={true}
            />
        </FeedLayout>
    );
}
