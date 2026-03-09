"use server";

import { db } from "@/db";
import { tournaments, tournamentGroups, groupMatches, bracketMatches, registrations, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type PlayerLike = { id: string; name: string };
type BracketSlot = PlayerLike | "BYE" | null;

export type SaveFixtureInput = {
    tournamentId: string;
    /** Which phase triggered this save — determines the new tournament status */
    phase: "grupos" | "eliminatorias" | "finalizado";
    youtubeUrl?: string;
    groups: {
        id: string;
        name: string;
        players: PlayerLike[];
    }[];
    matches: {
        id: string;
        groupId: string;
        team1: PlayerLike;
        team2: PlayerLike;
        score1?: number;
        score2?: number;
        confirmed: boolean;
    }[];
    bracket: {
        id: string;
        round: number;
        slot: number;
        team1: BracketSlot;
        team2: BracketSlot;
        score1?: number;
        score2?: number;
        confirmed: boolean;
        winnerId?: string;
    }[];
    championName?: string;
};

function slotName(t: BracketSlot): string | null {
    if (t === null || t === "BYE") return null;
    return (t as PlayerLike).name;
}

export async function saveTournamentFixture(input: SaveFixtureInput): Promise<{ ok: boolean; newStatus?: string; error?: string }> {
    try {
        const [prevT] = await db
            .select({ status: tournaments.status, pointsConfig: tournaments.pointsConfig })
            .from(tournaments)
            .where(eq(tournaments.id, input.tournamentId));

        if (!prevT) throw new Error("Tournament not found");

        // Since neon-http doesn't support transactions in the same way, 
        // we execute these calls sequentially. 

        // 1. Delete ALL old data for this tournament to ensure a clean state
        await db.delete(groupMatches).where(eq(groupMatches.tournamentId, input.tournamentId));
        await db.delete(bracketMatches).where(eq(bracketMatches.tournamentId, input.tournamentId));
        await db.delete(tournamentGroups).where(eq(tournamentGroups.tournamentId, input.tournamentId));

        // 2. Insert new groups and collect ID mapping
        const groupIdMap = new Map<string, string>();

        for (const g of input.groups) {
            const [inserted] = (await db
                .insert(tournamentGroups)
                .values({
                    tournamentId: input.tournamentId,
                    name: g.name,
                    players: g.players,
                })
                .returning({ id: tournamentGroups.id })) as any[];
            groupIdMap.set(g.id, inserted.id);
        }

        // 3. Insert group matches
        if (input.matches.length > 0) {
            const matchValues = input.matches.map(m => {
                const dbGroupId = groupIdMap.get(m.groupId);
                if (!dbGroupId) throw new Error(`Internal Error: Group ID ${m.groupId} not found in map`);
                return {
                    tournamentId: input.tournamentId,
                    groupId: dbGroupId,
                    team1Name: m.team1.name,
                    team2Name: m.team2.name,
                    score1: m.score1 ?? null,
                    score2: m.score2 ?? null,
                    confirmed: m.confirmed,
                };
            });
            await db.insert(groupMatches).values(matchValues);
        }

        // 4. Insert bracket matches
        if (input.bracket.length > 0) {
            const allPlayers = input.groups.flatMap(g => g.players);
            const bracketValues = input.bracket.map(bm => {
                const winnerName = bm.winnerId
                    ? allPlayers.find(p => p.id === bm.winnerId)?.name ?? null
                    : null;

                return {
                    tournamentId: input.tournamentId,
                    round: bm.round,
                    slot: bm.slot,
                    team1Name: slotName(bm.team1),
                    team2Name: slotName(bm.team2),
                    score1: bm.score1 ?? null,
                    score2: bm.score2 ?? null,
                    confirmed: bm.confirmed,
                    winnerId: bm.winnerId ?? null,
                    winnerName,
                };
            });
            await db.insert(bracketMatches).values(bracketValues);
        }

        // 5. Update tournament metadata and status
        const statusMap: Record<SaveFixtureInput["phase"], string> = {
            grupos: "en_curso",
            eliminatorias: "en_eliminatorias",
            finalizado: "finalizado",
        };
        const newStatus = statusMap[input.phase];

        // 6. Assign points if tournament is being finalized for the first time
        if (input.phase === "finalizado" && prevT.status !== "finalizado" && prevT.pointsConfig) {
            const points = prevT.pointsConfig as any;

            // Get all registrations to map player IDs (which are registration IDs) to user IDs
            const regs = await db.select().from(registrations).where(eq(registrations.tournamentId, input.tournamentId));

            // Track points to add to each user
            const userPointsAddition = new Map<string, number>();

            const addPoints = (playerId: string | null | undefined, pts: number) => {
                if (!playerId || playerId === "BYE") return;
                const r = regs.find(reg => reg.id === playerId);
                if (r) {
                    if (r.userId) {
                        userPointsAddition.set(r.userId, (userPointsAddition.get(r.userId) || 0) + pts);
                    }
                    if (r.partnerUserId) {
                        userPointsAddition.set(r.partnerUserId, (userPointsAddition.get(r.partnerUserId) || 0) + pts);
                    }
                }
            };

            // Evaluate bracket matches to determine highest round lost
            input.bracket.forEach(bm => {
                if (!bm.confirmed) return;

                const t1Id = (bm.team1 as any)?.id;
                const t2Id = (bm.team2 as any)?.id;

                if (bm.round === 0) { // Final
                    if (bm.winnerId === t1Id) {
                        addPoints(t1Id, points.winner || 0);
                        addPoints(t2Id, points.finalist || 0);
                    } else if (bm.winnerId === t2Id) {
                        addPoints(t2Id, points.winner || 0);
                        addPoints(t1Id, points.finalist || 0);
                    }
                } else if (bm.round === 1) { // Semifinals
                    const loserId = bm.winnerId === t1Id ? t2Id : t1Id;
                    addPoints(loserId, points.semi || 0);
                } else if (bm.round === 2) { // Quarterfinals
                    const loserId = bm.winnerId === t1Id ? t2Id : t1Id;
                    addPoints(loserId, points.quarter || 0);
                } else if (bm.round === 3) { // Round of 16 / Octavos
                    const loserId = bm.winnerId === t1Id ? t2Id : t1Id;
                    addPoints(loserId, points.octavos || 0);
                }
            });

            // Update user points
            const updates = Array.from(userPointsAddition.entries()).map(([uid, pts]) => {
                if (pts > 0) {
                    return db
                        .update(users)
                        .set({ points: sql`${users.points} + ${pts}` })
                        .where(eq(users.id, uid));
                }
                return null;
            }).filter(Boolean);

            if (updates.length > 0) {
                await Promise.all(updates);
            }
        }

        await db
            .update(tournaments)
            .set({
                status: newStatus,
                ...(input.youtubeUrl ? { youtubeUrl: input.youtubeUrl } : {}),
            })
            .where(eq(tournaments.id, input.tournamentId));

        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${input.tournamentId}/manage`);

        return { ok: true, newStatus };
    } catch (err) {
        console.error("[saveTournamentFixture]", err);
        return { ok: false, error: String(err) };
    }
}

export async function deleteTournament(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
        // Sequentially delete related records to clear constraints
        await db.delete(bracketMatches).where(eq(bracketMatches.tournamentId, id));
        await db.delete(groupMatches).where(eq(groupMatches.tournamentId, id));
        await db.delete(tournamentGroups).where(eq(tournamentGroups.tournamentId, id));
        await db.delete(registrations).where(eq(registrations.tournamentId, id));
        await db.delete(tournaments).where(eq(tournaments.id, id));

        revalidatePath("/tournaments");
        revalidatePath("/profiles/club");

        return { ok: true };
    } catch (err) {
        console.error("[deleteTournament]", err);
        return { ok: false, error: String(err) };
    }
}

export async function getAvailablePlayers(tournamentId: string) {
    try {
        // Get all users with role 'jugador'
        const allUsers = await db.select().from(users).where(eq(users.role, "jugador"));

        // Get already registered users for this tournament
        const existingRegs = await db.select({ userId: registrations.userId }).from(registrations).where(eq(registrations.tournamentId, tournamentId));
        const registeredIds = new Set(existingRegs.map(r => r.userId));

        // Filter out already registered
        return allUsers.filter(u => !registeredIds.has(u.id)).map(u => ({
            id: u.id,
            name: u.name || u.email.split("@")[0],
            email: u.email,
            category: u.category
        }));
    } catch (err) {
        console.error("[getAvailablePlayers]", err);
        return [];
    }
}

export async function quickInscribePlayer(tournamentId: string, userId: string, category?: string) {
    try {
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) throw new Error("User not found");

        const [newReg] = (await db.insert(registrations).values({
            tournamentId,
            userId,
            category: category || user.category || "5ta",
            status: "confirmed"
        }).returning()) as any[];

        revalidatePath(`/tournaments/${tournamentId}/fixture`);

        return {
            ok: true,
            player: {
                id: newReg.id,
                name: `${user.name || user.email.split("@")[0]} / Invitado`,
                category: newReg.category || undefined
            }
        };
    } catch (err) {
        console.error("[quickInscribePlayer]", err);
        return { ok: false, error: String(err) };
    }
}
