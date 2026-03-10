import { db } from "@/db";
import { categoriesTable } from "@/db/schema";
import { eq, and, lte, gte, asc } from "drizzle-orm";

/**
 * Finds the appropriate category name for a given point value and gender.
 * If no specific gender match is found, it looks for 'mixto'.
 */
export async function getCategoryFromPoints(points: number, gender: string = 'mixto'): Promise<string | null> {
    // Try to find matching category for specific gender
    let [matched] = await db
        .select()
        .from(categoriesTable)
        .where(
            and(
                eq(categoriesTable.isActive, true),
                eq(categoriesTable.gender, gender),
                lte(categoriesTable.minPoints, points),
                gte(categoriesTable.maxPoints, points)
            )
        )
        .limit(1);

    // If not found, try 'mixto'
    if (!matched && gender !== 'mixto') {
        [matched] = await db
            .select()
            .from(categoriesTable)
            .where(
                and(
                    eq(categoriesTable.isActive, true),
                    eq(categoriesTable.gender, 'mixto'),
                    lte(categoriesTable.minPoints, points),
                    gte(categoriesTable.maxPoints, points)
                )
            )
            .limit(1);
    }

    // Still not found? Get the one with highest maxPoints if points exceed everything, 
    // or lowest minPoints if below everything. 
    // For now, let's just return the matched name if it exists.
    return matched?.name ?? null;
}

export async function getAllActiveCategories() {
    return await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(asc(categoriesTable.categoryOrder));
}
