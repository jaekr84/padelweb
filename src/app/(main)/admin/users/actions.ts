"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function checkSuperAdmin() {
    const session = await getSession() as { userId: string, role: string } | null;
    if (!session || session.role !== "superadmin") {
        throw new Error("No tienes permisos para realizar esta acción");
    }
    return session;
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
    await checkSuperAdmin();

    await db.update(users)
        .set({ isActive })
        .where(eq(users.id, userId));

    revalidatePath("/admin/users");
    return { success: true };
}

export async function banUser(userId: string, days: number | null) {
    await checkSuperAdmin();

    let bannedUntil = null;
    if (days !== null) {
        bannedUntil = new Date();
        bannedUntil.setDate(bannedUntil.getDate() + days);
    }

    await db.update(users)
        .set({ bannedUntil })
        .where(eq(users.id, userId));

    revalidatePath("/admin/users");
    return { success: true };
}

export async function updateUserRole(userId: string, role: string) {
    await checkSuperAdmin();

    await db.update(users)
        .set({ role })
        .where(eq(users.id, userId));

    revalidatePath("/admin/users");
    return { success: true };
}
export async function updateUserCategory(userId: string, category: string, points?: number) {
    await checkSuperAdmin();

    await db.update(users)
        .set({ 
            category,
            ...(points !== undefined ? { points } : {})
        })
        .where(eq(users.id, userId));

    revalidatePath("/admin/users");
    revalidatePath("/ranking");
    return { success: true };
}
