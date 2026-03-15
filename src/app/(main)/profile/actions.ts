"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

export async function updatePlayerProfile(formData: {
    firstName: string;
    lastName: string;
    phone: string;
    location: string;
    bio: string;
    side: string;
    gender: string;
    imageUrl?: string | null;
}) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No autorizado");
    const userId = session.userId;

    await db
        .update(users)
        .set({
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            location: formData.location,
            bio: formData.bio,
            side: formData.side,
            gender: formData.gender,
            imageUrl: formData.imageUrl,
        })
        .where(eq(users.id, userId));

    revalidatePath("/profile");
    return { ok: true };
}


