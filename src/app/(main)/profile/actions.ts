"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession, hashPassword, comparePassword } from "@/lib/auth-server";
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

export async function updatePasswordAction(formData: { currentPass: string, newPass: string }) {
    const session = await getSession();
    if (!session) throw new Error("No hay sesión activa");

    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (!user) throw new Error("Usuario no encontrado");

    if (!user.passwordHash) throw new Error("No tienes una contraseña establecida actualmente");
    
    const isMatch = await comparePassword(formData.currentPass, user.passwordHash);
    if (!isMatch) throw new Error("La contraseña actual es incorrecta");

    const newHash = await hashPassword(formData.newPass);

    await db.update(users)
        .set({ 
            passwordHash: newHash,
            sessionVersion: sql`session_version + 1` 
        })
        .where(eq(users.id, session.userId));

    return { success: true };
}


