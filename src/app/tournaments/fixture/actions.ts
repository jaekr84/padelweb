"use server";

import { db } from "@/db";
import { tournaments, tournamentGroups, groupMatches, bracketMatches } from "@/db/schema";
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
        // 1. Upsert groups and collect DB id mapping (bracket_id → db_uuid)
        const groupIdMap = new Map<string, string>(); // local group id → db uuid

        for (const g of input.groups) {
            // Check if already exists (by tournamentId + name) to allow re-saves
            const existing = await db
                .select()
                .from(tournamentGroups)
                .where(eq(tournamentGroups.tournamentId, input.tournamentId))
                .execute();

            const existingGroup = existing.find(r => r.name === g.name);

            if (existingGroup) {
                groupIdMap.set(g.id, existingGroup.id);
                // Update players
                await db
                    .update(tournamentGroups)
                    .set({ players: g.players })
                    .where(eq(tournamentGroups.id, existingGroup.id));
            } else {
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
        }

        // 2. Delete old group matches and re-insert (simplest idempotent approach)
        await db
            .delete(groupMatches)
            .where(eq(groupMatches.tournamentId, input.tournamentId));

        for (const m of input.matches) {
            const dbGroupId = groupIdMap.get(m.groupId);
            if (!dbGroupId) continue;
            await db.insert(groupMatches).values({
                tournamentId: input.tournamentId,
                groupId: dbGroupId,
                team1Name: m.team1.name,
                team2Name: m.team2.name,
                score1: m.score1 ?? null,
                score2: m.score2 ?? null,
                confirmed: m.confirmed,
            });
        }

        // 3. Delete old bracket matches and re-insert
        await db
            .delete(bracketMatches)
            .where(eq(bracketMatches.tournamentId, input.tournamentId));

        for (const bm of input.bracket) {
            const allPlayers = input.groups.flatMap(g => g.players);
            const winnerName = bm.winnerId
                ? allPlayers.find(p => p.id === bm.winnerId)?.name ?? null
                : null;

            await db.insert(bracketMatches).values({
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
            });
        }

        // 4. Update tournament status based on phase
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

        return { ok: true, newStatus };
    } catch (err) {
        console.error("[saveTournamentFixture]", err);
        return { ok: false, error: String(err) };
    }
}
