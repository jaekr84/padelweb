"use server";

import { db } from "@/db";
import { users, clubs } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { eq, ne, and, desc, sql, notLike, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hashPassword } from "@/lib/auth-server";
import { HIDDEN_AND_DEMO_EMAILS, HIDDEN_USER_EMAILS, noEsInvitado } from "@/lib/hidden-users";
import { freeClubId } from "@/lib/managed-club";

async function checkSuperAdmin() {
    const session = await getSession() as { userId: string, role: string } | null;
    if (!session || session.role !== "superadmin") {
        throw new Error("No tienes permisos para realizar esta acción");
    }
    return session;
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
    await checkSuperAdmin();

    await db.update(users)
        .set({ isActive })
        .where(eq(users.id, userId));

    revalidatePath("/admin/users");
    return { success: true };
}

export async function banUser(userId: string, days: number | null) {
    await checkSuperAdmin();

    let bannedUntil = null;
    if (days !== null) {
        bannedUntil = new Date();
        bannedUntil.setDate(bannedUntil.getDate() + days);
    }

    await db.update(users)
        .set({ bannedUntil })
        .where(eq(users.id, userId));

    revalidatePath("/admin/users");
    return { success: true };
}

const ASSIGNABLE_ROLES = ["jugador", "club", "superadmin"];

export async function updateUserRole(userId: string, role: string) {
    const session = await checkSuperAdmin();

    const [current] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
    if (!current) throw new Error("Usuario no encontrado");

    // Sólo los roles del selector, más los que la persona ya tenía (el modal
    // precarga los actuales: un rol viejo como "admin" no tiene que trabar el
    // guardado).
    const currentRoles = current.role.split(",").map(r => r.trim().toLowerCase());
    const roles = Array.from(new Set(
        role.split(",").map(r => r.trim().toLowerCase()).filter(Boolean)
    ));
    if (roles.length === 0 || roles.some(r => !ASSIGNABLE_ROLES.includes(r) && !currentRoles.includes(r))) {
        throw new Error("Rol no válido");
    }
    const normalizedRole = roles.join(",");

    const roleChanged = current.role !== normalizedRole;

    await db.transaction(async (tx) => {
        await tx.update(users)
            .set({
                role: normalizedRole,
                // El rol viaja en el JWT del login: sin esto la persona sigue
                // navegando con el rol viejo hasta que cierra sesión por su
                // cuenta (y el proxy le bloquea las rutas de club). Se le corta
                // la sesión para que vuelva a entrar con el rol nuevo. A uno
                // mismo no, para no sacar al admin que se está editando.
                ...(roleChanged && userId !== session.userId
                    ? { sessionVersion: sql`session_version + 1` }
                    : {}),
            })
            .where(eq(users.id, userId));

        // Darle el rol club crea el club en el acto. Antes se creaba recién
        // cuando la persona abría "Mi Club" con ese rol activo, y hasta entonces
        // Mis Torneos / Cancha Abierta decían que no tenía club asociado.
        if (roles.includes("club")) {
            const [owned] = await tx
                .select({ id: clubs.id })
                .from(clubs)
                .where(eq(clubs.ownerId, userId))
                .limit(1);
            if (!owned) {
                await tx.insert(clubs).values({
                    id: await freeClubId(tx, userId),
                    ownerId: userId,
                    name: "Mi Club",
                    type: "club",
                    bio: "Nuevo club en PadelWeb",
                    location: "",
                    amenities: [],
                });
            }
        }
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/clubs");
    return { success: true, sessionClosed: roleChanged && userId !== session.userId };
}
export async function updateUserCategory(userId: string, category: string, points?: number) {
    await checkSuperAdmin();

    await db.update(users)
        .set({
            category,
            ...(points !== undefined ? { points } : {})
        })
        .where(eq(users.id, userId));

    revalidatePath("/admin/users");
    revalidatePath("/ranking");
    return { success: true };
}

export async function updateUserClub(userId: string, clubId: string | null) {
    await checkSuperAdmin();

    await db.update(users)
        .set({ clubId })
        .where(eq(users.id, userId));

    revalidatePath("/admin/users");
    return { success: true };
}


export async function resetDatabasePlayers() {
    await checkSuperAdmin();

    try {
        // Delete non-superadmin users
        // Note: This might require deleting related records first if there are FK constraints
        // For now, we try to delete them. If it fails due to FK, we'd need a more complex cleanup.
        await db.delete(users).where(
            and(
                notLike(users.role, "%superadmin%"),
                notInArray(users.email, HIDDEN_AND_DEMO_EMAILS)
            )
        );

        revalidatePath("/admin/users");
        revalidatePath("/ranking");
        return { success: true };
    } catch (error) {
        console.error("Reset error:", error);
        throw new Error("No se pudo resetear la base de datos de jugadores. Es posible que tengan registros o torneos asociados.");
    }
}



export async function getUsers() {
    await checkSuperAdmin();

    return await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        bannedUntil: users.bannedUntil,
        points: users.points,
        category: users.category,
        gender: users.gender,
        documentNumber: users.documentNumber,
        clubId: users.clubId,
        createdAt: users.createdAt,
    })
        .from(users)
        .where(and(notInArray(users.email, HIDDEN_USER_EMAILS as unknown as string[]), noEsInvitado()))
        .orderBy(desc(users.createdAt));
}

export async function resetUserPassword(userId: string) {
    await checkSuperAdmin();

    // Generate a human-readable temp password
    const tempPassword = `ACAP${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await hashPassword(tempPassword);

    await db.update(users)
        .set({ 
            passwordHash: hashedPassword,
            // Force session refresh for the user
            sessionVersion: sql`session_version + 1`
        })
        .where(eq(users.id, userId));

    return { success: true, tempPassword };
}
