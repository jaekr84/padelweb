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

export async function saveTournamentFixture(input: SaveFixtureInput): Promise<{ ok: boolean; newStatus?: string; error?: string }> {
    try {
        console.log(`\n\n>>> [SERVER] SAVE TOURNAMENT FIXTURE CALLED <<<`);
        console.log(`>>> ID: ${input.tournamentId} | Phase: ${input.phase} | Matches: ${input.matches?.length || 0} <<<\n`);
        
        return await db.transaction(async (tx) => {
            const [prevT] = await tx
                .select({ status: tournaments.status, pointsConfig: tournaments.pointsConfig, createdByUserId: tournaments.createdByUserId })
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
                        status: m.status || (isConfirmed ? "finished" : "pending"),
                        roundIndex: m.roundIndex !== undefined ? Number(m.roundIndex) : null,
                        courtNumber: m.courtNumber !== undefined ? Number(m.courtNumber) : null,
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
                        status: bm.status || (isConfirmed ? "finished" : "pending"),
                        winnerId: bm.winnerId ?? null,
                        winnerName,
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
            
            // Protect status: don't go back from eliminatorias to en_curso unless explicitly forced
            let newStatus = statusMap[input.phase];
            if (prevT.status === "en_eliminatorias" && input.phase === "grupos") {
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
                    ...(input.youtubeUrl ? { youtubeUrl: input.youtubeUrl } : {}),
                    ...(input.modalidad ? { modalidad: input.modalidad } : {}),
                    presentPlayerIds: input.presentPlayerIds || [],
                    paidPlayerIds: input.paidPlayerIds || [],
                })
                .where(eq(tournaments.id, input.tournamentId));
            if (!input.skipRevalidation) {
                revalidatePath("/tournaments");
                revalidatePath(`/tournaments/${input.tournamentId}/manage`);
            }

            return { ok: true, newStatus };
        });
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
        if (t.status !== "finalizado") {
            await awardTournamentPoints(id);
        }
        await db.update(tournaments).set({ status: "finalizado" }).where(eq(tournaments.id, id));
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
                return { id: existing.id, name, clubId: existing.clubId };
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
                isActive: true
            });
            return { id: fakeUserId, name: data.name };
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
            })
            .where(eq(tournaments.id, input.tournamentId));

        revalidatePath(`/tournaments/${input.tournamentId}/manage`);
        return { ok: true };
    } catch (err) {
        console.error("[updateTournamentMetadata]", err);
        return { ok: false, error: String(err) };
    }
}


