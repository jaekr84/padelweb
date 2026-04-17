"use server";

import { db } from "@/db";
import { posts, postComments } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";

export async function createPost(content: string, images: string[] | null) {
    const session = await getSession();
    if (!session?.userId) throw new Error("No autenticado");
    
    // Use dbRole for actual permissions, as 'role' might be a simulated active role (e.g. "jugador")
    const baseRoles = session.dbRole.split(',');
    if (!baseRoles.includes("superadmin") && !baseRoles.includes("club")) {
        throw new Error("Solo los administradores pueden publicar");
    }
    
    const userId = session.userId;

    await db.insert(posts).values({
        id: crypto.randomUUID(),
        userId,
        content,
        // If it's a single image, we can also set the legacy imageUrl field for compatibility
        imageUrl: images && images.length === 1 ? images[0] : null,
        images: images,
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

export async function updatePost(postId: string, content: string) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No autenticado");
    const userId = session.userId;

    await db.update(posts)
        .set({ content })
        .where(and(
            eq(posts.id, postId),
            eq(posts.userId, userId)
        ));
    
    revalidatePath("/home");
}

export async function deletePost(postId: string) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    if (!session?.userId) throw new Error("No autenticado");
    const userId = session.userId;

    // First delete comments (manual cascade)
    await db.delete(postComments)
        .where(eq(postComments.postId, postId));

    // Then delete post
    await db.delete(posts)
        .where(and(
            eq(posts.id, postId),
            eq(posts.userId, userId)
        ));
    
    revalidatePath("/home");
}

