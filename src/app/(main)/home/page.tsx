import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { posts, users, postComments } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    let currentUser = null;
    let initialPosts: any[] = [];

    try {
        const session = await getSession();
        const userId = session?.userId as string | undefined;

        if (userId) {
            const userResults = await db
                .select()
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);
            
            if (userResults.length > 0) {
                const u = userResults[0];
                currentUser = {
                    id: u.id,
                    name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
                    imageUrl: u.imageUrl,
                    role: u.role
                };
            }
        }

        // 1. Fetch posts joined with users
        const postRows = await db
            .select({
                post: posts,
                user: users
            })
            .from(posts)
            .leftJoin(users, eq(posts.userId, users.id))
            .orderBy(desc(posts.createdAt))
            .limit(50);

        if (postRows.length > 0) {
            const postIds = postRows.map(r => r.post.id);
            
            // 2. Fetch comments joined with users
            const commentRows = await db
                .select({
                    comment: postComments,
                    user: users
                })
                .from(postComments)
                .leftJoin(users, eq(postComments.userId, users.id))
                .where(inArray(postComments.postId, postIds))
                .orderBy(postComments.createdAt);

            // 3. Assemble
            initialPosts = postRows.map(r => ({
                id: r.post.id,
                content: r.post.content,
                imageUrl: r.post.imageUrl,
                createdAt: r.post.createdAt.toISOString(),
                user: {
                    id: r.user?.id || "unknown",
                    name: r.user ? `${r.user.firstName || ""} ${r.user.lastName || ""}`.trim() : "Usuario Eliminado",
                    role: r.user?.role || "jugador",
                    imageUrl: r.user?.imageUrl || null,
                },
                comments: commentRows
                    .filter(c => c.comment.postId === r.post.id)
                    .map(c => ({
                        id: c.comment.id,
                        content: c.comment.content,
                        createdAt: c.comment.createdAt.toISOString(),
                        user: {
                            id: c.user?.id || "unknown",
                            name: c.user ? `${c.user.firstName || ""} ${c.user.lastName || ""}`.trim() : "Usuario Eliminado",
                            imageUrl: c.user?.imageUrl || null,
                        }
                    }))
            }));
        }

    } catch (e) {
        console.error("DEBUG: Error loading home page or feed:", e);
    }

    return (
        <HomeClient
            initialPosts={initialPosts}
            currentUser={currentUser}
        />
    );
}
