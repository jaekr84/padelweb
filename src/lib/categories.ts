import { db } from "@/db";
import { categoriesTable } from "@/db/schema";
import { eq, and, lte, gte, asc } from "drizzle-orm";

/**
 * Finds the appropriate category name for a given point value.
 */
export async function getCategoryFromPoints(points: number): Promise<string | null> {
    const [matched] = await db
        .select()
        .from(categoriesTable)
        .where(
            and(
                eq(categoriesTable.isActive, true),
                lte(categoriesTable.minPoints, points),
                gte(categoriesTable.maxPoints, points)
            )
        )
        .limit(1);

    return matched?.name ?? null;
}

export async function getAllActiveCategories() {
    return await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(asc(categoriesTable.categoryOrder));
}
