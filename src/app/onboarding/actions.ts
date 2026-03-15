"use server";
import { getSession, setSession } from "@/lib/auth-server";
import { jwtVerify } from "jose";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(process.env.INVITATION_SECRET || "padel_secret_key_123_change_me");

export async function linkRoleToUser(role: string, invitedByClubId?: string | null, token?: string | null) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;

    if (!session?.userId) {
        throw new Error("No estás autenticado");
    }

    const userId = session.userId;
    let finalRole = role;

    // Verify token if present
    if (token) {
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            if (payload.issuer !== 'superadmin' && payload.issuer !== 'club') {
                throw new Error("Token de invitación inválido");
            }
            finalRole = payload.role as string;
        } catch (e: any) {
            console.error("JWT Verification failed:", e);
            throw new Error("El link de invitación ha expirado o es inválido (vida útil: 24hs)");
        }
    }

    // List of allowed roles
    const allowedRoles = ["jugador", "club"];
    if (!allowedRoles.includes(finalRole)) {
        throw new Error("Rol inválido");
    }

    try {
        // Update DB
        const updateData: any = { role: finalRole };
        if (invitedByClubId) {
            updateData.clubId = invitedByClubId;
        }

        // Note: isLibre is not in the current schema. If needed, we should add it.
        // For now, we only update role and clubId.

        await db.update(users)
            .set(updateData)
            .where(eq(users.id, userId));

        // Refresh the session cookie with the new role
        await setSession(userId, session.email, finalRole);

        return { success: true };
    } catch (err) {
        console.error("Error setting role in DB", err);
        return { success: false, error: "Hubo un error al asignar el rol" };
    }
}
