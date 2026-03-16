"use server";

import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { registrations, users, tournaments, categoriesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type RegisterInput = {
    tournamentId: string;
    category: string | null;
    partnerName: string | null;
    partnerUserId: string | null;
    isGuestPartner: boolean;
};

export async function registerForTournament(input: RegisterInput) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No autenticado");
    const userId = session.userId;

    // Verify user role and points
    const [dbUser] = await db.select({ 
        role: users.role,
        points: users.points 
    }).from(users).where(eq(users.id, userId)).limit(1);
    
    if (!dbUser) throw new Error("Usuario no encontrado");
    if (dbUser.role !== "jugador") {
        throw new Error("Solo jugadores pueden inscribirse");
    }

    const userPoints = dbUser.points || 0;

    // Point-category validation
    if (input.category && input.category !== "libre" && input.category !== "Libre") {
        const [targetCat] = await db
            .select()
            .from(categoriesTable)
            .where(eq(categoriesTable.name, input.category))
            .limit(1);

        if (targetCat) {
            if (userPoints > targetCat.maxPoints) {
                throw new Error(`Tu puntaje (${userPoints}) es superior al límite de la categoría ${input.category}. Deberías inscribirte en una categoría superior.`);
            }
        }
    }

    // Verify tournament exists and is published
    const [tournament] = await db.select({ id: tournaments.id, status: tournaments.status }).from(tournaments).where(eq(tournaments.id, input.tournamentId)).limit(1);
    if (!tournament) throw new Error("Torneo no encontrado");
    if (tournament.status !== "published") throw new Error("El torneo no está disponible para inscripción");

    // Check duplicate registration (same user in same tournament)
    const [existing] = await db
        .select({ id: registrations.id })
        .from(registrations)
        .where(
            and(
                eq(registrations.tournamentId, input.tournamentId),
                eq(registrations.userId, userId),
                eq(registrations.status, "confirmed")
            )
        )
        .limit(1);

    if (existing) throw new Error("Ya estás inscripto en este torneo");

    // Insert
    const newId = crypto.randomUUID();
    const registrationData = {
        id: newId,
        tournamentId: input.tournamentId,
        userId,
        category: input.category || null,
        partnerName: input.partnerName || null,
        partnerUserId: input.partnerUserId || null,
        isGuestPartner: input.isGuestPartner,
        status: "confirmed",
    };

    await db.insert(registrations).values(registrationData);

    // Update last participation date for the user
    await db.update(users)
        .set({ lastParticipationAt: new Date() })
        .where(eq(users.id, userId));
    
    // If partner is a registered user, update them too
    if (input.partnerUserId) {
        await db.update(users)
            .set({ lastParticipationAt: new Date() })
            .where(eq(users.id, input.partnerUserId));
    }

    return registrationData;
}
