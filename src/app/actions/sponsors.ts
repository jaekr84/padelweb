"use server";

import { db } from "@/db";
import { sponsors } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

export async function getSponsors() {
    try {
        return await db.select().from(sponsors).orderBy(desc(sponsors.createdAt));
    } catch (err) {
        console.error("[getSponsors]", err);
        return [];
    }
}

export async function addSponsor(data: {
    name: string;
    imageUrl: string;
    link?: string;
}) {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
        throw new Error("No tienes permiso para realizar esta acción");
    }

    try {
        await db.insert(sponsors).values({
            id: crypto.randomUUID(),
            name: data.name,
            imageUrl: data.imageUrl,
            link: data.link || null,
            isActive: true,
        });

        revalidatePath("/");
        revalidatePath("/admin/sponsors");
        return { success: true };
    } catch (err) {
        console.error("[addSponsor]", err);
        throw new Error("Error al agregar el sponsor");
    }
}

export async function updateSponsor(id: string, data: {
    name?: string;
    imageUrl?: string;
    link?: string;
    isActive?: boolean;
}) {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
        throw new Error("No tienes permiso para realizar esta acción");
    }

    try {
        await db.update(sponsors)
            .set({
                name: data.name,
                imageUrl: data.imageUrl,
                link: data.link || null,
                isActive: data.isActive,
            })
            .where(eq(sponsors.id, id));

        revalidatePath("/");
        revalidatePath("/admin/sponsors");
        return { success: true };
    } catch (err) {
        console.error("[updateSponsor]", err);
        throw new Error("Error al actualizar el sponsor");
    }
}

export async function deleteSponsor(id: string) {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
        throw new Error("No tienes permiso para realizar esta acción");
    }

    try {
        await db.delete(sponsors).where(eq(sponsors.id, id));
        
        revalidatePath("/");
        revalidatePath("/admin/sponsors");
        return { success: true };
    } catch (err) {
        console.error("[deleteSponsor]", err);
        throw new Error("Error al eliminar el sponsor");
    }
}
