"use server";

import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { tournaments, users, clubs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getTournamentPointsConfig, getClubTournamentLimits } from "@/lib/settings-actions";
import { count, and } from "drizzle-orm";

type PointsConfig = {
    winner: number;
    finalist: number;
    semi: number;
    quarter: number;
    octavos?: number;
    groupMatchWin?: number;
    participation?: number;
};

type TournamentInput = {
    name: string;
    startDate?: string | null;
    endDate?: string | null;
    time?: string | null;
    description?: string | null;
    categories: string[];
    imageUrl?: string | null;
    openDateClub?: string | null;
    openDateGeneral?: string | null;
    maxSlots?: number;
    modalidad?: {
        mode: string;
        participacion: string;
        genero: string;
        maxSlots?: number;
    } | null;
    registrationFee?: number | null;
    type?: string;
    surface?: string | null;
    location?: string | null;
    isMembersOnly?: boolean;
    memberRegistrationFee?: number | null;
};

export async function createTournament(data: TournamentInput) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No estás autenticado");
    const userId = session.userId;

    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existingUser.length === 0) throw new Error("Usuario no encontrado en la base de datos");
    const user = existingUser[0];

    const isSuperAdmin = session.role === 'superadmin' || session.role === 'admin';
    const isClub = session.role === 'club';

    if (!isSuperAdmin && !isClub) {
        throw new Error("No tienes permiso para crear torneos");
    }

    // 1. Determine local Club ID more accurately
    let actualClubId: string | null = null;
    if (isClub) {
        if (user.clubId) {
            actualClubId = user.clubId;
        } else {
            const [ownedClub] = await db.select().from(clubs).where(eq(clubs.ownerId, userId)).limit(1);
            actualClubId = ownedClub?.id || null;
        }
    }

    // 2. Check Limits for Clubs
    if (isClub && actualClubId) {
        const limits = await getClubTournamentLimits();
        const typeLimit = data.isMembersOnly ? limits.closedLimit : limits.openLimit;
        
        // Count existing tournaments of this type for this club
        const [existingCount] = await db
            .select({ value: count() })
            .from(tournaments)
            .where(and(
                eq(tournaments.clubId, actualClubId),
                eq(tournaments.isMembersOnly, !!data.isMembersOnly)
            ));

        if (typeLimit !== -1 && existingCount.value >= typeLimit) {
            throw new Error(`Has alcanzado el límite de torneos ${data.isMembersOnly ? 'cerrados' : 'abiertos'} (${typeLimit}). Contacte al administrador.`);
        }
    }

    if (!data.name?.trim()) throw new Error("El nombre del torneo es obligatorio");

    // 2. Use Global Points Config
    const globalPoints = await getTournamentPointsConfig();

    const tournamentId = crypto.randomUUID();
    await db
        .insert(tournaments)
        .values({
            id: tournamentId,
            createdByUserId: userId,
            clubId: actualClubId, // Correct club ID
            name: data.name.trim(),
            description: data.description || null,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            time: data.time || null,
            location: data.location || null,
            openDateClub: data.openDateClub || null,
            openDateGeneral: data.openDateGeneral || null,
            categories: data.categories,
            pointsConfig: globalPoints, // Always use global points snapshot
            imageUrl: data.imageUrl || null,
            modalidad: data.modalidad ? { ...data.modalidad, maxSlots: data.maxSlots || 0 } : null,
            status: "published",
            type: data.type || "round_robin",
            registrationFee: data.registrationFee || null,
            memberRegistrationFee: data.memberRegistrationFee || null,
            surface: data.surface || null,
            isMembersOnly: !!data.isMembersOnly,
        });

    revalidatePath("/profiles/club");

    return { success: true, tournamentId: tournamentId };
}

export async function updateTournament(id: string, data: TournamentInput) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No estás autenticado");
    const userId = session.userId;

    if (!data.name?.trim()) throw new Error("El nombre del torneo es obligatorio");

    // Ensure user is superadmin or owner
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const isSuperAdmin = userResult[0]?.role === "superadmin";

    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    if (!tournament) throw new Error("Torneo no encontrado");

    // Get current user's club IDs
    let userClubId: string | null = userResult[0]?.clubId || null;
    if (!userClubId && userResult[0]?.role === 'club') {
        const [ownedClub] = await db.select().from(clubs).where(eq(clubs.ownerId, userId)).limit(1);
        userClubId = ownedClub?.id || null;
    }

    const isOwner = tournament.createdByUserId === userId;
    const isClubOwner = tournament.clubId && userClubId === tournament.clubId;
    
    if (!isSuperAdmin && !isOwner && !isClubOwner) throw new Error("No tienes permiso para editar este torneo");

    await db
        .update(tournaments)
        .set({
            name: data.name.trim(),
            description: data.description || null,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            time: data.time || null,
            location: data.location || null,
            openDateClub: data.openDateClub || null,
            openDateGeneral: data.openDateGeneral || null,
            categories: data.categories,
            // We do NOT update pointsConfig here if it's a club, 
            // but for simplicity we just don't include it in the update payload if it shouldn't change.
            imageUrl: data.imageUrl || null,
            modalidad: data.modalidad ? { ...data.modalidad, maxSlots: data.maxSlots || 0 } : null,
            registrationFee: data.registrationFee || null,
            memberRegistrationFee: data.memberRegistrationFee || null,
            type: data.type || "round_robin",
            surface: data.surface || null,
            isMembersOnly: data.isMembersOnly !== undefined ? !!data.isMembersOnly : tournament.isMembersOnly,
        })
        .where(eq(tournaments.id, id));

    revalidatePath("/tournaments");
    revalidatePath(`/tournaments/${id}`);
    revalidatePath("/profile");
    revalidatePath("/profiles/club");

    return { success: true };
}
