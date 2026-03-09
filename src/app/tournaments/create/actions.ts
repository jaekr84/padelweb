"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { tournaments, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type PointsConfig = {
    winner: number;
    finalist: number;
    semi: number;
    quarter: number;
};

type TournamentInput = {
    name: string;
    startDate?: string | null;
    endDate?: string | null;
    description?: string | null;
    surface?: string | null;
    categories: string[];
    pointsConfig: PointsConfig;
    imageUrl?: string | null;
    modalidad?: {
        mode: string;
        participacion: string;
        genero: string;
    } | null;
};

export async function createTournament(data: TournamentInput) {
    const { userId } = await auth();
    if (!userId) throw new Error("No estás autenticado");

    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existingUser.length === 0) throw new Error("Usuario no encontrado en la base de datos");

    const userRole = existingUser[0].role;
    if (userRole !== 'club' && userRole !== 'centro_de_padel' && userRole !== 'superadmin') {
        throw new Error("Solo los clubes y administradores pueden crear torneos");
    }

    if (!data.name?.trim()) throw new Error("El nombre del torneo es obligatorio");

    const [tournament] = await db
        .insert(tournaments)
        .values({
            createdByUserId: userId,
            name: data.name.trim(),
            description: data.description || null,
            surface: data.surface || null,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            categories: data.categories,
            pointsConfig: data.pointsConfig,
            imageUrl: data.imageUrl || null,
            modalidad: data.modalidad || null,
            status: "published",
        })
        .returning();

    revalidatePath("/tournaments");
    revalidatePath("/profile");
    revalidatePath("/profiles/club");

    return { success: true, tournamentId: tournament.id };
}

export async function updateTournament(id: string, data: TournamentInput) {
    const { userId } = await auth();
    if (!userId) throw new Error("No estás autenticado");

    if (!data.name?.trim()) throw new Error("El nombre del torneo es obligatorio");

    // Ensure this tournament belongs to the current user
    const existing = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    if (existing.length === 0) throw new Error("Torneo no encontrado");
    if (existing[0].createdByUserId !== userId) throw new Error("No tenés permiso para editar este torneo");

    await db
        .update(tournaments)
        .set({
            name: data.name.trim(),
            description: data.description || null,
            surface: data.surface || null,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            categories: data.categories,
            pointsConfig: data.pointsConfig,
            imageUrl: data.imageUrl || null,
            modalidad: data.modalidad || null,
        })
        .where(eq(tournaments.id, id));

    revalidatePath("/tournaments");
    revalidatePath(`/tournaments/${id}`);
    revalidatePath("/profile");
    revalidatePath("/profiles/club");

    return { success: true };
}
