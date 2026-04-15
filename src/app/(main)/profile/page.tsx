import { db } from "@/db";
import { tournaments, registrations, users, groupMatches, bracketMatches, clubs, categoriesTable, clubRequests } from "@/db/schema";
import { eq, desc, inArray, gt, and, asc, sql, or } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import PlayerProfileClient from "./PlayerProfileClient";
import { getPlayerProfileData } from "@/app/actions/players";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
    const params = await searchParams;
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    const userId = params.id || session?.userId;

    if (!userId) redirect("/login");

    const isOwnProfile = userId === session?.userId;

    // Start all independent fetches in parallel
    const [
        dbUserRes,
        profileData,
        clubProfileRes,
        createdTournaments,
        availableCategories,
        pendingInvites,
        memberClubRes
    ] = await Promise.all([
        db.select().from(users).where(eq(users.id, userId)).limit(1),
        getPlayerProfileData(userId), // NO LIMIT for full history here
        db.select().from(clubs).where(eq(clubs.ownerId, userId)),
        db.select().from(tournaments).where(eq(tournaments.createdByUserId, userId)).orderBy(desc(tournaments.createdAt)),
        db.select().from(categoriesTable).where(eq(categoriesTable.isActive, true)).orderBy(asc(categoriesTable.categoryOrder)),
        db.select({
            id: clubRequests.id,
            clubId: clubRequests.clubId,
            userId: clubRequests.userId,
            type: clubRequests.type,
            status: clubRequests.status,
            createdAt: clubRequests.createdAt,
            club: {
                id: clubs.id,
                name: clubs.name,
                logoUrl: clubs.logoUrl
            }
        })
            .from(clubRequests)
            .innerJoin(clubs, eq(clubRequests.clubId, clubs.id))
            .where(and(eq(clubRequests.userId, userId), eq(clubRequests.status, "pending"))),

        db.select({
            id: clubs.id,
            name: clubs.name,
            logoUrl: clubs.logoUrl
        })
            .from(clubs)
            .innerJoin(users, eq(users.clubId, clubs.id))
            .where(eq(users.id, userId))
            .limit(1)
    ]);

    const dbUser = dbUserRes[0];
    if (!dbUser) redirect("/login");

    const clubProfile = clubProfileRes[0];

    // Ranking Logic (Keeping it here or moving to action later if needed)
    const rankingPositionRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.role, "jugador"), gt(users.points, dbUser.points || 0)));

    const categoryRankingRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.role, "jugador"), eq(users.category, dbUser.category || "D"), gt(users.points, dbUser.points || 0)));

    const rankingPosition = (Number(rankingPositionRes[0].count) || 0) + 1;
    const categoryRanking = (Number(categoryRankingRes[0].count) || 0) + 1;

    let clubMembers: any[] = [];
    if (clubProfile) {
        clubMembers = await db.select().from(users).where(eq(users.clubId, clubProfile.id)).orderBy(desc(users.points));
    }

    return (
        <PlayerProfileClient
            dbUser={{
                ...dbUser,
                name: `${dbUser.firstName} ${dbUser.lastName}`.trim() || dbUser.email
            }}
            profileData={profileData || {
                player: dbUser,
                stats: { pj: 0, pg: 0, pp: 0, wr: 0, trofeos: 0 },
                history: []
            }}
            isOwnProfile={isOwnProfile}
            clubProfile={clubProfile || null}
            members={JSON.parse(JSON.stringify(clubMembers))}
            createdTournaments={JSON.parse(JSON.stringify(createdTournaments))}
            availableCategories={availableCategories}
            rankingPosition={rankingPosition}
            categoryRanking={categoryRanking}
            pendingInvites={JSON.parse(JSON.stringify(pendingInvites))}
            memberClub={memberClubRes[0] || null}
        />
    );
}
