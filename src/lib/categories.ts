import { db } from "@/db";
import { categoriesTable, bracketMatches, registrations, tournaments } from "@/db/schema";
import { eq, and, lte, gte, asc, sql } from "drizzle-orm";

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
