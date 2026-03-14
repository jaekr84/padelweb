"use server";

import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { registrations, users, tournaments } from "@/db/schema";
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

    // Verify user role
    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    if (!dbUser) throw new Error("Usuario no encontrado");
    if (!["jugador", "profe"].includes(dbUser.role)) {
        throw new Error("Solo jugadores y profes pueden inscribirse");
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
    const [created] = (await db.insert(registrations).values({
        tournamentId: input.tournamentId,
        userId,
        category: input.category || null,
        partnerName: input.partnerName || null,
        partnerUserId: input.partnerUserId || null,
        isGuestPartner: input.isGuestPartner,
        status: "confirmed",
    }).returning()) as any[];

    return created;
}
