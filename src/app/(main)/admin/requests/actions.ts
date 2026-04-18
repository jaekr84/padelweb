"use server";

import { db } from "@/db";
import { registrationRequests, contactMessages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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
