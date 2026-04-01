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

            // Parse tournament modalidad to check participation format
            let mod: any = tournament?.modalidad;
            try {
                if (typeof mod === 'string' && mod.trim().startsWith('{')) mod = JSON.parse(mod);
            } catch (e) {}
            const isIndividual = mod?.participacion === "individual";

            const mainUser = dbUsers.find(u => u.id === reg.userId);
            
            const namePart1 = mainUser 
                ? ([mainUser.firstName, mainUser.lastName].filter(Boolean).join(" ").trim() || mainUser.email.split("@")[0])
                : "Jugador";
            
            // Construct teamName based on participation type
            const teamName = isIndividual 
                ? namePart1.trim()
                : `${namePart1} / ${(reg.partnerName || "Invitado").trim()}`;

            // Batch fetch matches for this tournament to avoid N+1 queries in the loop
            // Optimization: Get only confirmed matches where this team played
            const [gMatches, bMatches] = await Promise.all([
                db.select().from(groupMatches).where(
                    and(
                        eq(groupMatches.tournamentId, reg.tournamentId),
                        eq(groupMatches.confirmed, true),
                        or(
                            eq(groupMatches.team1Id, reg.id),
                            eq(groupMatches.team2Id, reg.id),
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
                            eq(bracketMatches.team1Id, reg.id),
                            eq(bracketMatches.team2Id, reg.id),
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
                const matchesTeam1 = m.team1Id === reg.id || (m.team1Name || "").trim() === teamName.trim();
                
                let isWinner = false;
                if ((m as any).winnerId) {
                    isWinner = (m as any).winnerId === reg.id;
                } else {
                    isWinner = matchesTeam1 ? score1 > score2 : score2 > score1;
                }

                playerMatches.push({
                    id: m.id,
                    tournamentName: tournament?.name || "Torneo",
                    type: m.type,
                    round: (m as any).round,
                    team1: m.team1Name,
                    team2: m.team2Name,
                    score1: score1,
                    score2: score2,
                    isWinner,
                    date: tournament?.createdAt || new Date(),
                    category: reg.category
                });
            }
        }

        // 6. Deduplicate by match ID to avoid double-counting if user appeared in multiple registrations
        const uniqueMatches = Array.from(
            new Map(playerMatches.map(m => [m.id, m])).values()
        );

        // Sort by date (descending)
        return uniqueMatches.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        console.error("Error fetching match history:", error);
        return [];
    }
}
