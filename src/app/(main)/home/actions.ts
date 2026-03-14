"use server";

import { db } from "@/db";
import { posts } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { desc } from "drizzle-orm";

export async function createPost(content: string, imageUrl: string | null) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No autenticado");
    const userId = session.userId;

    await db.insert(posts).values({
        id: crypto.randomUUID(),
        userId,
        content,
        imageUrl,
    });
}
