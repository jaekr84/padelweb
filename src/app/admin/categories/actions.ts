"use server"

import { db } from "@/db";
import { categoriesTable } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, asc } from "drizzle-orm";

import { checkSuperadmin } from "@/lib/auth";

export async function getCategories() {
    return await db.query.categoriesTable.findMany({
        where: eq(categoriesTable.isActive, true),
        orderBy: [asc(categoriesTable.categoryOrder)]
    });
}

export async function getAllCategoriesAdmin() {
    if (!(await checkSuperadmin())) {
        throw new Error('No autorizado');
    }

    return await db.select().from(categoriesTable).orderBy(asc(categoriesTable.categoryOrder));
}

export async function updateCategory(id: string, data: any) {
    if (!(await checkSuperadmin())) {
        throw new Error('No autorizado');
    }

    const { id: _, createdAt: __, ...updateData } = data;

    await db.update(categoriesTable)
        .set(updateData)
        .where(eq(categoriesTable.id, id));

    revalidatePath('/admin/categories');
    revalidatePath('/tournaments/create');
    return { success: true };
}

export async function createCategory(data: any) {
    if (!(await checkSuperadmin())) {
        throw new Error('No autorizado');
    }

    await db.insert(categoriesTable).values({
        ...data,
        id: crypto.randomUUID(),
    });

    revalidatePath('/admin/categories');
    revalidatePath('/tournaments/create');
    return { success: true };
}

export async function deleteCategory(id: string) {
    if (!(await checkSuperadmin())) {
        throw new Error('No autorizado');
    }

    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));

    revalidatePath('/admin/categories');
    revalidatePath('/tournaments/create');
    return { success: true };
}
