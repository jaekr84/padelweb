"use server";

import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { marketplaceItems, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getMarketplaceItems() {
    return await db.query.marketplaceItems.findMany({
        with: {
            user: true,
        },
        orderBy: [desc(marketplaceItems.createdAt)],
    });
}

export async function createMarketplaceItem(data: {
    title: string;
    price: number;
    images: string[];
    category: string;
    condition: string;
    whatsappUrl: string;
    observations?: string;
}) {
    const session = await getSession() as { userId: string } | null;
    if (!session?.userId) throw new Error("No estás autenticado");

    const [item] = await db.insert(marketplaceItems).values({
        userId: session.userId,
        title: data.title,
        price: data.price,
        images: data.images,
        category: data.category,
        condition: data.condition,
        whatsappUrl: data.whatsappUrl,
        observations: data.observations || "",
    }).returning();

    revalidatePath("/marketplace");
    return { success: true, item };
}

export async function deleteMarketplaceItem(id: string) {
    const session = await getSession() as { userId: string, role: string } | null;
    if (!session?.userId) throw new Error("No estás autenticado");

    const item = await db.query.marketplaceItems.findFirst({
        where: eq(marketplaceItems.id, id)
    });

    if (!item) throw new Error("Item no encontrado");
    if (item.userId !== session.userId && session.role !== 'superadmin') {
        throw new Error("No tenés permiso para borrar este item");
    }

    await db.delete(marketplaceItems).where(eq(marketplaceItems.id, id));
    revalidatePath("/marketplace");
    return { success: true };
}
