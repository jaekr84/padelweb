"use server";

import { db } from "@/db";
import { users, clubs } from "@/db/schema";
import { comparePassword, setSession } from "@/lib/auth-server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Faltan campos obligatorios" };
    }

    // 1. Find user
    const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase())
    });

    if (!user || !user.passwordHash) {
        return { error: "Credenciales inválidas" };
    }

    // 2. Compare password
    const isValid = await comparePassword(password, user.passwordHash);

    if (!isValid) {
        return { error: "Credenciales inválidas" };
    }

    // 3. Set session
    await setSession(user.id, user.email, user.role);

    revalidatePath("/home");
    redirect("/home");
}

export async function logoutAction() {
    const { deleteSession } = await import("@/lib/auth-server");
    await deleteSession();
    redirect("/login");
}

export async function getSidebarUser() {
    const { getSession } = await import("@/lib/auth-server");
    const session = await getSession();
    if (!session || !session.userId) return null;

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId as string)
    });

    if (!user) return null;

    let displayName = user.firstName 
        ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
        : user.email.split('@')[0];
    
    if (user.role === 'club') {
        const club = await db.query.clubs.findFirst({
            where: eq(clubs.ownerId, user.id)
        });
        if (club) displayName = club.name;
    }

    return {
        name: displayName,
        role: user.role
    };
}
