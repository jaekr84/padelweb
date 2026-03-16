"use server";

import { db } from "@/db";
import { tournaments, tournamentGroups, groupMatches, bracketMatches, registrations, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-server";

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

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/** Ensures data is an object/array, parsing it only if it's a string */
function ensureParsed(val: any) {
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        } catch (e) {
            console.error("[ensureParsed] Failed to parse:", val);
            return val;
        }
    }
    return val;
}

export async function saveTournamentFixture(input: SaveFixtureInput): Promise<{ ok: boolean; newStatus?: string; error?: string }> {
    try {
        console.log(`[saveTournamentFixture] Saving tournament ${input.tournamentId} (Phase: ${input.phase})`);
        const [prevT] = await db
            .select({ status: tournaments.status, pointsConfig: tournaments.pointsConfig, createdByUserId: tournaments.createdByUserId })
            .from(tournaments)
            .where(eq(tournaments.id, input.tournamentId));

        if (!prevT) throw new Error("Tournament not found");

        const session = await getSession();
        if (!session?.userId) throw new Error("No autorizado");

        const user = await db.query.users.findFirst({ where: eq(users.id, session.userId as string) });
        const isSuperAdmin = user?.role === 'superadmin';

        if (prevT.createdByUserId !== session.userId && !isSuperAdmin) {
            throw new Error("No tenés permiso para gestionar este torneo");
        }

        // Sequential deletes
        await db.delete(groupMatches).where(eq(groupMatches.tournamentId, input.tournamentId));
        await db.delete(bracketMatches).where(eq(bracketMatches.tournamentId, input.tournamentId));
        await db.delete(tournamentGroups).where(eq(tournamentGroups.tournamentId, input.tournamentId));

        // 2. Insert groups
        const groupIdMap = new Map<string, string>();
        for (const g of input.groups) {
            const idToUse = isUUID(g.id) ? g.id : crypto.randomUUID();
            await db
                .insert(tournamentGroups)
                .values({
                    id: idToUse,
                    tournamentId: input.tournamentId,
                    name: g.name,
                    players: ensureParsed(g.players),
                });
            groupIdMap.set(g.id, idToUse);
        }

        // 3. Insert group matches
        if (input.matches.length > 0) {
            const matchValues = input.matches.map(m => {
                const dbGroupId = groupIdMap.get(m.groupId) || m.groupId; // Fallback if already mapped
                const idToUse = isUUID(m.id) ? m.id : crypto.randomUUID();
                return {
                    id: idToUse,
                    tournamentId: input.tournamentId,
                    groupId: dbGroupId,
                    team1Id: (m.team1 as any)?.id ?? null,
                    team2Id: (m.team2 as any)?.id ?? null,
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
            const allPlayers = input.groups.flatMap(g => ensureParsed(g.players));
            const bracketValues = input.bracket.map(bm => {
                let winnerName = bm.winnerId
                    ? allPlayers.find(p => p.id === bm.winnerId)?.name ?? null
                    : null;
                
                if (!winnerName && bm.winnerId && (bm as any).winnerName) {
                    winnerName = (bm as any).winnerName;
                }

                const idToUse = isUUID(bm.id) ? bm.id : crypto.randomUUID();

                return {
                    id: idToUse,
                    tournamentId: input.tournamentId,
                    round: bm.round,
                    slot: bm.slot,
                    team1Id: (bm.team1 as any)?.id ?? null,
                    team2Id: (bm.team2 as any)?.id ?? null,
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
        if (input.phase === "finalizado" && prevT.status !== "finalizado") {
            await awardTournamentPoints(input.tournamentId, input.bracket);
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
        const session = await getSession();
        if (!session?.userId) throw new Error("No autorizado");

        const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
        if (!t) throw new Error("Torneo no encontrado");

        const user = await db.query.users.findFirst({ where: eq(users.id, session.userId as string) });
        const isSuperAdmin = user?.role === 'superadmin';

        if (t.createdByUserId !== session.userId && !isSuperAdmin) {
            throw new Error("No tenés permiso para eliminar este torneo");
        }

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
        const allUsers = await db.select().from(users).where(eq(users.role, "jugador"));
        const existingRegs = await db.select({ userId: registrations.userId }).from(registrations).where(eq(registrations.tournamentId, tournamentId));
        const registeredIds = new Set(existingRegs.map(r => r.userId));
        return allUsers.filter(u => !registeredIds.has(u.id)).map(u => ({
            id: u.id,
            name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email.split("@")[0],
            email: u.email,
            category: u.category,
            gender: u.gender
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
        const newId = crypto.randomUUID();
        await db.insert(registrations).values({
            id: newId,
            tournamentId,
            userId,
            category: category || user.category || "D",
            status: "confirmed"
        });
        await db.update(users)
            .set({ lastParticipationAt: new Date() })
            .where(eq(users.id, userId));

        revalidatePath(`/tournaments/${tournamentId}/fixture`);
        return { ok: true, player: { id: newId, name: `${[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0]} / Invitado`, category: category || user.category || "D" } };
    } catch (err) {
        console.error("[quickInscribePlayer]", err);
        return { ok: false, error: String(err) };
    }
}

export async function finalizeTournament(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const session = await getSession();
        if (!session?.userId) throw new Error("No autorizado");
        const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
        if (!t) throw new Error("Torneo no encontrado");
        const user = await db.query.users.findFirst({ where: eq(users.id, session.userId as string) });
        const isSuperAdmin = user?.role === 'superadmin';
        if (t.createdByUserId !== session.userId && !isSuperAdmin) {
            throw new Error("No tenés permiso para finalizar este torneo");
        }
        if (t.status !== "finalizado") {
            await awardTournamentPoints(id);
        }
        await db.update(tournaments).set({ status: "finalizado" }).where(eq(tournaments.id, id));
        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${id}`);
        revalidatePath(`/tournaments/${id}/manage`);
        revalidatePath("/admin/tournaments");
        return { ok: true };
    } catch (err) {
        console.error("[finalizeTournament]", err);
        return { ok: false, error: String(err) };
    }
}

export async function awardTournamentPoints(tournamentId: string, providedBracket?: any[]) {
    try {
        console.log(`[awardTournamentPoints] Iniciando para torneo: ${tournamentId}`);
        const [t] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
        if (!t || !t.pointsConfig) {
            console.log(`[awardTournamentPoints] No se encontró el torneo o puntosConfig para ${tournamentId}`);
            return;
        }

        const points = ensureParsed(t.pointsConfig);
        console.log(`[awardTournamentPoints] Config de puntos cargada:`, points);

        const regs = await db.select().from(registrations).where(eq(registrations.tournamentId, tournamentId));
        console.log(`[awardTournamentPoints] Encontradas ${regs.length} inscripciones`);
        const groups = await db.select().from(tournamentGroups).where(eq(tournamentGroups.tournamentId, tournamentId));
        const groupMatchesList = await db.select().from(groupMatches).where(eq(groupMatches.tournamentId, tournamentId));
        
        let bracketToProcess = providedBracket;
        if (!bracketToProcess) {
            const dbBracket = await db.select().from(bracketMatches).where(eq(bracketMatches.tournamentId, tournamentId));
            bracketToProcess = dbBracket.map(bm => ({
                ...bm,
                team1: bm.team1Id ? { id: bm.team1Id } : null,
                team2: bm.team2Id ? { id: bm.team2Id } : null,
            }));
        }

        const userPointsAddition = new Map<string, number>();

        const addPoints = (playerId: string | null | undefined, pts: number | string) => {
            if (!playerId || playerId === "BYE") return;
            
            const pointsToAdd = Number(pts) || 0;
            if (pointsToAdd === 0) return;

            let r = regs.find(reg => reg.id === playerId);
            if (!r) {
                r = regs.find(reg => reg.userId === playerId);
            }

            if (r) {
                console.log(`[awardTournamentPoints] -> Jugador ${playerId} (User: ${r.userId}) suma ${pointsToAdd}`);
                if (r.userId) {
                    userPointsAddition.set(r.userId, (userPointsAddition.get(r.userId) || 0) + pointsToAdd);
                }
                if (r.partnerUserId) {
                    userPointsAddition.set(r.partnerUserId, (userPointsAddition.get(r.partnerUserId) || 0) + pointsToAdd);
                }
            } else {
                console.warn(`[awardTournamentPoints] No se encontró inscripción para ID: ${playerId}`);
            }
        };

        // 1. Participation Points
        if (points.participation > 0) {
            regs.forEach(r => {
                if (r.userId) userPointsAddition.set(r.userId, (userPointsAddition.get(r.userId) || 0) + points.participation);
                if (r.partnerUserId) userPointsAddition.set(r.partnerUserId, (userPointsAddition.get(r.partnerUserId) || 0) + points.participation);
            });
        }

        // 2. Group Match Win Points
        if (points.groupMatchWin > 0) {
            groupMatchesList.forEach(m => {
                if (!m.confirmed) return;
                const winnerId = m.score1! > m.score2! ? m.team1Id : (m.score2! > m.score1! ? m.team2Id : null);
                if (winnerId) addPoints(winnerId, points.groupMatchWin);
            });
        }

        // 3. Bracket Points (Reached Rounds)
        if (bracketToProcess) {
            bracketToProcess.forEach(bm => {
                if (!bm.confirmed) return;
                const t1Id = (bm.team1 as any)?.id?.toString();
                const t2Id = (bm.team2 as any)?.id?.toString();
                const wId = bm.winnerId?.toString();
                
                if (bm.round === 0) { // Final
                    if (wId === t1Id) {
                        addPoints(t1Id, points.winner || 0);
                        addPoints(t2Id, points.finalist || 0);
                    } else if (wId === t2Id) {
                        addPoints(t2Id, points.winner || 0);
                        addPoints(t1Id, points.finalist || 0);
                    }
                } else {
                    const loserId = wId === t1Id ? t2Id : (wId === t2Id ? t1Id : null);
                    if (loserId) {
                        let pts = 0;
                        if (bm.round === 1) pts = points.semi || 0;
                        else if (bm.round === 2) pts = points.quarter || 0;
                        else if (bm.round === 3) pts = points.octavos || points.roundOf16 || 0;
                        
                        if (pts > 0) addPoints(loserId, pts);
                    }
                }
            });
        }

        // Final points update and promotion logic
        for (const [uid, pts] of userPointsAddition.entries()) {
            if (pts > 0) {
                await db
                    .update(users)
                    .set({ points: sql`COALESCE(${users.points}, 0) + ${pts}` })
                    .where(eq(users.id, uid));

                const updatedUser = await db.query.users.findFirst({ where: eq(users.id, uid) });
                if (updatedUser) {
                    const { getCategoryFromPoints, getCategoryByName, getAllActiveCategories, countUserWins } = await import("@/lib/categories");
                    
                    // Logic: Promote if points reach threshold OR if they win trophies
                    const newCatByPoints = await getCategoryFromPoints(updatedUser.points ?? 0);
                    const currentCatObj = await getCategoryByName(updatedUser.category || "D");
                    
                    if (newCatByPoints && currentCatObj && newCatByPoints.categoryOrder < currentCatObj.categoryOrder) {
                        const currentYear = new Date().getFullYear();
                        const titleWins = await countUserWins(uid, updatedUser.category || "D", currentYear);
                        
                        // FLEXIBLE RULE:
                        // 1. If Category suggests promotion AND Wins >= 1 (Make it 1 tournament win + enough points)
                        // OR 2. Wins >= 2 (Even if points don't reach threshold, winning 2 titles is clear sign)
                        // OR 3. Points exceed category MAX by 15%
                        const pointsThreshold = currentCatObj.maxPoints * 1.15;
                        const deservesPromotion = (titleWins >= 1) || (updatedUser.points! >= pointsThreshold) || (titleWins >= 2);

                        if (deservesPromotion) {
                            const allCats = await getAllActiveCategories();
                            // Ascending means categoryOrder decreases (e.g. from 3 to 2)
                            // We want the ONE category immediately better than currentCatObj
                            const nextCat = allCats
                                .filter(c => c.categoryOrder < currentCatObj.categoryOrder)
                                .sort((a, b) => b.categoryOrder - a.categoryOrder)[0]; 
                            
                            if (nextCat) {
                                console.log(`[ascentCheck] PROMOTING User ${uid} to ${nextCat.name} (deservesPromotion: ${deservesPromotion})`);
                                await db.update(users).set({ category: nextCat.name }).where(eq(users.id, uid));
                            }
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error("[awardTournamentPoints]", err);
    }
}

