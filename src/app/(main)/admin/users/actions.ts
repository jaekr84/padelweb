"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { eq, ne, and, desc, sql } from "drizzle-orm";
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

export async function updateUserClub(userId: string, clubId: string | null) {
    await checkSuperAdmin();

    await db.update(users)
        .set({ clubId })
        .where(eq(users.id, userId));

    revalidatePath("/admin/users");
    return { success: true };
}


export async function resetDatabasePlayers() {
    await checkSuperAdmin();

    try {
        // Delete non-superadmin users
        // Note: This might require deleting related records first if there are FK constraints
        // For now, we try to delete them. If it fails due to FK, we'd need a more complex cleanup.
        await db.delete(users).where(
            and(
                ne(users.role, "superadmin"),
                sql`${users.email} NOT IN ('dev@jae.com', 'jae@dev.com', 'demo1@demo.com', 'demo2@demo.com', 'demo3@demo.com', 'demo4@demo.com', 'admin@admin.com', 'dkdunko@gmail.com')`
            )
        );

        revalidatePath("/admin/users");
        revalidatePath("/ranking");
        return { success: true };
    } catch (error) {
        console.error("Reset error:", error);
        throw new Error("No se pudo resetear la base de datos de jugadores. Es posible que tengan registros o torneos asociados.");
    }
}



export async function getUsers() {
    await checkSuperAdmin();

    return await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        bannedUntil: users.bannedUntil,
        points: users.points,
        category: users.category,
        gender: users.gender,
        documentNumber: users.documentNumber,
        createdAt: users.createdAt,
    })
        .from(users)
        .where(sql`${users.email} NOT IN ('dev@jae.com', 'jae@dev.com', 'dkdunko@gmail.com')`)
        .orderBy(desc(users.createdAt));
}
