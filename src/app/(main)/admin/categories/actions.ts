"use server";

import { db } from "@/db";
import { categoriesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-server";

export async function addCategory(data: {
    name: string;
    minPoints: number;
    maxPoints: number;
    categoryOrder: number;
}) {
    const session = await getSession();
    if (!session || session.role !== "superadmin") throw new Error("Unauthorized");

    await db.insert(categoriesTable).values({
        id: crypto.randomUUID(),
        ...data,
        isActive: true,
    });

    revalidatePath("/admin/categories");
    revalidatePath("/ranking");
}

export async function updateCategory(id: string, data: Partial<{
    name: string;
    minPoints: number;
    maxPoints: number;
    categoryOrder: number;
    isActive: boolean;
}>) {
    const session = await getSession();
    if (!session || session.role !== "superadmin") throw new Error("Unauthorized");

    await db.update(categoriesTable)
        .set(data)
        .where(eq(categoriesTable.id, id));

    revalidatePath("/admin/categories");
    revalidatePath("/ranking");
}

export async function deleteCategory(id: string) {
    const session = await getSession();
    if (!session || session.role !== "superadmin") throw new Error("Unauthorized");

    await db.update(categoriesTable)
        .set({ isActive: false })
        .where(eq(categoriesTable.id, id));

    revalidatePath("/admin/categories");
    revalidatePath("/ranking");
}
