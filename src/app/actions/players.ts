"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getAllPlayers() {
    try {
        const allUsers = await db.select().from(users).where(eq(users.role, "jugador"));
        return allUsers.map(u => ({
            id: u.id,
            name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email.split("@")[0],
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            category: u.category,
            points: u.points,
            gender: u.gender,
            clubId: u.clubId
        }));
    } catch (err) {
        console.error("[getAllPlayers]", err);
        return [];
    }
}
