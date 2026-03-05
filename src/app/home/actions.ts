"use server";

import { db } from "@/db";
import { posts, users } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { desc } from "drizzle-orm";

export async function createPost(content: string, imageUrl: string | null) {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) throw new Error("No autenticado");

    await db.insert(posts).values({
        userId,
        content,
        imageUrl,
    });
}
