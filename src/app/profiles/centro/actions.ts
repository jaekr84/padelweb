"use server";

import { db } from "@/db";
import { clubs, users } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

interface CentroProfileData {
    name: string;
    bio: string;
    location: string;
    address: string;
    phone: string;
    whatsapp: string;
    instagram: string;
    website: string;
    courts: number;
    amenities: string[];
    schedule: Record<string, { open: string; close: string; closed: boolean }> | null;
    photos: string[];
}

export async function updateCentroProfile(data: CentroProfileData) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No estás autenticado");

    const userId = session.userId;

    const existing = await db.select().from(clubs).where(eq(clubs.ownerId, userId));

    if (existing.length > 0) {
        await db.update(clubs).set({
            name: data.name,
            bio: data.bio,
            location: data.location,
            address: data.address,
            phone: data.phone,
            whatsapp: data.whatsapp,
            instagram: data.instagram,
            website: data.website,
            courts: data.courts,
            amenities: data.amenities,
            schedule: data.schedule,
            photos: data.photos,
        }).where(eq(clubs.ownerId, userId));
    } else {
        await db.insert(clubs).values({
            id: userId,
            ownerId: userId,
            name: data.name || "Mi Centro",
            bio: data.bio,
            location: data.location,
            address: data.address,
            phone: data.phone,
            whatsapp: data.whatsapp,
            instagram: data.instagram,
            website: data.website,
            courts: data.courts,
            amenities: data.amenities,
            schedule: data.schedule,
            photos: data.photos,
        });
    }

    revalidatePath("/profile");
    revalidatePath(`/profiles/centro/${userId}`);
    return { success: true };
}

export async function getCentroByOwner(ownerId: string) {
    const result = await db.select().from(clubs).where(eq(clubs.ownerId, ownerId));
    return result[0] || null;
}

export async function getCentroById(id: string) {
    const result = await db.select().from(clubs).where(eq(clubs.id, id));
    return result[0] || null;
}
