"use server";

import { db } from "@/db";
import { clubs } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function getClubs() {
    try {
        const results = await db
            .select({
                id: clubs.id,
                name: clubs.name,
                logoUrl: clubs.logoUrl,
            })
            .from(clubs)
            .orderBy(asc(clubs.name));

        return results;
    } catch (err) {
        console.error("[getClubs]", err);
        return [];
    }
}
