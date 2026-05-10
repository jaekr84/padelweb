import { signJWT, verifyJWT } from "./auth-jwt";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

import { cache } from "react";

// JWT Logic moved to auth-jwt.ts

export async function hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
}

// JWT functions now imported from auth-jwt.ts

export interface Session {
    userId: string;
    email: string;
    role: string;
    dbRole: string;
}

export const getSession = cache(async (): Promise<Session | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;
    
    const payload = await verifyJWT(token);
    if (!payload || !payload.userId || !payload.sessionVersion) return null;

    // Verificar contra la base de datos para asegurar login único
    // Verificar contra la base de datos para asegurar login único
    let user;
    try {
        user = await db.query.users.findFirst({
            where: eq(users.id, payload.userId as string),
            columns: {
                sessionVersion: true,
                role: true
            }
        });
    } catch (dbError: any) {
        console.error("DEBUG - Database Error in getSession:", {
            message: dbError.message,
            code: dbError.code
        });
        return null;
    }

    if (!user || user.sessionVersion !== payload.sessionVersion) {
        return null;
    }

    // Role override logic
    let activeRole = payload.role as string;
    const requestedRole = cookieStore.get("active_role")?.value;
    
    if (requestedRole) {
        const userRoles = user.role.split(',');
        if (userRoles.includes('superadmin')) {
            // Superadmin can switch to any role
            activeRole = requestedRole;
        } else if (userRoles.includes(requestedRole)) {
            // Can switch to any role you actually have
            activeRole = requestedRole;
        } else if (userRoles.includes('club') && requestedRole === 'jugador') {
            // Club users can also see player view
            activeRole = requestedRole;
        }
    }

    // Return extended session with both the active simulated role and the real DB role
    return { 
        userId: payload.userId as string,
        email: payload.email as string,
        role: activeRole,
        dbRole: user.role
    };
});

/**
 * Ensures a user is authenticated and returns the session.
 * Throws an error if not authenticated.
 */
export async function requireSession(): Promise<Session> {
    const session = await getSession();
    if (!session) {
        throw new Error("No autenticado");
    }
    return session;
}

export async function setSession(userId: string, email: string, role: string) {
    const sessionVersion = Math.floor(Date.now() / 1000);
    
    // Actualizar la versión de sesión en la base de datos
    await db.update(users)
        .set({ sessionVersion })
        .where(eq(users.id, userId));

    const token = await signJWT({ userId, email, role, sessionVersion });
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
}
