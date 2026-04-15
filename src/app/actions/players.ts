"use server";

import { db } from "@/db";
import { users, groupMatches, bracketMatches, tournaments, registrations, openCourtMatches, openCourtEvents, publicMatches, publicMatchRegistrations } from "@/db/schema";
import { eq, and, or, like, desc, inArray } from "drizzle-orm";

export interface MatchHistoryItem {
    id: string;
    tournament: string;
    date: Date | string | null;
    opponent: string;
    score: string;
    isWin: boolean | null;
    type: string;
    subType: string;
}

export async function getAllPlayers() {
    try {
        const allUsers = await db.select().from(users).where(eq(users.role, "jugador"));
        return allUsers.map(u => ({
            id: u.id,
            name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email.split("@")[0],
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            category: u.category,
            points: u.points,
            gender: u.gender,
            clubId: u.clubId
        }));
    } catch (err) {
        console.error("[getAllPlayers]", err);
        return [];
    }
}
export async function searchPlayers(query: string) {
    if (!query || query.length < 2) return [];
    
    try {
        const results = await db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.role, "jugador"),
                    or(
                        like(users.firstName, `%${query}%`),
                        like(users.lastName, `%${query}%`),
                        like(users.email, `%${query}%`)
                    )
                )
            )
            .limit(10);

        return results.map(u => ({
            id: u.id,
            name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email.split("@")[0],
            imageUrl: u.imageUrl,
            category: u.category
        }));
    } catch (err) {
        console.error("[searchPlayers]", err);
        return [];
    }
}
export async function getPlayerProfileData(userId: string, limit?: number) {
    if (!userId) return null;

    try {
        const userRes = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        const user = userRes[0];
        if (!user) return null;

        // --- TOURNAMENT PREP ---
        const userRegistrations = await db.select({ id: registrations.id })
            .from(registrations)
            .where(or(
                eq(registrations.userId, userId),
                eq(registrations.partnerUserId, userId)
            ));
        
        const regIds = userRegistrations.map(r => r.id);
        const allPossibleIds = [userId, ...regIds];

        // 1. Group Matches
        const gMatches = await db.select({
            match: groupMatches,
            tournamentName: tournaments.name
        })
        .from(groupMatches)
        .innerJoin(tournaments, eq(groupMatches.tournamentId, tournaments.id))
        .where(or(
            inArray(groupMatches.team1Id, allPossibleIds),
            inArray(groupMatches.team2Id, allPossibleIds)
        ));

        // 2. Bracket Matches
        const bMatches = await db.select({
            match: bracketMatches,
            tournamentName: tournaments.name
        })
        .from(bracketMatches)
        .innerJoin(tournaments, eq(bracketMatches.tournamentId, tournaments.id))
        .where(or(
            inArray(bracketMatches.team1Id, allPossibleIds),
            inArray(bracketMatches.team2Id, allPossibleIds)
        ));

        // 3. Open Court Matches
        const ocMatches = await db.select({
            match: openCourtMatches,
            eventName: openCourtEvents.name,
            eventDate: openCourtEvents.date
        })
        .from(openCourtMatches)
        .innerJoin(openCourtEvents, eq(openCourtMatches.eventId, openCourtEvents.id))
        .where(or(
            eq(openCourtMatches.team1Player1Id, userId),
            eq(openCourtMatches.team1Player2Id, userId),
            eq(openCourtMatches.team2Player1Id, userId),
            eq(openCourtMatches.team2Player2Id, userId)
        ));

        // 4. Public Matches
        const pMatches = await db.select({
            match: publicMatches,
            reg: publicMatchRegistrations
        })
        .from(publicMatchRegistrations)
        .innerJoin(publicMatches, eq(publicMatchRegistrations.matchId, publicMatches.id))
        .where(eq(publicMatchRegistrations.userId, userId));

        let pj = 0;
        let pg = 0;
        let pp = 0;

        const history: MatchHistoryItem[] = [];
        let trofeos = 0;

        // --- PROCESS TOURNAMENT GROUP ---
        gMatches.filter(m => m.match.confirmed && m.match.score1 !== null).forEach(m => {
            pj++;
            const isT1 = allPossibleIds.includes(m.match.team1Id || "");
            const myScore = isT1 ? m.match.score1 : m.match.score2;
            const opScore = isT1 ? m.match.score2 : m.match.score1;
            const isWin = (myScore || 0) > (opScore || 0);
            const opponent = isT1 ? m.match.team2Name : m.match.team1Name;

            if (isWin) pg++; else pp++;

            history.push({
                id: m.match.id,
                tournament: m.tournamentName,
                date: m.match.createdAt,
                opponent: opponent || "TBD",
                score: `${myScore}-${opScore}`,
                isWin,
                type: 'Torneo',
                subType: 'Grupo'
            });
        });

        // --- PROCESS TOURNAMENT BRACKET ---
        bMatches.filter(m => m.match.confirmed && m.match.score1 !== null).forEach(m => {
            pj++;
            const isT1 = allPossibleIds.includes(m.match.team1Id || "");
            const isWinner = allPossibleIds.includes(m.match.winnerId || "");
            const isWin = isWinner;
            
            const myScore = isT1 ? m.match.score1 : m.match.score2;
            const opScore = isT1 ? m.match.score2 : m.match.score1;
            const opponent = isT1 ? m.match.team2Name : m.match.team1Name;

            if (isWin) {
                pg++;
                if (m.match.round === 1) trofeos++; 
            } else {
                pp++;
            }

            history.push({
                id: m.match.id,
                tournament: m.tournamentName,
                date: m.match.createdAt,
                opponent: opponent || "TBD",
                score: myScore !== null ? `${myScore}-${opScore}` : "W.O.",
                isWin,
                type: 'Torneo',
                subType: 'Eliminatoria'
            });
        });

        // --- PROCESS OPEN COURT ---
        ocMatches.forEach(m => {
            if (m.match.status === 'completed') {
                pj++;
                const isT1 = m.match.team1Player1Id === userId || m.match.team1Player2Id === userId;
                const myScore = isT1 ? m.match.score1 : m.match.score2;
                const opScore = isT1 ? m.match.score2 : m.match.score1;
                const isWin = (myScore || 0) > (opScore || 0);
                
                if (isWin) pg++; else pp++;

                history.push({
                    id: m.match.id,
                    tournament: m.eventName,
                    date: m.match.finishedAt || m.eventDate,
                    opponent: "Varias Parejas",
                    score: `${myScore}-${opScore}`,
                    isWin,
                    type: 'Cancha Abierta',
                    subType: 'Match'
                });
            }
        });

        // --- PROCESS PUBLIC MATCHES ---
        pMatches.filter(m => m.match.status === 'completed').forEach(m => {
            // These don't usually have scores, but we count them as "Played"
            pj++;
            history.push({
                id: m.match.id,
                tournament: "Partido Público",
                date: m.match.date,
                opponent: m.match.location || "Club",
                score: "-",
                isWin: null, // neutral
                type: 'Público',
                subType: 'Organizado'
            });
        });

        // Sort history by date
        const sortedHistory = history.sort((a, b) => {
            const dateA = a.date ? new Date(a.date as any).getTime() : 0;
            const dateB = b.date ? new Date(b.date as any).getTime() : 0;
            return dateB - dateA;
        });

        const wr = pj > 0 ? Math.round((pg / pj) * 100) : 0;

        return {
            player: {
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                imageUrl: user.imageUrl,
                category: user.category || "4TA",
                side: user.side || "ambos",
                points: user.points || 0,
                clubName: "Socio Independiente"
            },
            stats: {
                pj, pg, pp, wr, trofeos
            },
            history: limit ? sortedHistory.slice(0, limit) : sortedHistory
        };

    } catch (err) {
        console.error("[getPlayerProfileData]", err);
        return null;
    }
}
