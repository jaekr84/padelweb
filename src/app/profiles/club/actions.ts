"use server";

import { db } from "@/db";
import { clubs, users } from "@/db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateClubProfile(formData: FormData) {
    const user = await currentUser();
    if (!user) {
        throw new Error("No estás autenticado");
    }

    const name = formData.get("name") as string;
    const bio = formData.get("bio") as string;
    const location = formData.get("location") as string;
    const phone = formData.get("phone") as string;
    const website = formData.get("website") as string;

    // Convert comma separated string to array
    const amenitiesString = formData.get("amenities") as string;
    const amenities = amenitiesString ? amenitiesString.split(",").map(s => s.trim()).filter(Boolean) : [];

    // Check if club exists

    // Ensure the user exists in our Neon DB to prevent FK constraint failures
    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress
        || user.emailAddresses[0]?.emailAddress
        || "no-email@padelweb.com";

    const role = (user.publicMetadata?.role as string) || "club";

    await db.insert(users).values({
        id: user.id,
        email: primaryEmail,
        role: role
    }).onConflictDoNothing();

    const existingClubs = await db.select().from(clubs).where(eq(clubs.ownerId, user.id));

    if (existingClubs.length > 0) {
        // Update
        await db.update(clubs).set({
            name,
            bio,
            location,
            phone,
            website,
            amenities
        }).where(eq(clubs.ownerId, user.id));
    } else {
        // Insert
        await db.insert(clubs).values({
            id: user.id, // using clerk id mapped 1:1 for simplicity
            ownerId: user.id,
            name: name || user.firstName || "Mi Club",
            bio,
            location,
            phone,
            website,
            amenities
        });
    }

    revalidatePath("/profiles/club");
    return { success: true };
}
