"use server";

import { db } from "@/db";
import { tournaments, tournamentGroups, groupMatches, bracketMatches, registrations, users, categoriesTable } from "@/db/schema";
import { eq, sql, inArray, and, not, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-server";

type PlayerLike = { id: string; name: string; clubId?: string | null };
type BracketSlot = PlayerLike | "BYE" | null;

export type SaveFixtureInput = {
    tournamentId: string;
    /** Which phase triggered this save — determines the new tournament status */
    phase: "grupos" | "eliminatorias" | "finalizado";
    /** ISO string of the updatedAt the client last saw. If provided and mismatches DB, save is rejected. */
    lastKnownUpdatedAt?: string;
    youtubeUrl?: string;
    groups: {
        id: string;
        name: string;
        players: PlayerLike[];
        courtNumber?: string | number | null;
    }[];
    matches: {
        id: string;
        groupId: string;
        team1: PlayerLike;
        team2: PlayerLike;
        score1?: number;
        score2?: number;
        confirmed: boolean;
        status?: string;
        roundIndex?: number;
        courtNumber?: number;
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
        status?: string;
        winnerId?: string;
    }[];
    championName?: string;
    modalidad?: any;
    presentPlayerIds?: string[];
    paidPlayerIds?: string[];
    skipRevalidation?: boolean;
    /**
     * Rearma la fase de grupos desde el armado ("Iniciar Torneo"): fuerza el
     * estado a "en_curso" aunque el torneo ya hubiera pasado a eliminatorias.
     * No lo usa el guardado de fondo de la vista de grupos.
     */
    restartGroups?: boolean;
};
function slotName(t: BracketSlot): string | null {
    if (!t) return null;
    if (t === "BYE") return "BYE";
    return (t as PlayerLike).name || null;
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

export async function saveTournamentFixture(input: SaveFixtureInput): Promise<{ ok: boolean; newStatus?: string; newUpdatedAt?: string; conflictError?: boolean; error?: string }> {
    try {
        console.log(`\n\n>>> [SERVER] SAVE TOURNAMENT FIXTURE CALLED <<<`);
        console.log(`>>> ID: ${input.tournamentId} | Phase: ${input.phase} | Matches: ${input.matches?.length || 0} <<<\n`);
        
        return await db.transaction(async (tx) => {
            const [prevT] = await tx
                .select({ status: tournaments.status, pointsConfig: tournaments.pointsConfig, createdByUserId: tournaments.createdByUserId, updatedAt: tournaments.updatedAt })
                .from(tournaments)
                .where(eq(tournaments.id, input.tournamentId));

            if (!prevT) throw new Error("Tournament not found");

            const session = await getSession();
            if (!session?.userId) throw new Error("No autorizado");

            const isAdmin = session.role === 'admin' || session.role === 'superadmin' || session.role === 'club';
            const isOwner = prevT.createdByUserId === session.userId;

            if (!isAdmin && !isOwner) {
                throw new Error("No tenés permiso para gestionar este torneo");
            }

            // Optimistic locking: reject if another admin saved in between
            if (input.lastKnownUpdatedAt && prevT.updatedAt) {
                const dbTs = new Date(prevT.updatedAt).getTime();
                const clientTs = new Date(input.lastKnownUpdatedAt).getTime();
                if (Math.abs(dbTs - clientTs) > 1000) {
                    return { ok: false, conflictError: true, error: "CONFLICT" };
                }
            }

            const saveTime = new Date();

            // Preserve existing per-match timing across the delete+reinsert save.
            // Keyed by id (stable UUIDs once the tournament is running).
            const prevGroupTiming = new Map<string, { startedAt: Date | null; finishedAt: Date | null }>();
            (await tx
                .select({ id: groupMatches.id, startedAt: groupMatches.startedAt, finishedAt: groupMatches.finishedAt })
                .from(groupMatches)
                .where(eq(groupMatches.tournamentId, input.tournamentId)))
                .forEach(r => prevGroupTiming.set(r.id, { startedAt: r.startedAt, finishedAt: r.finishedAt }));

            const prevBracketTiming = new Map<string, { startedAt: Date | null; finishedAt: Date | null }>();
            (await tx
                .select({ id: bracketMatches.id, startedAt: bracketMatches.startedAt, finishedAt: bracketMatches.finishedAt })
                .from(bracketMatches)
                .where(eq(bracketMatches.tournamentId, input.tournamentId)))
                .forEach(r => prevBracketTiming.set(r.id, { startedAt: r.startedAt, finishedAt: r.finishedAt }));

            // 1. Initial cleanup
            await tx.delete(groupMatches).where(eq(groupMatches.tournamentId, input.tournamentId));
            await tx.delete(bracketMatches).where(eq(bracketMatches.tournamentId, input.tournamentId));
            await tx.delete(tournamentGroups).where(eq(tournamentGroups.tournamentId, input.tournamentId));

            // 2. Insert groups
            const groupIdMap = new Map<string, string>();
            for (const g of input.groups) {
                const idToUse = isUUID(g.id) ? g.id : crypto.randomUUID();
                await tx
                    .insert(tournamentGroups)
                    .values({
                        id: idToUse,
                        tournamentId: input.tournamentId,
                        name: g.name,
                        players: ensureParsed(g.players),
                        courtNumber: g.courtNumber != null && String(g.courtNumber).trim() !== ""
                            ? String(g.courtNumber).trim().slice(0, 50)
                            : null,
                    });
                groupIdMap.set(g.id, idToUse);
            }

            // 3. Insert group matches
            if (input.matches && input.matches.length > 0) {
                const matchValues = input.matches.map(m => {
                    const dbGroupId = groupIdMap.get(m.groupId) || m.groupId;
                    const idToUse = isUUID(m.id) ? m.id : crypto.randomUUID();
                    
                    // Explicitly convert to numbers for MySQL tinyint/smallint
                    const s1 = (m.score1 !== undefined && m.score1 !== null) ? Number(m.score1) : null;
                    const s2 = (m.score2 !== undefined && m.score2 !== null) ? Number(m.score2) : null;
                    const isConfirmed = m.confirmed ? 1 : 0;
                    // Confirmed always wins (a match may still carry an 'in_progress'
                    // status from the client, e.g. Americano matches).
                    const status = isConfirmed ? "finished" : (m.status || "pending");
                    // "live" is the Americano vocabulary for in-progress.
                    const isLive = status === "in_progress" || status === "live";
                    const isDone = !!isConfirmed || status === "finished" || status === "completed";
                    const prevTiming = prevGroupTiming.get(idToUse);
                    // Keep the first start time while the match is live/done; a match sent
                    // back to 'pending' (undo start) loses it so stats don't count that time.
                    const startedAt = (isLive || isDone) ? (prevTiming?.startedAt ?? saveTime) : null;
                    const finishedAt = isDone ? (prevTiming?.finishedAt ?? saveTime) : null;

                    return {
                        id: idToUse,
                        tournamentId: input.tournamentId,
                        groupId: dbGroupId,
                        team1Id: (m.team1 as any)?.id ?? null,
                        team2Id: (m.team2 as any)?.id ?? null,
                        team1Name: m.team1.name || "Equipo 1",
                        team2Name: m.team2.name || "Equipo 2",
                        score1: s1,
                        score2: s2,
                        confirmed: isConfirmed as any,
                        status,
                        roundIndex: m.roundIndex !== undefined ? Number(m.roundIndex) : null,
                        courtNumber: m.courtNumber !== undefined ? Number(m.courtNumber) : null,
                        startedAt,
                        finishedAt,
                    };
                });
                
                if (matchValues.length > 0) {
                    await tx.insert(groupMatches).values(matchValues);
                }
            }

            // 4. Insert bracket matches
            if (input.bracket && input.bracket.length > 0) {
                const allPlayers = input.groups.flatMap(g => ensureParsed(g.players));
                const bracketValues = input.bracket.map(bm => {
                    let winnerName = bm.winnerId
                        ? allPlayers.find(p => p.id === bm.winnerId)?.name ?? null
                        : null;

                    if (!winnerName && bm.winnerId && (bm as any).winnerName) {
                        winnerName = (bm as any).winnerName;
                    }

                    const idToUse = isUUID(bm.id) ? bm.id : crypto.randomUUID();
                    const s1 = (bm.score1 !== undefined && bm.score1 !== null) ? Number(bm.score1) : null;
                    const s2 = (bm.score2 !== undefined && bm.score2 !== null) ? Number(bm.score2) : null;
                    const isConfirmed = bm.confirmed ? 1 : 0;
                    const status = isConfirmed ? "finished" : (bm.status || "pending");
                    // "live" is the Americano vocabulary for in-progress.
                    const isLive = status === "in_progress" || status === "live";
                    const isDone = !!isConfirmed || status === "finished" || status === "completed";
                    const prevTiming = prevBracketTiming.get(idToUse);
                    const startedAt = prevTiming?.startedAt ?? ((isLive || isDone) ? saveTime : null);
                    const finishedAt = isDone ? (prevTiming?.finishedAt ?? saveTime) : null;

                    return {
                        id: idToUse,
                        tournamentId: input.tournamentId,
                        round: Number(bm.round),
                        slot: Number(bm.slot),
                        team1Id: (bm.team1 as any)?.id ?? null,
                        team2Id: (bm.team2 as any)?.id ?? null,
                        team1Name: slotName(bm.team1),
                        team2Name: slotName(bm.team2),
                        score1: s1,
                        score2: s2,
                        confirmed: isConfirmed as any,
                        status,
                        winnerId: bm.winnerId ?? null,
                        winnerName,
                        startedAt,
                        finishedAt,
                    };
                });
                if (bracketValues.length > 0) {
                    await tx.insert(bracketMatches).values(bracketValues);
                }
            }

            // 5. Update tournament metadata and status
            const statusMap: Record<SaveFixtureInput["phase"], string> = {
                grupos: "en_curso",
                eliminatorias: "en_eliminatorias",
                finalizado: "finalizado",
            };
            
            // Protect status: don't go back from eliminatorias to en_curso unless explicitly forced.
            // El guardado de fondo de la vista de grupos usa phase "grupos" aunque el
            // torneo ya esté en llaves, y sin esto lo tiraría para atrás.
            // `restartGroups` es el "explícitamente forzado": lo manda solo el botón
            // "Iniciar Torneo" del armado, que rehace el fixture desde cero.
            let newStatus = statusMap[input.phase];
            if (prevT.status === "en_eliminatorias" && input.phase === "grupos" && !input.restartGroups) {
                newStatus = "en_eliminatorias";
            }

            // 6. Assign points if tournament is being finalized for the first time
            if (input.phase === "finalizado" && prevT.status !== "finalizado") {
                await awardTournamentPoints(input.tournamentId, input.bracket);
            }

            await tx
                .update(tournaments)
                .set({
                    status: newStatus,
                    updatedAt: saveTime,
                    ...(input.youtubeUrl ? { youtubeUrl: input.youtubeUrl } : {}),
                    ...(input.modalidad ? { modalidad: input.modalidad } : {}),
                    presentPlayerIds: input.presentPlayerIds || [],
                    paidPlayerIds: input.paidPlayerIds || [],
                    // Stamp the moment the tournament is finalized (first time only).
                    ...(input.phase === "finalizado" && prevT.status !== "finalizado" ? { finalizedAt: saveTime } : {}),
                })
                .where(eq(tournaments.id, input.tournamentId));
            if (!input.skipRevalidation) {
                revalidatePath("/tournaments");
                revalidatePath(`/tournaments/${input.tournamentId}/manage`);
            }

            return { ok: true, newStatus, newUpdatedAt: saveTime.toISOString() };
        });
    } catch (err) {
        console.error("[saveTournamentFixture]", err);
        return { ok: false, error: String(err) };
    }
}

/**
 * Guarda solo la cancha de un grupo. Va aparte de saveTournamentFixture a
 * propósito: es un UPDATE puntual, no toca partidos ni `tournaments.updatedAt`,
 * así que no dispara el bloqueo optimista de los otros admins conectados.
 */
export async function updateGroupCourt(input: {
    tournamentId: string;
    groupId: string;
    courtNumber: string | null;
}): Promise<{ ok: boolean; courtNumber?: string | null; error?: string }> {
    try {
        const session = await getSession();
        if (!session?.userId) return { ok: false, error: "No autorizado" };

        const [tournament] = await db
            .select({ createdByUserId: tournaments.createdByUserId })
            .from(tournaments)
            .where(eq(tournaments.id, input.tournamentId))
            .limit(1);

        if (!tournament) return { ok: false, error: "Torneo no encontrado" };

        const isAdmin = session.role === 'admin' || session.role === 'superadmin' || session.role === 'club';
        const isOwner = tournament.createdByUserId === session.userId;
        if (!isAdmin && !isOwner) return { ok: false, error: "No tenés permiso para gestionar este torneo" };

        const raw = (input.courtNumber ?? "").trim().slice(0, 50);
        const value = raw === "" ? null : raw;

        // El tournamentId acota el grupo al torneo: un groupId de otro torneo no entra.
        const groupFilter = and(
            eq(tournamentGroups.id, input.groupId),
            eq(tournamentGroups.tournamentId, input.tournamentId),
        );

        const [group] = await db
            .select({ id: tournamentGroups.id })
            .from(tournamentGroups)
            .where(groupFilter)
            .limit(1);

        if (!group) return { ok: false, error: "Grupo no encontrado" };

        await db.update(tournamentGroups).set({ courtNumber: value }).where(groupFilter);

        revalidatePath(`/tournaments/${input.tournamentId}/manage`);
        revalidatePath(`/tournaments/${input.tournamentId}/resultados`);

        return { ok: true, courtNumber: value };
    } catch (err) {
        console.error("[updateGroupCourt]", err);
        return { ok: false, error: String(err) };
    }
}

export async function deleteTournament(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const session = await getSession();
        if (!session?.userId) throw new Error("No autorizado");

        const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
        if (!t) throw new Error("Torneo no encontrado");

        const isAdmin = session.role === 'admin' || session.role === 'superadmin' || session.role === 'club';
        const isOwner = t.createdByUserId === session.userId;

        if (!isAdmin && !isOwner) {
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
        const allUsers = await db.select().from(users)
            .where(not(like(users.email, '%@manual.test')));
        const existingRegs = await db.select({
            u1: registrations.userId,
            u2: registrations.partnerUserId
        }).from(registrations).where(eq(registrations.tournamentId, tournamentId));
        
        const registeredIds = new Set();
        existingRegs.forEach(r => {
            if (r.u1) registeredIds.add(r.u1);
            if (r.u2) registeredIds.add(r.u2);
        });
        return allUsers.filter(u => !registeredIds.has(u.id)).map(u => ({
            id: u.id,
            name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email.split("@")[0],
            email: u.email,
            category: u.category,
            gender: u.gender,
            side: u.side,
            isGuest: u.isGuest,
            clubId: u.clubId
        }));
    } catch (err) {
        console.error("[getAvailablePlayers]", err);
        return [];
    }
}

export async function quickInscribePlayer(tournamentId: string, userId: string, category?: string) {
    try {
        const session = await getSession();
        if (!session?.userId) throw new Error("No autorizado");

        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) throw new Error("User not found");

        const [tournament] = await db.select({ 
            modalidad: tournaments.modalidad, 
            createdByUserId: tournaments.createdByUserId 
        }).from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
        
        if (!tournament) throw new Error("Torneo no encontrado");

        const isAdmin = session.role === 'admin' || session.role === 'superadmin' || session.role === 'club';
        const isOwner = tournament.createdByUserId === session.userId;

        if (!isAdmin && !isOwner) {
            throw new Error("No tenés permiso para gestionar este torneo");
        }

        let mod: any = tournament?.modalidad;
        try {
            if (typeof mod === 'string' && mod.trim().startsWith('{')) mod = JSON.parse(mod);
        } catch (e) { }

        // Check for duplicate registration
        const [existing] = await db.select({ id: registrations.id })
            .from(registrations)
            .where(and(
                eq(registrations.tournamentId, tournamentId),
                eq(registrations.userId, userId)
            ))
            .limit(1);

        if (existing) return { ok: false, error: "El jugador ya está inscripto en este torneo" };

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

        const isIndividual = mod?.participacion === "individual";

        const playerName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0];

        revalidatePath(`/tournaments/${tournamentId}/fixture`);
        return {
            ok: true,
            player: {
                id: newId,
                name: isIndividual ? playerName : `${playerName}`,
                category: category || user.category || "D",
                clubId: user.clubId,
                userId: userId,
                partnerUserId: null
            }
        };
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
        const isAdmin = session.role === 'admin' || session.role === 'superadmin' || session.role === 'club';
        const isOwner = t.createdByUserId === session.userId;

        if (!isAdmin && !isOwner) {
            throw new Error("No tenés permiso para finalizar este torneo");
        }
        const firstFinalize = t.status !== "finalizado";
        if (firstFinalize) {
            await awardTournamentPoints(id);
        }
        await db.update(tournaments).set({
            status: "finalizado",
            // Stamp finalize time once (used for total-duration stats).
            ...(firstFinalize ? { finalizedAt: new Date() } : {}),
        }).where(eq(tournaments.id, id));
        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${id}`);
        revalidatePath(`/tournaments/${id}/manage`);
        revalidatePath("/admin/tournaments");
        revalidatePath("/ranking");
        revalidatePath("/profile");
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

        // Guard against double execution: if tournament is already finalized, points were already awarded
        if (t.status === "finalizado") {
            console.log(`[awardTournamentPoints] Torneo ya finalizado — puntos ya otorgados, abortando.`);
            return;
        }

        // Check if creator is a club - Club tournaments are recreational only
        const [creator] = await db.select({ role: users.role }).from(users).where(eq(users.id, t.createdByUserId)).limit(1);
        if (creator?.role === 'club') {
            console.log(`[awardTournamentPoints] Torneo recreativo (Club). No se reparten puntos.`);
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

        // Final points update and promotion logic (OPTIMIZED: O(1) DB calls instead of O(N))
        const involvedUserIds = Array.from(userPointsAddition.keys());
        if (involvedUserIds.length === 0) return;

        console.log(`[awardTournamentPoints] Procesando ascensos para ${involvedUserIds.length} jugadores`);

        // Fetch all needed data in bulk
        const [involvedUsers, allCats] = await Promise.all([
            db.select().from(users).where(inArray(users.id, involvedUserIds)),
            import("@/lib/categories").then(m => m.getAllActiveCategories())
        ]);

        const { getCategoryFromPoints, getCategoryByName, countUserWins } = await import("@/lib/categories");
        const currentYear = new Date().getFullYear();

        // Perform updates in parallel or batch
        await Promise.all(involvedUserIds.map(async (uid) => {
            const pts = userPointsAddition.get(uid) || 0;
            if (pts <= 0) return;

            // 1. Update points (We do this first or calculate in memory for check)
            const userObj = involvedUsers.find(u => u.id === uid);
            if (!userObj) return;

            const newTotalPoints = (userObj.points || 0) + pts;

            // Apply points update
            await db.update(users)
                .set({ points: newTotalPoints })
                .where(eq(users.id, uid));

            // 2. Promotion Check
            const currentCatName = userObj.category || "D";
            const currentCatObj = allCats.find(c => c.name === currentCatName);

            if (currentCatObj) {
                // Fetch tournament wins for the current category in the current year
                const titleWins = await countUserWins(uid, currentCatName, currentYear);

                // Promotion criteria: 
                // A) Exceeded current category's max points (immediate promotion)
                // B) Won 2 or more tournaments in the current category this year
                const exceedsPoints = newTotalPoints > currentCatObj.maxPoints;
                const deservesPromotion = (titleWins >= 2) || exceedsPoints;

                if (deservesPromotion) {
                    // Check if we should promote automatically or manually
                    const { getPromotionMode } = await import("@/lib/settings-actions");
                    const promoMode = await getPromotionMode();

                    // Find the best superior categories. 
                    // In this DB, HIGHER categoryOrder is better (D=0, C=1, B=2, A=3, A+=4)
                    const betterCats = allCats
                        .filter(c => c.categoryOrder > currentCatObj.categoryOrder)
                        .sort((a, b) => a.categoryOrder - b.categoryOrder);

                    const catByPoints = allCats.find(c => newTotalPoints >= c.minPoints && newTotalPoints <= c.maxPoints);
                    let nextCat = betterCats[0];

                    if (catByPoints && catByPoints.categoryOrder > currentCatObj.categoryOrder) {
                        nextCat = catByPoints;
                    }

                    if (nextCat) {
                        const reason = titleWins >= 2 ? '2+ Victorias' : `Puntos (${newTotalPoints})`;
                        console.log(`[awardTournamentPoints] PROPUESTA PROMOCIÓN: ${userObj.firstName} ${userObj.lastName} (ID: ${uid}) -> ${nextCat.name}. Razón: ${reason} [Modo: ${promoMode}]`);

                        if (promoMode === "auto") {
                            await db.update(users)
                                .set({
                                    category: nextCat.name,
                                    points: Math.max(newTotalPoints, nextCat.minPoints),
                                    lastCategoryUpdate: new Date()
                                })
                                .where(eq(users.id, uid));
                            console.log(`[awardTournamentPoints] PROMOCIÓN AUTOMÁTICA COMPLETADA.`);
                        } else {
                            console.log(`[awardTournamentPoints] PROMOCIÓN PENDIENTE (MODO MANUAL).`);
                        }
                    }
                }
            }
        }));
    } catch (err) {
        console.error("[awardTournamentPoints]", err);
    }
}

export type ManualPlayerData = {
    userId?: string;
    name?: string;
    category?: string;
    gender?: string;
    side?: string;
    clubId?: string | null;
}

export async function registerManualPlayer(
    tournamentId: string,
    player1: ManualPlayerData,
    player2?: ManualPlayerData
) {
    try {
        const session = await getSession();
        if (!session?.userId) throw new Error("No autorizado");

        const [t] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
        if (!t) throw new Error("Torneo no encontrado");

        const isAdmin = session.role === 'admin' || session.role === 'superadmin' || session.role === 'club';
        const isOwner = t.createdByUserId === session.userId;

        if (!isAdmin && !isOwner) {
            throw new Error("No tenés permiso para gestionar este torneo");
        }

        let mod: any = t.modalidad;
        try {
            if (typeof mod === 'string' && mod.trim().startsWith('{')) mod = JSON.parse(mod);
        } catch (e) { }

        // Admin bypass

        if (player2 && ((player1.userId && player1.userId === player2.userId) || (player1.name && player1.name === player2.name))) {
            throw new Error("La pareja no puede estar integrada por la misma persona");
        }

        const getOrCreateUser = async (data: ManualPlayerData) => {
            if (data.userId) {
                const [existing] = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
                if (!existing) throw new Error(`User ${data.userId} not found`);
                const name = [existing.firstName, existing.lastName].filter(Boolean).join(" ") || existing.email.split("@")[0];

                // Allow updating side/club/category/gender from the registration screen (pre-filled with the player's current data)
                const updates: { side?: string | null; clubId?: string | null; category?: string; gender?: string } = {};
                if (data.side !== undefined && (data.side || null) !== existing.side) updates.side = data.side || null;
                if (data.clubId !== undefined && (data.clubId || null) !== existing.clubId) updates.clubId = data.clubId || null;
                if (data.category && data.category !== existing.category) updates.category = data.category;
                if (data.gender && data.gender !== existing.gender) updates.gender = data.gender;
                if (Object.keys(updates).length > 0) {
                    await db.update(users).set(updates).where(eq(users.id, existing.id));
                }

                return {
                    id: existing.id,
                    name,
                    clubId: 'clubId' in updates ? updates.clubId ?? null : existing.clubId
                };
            }
            if (!data.name) throw new Error("Nombre es obligatorio para registro manual");

            const fakeUserId = `manual_${crypto.randomUUID()}`;
            await db.insert(users).values({
                id: fakeUserId,
                email: `${fakeUserId}@manual.test`,
                firstName: data.name.split(" ")[0],
                lastName: data.name.split(" ").slice(1).join(" ") || " ",
                role: "jugador",
                category: data.category || "D",
                gender: data.gender || "masculino",
                side: data.side || null,
                clubId: data.clubId || null,
                isActive: true
            });
            return { id: fakeUserId, name: data.name, clubId: data.clubId || null };
        };

        const u1 = await getOrCreateUser(player1);
        const u2 = player2 ? await getOrCreateUser(player2) : null;

        const registrationId = crypto.randomUUID();
        await db.insert(registrations).values({
            id: registrationId,
            tournamentId,
            userId: u1.id,
            partnerUserId: u2?.id || null,
            category: player1.category || "D",
            status: "confirmed"
        });

        const isIndividual = mod?.participacion === "individual";
        const displayName = u2 ? `${u1.name} / ${u2.name}` : (isIndividual ? u1.name : `${u1.name}`);

        revalidatePath(`/tournaments/${tournamentId}/fixture`);
        revalidatePath("/ranking");

        return {
            ok: true,
            player: {
                id: registrationId,
                name: displayName,
                category: player1.category || "D",
                clubId: u1.clubId || null,
                player1: u1.name,
                player2: u2?.name || (isIndividual ? null : "Invitado"),
                userId: u1.id,
                partnerUserId: u2?.id || null
            }
        };
    } catch (err) {
        console.error("[registerManualPlayer]", err);
        return { ok: false, error: String(err) };
    }
}

/**
 * Inscripción masiva: una fila por inscripción (una pareja, o un jugador en los
 * torneos individuales). Existe porque mucha gente no quiere crearse una cuenta
 * para jugar un torneo suelto.
 *
 * Los jugadores sin cuenta se crean como INVITADOS (`isGuest`), igual que en el
 * módulo Desafío: quedan fuera de los listados generales y después se pueden
 * promover a cuenta real o fusionar con una existente sin perder historial ni
 * puntos. Ver src/app/(main)/desafio/actions/invitados.ts.
 */
export type BulkRegistrationRow = {
    /** Clave del cliente, para devolver el resultado fila por fila. */
    key: string;
    player1: ManualPlayerData;
    player2?: ManualPlayerData;
};

export type BulkRegistrationResult = {
    key: string;
    ok: boolean;
    error?: string;
    /** Inscripción creada, con la forma que usa la lista de jugadores del armado. */
    player?: {
        id: string;
        name: string;
        category: string;
        player1: string;
        player2: string | null;
        userId: string;
        partnerUserId: string | null;
    };
};

// Mismo dominio inválido que usa el módulo Desafío: nadie puede recibir mail ahí
// ni registrarse con él por accidente. Al promover al invitado se reemplaza.
const guestEmail = (id: string) => `invitado.${id}@invitado.local`;

export async function bulkRegisterPlayers(
    tournamentId: string,
    rows: BulkRegistrationRow[],
): Promise<{ ok: boolean; error?: string; results: BulkRegistrationResult[] }> {
    try {
        const session = await getSession();
        if (!session?.userId) return { ok: false, error: "No autorizado", results: [] };

        const [t] = await db
            .select({ modalidad: tournaments.modalidad, createdByUserId: tournaments.createdByUserId })
            .from(tournaments)
            .where(eq(tournaments.id, tournamentId))
            .limit(1);
        if (!t) return { ok: false, error: "Torneo no encontrado", results: [] };

        const isAdmin = session.role === 'admin' || session.role === 'superadmin' || session.role === 'club';
        const isOwner = t.createdByUserId === session.userId;
        if (!isAdmin && !isOwner) {
            return { ok: false, error: "No tenés permiso para gestionar este torneo", results: [] };
        }

        // Quiénes ya están inscriptos: se arranca de la base y se va sumando lo
        // que entra en esta misma tanda, para que la tanda no se duplique a sí misma.
        const yaInscriptos = new Set<string>();
        (await db
            .select({ u1: registrations.userId, u2: registrations.partnerUserId })
            .from(registrations)
            .where(eq(registrations.tournamentId, tournamentId)))
            .forEach(r => {
                if (r.u1) yaInscriptos.add(r.u1);
                if (r.u2) yaInscriptos.add(r.u2);
            });

        const results: BulkRegistrationResult[] = [];

        for (const row of rows) {
            try {
                const nombre1 = (row.player1?.name ?? "").trim();
                const nombre2 = (row.player2?.name ?? "").trim();

                if (!row.player1?.userId && !nombre1) {
                    results.push({ key: row.key, ok: false, error: "Falta el nombre" });
                    continue;
                }
                if (row.player2 && !row.player2.userId && !nombre2) {
                    results.push({ key: row.key, ok: false, error: "Falta el nombre del compañero" });
                    continue;
                }
                if (row.player2 && row.player1.userId && row.player1.userId === row.player2.userId) {
                    results.push({ key: row.key, ok: false, error: "La pareja no puede ser la misma persona" });
                    continue;
                }

                // Cada fila en su propia transacción: si falla la inscripción no
                // queda un invitado suelto, y las demás filas siguen su curso.
                const resultado = await db.transaction(async (tx) => {
                    const resolver = async (data: ManualPlayerData) => {
                        if (data.userId) {
                            const [existing] = await tx.select().from(users).where(eq(users.id, data.userId)).limit(1);
                            if (!existing) throw new Error("El jugador elegido ya no existe");

                            const updates: Record<string, unknown> = {};
                            if (data.side !== undefined && (data.side || null) !== existing.side) updates.side = data.side || null;
                            if (data.category && data.category !== existing.category) updates.category = data.category;
                            if (data.gender && data.gender !== existing.gender) updates.gender = data.gender;
                            if (Object.keys(updates).length > 0) {
                                await tx.update(users).set(updates).where(eq(users.id, existing.id));
                            }
                            const nombre = [existing.firstName, existing.lastName].filter(Boolean).join(" ").trim()
                                || existing.email.split("@")[0];
                            return { id: existing.id, name: nombre };
                        }

                        const id = crypto.randomUUID();
                        const partes = (data.name ?? "").trim().split(/\s+/);
                        await tx.insert(users).values({
                            id,
                            email: guestEmail(id),
                            // Sin hash no hay login posible.
                            passwordHash: null,
                            role: "jugador",
                            firstName: partes[0],
                            lastName: partes.slice(1).join(" ") || null,
                            category: data.category || "D",
                            gender: data.gender || null,
                            side: data.side || null,
                            clubId: data.clubId || null,
                            isGuest: true,
                        });
                        return { id, name: (data.name ?? "").trim() };
                    };

                    const u1 = await resolver(row.player1);
                    if (yaInscriptos.has(u1.id)) throw new Error(`${u1.name} ya está inscripto`);

                    const u2 = row.player2 ? await resolver(row.player2) : null;
                    if (u2 && yaInscriptos.has(u2.id)) throw new Error(`${u2.name} ya está inscripto`);
                    if (u2 && u2.id === u1.id) throw new Error("La pareja no puede ser la misma persona");

                    const registrationId = crypto.randomUUID();
                    await tx.insert(registrations).values({
                        id: registrationId,
                        tournamentId,
                        userId: u1.id,
                        partnerUserId: u2?.id ?? null,
                        category: row.player1.category || "D",
                        status: "confirmed",
                    });

                    return { u1, u2, registrationId };
                });

                yaInscriptos.add(resultado.u1.id);
                if (resultado.u2) yaInscriptos.add(resultado.u2.id);

                results.push({
                    key: row.key,
                    ok: true,
                    player: {
                        id: resultado.registrationId,
                        name: resultado.u2 ? `${resultado.u1.name} / ${resultado.u2.name}` : resultado.u1.name,
                        category: row.player1.category || "D",
                        player1: resultado.u1.name,
                        player2: resultado.u2?.name ?? null,
                        userId: resultado.u1.id,
                        partnerUserId: resultado.u2?.id ?? null,
                    },
                });
            } catch (err: any) {
                results.push({ key: row.key, ok: false, error: err?.message || String(err) });
            }
        }

        revalidatePath(`/tournaments/${tournamentId}/fixture`);
        revalidatePath(`/tournaments/${tournamentId}`);

        return { ok: results.some(r => r.ok), results };
    } catch (err) {
        console.error("[bulkRegisterPlayers]", err);
        return { ok: false, error: String(err), results: [] };
    }
}

export async function resetTournamentStatus(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const session = await getSession();
        if (!session?.userId) throw new Error("No autorizado");

        const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
        if (!t) throw new Error("Torneo no encontrado");

        const isAdmin = session.role === 'admin' || session.role === 'superadmin' || session.role === 'club';
        const isOwner = t.createdByUserId === session.userId;
        if (!isAdmin && !isOwner) throw new Error("No tenés permiso para resetear este torneo");

        await db.update(tournaments).set({ status: "pendiente" }).where(eq(tournaments.id, id));
        revalidatePath(`/tournaments/${id}`);
        revalidatePath(`/tournaments/${id}/fixture`);
        revalidatePath(`/tournaments/${id}/manage`);
        revalidatePath("/tournaments");

        return { ok: true };
    } catch (err) {
        console.error("[resetTournamentStatus]", err);
        return { ok: false, error: String(err) };
    }
}

export type TournamentFormat = "round_robin" | "americano";

/**
 * Switches a tournament between Round Robin and Americano *after* check-in.
 *
 * The fixture data shape differs between the two formats (Robin saves N groups
 * with a full round-robin of matches, Americano saves a single group and
 * generates matches on the fly), so the format is locked as soon as a fixture
 * exists. Until then, `type` is only a routing/label switch and swapping it is
 * safe: registrations and attendance don't depend on it.
 */
export async function setTournamentFormat(input: {
    tournamentId: string;
    format: TournamentFormat;
    /**
     * Escape hatch for "started the tournament but need to change it anyway":
     * wipes groups, matches and bracket and sends the tournament back to
     * `published` so the setup flow can re-arm it in the other format.
     * Refused on finalized tournaments — ranking points are already awarded.
     */
    resetFixture?: boolean;
}): Promise<{ ok: boolean; locked?: boolean; error?: string }> {
    try {
        const session = await getSession();
        if (!session?.userId) throw new Error("No autorizado");

        if (input.format !== "round_robin" && input.format !== "americano") {
            throw new Error("Formato inválido");
        }

        const [tournament] = await db
            .select({
                createdByUserId: tournaments.createdByUserId,
                status: tournaments.status,
                type: tournaments.type,
            })
            .from(tournaments)
            .where(eq(tournaments.id, input.tournamentId))
            .limit(1);

        if (!tournament) throw new Error("Torneo no encontrado");

        const isAdmin = session.role === 'admin' || session.role === 'superadmin' || session.role === 'club';
        const isOwner = tournament.createdByUserId === session.userId;

        if (!isAdmin && !isOwner) {
            throw new Error("No tenés permiso");
        }

        // Nothing to do — the caller can just advance to the next step.
        if (tournament.type === input.format) return { ok: true };

        // Only these two formats are interchangeable. Anything else (desafío,
        // future formats) must not be silently converted.
        if (tournament.type !== "round_robin" && tournament.type !== "americano") {
            return { ok: false, error: "Este torneo no admite cambio de formato" };
        }

        const [groupCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(tournamentGroups)
            .where(eq(tournamentGroups.tournamentId, input.tournamentId));

        const hasFixture = Number(groupCount?.count ?? 0) > 0;
        const isPreFixtureStatus = tournament.status === "draft" || tournament.status === "published";
        const needsReset = hasFixture || !isPreFixtureStatus;

        if (needsReset && !input.resetFixture) {
            return {
                ok: false,
                locked: true,
                error: "El fixture ya está armado. Reiniciá el torneo para cambiar el formato.",
            };
        }

        if (needsReset) {
            if (tournament.status === "finalizado") {
                return {
                    ok: false,
                    error: "El torneo está finalizado y ya repartió puntos de ranking. No se puede cambiar el formato.",
                };
            }

            // Destructive on purpose: the old format's fixture cannot be
            // reinterpreted as the new one. Attendance (present/paid) and
            // registrations are left untouched so the check-in survives.
            await db.transaction(async (tx) => {
                await tx.delete(bracketMatches).where(eq(bracketMatches.tournamentId, input.tournamentId));
                await tx.delete(groupMatches).where(eq(groupMatches.tournamentId, input.tournamentId));
                await tx.delete(tournamentGroups).where(eq(tournamentGroups.tournamentId, input.tournamentId));
                await tx
                    .update(tournaments)
                    .set({
                        type: input.format,
                        status: "published",
                        // Unlike the metadata-only path below, this destroys data:
                        // let updatedAt advance so another admin's stale client
                        // hits the optimistic-lock conflict instead of overwriting.
                        updatedAt: new Date(),
                    })
                    .where(eq(tournaments.id, input.tournamentId));
            });

            revalidatePath("/tournaments");
            revalidatePath(`/tournaments/${input.tournamentId}`);
            revalidatePath(`/tournaments/${input.tournamentId}/fixture`);
            revalidatePath(`/tournaments/${input.tournamentId}/manage`);
            return { ok: true };
        }

        await db
            .update(tournaments)
            .set({
                type: input.format,
                // Same rationale as updateTournamentMetadata: don't advance the
                // optimistic-lock version for a metadata-only write.
                updatedAt: sql`updated_at`,
            })
            .where(eq(tournaments.id, input.tournamentId));

        revalidatePath(`/tournaments/${input.tournamentId}/fixture`);
        revalidatePath(`/tournaments/${input.tournamentId}/manage`);
        return { ok: true };
    } catch (err) {
        console.error("[setTournamentFormat]", err);
        return { ok: false, error: String(err) };
    }
}

/**
 * What a format change with `resetFixture` would destroy. Read-only: feeds the
 * confirmation dialog so the organizer sees the damage before accepting it.
 */
export async function getFormatResetImpact(tournamentId: string): Promise<{
    ok: boolean;
    groups?: number;
    matches?: number;
    playedMatches?: number;
    bracket?: number;
    isFinalized?: boolean;
    error?: string;
}> {
    try {
        const session = await getSession();
        if (!session?.userId) throw new Error("No autorizado");

        const [tournament] = await db
            .select({ createdByUserId: tournaments.createdByUserId, status: tournaments.status })
            .from(tournaments)
            .where(eq(tournaments.id, tournamentId))
            .limit(1);

        if (!tournament) throw new Error("Torneo no encontrado");

        const isAdmin = session.role === 'admin' || session.role === 'superadmin' || session.role === 'club';
        const isOwner = tournament.createdByUserId === session.userId;
        if (!isAdmin && !isOwner) throw new Error("No tenés permiso");

        const dbMatches = await db
            .select({ confirmed: groupMatches.confirmed })
            .from(groupMatches)
            .where(eq(groupMatches.tournamentId, tournamentId));

        const [groups] = await db
            .select({ count: sql<number>`count(*)` })
            .from(tournamentGroups)
            .where(eq(tournamentGroups.tournamentId, tournamentId));

        const [bracket] = await db
            .select({ count: sql<number>`count(*)` })
            .from(bracketMatches)
            .where(eq(bracketMatches.tournamentId, tournamentId));

        return {
            ok: true,
            groups: Number(groups?.count ?? 0),
            matches: dbMatches.length,
            playedMatches: dbMatches.filter(m => m.confirmed).length,
            bracket: Number(bracket?.count ?? 0),
            isFinalized: tournament.status === "finalizado",
        };
    } catch (err) {
        console.error("[getFormatResetImpact]", err);
        return { ok: false, error: String(err) };
    }
}

export async function updateTournamentMetadata(input: {
    tournamentId: string,
    presentPlayerIds?: string[],
    paidPlayerIds?: string[],
    status?: string
}) {
    try {
        const session = await getSession();
        if (!session?.userId) throw new Error("No autorizado");

        const [tournament] = await db
            .select({ createdByUserId: tournaments.createdByUserId })
            .from(tournaments)
            .where(eq(tournaments.id, input.tournamentId))
            .limit(1);

        if (!tournament) throw new Error("Torneo no encontrado");

        const isAdmin = session.role === 'admin' || session.role === 'superadmin' || session.role === 'club';
        const isOwner = tournament.createdByUserId === session.userId;

        if (!isAdmin && !isOwner) {
            throw new Error("No tenés permiso");
        }

        await db
            .update(tournaments)
            .set({
                ...(input.status ? { status: input.status } : {}),
                ...(input.presentPlayerIds ? { presentPlayerIds: input.presentPlayerIds } : {}),
                ...(input.paidPlayerIds ? { paidPlayerIds: input.paidPlayerIds } : {}),
                // Preserve updatedAt so present/paid/status toggles don't advance the
                // optimistic-lock version. `onUpdateNow()` would otherwise bump it on
                // every metadata write and cause a false "another admin modified this
                // tournament" conflict. We self-assign atomically (updated_at = updated_at)
                // so a concurrent fixture save can't be clobbered by a stale read-then-write.
                updatedAt: sql`updated_at`,
            })
            .where(eq(tournaments.id, input.tournamentId));

        revalidatePath(`/tournaments/${input.tournamentId}/manage`);
        return { ok: true };
    } catch (err) {
        console.error("[updateTournamentMetadata]", err);
        return { ok: false, error: String(err) };
    }
}


