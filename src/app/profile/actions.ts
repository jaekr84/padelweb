"use server";

import { db } from "@/db";
import { users, instructorProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

export async function updatePlayerProfile(formData: {
    name: string;
    location: string;
    bio: string;
    side: string;
}) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No autorizado");
    const userId = session.userId;

    await db
        .update(users)
        .set({
            firstName: formData.name, // Using firstName as the display name for now
            location: formData.location,
            bio: formData.bio,
            side: formData.side,
        })
        .where(eq(users.id, userId));

    revalidatePath("/profile");
    return { ok: true };
}

export async function switchRole(newRole: "jugador" | "profe") {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No autorizado");
    const userId = session.userId;

    await db
        .update(users)
        .set({ role: newRole })
        .where(eq(users.id, userId));

    if (newRole === "profe") {
        const [existing] = await db.select().from(instructorProfiles).where(eq(instructorProfiles.userId, userId));
        if (!existing) {
            await db.insert(instructorProfiles).values({
                userId: userId,
                name: session.email.split('@')[0] || "Profesor",
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
