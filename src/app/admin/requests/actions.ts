"use server";

import { db } from "@/db";
import { registrationRequests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { checkSuperadmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getRegistrationRequests() {
    if (!(await checkSuperadmin())) {
        throw new Error("No autorizado");
    }

    return await db.select().from(registrationRequests).orderBy(desc(registrationRequests.createdAt));
}

export async function updateRequestStatus(id: string, status: "pendiente" | "enviado" | "aceptado" | "rechazado" | "caducado") {
    if (!(await checkSuperadmin())) {
        throw new Error("No autorizado");
    }

    await db.update(registrationRequests)
        .set({ status })
        .where(eq(registrationRequests.id, id));

    revalidatePath("/admin/requests");
}

export async function deleteRequestAction(id: string) {
    if (!(await checkSuperadmin())) {
        throw new Error("No autorizado");
    }

    await db.delete(registrationRequests).where(eq(registrationRequests.id, id));
    revalidatePath("/admin/requests");
}
