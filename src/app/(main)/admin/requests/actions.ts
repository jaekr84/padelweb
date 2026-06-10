"use server";

import { db } from "@/db";
import { registrationRequests, contactMessages, users } from "@/db/schema";
import { eq, desc, and, or, count } from "drizzle-orm";
import { checkAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getRegistrationRequests() {
    if (!(await checkAdmin())) {
        throw new Error("No autorizado");
    }

    return await db.select().from(registrationRequests).orderBy(desc(registrationRequests.createdAt));
}

export async function updateRequestStatus(id: string, status: "pendiente" | "enviado" | "aceptado" | "rechazado" | "caducado") {
    if (!(await checkAdmin())) {
        throw new Error("No autorizado");
    }

    await db.update(registrationRequests)
        .set({ status })
        .where(eq(registrationRequests.id, id));

    revalidatePath("/admin/requests");
}

export async function deleteRequestAction(id: string) {
    if (!(await checkAdmin())) {
        throw new Error("No autorizado");
    }

    await db.delete(registrationRequests).where(eq(registrationRequests.id, id));
    revalidatePath("/admin/requests");
}

// Contact Messages Actions
export async function getContactMessages() {
    if (!(await checkAdmin())) {
        throw new Error("No autorizado");
    }

    return await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
}

export async function updateMessageStatus(id: string, status: "pendiente" | "leido") {
    if (!(await checkAdmin())) {
        throw new Error("No autorizado");
    }

    await db.update(contactMessages)
        .set({ status })
        .where(eq(contactMessages.id, id));

    revalidatePath("/admin/requests");
}

export async function deleteMessageAction(id: string) {
    if (!(await checkAdmin())) {
        throw new Error("No autorizado");
    }

    await db.delete(contactMessages).where(eq(contactMessages.id, id));
    revalidatePath("/admin/requests");
}

// Pending signups (accounts created via invitation link, awaiting approval)
export async function getPendingSignups() {
    if (!(await checkAdmin())) {
        throw new Error("No autorizado");
    }

    return await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        gender: users.gender,
        createdAt: users.createdAt,
    })
        .from(users)
        .where(eq(users.approvalStatus, "pending"))
        .orderBy(desc(users.createdAt));
}

export async function approveSignupAction(userId: string) {
    if (!(await checkAdmin())) {
        throw new Error("No autorizado");
    }

    await db.update(users)
        .set({ approvalStatus: "approved" })
        .where(and(eq(users.id, userId), eq(users.approvalStatus, "pending")));

    revalidatePath("/admin/requests");
}

export async function rejectSignupAction(userId: string) {
    if (!(await checkAdmin())) {
        throw new Error("No autorizado");
    }

    // Only pending accounts can be deleted from here
    await db.delete(users)
        .where(and(eq(users.id, userId), eq(users.approvalStatus, "pending")));

    revalidatePath("/admin/requests");
}

// Badge count: pending registration requests + unread contact messages
export async function getPendingRequestsCount(): Promise<number> {
    try {
        if (!(await checkAdmin())) return 0;

        const [regResult, msgResult, signupResult] = await Promise.all([
            db.select({ value: count() })
                .from(registrationRequests)
                .where(eq(registrationRequests.status, "pendiente")),
            db.select({ value: count() })
                .from(contactMessages)
                .where(eq(contactMessages.status, "pendiente")),
            db.select({ value: count() })
                .from(users)
                .where(eq(users.approvalStatus, "pending")),
        ]);

        return (regResult[0]?.value ?? 0) + (msgResult[0]?.value ?? 0) + (signupResult[0]?.value ?? 0);
    } catch {
        return 0;
    }
}
