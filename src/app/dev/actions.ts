"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const VALID_ROLES = ["jugador", "profe", "centro_de_padel", "club"] as const;
type Role = typeof VALID_ROLES[number];

export async function switchRole(role: Role) {
    if (process.env.NODE_ENV !== "development") {
        throw new Error("Only available in development");
    }

    const { userId } = await auth();
    if (!userId) throw new Error("Not authenticated");

    if (!VALID_ROLES.includes(role)) throw new Error("Invalid role");

    await db.update(users).set({ role }).where(eq(users.id, userId));

    // Revalidate all pages so server components pick up the new role
    revalidatePath("/", "layout");
}
