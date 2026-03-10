"use server";

import { db } from "@/db";
import { clubs, users } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { eq } from "drizzle-orm";
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
            amenities
        });
    }

    revalidatePath("/profiles/club", "layout");
    return { success: true };
}
