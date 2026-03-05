import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { posts, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import FeedLayout from "@/app/feed/layout";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    let currentUser = null;
    let initialPosts: any[] = [];

    try {
        const authData = await auth();
        const userId = authData.userId;

        if (userId) {
            const dbUser = await db.query.users.findFirst({
                where: eq(users.id, userId),
            });
            if (dbUser) {
                currentUser = {
                    id: dbUser.id,
                    name: dbUser.name,
                    imageUrl: null, // Si hubiese avatarUrl en schema, lo pasaría
                };
            }
        }

        // Fetch posts joined with users
        const rows = await db
            .select({
                post: posts,
                user: {
                    id: users.id,
                    name: users.name,
                    role: users.role,
                }
            })
            .from(posts)
            .leftJoin(users, eq(posts.userId, users.id))
            .orderBy(desc(posts.createdAt))
            .limit(50);

        initialPosts = rows.map(r => ({
            id: r.post.id,
            content: r.post.content,
            imageUrl: r.post.imageUrl,
            createdAt: r.post.createdAt.toISOString(),
            user: {
                id: r.user?.id || "unknown",
                name: r.user?.name || "Usuario Eliminado",
                role: r.user?.role || "jugador",
                imageUrl: null, // Add if user avatar is tracked
            }
        }));

    } catch (e) {
        console.error("Error loading home page:", e);
    }

    return (
        <FeedLayout>
            <HomeClient
                initialPosts={initialPosts}
                currentUser={currentUser}
            />
        </FeedLayout>
    );
}
