"use server";

import { db } from "@/db";
import { users, categoriesTable } from "@/db/schema";
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

export async function promotePlayerManually(userId: string, targetCategory: string) {
    await checkSuperAdmin();

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error("Usuario no encontrado");

    const [targetCatData] = await db.select().from(categoriesTable).where(eq(categoriesTable.name, targetCategory)).limit(1);
    const startPoints = targetCatData?.minPoints || 0;

    await db.update(users)
        .set({ 
            category: targetCategory,
            points: startPoints,
            lastCategoryUpdate: new Date()
        })
        .where(eq(users.id, userId));

    revalidatePath("/admin/promotions");
    revalidatePath("/admin/users");
    revalidatePath("/ranking");

    return { success: true };
}
