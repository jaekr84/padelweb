"use server";

import { db } from "@/db";
import { users, instructorProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function updatePlayerProfile(formData: {
    name: string;
    location: string;
    bio: string;
    side: string;
}) {
    const user = await currentUser();
    if (!user) throw new Error("No autorizado");

    await db
        .update(users)
        .set({
            name: formData.name,
            location: formData.location,
            bio: formData.bio,
            side: formData.side,
        })
        .where(eq(users.id, user.id));

    revalidatePath("/profile");
    return { ok: true };
}

export async function switchRole(newRole: "jugador" | "profe") {
    const user = await currentUser();
    if (!user) throw new Error("No autorizado");

    await db
        .update(users)
        .set({ role: newRole })
        .where(eq(users.id, user.id));

    if (newRole === "profe") {
        const [existing] = await db.select().from(instructorProfiles).where(eq(instructorProfiles.userId, user.id));
        if (!existing) {
            await db.insert(instructorProfiles).values({
                userId: user.id,
                name: user.fullName || user.emailAddresses[0]?.emailAddress.split('@')[0] || "Profesor",
                level: "Profesor",
                experience: "Años de experiencia",
                availability: [
                    [0, 0, 0, 0, 1, 1, 1],
                    [1, 0, 1, 0, 0, 1, 1],
                    [1, 1, 0, 1, 0, 1, 0],
                ]
            });
        }
    }

    revalidatePath("/profile");
    revalidatePath("/profiles/profe");
    return { ok: true };
}
