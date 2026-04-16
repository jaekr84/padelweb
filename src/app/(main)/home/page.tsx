import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { posts, users, postComments, tournaments, openCourtEvents, clubs, openCourtRegistrations } from "@/db/schema";
import { eq, desc, inArray, gte, and, not, sql } from "drizzle-orm";
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

        // 4. Fetch Quick View Data
        const upcomingTournaments = await db
            .select({
                id: tournaments.id,
                name: tournaments.name,
                startDate: tournaments.startDate,
                status: tournaments.status,
                imageUrl: tournaments.imageUrl,
                createdByUserId: tournaments.createdByUserId,
                categories: tournaments.categories,
                modalidad: tournaments.modalidad,
                type: tournaments.type,
                clubName: clubs.name,
            })
            .from(tournaments)
            .leftJoin(clubs, eq(tournaments.clubId, clubs.id))
            .where(eq(tournaments.status, 'published'))
            .orderBy(tournaments.startDate)
            .limit(5);

        const ongoingTournaments = await db
            .select({
                id: tournaments.id,
                name: tournaments.name,
                startDate: tournaments.startDate,
                status: tournaments.status,
                imageUrl: tournaments.imageUrl,
                createdByUserId: tournaments.createdByUserId,
                categories: tournaments.categories,
                modalidad: tournaments.modalidad,
                type: tournaments.type,
                clubName: clubs.name,
            })
            .from(tournaments)
            .leftJoin(clubs, eq(tournaments.clubId, clubs.id))
            .where(inArray(tournaments.status, ['en_curso', 'en_eliminatorias']))
            .orderBy(tournaments.startDate)
            .limit(5);

        const upcomingOpenCourts = await db
            .select({
                id: openCourtEvents.id,
                name: openCourtEvents.name,
                date: openCourtEvents.date,
                time: openCourtEvents.time,
                totalSlots: openCourtEvents.totalSlots,
                clubName: clubs.name,
                registrationCount: sql<number>`(SELECT count(*) FROM ${openCourtRegistrations} WHERE event_id = ${openCourtEvents.id})`
            })
            .from(openCourtEvents)
            .leftJoin(clubs, eq(openCourtEvents.clubId, clubs.id))
            .where(eq(openCourtEvents.status, 'active'))
            .orderBy(openCourtEvents.date, openCourtEvents.time)
            .limit(5);

        return (
            <HomeClient
                initialPosts={initialPosts}
                currentUser={currentUser}
                upcomingTournaments={upcomingTournaments}
                ongoingTournaments={ongoingTournaments}
                upcomingOpenCourts={upcomingOpenCourts}
            />
        );
    } catch (e) {
        console.error("DEBUG: Error loading home page or feed:", e);
        // Fallback for when DB fails but we still want to show the page with empty state
        return (
            <HomeClient
                initialPosts={[]}
                currentUser={null}
                upcomingTournaments={[]}
                ongoingTournaments={[]}
                upcomingOpenCourts={[]}
            />
        );
    }
}
