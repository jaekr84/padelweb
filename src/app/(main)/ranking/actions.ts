"use server";

import { db } from "@/db";
import { groupMatches, bracketMatches, registrations, tournaments, users } from "@/db/schema";
import { eq, or, and, sql, inArray } from "drizzle-orm";

export async function getPlayerMatchHistory(userId: string) {
    try {
        // 1. Get all registrations for this user (as main or partner)
        const userRegs = await db
            .select()
            .from(registrations)
            .where(
                or(
                    eq(registrations.userId, userId),
                    eq(registrations.partnerUserId, userId)
                )
            );

        if (userRegs.length === 0) return [];

        // 2. Collect all relevant IDs
        const tournamentIds = Array.from(new Set(userRegs.map(r => r.tournamentId)));
        const allUserIds = Array.from(new Set([
            ...userRegs.map(r => r.userId),
            ...userRegs.map(r => r.partnerUserId)
        ])).filter((id): id is string => !!id);

        // 3. Batch fetch supporting data
        const [dbTournaments, dbUsers] = await Promise.all([
            db.select().from(tournaments).where(inArray(tournaments.id, tournamentIds)),
            db.select().from(users).where(inArray(users.id, allUserIds))
        ]);

        const playerMatches: any[] = [];

        // 4. For each registration, find its matches
        for (const reg of userRegs) {
            const tournament = dbTournaments.find(t => t.id === reg.tournamentId);
            const mainUser = dbUsers.find(u => u.id === reg.userId);
            
            const namePart1 = mainUser 
                ? ([mainUser.firstName, mainUser.lastName].filter(Boolean).join(" ").trim() || mainUser.email.split("@")[0])
                : "Jugador";
            const namePart2 = (reg.partnerName || "Invitado").trim();
            const teamName = `${namePart1} / ${namePart2}`;

            // Batch fetch matches for this tournament to avoid N+1 queries in the loop
            // Optimization: Get only confirmed matches where this team played
            const [gMatches, bMatches] = await Promise.all([
                db.select().from(groupMatches).where(
                    and(
                        eq(groupMatches.tournamentId, reg.tournamentId),
                        eq(groupMatches.confirmed, true),
                        or(
                            eq(groupMatches.team1Name, teamName),
                            eq(groupMatches.team2Name, teamName)
                        )
                    )
                ),
                db.select().from(bracketMatches).where(
                    and(
                        eq(bracketMatches.tournamentId, reg.tournamentId),
                        eq(bracketMatches.confirmed, true),
                        or(
                            eq(bracketMatches.team1Name, teamName),
                            eq(bracketMatches.team2Name, teamName)
                        )
                    )
                )
            ]);

            const allMatches = [
                ...gMatches.map(m => ({ ...m, type: 'Grupo' })), 
                ...bMatches.map(m => ({ ...m, type: 'Playoff' }))
            ];
            
            for (const m of allMatches) {
                const score1 = m.score1 ?? 0;
                const score2 = m.score2 ?? 0;
                const matchesTeam1 = (m.team1Name || "").trim() === teamName.trim();
                
                playerMatches.push({
                    id: m.id,
                    tournamentName: tournament?.name || "Torneo",
                    type: m.type,
                    round: (m as any).round,
                    team1: m.team1Name,
                    team2: m.team2Name,
                    score1: score1,
                    score2: score2,
                    isWinner: matchesTeam1 ? score1 > score2 : score2 > score1,
                    date: tournament?.createdAt || new Date(),
                    category: reg.category
                });
            }
        }

        // 5. Final sort by date
        return playerMatches.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
        console.error("Error fetching match history:", error);
        return [];
    }
}
