import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "padel_master_secret_key_change_me_in_prod");

export async function hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
}

export async function signJWT(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(JWT_SECRET);
}

export async function verifyJWT(token: string) {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload;
    } catch (e) {
        return null;
    }
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;
    
    const payload = await verifyJWT(token);
    if (!payload || !payload.userId || !payload.sessionVersion) return null;

    // Verificar contra la base de datos para asegurar login único
    const [user] = await db
        .select({ sessionVersion: users.sessionVersion })
        .from(users)
        .where(eq(users.id, payload.userId as string))
        .limit(1);

    if (!user || user.sessionVersion !== payload.sessionVersion) {
        return null;
    }

    return payload;
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
        maxAge: 60 * 60 * 24, // 1 day
    });
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
}
