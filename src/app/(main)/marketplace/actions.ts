"use server";

import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { marketplaceItems, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getMarketplaceItems() {
    const items = await db
        .select({
            id: marketplaceItems.id,
            userId: marketplaceItems.userId,
            title: marketplaceItems.title,
            description: marketplaceItems.description,
            price: marketplaceItems.price,
            images: marketplaceItems.images,
            category: marketplaceItems.category,
            condition: marketplaceItems.condition,
            status: marketplaceItems.status,
            whatsappUrl: marketplaceItems.whatsappUrl,
            observations: marketplaceItems.observations,
            createdAt: marketplaceItems.createdAt,
            updatedAt: marketplaceItems.updatedAt,
            user: {
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
            }
        })
        .from(marketplaceItems)
        .leftJoin(users, eq(marketplaceItems.userId, users.id))
        .orderBy(desc(marketplaceItems.createdAt));
    
    return items;
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

    const newItem = {
        id: crypto.randomUUID(),
        userId: session.userId,
        title: data.title,
        price: data.price,
        images: data.images,
        category: data.category,
        condition: data.condition,
        whatsappUrl: data.whatsappUrl,
        observations: data.observations || "",
    };

    await db.insert(marketplaceItems).values(newItem);

    revalidatePath("/marketplace");
    return { success: true, item: newItem };
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

export async function updateMarketplaceItem(id: string, data: {
    title: string;
    price: number;
    images: string[];
    category: string;
    condition: string;
    whatsappUrl: string;
    observations?: string;
}) {
    const session = await getSession() as { userId: string, role: string } | null;
    if (!session?.userId) throw new Error("No estás autenticado");

    const item = await db.query.marketplaceItems.findFirst({
        where: eq(marketplaceItems.id, id)
    });

    if (!item) throw new Error("Item no encontrado");
    if (item.userId !== session.userId && session.role !== 'superadmin') {
        throw new Error("No tenés permiso para editar este item");
    }

    await db.update(marketplaceItems)
        .set({
            title: data.title,
            price: data.price,
            images: data.images,
            category: data.category,
            condition: data.condition,
            whatsappUrl: data.whatsappUrl,
            observations: data.observations || "",
            updatedAt: new Date(),
        })
        .where(eq(marketplaceItems.id, id));

    revalidatePath("/marketplace");
    return { success: true };
}
