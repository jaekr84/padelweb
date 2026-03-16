import { db } from "@/db";
import { categoriesTable, bracketMatches, registrations, tournaments, users } from "@/db/schema";
import { eq, and, lte, gte, asc, sql, desc } from "drizzle-orm";
import { differenceInMonths, addMonths } from "date-fns";


/**
 * Finds the appropriate category for a given point value.
 */
export async function getCategoryFromPoints(points: number) {
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

    return matched ?? null;
}

export async function getCategoryByName(name: string) {
    const [matched] = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.name, name))
        .limit(1);
    return matched ?? null;
}

export async function getAllActiveCategories() {
    return await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(asc(categoriesTable.categoryOrder));
}

export async function countUserWins(userId: string, categoryName: string, year: number) {
    const results = await db
        .select({ value: sql<number>`count(*)` })
        .from(bracketMatches)
        .innerJoin(registrations, eq(bracketMatches.winnerId, registrations.id))
        .innerJoin(tournaments, eq(bracketMatches.tournamentId, tournaments.id))
        .where(
            and(
                eq(bracketMatches.round, 0),
                eq(bracketMatches.confirmed, true),
                sql`(registrations.user_id = ${userId} OR registrations.partner_user_id = ${userId})`,
                eq(registrations.category, categoryName),
                sql`YEAR(${tournaments.createdAt}) = ${year}`
            )
        );
    return Number(results[0]?.value ?? 0);
}

export async function checkAndApplyInactivityDowngrade(userId: string) {
    const [user] = await db
        .select({
            id: users.id,
            category: users.category,
            points: users.points,
            lastParticipationAt: users.lastParticipationAt,
            lastCategoryUpdate: users.lastCategoryUpdate,
            createdAt: users.createdAt
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!user) return null;

    // Use lastParticipationAt, if null use createdAt
    const referenceDate = user.lastParticipationAt || user.createdAt;
    const monthsInactive = differenceInMonths(new Date(), referenceDate);

    // If less than 12 months, do nothing
    if (monthsInactive < 12) return null;

    // Calculation logic:
    // We check how many months have passed since the last evaluation (lastCategoryUpdate)
    // If it's been > 12 months AND they are still inactive, they drop again.
    const monthsSinceLastCheck = differenceInMonths(new Date(), user.lastCategoryUpdate || user.createdAt);
    
    if (monthsSinceLastCheck < 12) return null;

    const allCats = await getAllActiveCategories();
    const currentCatObj = allCats.find(c => c.name === user.category);
    
    if (!currentCatObj) return null;

    // Higher categoryOrder = Lower skill level (e.g. 1=A, 2=B, 3=C, 4=D)
    const nextLowerCat = allCats
        .filter(c => c.categoryOrder > currentCatObj.categoryOrder)
        .sort((a, b) => a.categoryOrder - b.categoryOrder)[0];

    if (!nextLowerCat) {
        // Already at the lowest category, update check date
        await db.update(users)
            .set({ lastCategoryUpdate: new Date() })
            .where(eq(users.id, userId));
        return null;
    }

    // Apply downgrade
    await db.update(users)
        .set({ 
            category: nextLowerCat.name,
            points: nextLowerCat.maxPoints, // Reset to bottom of the new category (top points of lower cat)
            lastCategoryUpdate: new Date()
        })
        .where(eq(users.id, userId));

    return {
        oldCategory: user.category,
        newCategory: nextLowerCat.name,
        applied: true
    };
}
