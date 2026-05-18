import RankingClient from "./RankingClient";
import { db } from "@/db";
import { users, registrations, categoriesTable, bracketMatches, groupMatches, tournaments, clubs } from "@/db/schema";
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
        sql`${users.email} NOT IN ('dev@jae.com', 'jae@dev.com', 'dkdunko@gmail.com')`
    );

    // 2. Fetch all tournament registrations to count UNIQUE tournaments played per player
    // We only count registrations for tournaments that are NOT in draft status
    const allRegistrationsJoined = await db.select({
        id: registrations.id,
        userId: registrations.userId,
        partnerUserId: registrations.partnerUserId,
        tournamentId: registrations.tournamentId,
        category: registrations.category,
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

    // 4. Map registrations to UNIQUE tournament counts & setup mapping dictionary
    const userTournaments: Record<string, Set<string>> = {};
    const regMap: Record<string, { userId: string; partnerUserId: string | null; category: string | null }> = {};
    
    for (const reg of allRegistrationsJoined) {
        regMap[reg.id] = {
            userId: reg.userId,
            partnerUserId: reg.partnerUserId,
            category: reg.category
        };

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

    // 5. Fetch confirmed bracket matches & group matches to pre-calculate player stats
    const confirmedBrackets = await db.select({
        id: bracketMatches.id,
        round: bracketMatches.round,
        confirmed: bracketMatches.confirmed,
        winnerId: bracketMatches.winnerId,
        team1Id: bracketMatches.team1Id,
        team2Id: bracketMatches.team2Id,
    })
    .from(bracketMatches)
    .where(eq(bracketMatches.confirmed, true));

    const confirmedGroups = await db.select({
        id: groupMatches.id,
        confirmed: groupMatches.confirmed,
        team1Id: groupMatches.team1Id,
        team2Id: groupMatches.team2Id,
        score1: groupMatches.score1,
        score2: groupMatches.score2,
    })
    .from(groupMatches)
    .where(eq(groupMatches.confirmed, true));

    const userStats: Record<string, {
        pj: number;
        pg: number;
        pp: number;
        wr: number;
        trofeos: number;
        subcampeonatos: number;
    }> = {};

    const addMatch = (userId: string, isWin: boolean, isFinal: boolean) => {
        if (!userStats[userId]) {
            userStats[userId] = { pj: 0, pg: 0, pp: 0, wr: 0, trofeos: 0, subcampeonatos: 0 };
        }
        const s = userStats[userId];
        s.pj += 1;
        if (isWin) {
            s.pg += 1;
            if (isFinal) s.trofeos += 1;
        } else {
            s.pp += 1;
            if (isFinal) s.subcampeonatos += 1;
        }
    };

    // Calculate Bracket Stats
    for (const bm of confirmedBrackets) {
        const team1 = bm.team1Id ? regMap[bm.team1Id] : null;
        const team2 = bm.team2Id ? regMap[bm.team2Id] : null;
        const isFinal = bm.round === 0;

        if (team1) {
            const isWin = bm.winnerId === bm.team1Id;
            if (team1.userId) addMatch(team1.userId, isWin, isFinal);
            if (team1.partnerUserId) addMatch(team1.partnerUserId, isWin, isFinal);
        }
        if (team2) {
            const isWin = bm.winnerId === bm.team2Id;
            if (team2.userId) addMatch(team2.userId, isWin, isFinal);
            if (team2.partnerUserId) addMatch(team2.partnerUserId, isWin, isFinal);
        }
    }

    // Calculate Group Match Stats
    for (const gm of confirmedGroups) {
        const team1 = gm.team1Id ? regMap[gm.team1Id] : null;
        const team2 = gm.team2Id ? regMap[gm.team2Id] : null;

        if (team1 && team2 && gm.score1 !== null && gm.score2 !== null) {
            const team1Won = gm.score1 > gm.score2;
            
            if (team1.userId) addMatch(team1.userId, team1Won, false);
            if (team1.partnerUserId) addMatch(team1.partnerUserId, team1Won, false);

            if (team2.userId) addMatch(team2.userId, !team1Won, false);
            if (team2.partnerUserId) addMatch(team2.partnerUserId, !team1Won, false);
        }
    }

    // Compute derived Win Rates
    for (const stats of Object.values(userStats)) {
        stats.wr = stats.pj > 0 ? Math.round((stats.pg / stats.pj) * 100) : 0;
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

    // 6. Transform users mapping with complete statistics
    const rankingUsers = allUsers.map(u => {
        const stats = userStats[u.id] || { pj: 0, pg: 0, pp: 0, wr: 0, trofeos: 0, subcampeonatos: 0 };
        return {
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
            club: u.club,
            stats
        };
    });

    return (
        <RankingClient 
            users={rankingUsers} 
            tournamentCounts={tournamentCounts} 
            availableCategories={customCategories}
            isLoggedIn={isLoggedIn}
            currentUserId={session?.userId}
        />
    );
}
