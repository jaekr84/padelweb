import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { posts, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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
                post: {
                    id: posts.id,
                    content: posts.content,
                    imageUrl: posts.imageUrl,
                    createdAt: posts.createdAt,
                    userId: posts.userId,
                },
                user: {
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    role: users.role,
                    imageUrl: users.imageUrl,
                }
            })
            .from(posts)
            .leftJoin(users, eq(posts.userId, users.id))
            .orderBy(desc(posts.createdAt))
            .limit(50);

        if (userId) {
            const userResults = await db
                .select({
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email,
                    imageUrl: users.imageUrl,
                })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);
            
            const dbUser = userResults[0];
            if (dbUser) {
                currentUser = {
                    id: dbUser.id,
                    name: `${dbUser.firstName} ${dbUser.lastName}`.trim() || dbUser.email,
                    imageUrl: dbUser.imageUrl,
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
                    imageUrl: r.user?.imageUrl || null,
                }
        }));

    } catch (e) {
        console.error("Error loading home page:", e);
    }

    return (
        <HomeClient
            initialPosts={initialPosts}
            currentUser={currentUser}
        />
    );
}
