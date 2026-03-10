"use server";

import { getSession, setSession } from "@/lib/auth-server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const VALID_ROLES = ["jugador", "profe", "centro_de_padel", "club", "superadmin"] as const;
type Role = typeof VALID_ROLES[number];

export async function switchRole(role: Role) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("Not authenticated");

    if (!VALID_ROLES.includes(role)) throw new Error("Invalid role");

    await db.update(users).set({ role }).where(eq(users.id, session.userId));

    // Update the session cookie with the new role
    await setSession(session.userId, session.email, role);

    // Revalidate all pages so server components pick up the new role
    revalidatePath("/", "layout");

    return { role };
}
