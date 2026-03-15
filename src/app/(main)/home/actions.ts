"use server";

import { db } from "@/db";
import { posts, postComments } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";

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
    revalidatePath("/home");
}

export async function addComment(postId: string, content: string) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No autenticado");
    const userId = session.userId;

    await db.insert(postComments).values({
        id: crypto.randomUUID(),
        postId,
        userId,
        content,
    });
    revalidatePath("/home");
}

export async function updateComment(commentId: string, content: string) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No autenticado");
    const userId = session.userId;

    await db.update(postComments)
        .set({ content })
        .where(and(
            eq(postComments.id, commentId),
            eq(postComments.userId, userId)
        ));
    
    revalidatePath("/home");
}

export async function deleteComment(commentId: string) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No autenticado");
    const userId = session.userId;

    await db.delete(postComments)
        .where(and(
            eq(postComments.id, commentId),
            eq(postComments.userId, userId)
        ));
    
    revalidatePath("/home");
}
