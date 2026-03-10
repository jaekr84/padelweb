import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { posts, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import FeedLayout from "@/app/feed/layout";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    let currentUser = null;
    let initialPosts: any[] = [];

    try {
        const session = await getSession();
        const userId = session?.userId as string | undefined;

        const rows = await db
            .select({
                post: posts,
                user: {
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    role: users.role,
                }
            })
            .from(posts)
            .leftJoin(users, eq(posts.userId, users.id))
            .orderBy(desc(posts.createdAt))
            .limit(50);

        if (userId) {
            const dbUser = await db.query.users.findFirst({
                where: eq(users.id, userId),
            });
            if (dbUser) {
                currentUser = {
                    id: dbUser.id,
                    name: `${dbUser.firstName} ${dbUser.lastName}`.trim() || dbUser.email,
                    imageUrl: null,
                };
            }
        }

        initialPosts = rows.map(r => ({
            id: r.post.id,
            content: r.post.content,
            imageUrl: r.post.imageUrl,
            createdAt: r.post.createdAt.toISOString(),
            user: {
                id: r.user?.id || "unknown",
                name: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : "Usuario Eliminado",
                role: r.user?.role || "jugador",
                imageUrl: null,
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
