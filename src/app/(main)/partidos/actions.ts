"use server";

import { db } from "@/db";
import { publicMatches, publicMatchRegistrations, users } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createPublicMatch(data: {
    date: string;
    time: string;
    location: string;
    city: string;
    category?: string;
    gender?: string;
    description?: string;
    totalSlots?: number;
    initialPlayers?: { userId?: string, guestName?: string }[];
}) {
    const session = await getSession();
    if (!session) throw new Error("No autenticado");

    const matchId = crypto.randomUUID();
    const totalSlots = data.totalSlots || 4;

    await db.insert(publicMatches).values({
        id: matchId,
        creatorId: session.userId,
        date: data.date,
        time: data.time,
        location: data.location,
        city: data.city,
        category: data.category || "D",
        gender: data.gender || "mixto",
        description: data.description,
        totalSlots: totalSlots,
        status: "open",
    });

    // Handle initial players
    // 1. Always ensure creator is included
    const playersToRegister: { id: string, matchId: string, userId?: string | null, guestName?: string | null }[] = [
        {
            id: crypto.randomUUID(),
            matchId: matchId,
            userId: session.userId,
            guestName: null,
        }
    ];

    // 2. Add others if provided, avoiding adding creator twice
    if (data.initialPlayers) {
        for (const p of data.initialPlayers) {
            if (p.userId === session.userId) continue; // Skip creator
            if (playersToRegister.length >= totalSlots) break; // Don't exceed capacity

            playersToRegister.push({
                id: crypto.randomUUID(),
                matchId: matchId,
                userId: p.userId || null,
                guestName: p.guestName || null,
            });
        }
    }

    // Insert all registrations
    await db.insert(publicMatchRegistrations).values(playersToRegister);

    // If full from the start, update status
    if (playersToRegister.length >= totalSlots) {
        await db.update(publicMatches).set({ status: "full" }).where(eq(publicMatches.id, matchId));
    }

    revalidatePath("/partidos");
    return { success: true, matchId };
}


export async function joinPublicMatch(matchId: string) {
    const session = await getSession();
    if (!session) throw new Error("No autenticado");

    // Check if already joined
    const existing = await db.select().from(publicMatchRegistrations)
        .where(and(
            eq(publicMatchRegistrations.matchId, matchId),
            eq(publicMatchRegistrations.userId, session.userId)
        )).limit(1);

    if (existing.length > 0) throw new Error("Ya estás unido a este partido");

    // Check if full
    const [match] = await db.select().from(publicMatches).where(eq(publicMatches.id, matchId)).limit(1);
    if (!match) throw new Error("Partido no encontrado");

    const registrations = await db.select().from(publicMatchRegistrations).where(eq(publicMatchRegistrations.matchId, matchId));
    if (registrations.length >= (match.totalSlots || 4)) throw new Error("Partido completo");

    await db.insert(publicMatchRegistrations).values({
        id: crypto.randomUUID(),
        matchId,
        userId: session.userId,
    });

    // If full, update status
    if (registrations.length + 1 >= (match.totalSlots || 4)) {
        await db.update(publicMatches).set({ status: "full" }).where(eq(publicMatches.id, matchId));
    }

    revalidatePath("/partidos");
    revalidatePath(`/partidos/${matchId}`);
    return { success: true };
}

export async function leavePublicMatch(matchId: string) {
    const session = await getSession();
    if (!session) throw new Error("No autenticado");

    const [match] = await db.select().from(publicMatches).where(eq(publicMatches.id, matchId)).limit(1);
    if (!match) throw new Error("Partido no encontrado");

    if (match.creatorId === session.userId) {
        throw new Error("El creador no puede abandonar el partido. Debe cancelarlo.");
    }

    await db.delete(publicMatchRegistrations)
        .where(and(
            eq(publicMatchRegistrations.matchId, matchId),
            eq(publicMatchRegistrations.userId, session.userId)
        ));

    // Update status back to open if it was full
    if (match.status === "full") {
        await db.update(publicMatches).set({ status: "open" }).where(eq(publicMatches.id, matchId));
    }

    revalidatePath("/partidos");
    revalidatePath(`/partidos/${matchId}`);
    return { success: true };
}

export async function cancelPublicMatch(matchId: string) {
    const session = await getSession();
    if (!session) throw new Error("No autenticado");

    const [match] = await db.select().from(publicMatches).where(eq(publicMatches.id, matchId)).limit(1);
    if (!match) throw new Error("Partido no encontrado");

    if (match.creatorId !== session.userId && session.role !== "superadmin") {
        throw new Error("No tienes permiso para cancelar este partido");
    }

    await db.update(publicMatches).set({ status: "cancelled" }).where(eq(publicMatches.id, matchId));

    revalidatePath("/partidos");
    revalidatePath(`/partidos/${matchId}`);
    return { success: true };
}

export async function completePublicMatch(matchId: string) {
    const session = await getSession();
    if (!session) throw new Error("No autenticado");

    const [match] = await db.select().from(publicMatches).where(eq(publicMatches.id, matchId)).limit(1);
    if (!match) throw new Error("Partido no encontrado");

    if (match.creatorId !== session.userId && session.role !== "superadmin") {
        throw new Error("No tienes permiso para completar este partido");
    }

    await db.update(publicMatches).set({ status: "completed" }).where(eq(publicMatches.id, matchId));

    revalidatePath("/partidos");
    revalidatePath(`/partidos/${matchId}`);
    revalidatePath("/profile");
    return { success: true };
}
