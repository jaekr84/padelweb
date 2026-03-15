"use server";

import { db } from "@/db";
import { groupMatches, bracketMatches, registrations, tournaments, users } from "@/db/schema";
import { eq, or, and, sql } from "drizzle-orm";

export async function getPlayerMatchHistory(userId: string) {
    try {
        // 1. Get all registrations for this user (as main or partner)
        const userRegs = await db
            .select({
                regId: registrations.id,
                tournamentId: registrations.tournamentId,
                partnerName: registrations.partnerName,
                partnerUserId: registrations.partnerUserId,
                userId: registrations.userId,
            })
            .from(registrations)
            .where(
                or(
                    eq(registrations.userId, userId),
                    eq(registrations.partnerUserId, userId)
                )
            );

        if (userRegs.length === 0) return [];

        // 2. For each registration, reconstruct the "Team Name" that was used in the fixture
        // We need the user's name for those tournaments
        const userIds = Array.from(new Set(userRegs.map(r => r.userId).concat(userRegs.map(r => r.partnerUserId || ""))));
        const dbUsers = await db.select().from(users).where(sql`${users.id} IN (${userIds.map(id => `'${id}'`).join(',')})`);

        const playerMatches: any[] = [];

        for (const reg of userRegs) {
            const mainUser = dbUsers.find(u => u.id === reg.userId);
            const namePart1 = mainUser 
                ? ([mainUser.firstName, mainUser.lastName].filter(Boolean).join(" ") || mainUser.email.split("@")[0])
                : "Jugador";
            const namePart2 = reg.partnerName || "Invitado";
            const teamName = `${namePart1} / ${namePart2}`;

            // Get Tournament Info
            const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, reg.tournamentId)).limit(1);

            // Get group matches
            const gMatches = await db
                .select()
                .from(groupMatches)
                .where(
                    and(
                        eq(groupMatches.tournamentId, reg.tournamentId),
                        or(
                            eq(groupMatches.team1Name, teamName),
                            eq(groupMatches.team2Name, teamName)
                        ),
                        eq(groupMatches.confirmed, true)
                    )
                );

            // Get bracket matches
            const bMatches = await db
                .select()
                .from(bracketMatches)
                .where(
                    and(
                        eq(bracketMatches.tournamentId, reg.tournamentId),
                        or(
                            eq(bracketMatches.team1Name, teamName),
                            eq(bracketMatches.team2Name, teamName)
                        ),
                        eq(bracketMatches.confirmed, true)
                    )
                );

            const allMatches = [...gMatches.map(m => ({ ...m, type: 'Grupo' })), ...bMatches.map(m => ({ ...m, type: 'Playoff', round: (m as any).round }))];
            
            for (const m of allMatches) {
                playerMatches.push({
                    id: m.id,
                    tournamentName: tournament?.name || "Torneo",
                    type: m.type,
                    round: (m as any).round,
                    team1: m.team1Name,
                    team2: m.team2Name,
                    score1: m.score1,
                    score2: m.score2,
                    isWinner: m.team1Name === teamName ? (m.score1 || 0) > (m.score2 || 0) : (m.score2 || 0) > (m.score1 || 0),
                    date: tournament?.createdAt
                });
            }
        }

        return playerMatches.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
        console.error("Error fetching match history:", error);
        return [];
    }
}
