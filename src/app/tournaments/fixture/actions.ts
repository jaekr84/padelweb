"use server";

import { db } from "@/db";
import { tournaments, tournamentGroups, groupMatches, bracketMatches, registrations } from "@/db/schema";
import { eq } from "drizzle-orm";
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
        // Since neon-http doesn't support transactions in the same way, 
        // we execute these calls sequentially. 

        // 1. Delete ALL old data for this tournament to ensure a clean state
        await db.delete(groupMatches).where(eq(groupMatches.tournamentId, input.tournamentId));
        await db.delete(bracketMatches).where(eq(bracketMatches.tournamentId, input.tournamentId));
        await db.delete(tournamentGroups).where(eq(tournamentGroups.tournamentId, input.tournamentId));

        // 2. Insert new groups and collect ID mapping
        const groupIdMap = new Map<string, string>();

        for (const g of input.groups) {
            const [inserted] = await db
                .insert(tournamentGroups)
                .values({
                    tournamentId: input.tournamentId,
                    name: g.name,
                    players: g.players,
                })
                .returning({ id: tournamentGroups.id });
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

        await db
            .update(tournaments)
            .set({
                status: newStatus,
                ...(input.youtubeUrl ? { youtubeUrl: input.youtubeUrl } : {}),
            })
            .where(eq(tournaments.id, input.tournamentId));

        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${input.tournamentId}/live`);
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
