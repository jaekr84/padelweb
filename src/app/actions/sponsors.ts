"use server";

import { db } from "@/db";
import { sponsors } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import path from "path";

/**
 * Helper to delete a file from the server given its public URL
 */
async function deleteFileByUrl(url: string | null) {
    if (!url || !url.startsWith("/uploads/")) return;

    try {
        const filename = url.replace("/uploads/", "");
        const uploadDir = process.env.NODE_ENV === 'production'
            ? '/home/u957097802/domains/acap.ar/public_html/uploads'
            : path.join(process.cwd(), "public", "uploads");

        const filePath = path.join(uploadDir, filename);
        await unlink(filePath);
        console.log(`[Storage] Deleted file: ${filePath}`);
    } catch (err) {
        // We log the error but don't throw, as the database operation might still be valid
        console.error("[Storage] Error deleting file:", err);
    }
}

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
        // Query the old record to get the old image URL
        const existing = await db.select().from(sponsors).where(eq(sponsors.id, id)).limit(1);
        const oldSponsor = existing[0];

        // If the image URL is changing, delete the old one
        if (oldSponsor && data.imageUrl && oldSponsor.imageUrl !== data.imageUrl) {
            await deleteFileByUrl(oldSponsor.imageUrl);
        }

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
        // Query record first to get the image URL
        const existing = await db.select().from(sponsors).where(eq(sponsors.id, id)).limit(1);
        const sponsorToDelete = existing[0];

        if (sponsorToDelete) {
            // Delete the physical file
            await deleteFileByUrl(sponsorToDelete.imageUrl);
        }

        await db.delete(sponsors).where(eq(sponsors.id, id));
        
        revalidatePath("/");
        revalidatePath("/admin/sponsors");
        return { success: true };
    } catch (err) {
        console.error("[deleteSponsor]", err);
        throw new Error("Error al eliminar el sponsor");
    }
}
