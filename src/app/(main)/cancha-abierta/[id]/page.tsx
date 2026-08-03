import { db } from "@/db";
import { openCourtEvents, clubs, openCourtRegistrations, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { notFound } from "next/navigation";
import EventJoinClient from "@/app/(main)/cancha-abierta/[id]/EventJoinClient";

export default async function EventJoinPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: eventId } = await params;
    const session = await getSession();

    // 1. Fetch event with club
    const eventData = await db
        .select({
            event: openCourtEvents,
            club: clubs,
        })
        .from(openCourtEvents)
        .where(eq(openCourtEvents.id, eventId))
        .leftJoin(clubs, eq(openCourtEvents.clubId, clubs.id));

    if (!eventData || eventData.length === 0) {
        notFound();
    }

    const event = eventData[0].event;
    const club = eventData[0].club;

    // 2. Fetch all registrations (to show participants)
    const registrations = await db
        .select({
            reg: openCourtRegistrations,
            userName: users.firstName,
            userLastName: users.lastName,
            userImage: users.imageUrl,
        })
        .from(openCourtRegistrations)
        .where(eq(openCourtRegistrations.eventId, eventId))
        .leftJoin(users, eq(openCourtRegistrations.userId, users.id));

    // 3. Fetch all matches for history
    const matches = await db.query.openCourtMatches.findMany({
        where: (m, { eq }) => eq(m.eventId, eventId),
        orderBy: (m, { desc }) => [desc(m.startedAt)]
    });

    // 4. User setup & Profile Side Preference
    const userReg = registrations.find(r => r.reg.userId === session?.userId);
    
    let userSidePreference = "ambos";
    if (session?.userId) {
        const currentUser = await db.query.users.findFirst({
            where: eq(users.id, session.userId)
        });
        if (currentUser?.side) {
            userSidePreference = currentUser.side;
        }
    }

    return (
        <div className="min-h-screen pb-20 bg-background">
            <EventJoinClient 
                event={event}
                club={club}
                participants={registrations.map(r => ({
                    id: r.reg.id,
                    userId: r.reg.userId,
                    name: r.reg.userId
                        ? `${r.userName || ''} ${r.userLastName || ''}`.trim() || 'Jugador'
                        : (r.reg.guestName || 'Invitado'),
                    image: r.userImage,
                    side: r.reg.sidePreference,
                    status: r.reg.status
                }))}
                isLoggedIn={!!session?.userId}
                currentUserId={session?.userId}
                userRegistration={userReg?.reg || null}
                defaultSidePreference={userSidePreference}
                matches={matches}
            />
        </div>
    );
}
