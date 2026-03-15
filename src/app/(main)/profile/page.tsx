import { db } from "@/db";
import { tournaments, registrations, users, groupMatches, bracketMatches, clubs, categoriesTable } from "@/db/schema";
import { eq, desc, inArray, gt, and, asc, sql, or } from "drizzle-orm";
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
        createdTournaments,
        availableCategories
    ] = await Promise.all([
        db.select().from(users).where(eq(users.id, userId)).limit(1),
        db.select({
            id: registrations.id,
            tournamentId: registrations.tournamentId,
            partnerName: registrations.partnerName,
            partnerUserId: registrations.partnerUserId,
            userId: registrations.userId,
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
            .where(
                or(
                    eq(registrations.userId, userId),
                    eq(registrations.partnerUserId, userId)
                )
            )
            .orderBy(desc(registrations.createdAt)),

        db.select().from(clubs).where(eq(clubs.ownerId, userId)),
        db.select().from(tournaments).where(eq(tournaments.createdByUserId, userId)).orderBy(desc(tournaments.createdAt)),
        db.select().from(categoriesTable).where(eq(categoriesTable.isActive, true)).orderBy(asc(categoriesTable.categoryOrder))
    ]);

    const dbUser = dbUserRes[0];
    if (!dbUser) redirect("/login");

    // Pre-fetch users for team name reconstruction
    const allPartnerIds = userRegistrations.map(r => r.partnerUserId).filter(Boolean) as string[];
    const allPrimaryIds = userRegistrations.map(r => r.userId).filter(Boolean) as string[];
    const uniqueUserIds = Array.from(new Set([...allPartnerIds, ...allPrimaryIds]));
    
    const relatedUsers = uniqueUserIds.length > 0 
        ? await db.select().from(users).where(inArray(users.id, uniqueUserIds))
        : [];

    // Reconstruct team names for each registration
    const registrationsWithTeamNames = userRegistrations.map(reg => {
        const u1 = relatedUsers.find(u => u.id === reg.userId);
        const u2 = reg.partnerUserId ? relatedUsers.find(u => u.id === reg.partnerUserId) : null;

        const name1 = u1 ? ([u1.firstName, u1.lastName].filter(Boolean).join(" ").trim() || u1.email.split("@")[0]) : "Jugador";
        const name2 = u2 ? ([u2.firstName, u2.lastName].filter(Boolean).join(" ").trim() || u2.email.split("@")[0]) : (reg.partnerName || "Invitado");
        
        return {
            ...reg,
            teamName: `${name1} / ${name2}`.trim()
        };
    });

    const clubProfile = clubProfileRes[0];

    // Ranking position: Count players with more points
    const rankingPositionRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
            and(
                eq(users.role, "jugador"),
                gt(users.points, dbUser.points || 0)
            )
        );
    
    const rankingPosition = (Number(rankingPositionRes[0].count) || 0) + 1;

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
            registrations={registrationsWithTeamNames}
            matchHistory={[...allMatches, ...allBracketMatches]}
            isOwnProfile={true}
            clubProfile={clubProfile || null}
            members={JSON.parse(JSON.stringify(clubMembers))}
            createdTournaments={JSON.parse(JSON.stringify(createdTournaments))}
            availableCategories={availableCategories}
            rankingPosition={rankingPosition}
        />
    );
}
