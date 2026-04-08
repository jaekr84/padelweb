
import RankingClient from "./RankingClient";
import { db } from "@/db";
import { users, registrations, categoriesTable, bracketMatches, tournaments, clubs } from "@/db/schema";
import { eq, inArray, asc, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";

export default async function RankingPage() {
    const session = await getSession();
    const isLoggedIn = !!session;

    // 1. Fetch all users that are players (exclude clubs/centers)
    const allUsers = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        category: users.category,
        gender: users.gender,
        points: users.points,
        side: users.side,
        imageUrl: users.imageUrl,
        clubId: users.clubId,
        club: {
            name: clubs.name,
            logoUrl: clubs.logoUrl
        }
    })
    .from(users)
    .leftJoin(clubs, eq(users.clubId, clubs.id))
    .where(
        and(
            eq(users.role, "jugador"),
            sql`${users.email} NOT IN ('dev@jae.com', 'jae@dev.com', 'dkdunko@gmail.com')`
        )
    );

    // 2. Fetch all tournament registrations to count UNIQUE tournaments played per player
    // We only count registrations for tournaments that are NOT in draft status
    const allRegistrationsJoined = await db.select({
        userId: registrations.userId,
        partnerUserId: registrations.partnerUserId,
        tournamentId: registrations.tournamentId
    })
    .from(registrations)
    .innerJoin(tournaments, eq(registrations.tournamentId, tournaments.id))
    .where(
        and(
            eq(registrations.status, "confirmed"),
            sql`${tournaments.status} != 'draft'`
        )
    );

    // 3. Fetch custom categories
    const customCategories = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(asc(categoriesTable.categoryOrder));

    // 4. Map registrations to UNIQUE tournament counts
    const userTournaments: Record<string, Set<string>> = {};
    for (const reg of allRegistrationsJoined) {
        if (!userTournaments[reg.userId]) {
            userTournaments[reg.userId] = new Set();
        }
        userTournaments[reg.userId].add(reg.tournamentId);

        if (reg.partnerUserId) {
            if (!userTournaments[reg.partnerUserId]) {
                userTournaments[reg.partnerUserId] = new Set();
            }
            userTournaments[reg.partnerUserId].add(reg.tournamentId);
        }
    }

    const tournamentCounts: Record<string, number> = {};
    for (const [userId, tIds] of Object.entries(userTournaments)) {
        tournamentCounts[userId] = tIds.size;
    }

    const currentYear = new Date().getFullYear();
    const allWins = await db
        .select({
            userId: registrations.userId,
            partnerUserId: registrations.partnerUserId,
            category: registrations.category,
        })
        .from(bracketMatches)
        .innerJoin(registrations, eq(bracketMatches.winnerId, registrations.id))
        .innerJoin(tournaments, eq(bracketMatches.tournamentId, tournaments.id))
        .where(
            and(
                eq(bracketMatches.round, 0),
                eq(bracketMatches.confirmed, true),
                sql`YEAR(${tournaments.createdAt}) = ${currentYear}`
            )
        );

    const winCounts: Record<string, Record<string, number>> = {};
    for (const win of allWins) {
        const cats = [win.category].filter(Boolean) as string[];
        for (const cat of cats) {
            if (win.userId) {
                if (!winCounts[win.userId]) winCounts[win.userId] = {};
                winCounts[win.userId][cat] = (winCounts[win.userId][cat] || 0) + 1;
            }
            if (win.partnerUserId) {
                if (!winCounts[win.partnerUserId]) winCounts[win.partnerUserId] = {};
                winCounts[win.partnerUserId][cat] = (winCounts[win.partnerUserId][cat] || 0) + 1;
            }
        }
    }

    // 5. Transform users mapping
    const rankingUsers = allUsers.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        name: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.firstName || u.lastName || "Jugador"),
        email: u.email,
        category: u.category,
        gender: u.gender,
        points: u.points || 0,
        imageUrl: u.imageUrl,
        side: u.side,
        winsInCurrentCategory: winCounts[u.id]?.[u.category || "D"] || 0,
        club: u.club
    }));

    return (
        <RankingClient 
            users={rankingUsers} 
            tournamentCounts={tournamentCounts} 
            availableCategories={customCategories}
            isLoggedIn={isLoggedIn}
        />
    );
}
