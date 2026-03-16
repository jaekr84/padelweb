"use server";

import { db } from "@/db";
import { clubs, users } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function updateClubProfile(formData: FormData) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) {
        throw new Error("No estás autenticado");
    }

    const userId = session.userId;
    const name = formData.get("name") as string;
    const bio = formData.get("bio") as string;
    const location = formData.get("location") as string;
    const phone = formData.get("phone") as string;
    const website = formData.get("website") as string;
    const logoUrl = formData.get("logoUrl") as string;

    // Convert comma separated string to array
    const amenitiesString = formData.get("amenities") as string;
    const amenities = amenitiesString ? amenitiesString.split(",").map(s => s.trim()).filter(Boolean) : [];

    const existingClubs = await db.select().from(clubs).where(eq(clubs.ownerId, userId));

    if (existingClubs.length > 0) {
        // Update
        await db.update(clubs).set({
            name,
            bio,
            location,
            phone,
            website,
            logoUrl,
            amenities
        }).where(eq(clubs.ownerId, userId));
    } else {
        // Insert
        await db.insert(clubs).values({
            id: userId,
            ownerId: userId,
            name: name || "Mi Club",
            bio,
            location,
            phone,
            website,
            logoUrl,
            amenities
        });
    }

    revalidatePath("/profiles/club", "layout");
    return { success: true };
}

const INVITATION_SECRET = new TextEncoder().encode(process.env.INVITATION_SECRET || "padel_secret_key_123_change_me");

export async function generateClubInviteLink(clubId: string) {
    const session = await getSession();
    if (!session?.userId) throw new Error("No authorized");

    // Generar un token que expire en 24h
    // El emisor 'club' indica que es una invitación de club para unirse como jugador
    const token = await new SignJWT({ 
        role: 'jugador', 
        clubId: clubId, 
        issuer: 'club' 
    })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(INVITATION_SECRET);

    const headerList = await headers();
    const host = headerList.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";
    
    const baseUrl = host 
        ? `${protocol}://${host}` 
        : (process.env.NEXT_PUBLIC_APP_URL || "https://acap.ar");

    return `${baseUrl}/register?invitation=${token}&invite=${clubId}`;
}

import { clubRequests } from "@/db/schema";
import { and } from "drizzle-orm";

export async function sendClubInviteAction(targetUserId: string, clubId: string) {
    const session = await getSession() as { userId: string, role: string } | null;
    if (!session || (session.role !== "club" && session.role !== "superadmin")) {
        throw new Error("No autorizado");
    }

    // Si es un club admin, verificar que sea dueño del club
    if (session.role === "club") {
        const clubRes = await db.select().from(clubs).where(eq(clubs.id, clubId)).limit(1);
        const club = clubRes[0];
        if (club?.ownerId !== session.userId) throw new Error("No eres administrador de este club");
    }

    // Verificar si ya existe una invitación pendiente
    const existingRes = await db.select().from(clubRequests).where(and(
        eq(clubRequests.userId, targetUserId),
        eq(clubRequests.clubId, clubId),
        eq(clubRequests.status, "pending")
    )).limit(1);

    if (existingRes.length > 0) throw new Error("Ya existe una invitación pendiente para este usuario");

    await db.insert(clubRequests).values({
        id: crypto.randomUUID(),
        clubId,
        userId: targetUserId,
        type: "invitation",
        status: "pending"
    });

    return { success: true, message: "Invitación enviada correctamente" };
}

export async function acceptClubInviteAction(requestId: string) {
    const session = await getSession() as { userId: string } | null;
    if (!session) throw new Error("No autorizado");

    const requestRes = await db.select({
        id: clubRequests.id,
        clubId: clubRequests.clubId,
        userId: clubRequests.userId,
        status: clubRequests.status
    })
    .from(clubRequests)
    .where(eq(clubRequests.id, requestId))
    .limit(1);

    const request = requestRes[0];

    if (!request || request.userId !== session.userId) throw new Error("Invitación no encontrada");
    if (request.status !== "pending") throw new Error("La invitación ya no está vigente");

    // 1. Update request status
    await db.update(clubRequests)
        .set({ status: "accepted" })
        .where(eq(clubRequests.id, requestId));

    // 2. Update user club
    await db.update(users)
        .set({ clubId: request.clubId })
        .where(eq(users.id, session.userId));

    revalidatePath("/profile");
    return { success: true, message: "Te has unido al club con éxito" };
}

export async function getMyClubRequests() {
    const session = await getSession() as { userId: string } | null;
    if (!session) return [];

    return await db.select({
        id: clubRequests.id,
        clubId: clubRequests.clubId,
        userId: clubRequests.userId,
        type: clubRequests.type,
        status: clubRequests.status,
        createdAt: clubRequests.createdAt,
        club: {
            id: clubs.id,
            name: clubs.name,
            logoUrl: clubs.logoUrl
        }
    })
    .from(clubRequests)
    .innerJoin(clubs, eq(clubRequests.clubId, clubs.id))
    .where(and(
        eq(clubRequests.userId, session.userId),
        eq(clubRequests.status, "pending")
    ));
}

export async function rejectClubInviteAction(requestId: string) {
    const session = await getSession() as { userId: string } | null;
    if (!session) throw new Error("No autorizado");

    await db.update(clubRequests)
        .set({ status: "rejected" })
        .where(and(
            eq(clubRequests.id, requestId),
            eq(clubRequests.userId, session.userId)
        ));

    revalidatePath("/profile");
    return { success: true };
}


