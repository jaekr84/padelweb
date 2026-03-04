"use server";

import { db } from "@/db";
import { clubs, users } from "@/db/schema";
import { currentUser } from "@clerk/nextjs/server";
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
    const user = await currentUser();
    if (!user) throw new Error("No estás autenticado");

    const primaryEmail =
        user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress ||
        user.emailAddresses[0]?.emailAddress ||
        "no-email@padelweb.com";

    const role = (user.publicMetadata?.role as string) || "club";

    await db.insert(users).values({
        id: user.id,
        email: primaryEmail,
        role,
    }).onConflictDoNothing();

    const existing = await db.select().from(clubs).where(eq(clubs.ownerId, user.id));

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
        }).where(eq(clubs.ownerId, user.id));
    } else {
        await db.insert(clubs).values({
            id: user.id,
            ownerId: user.id,
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
    revalidatePath(`/profiles/centro/${user.id}`);
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
