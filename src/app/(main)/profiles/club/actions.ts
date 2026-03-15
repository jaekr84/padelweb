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
