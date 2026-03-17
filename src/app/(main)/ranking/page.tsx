
import RankingClient from "./RankingClient";
import { db } from "@/db";
import { users, registrations, categoriesTable, bracketMatches, tournaments, clubs } from "@/db/schema";
import { eq, inArray, asc, and, sql } from "drizzle-orm";

export default async function RankingPage() {
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
            sql`${users.email} NOT IN ('dev@jae.com', 'jae@dev.com')`
        )
    );

    // 2. Fetch all tournament registrations to count tournaments played per player
    const allRegistrations = await db.select().from(registrations).where(eq(registrations.status, "confirmed"));

    // 3. Fetch custom categories
    const customCategories = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(asc(categoriesTable.categoryOrder));

    // 4. Map registrations to tournament counts
    const tournamentCounts: Record<string, number> = {};
    for (const reg of allRegistrations) {
        if (!tournamentCounts[reg.userId]) {
            tournamentCounts[reg.userId] = 0;
        }
        tournamentCounts[reg.userId]++;
        if (reg.partnerUserId) {
            if (!tournamentCounts[reg.partnerUserId]) {
                tournamentCounts[reg.partnerUserId] = 0;
            }
            tournamentCounts[reg.partnerUserId]++;
        }
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
        />
    );
}


