import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { posts, users, postComments, tournaments, registrations, openCourtEvents, clubs, openCourtRegistrations } from "@/db/schema";
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
                images: r.post.images,
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

        // 4. Fetch Quick View Data (Tournaments)
        const fetchTournamentsWithRegistrations = async (statusFilter: any) => {
            const tourns = await db
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
                .where(statusFilter)
                .orderBy(tournaments.startDate)
                .limit(5);

            if (tourns.length === 0) return [];

            const tournIds = tourns.map(t => t.id);

            // Fetch registration counts
            const counts = await db
                .select({
                    tournamentId: registrations.tournamentId,
                    count: sql<number>`count(*)`
                })
                .from(registrations)
                .where(inArray(registrations.tournamentId, tournIds))
                .groupBy(registrations.tournamentId);

            // Fetch first 3 registrants per tournament
            const regs = await db
                .select({
                    tournamentId: registrations.tournamentId,
                    userId: registrations.userId,
                    userImage: users.imageUrl,
                    userName: users.firstName
                })
                .from(registrations)
                .leftJoin(users, eq(registrations.userId, users.id))
                .where(inArray(registrations.tournamentId, tournIds))
                .orderBy(desc(registrations.createdAt));

            return tourns.map(t => {
                const tournRegs = regs.filter(r => r.tournamentId === t.id).slice(0, 3);
                return {
                    ...t,
                    registrationsCount: counts.find(c => c.tournamentId === t.id)?.count || 0,
                    registrants: tournRegs.map(r => ({
                        name: r.userName || "Jugador",
                        imageUrl: r.userImage || null
                    }))
                };
            });
        };

        const upcomingTournaments = await fetchTournamentsWithRegistrations(eq(tournaments.status, 'published'));
        const ongoingTournaments = await fetchTournamentsWithRegistrations(
            inArray(tournaments.status, ['en_curso', 'en_eliminatorias'])
        );

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
