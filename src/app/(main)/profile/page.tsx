import { db } from "@/db";
import { tournaments, registrations, users, groupMatches, bracketMatches, clubs } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import PlayerProfileClient from "./PlayerProfileClient";

export default async function ProfilePage() {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) redirect("/login");
    const userId = session.userId;

    // Start all independent fetches in parallel
    const [
        dbUserRes,
        userRegistrations,
        clubProfileRes,
        createdTournaments
    ] = await Promise.all([
        db.select().from(users).where(eq(users.id, userId)).limit(1),
        db.select({
            id: registrations.id,
            tournamentId: registrations.tournamentId,
            partnerName: registrations.partnerName,
            category: registrations.category,
            status: registrations.status,
            tournament: {
                id: tournaments.id,
                name: tournaments.name,
                status: tournaments.status,
                startDate: tournaments.startDate,
                surface: tournaments.surface,
            }
        })
            .from(registrations)
            .innerJoin(tournaments, eq(registrations.tournamentId, tournaments.id))
            .where(eq(registrations.userId, userId))
            .orderBy(desc(registrations.createdAt)),

        db.select().from(clubs).where(eq(clubs.ownerId, userId)),
        db.select().from(tournaments).where(eq(tournaments.createdByUserId, userId)).orderBy(desc(tournaments.createdAt))
    ]);

    const dbUser = dbUserRes[0];
    if (!dbUser) redirect("/login");

    const clubProfile = clubProfileRes[0];

    // Fetch matches if there are registrations
    const tournamentIds = userRegistrations.map(r => r.tournamentId);
    let allMatches: any[] = [];
    let allBracketMatches: any[] = [];
    let clubMembers: any[] = [];

    const secondPhaseFetches: Promise<any>[] = [];

    if (tournamentIds.length > 0) {
        secondPhaseFetches.push(
            db.select({ match: groupMatches, tournamentName: tournaments.name })
                .from(groupMatches)
                .innerJoin(tournaments, eq(groupMatches.tournamentId, tournaments.id))
                .where(inArray(groupMatches.tournamentId, tournamentIds))
        );
        secondPhaseFetches.push(
            db.select({ match: bracketMatches, tournamentName: tournaments.name })
                .from(bracketMatches)
                .innerJoin(tournaments, eq(bracketMatches.tournamentId, tournaments.id))
                .where(inArray(bracketMatches.tournamentId, tournamentIds))
        );
    }

    if (clubProfile) {
        secondPhaseFetches.push(
            db.select().from(users).where(eq(users.clubId, clubProfile.id)).orderBy(desc(users.points))
        );
    }

    const secondPhaseResults = await Promise.all(secondPhaseFetches);

    let resultIdx = 0;
    if (tournamentIds.length > 0) {
        allMatches = secondPhaseResults[resultIdx++];
        allBracketMatches = secondPhaseResults[resultIdx++];
    }
    if (clubProfile) {
        clubMembers = secondPhaseResults[resultIdx++];
    }

    return (
        <PlayerProfileClient
            dbUser={{
                ...dbUser,
                name: `${dbUser.firstName} ${dbUser.lastName}`.trim() || dbUser.email
            }}
            registrations={userRegistrations}
            matchHistory={[...allMatches, ...allBracketMatches]}
            isOwnProfile={true}
            clubProfile={clubProfile || null}
            members={JSON.parse(JSON.stringify(clubMembers))}
            createdTournaments={JSON.parse(JSON.stringify(createdTournaments))}
        />
    );
}
