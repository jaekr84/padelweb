import { getSession } from "@/lib/auth-server";
import { db } from "@/db";
import { clubs, tournaments, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import FeedLayout from "@/app/feed/layout";
import ClubProfileClient from "./ClubProfileClient";
import { Shield } from "lucide-react";

export default async function ClubProfilePage({
    searchParams
}: {
    searchParams: Promise<{ id?: string }>
}) {
    const session = await getSession() as { userId: string, role: string, email: string } | null;
    const resolvedSearchParams = await searchParams;
    const targetClubId = resolvedSearchParams?.id;

    let club = null;

    if (targetClubId) {
        // Viewing a specific club by ID
        const foundClubs = await db.select().from(clubs).where(eq(clubs.id, targetClubId));
        club = foundClubs[0] ?? null;
    } else if (session?.userId) {
        // Viewing own club profile
        const userClubs = await db.select().from(clubs).where(eq(clubs.ownerId, session.userId));
        club = userClubs[0] ?? null;

        // Auto-create if club role but no club found
        if (!club && session.role === 'club') {
            const result = await db.insert(clubs).values({
                id: session.userId,
                ownerId: session.userId,
                name: "Mi Club",
                type: "club",
                bio: "Nuevo club en PadelWeb",
                location: "",
                amenities: [],
            }).returning();
            club = result[0];
        }
    }

    if (!session && !club) {
        return <div className="flex flex-col items-center justify-center min-h-screen text-white/40 gap-4">
            <Shield className="w-12 h-12" />
            <p className="font-bold uppercase tracking-widest text-[10px]">Debe iniciar sesión para ver este perfil</p>
        </div>;
    }

    if (!club) {
        return (
            <FeedLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-foreground/40 gap-4 p-8 text-center max-w-md mx-auto">
                    <div className="w-20 h-20 rounded-[2.5rem] bg-muted flex items-center justify-center border-2 border-border/50">
                        <Shield className="w-10 h-10" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-foreground/80">Club no encontrado</h2>
                        <p className="text-xs font-medium leading-relaxed uppercase tracking-widest">
                            Si sos dueño de un club, asegurate de tener el rol correcto o contactá a soporte.
                        </p>
                    </div>
                </div>
            </FeedLayout>
        );
    }

    const userTournaments = club.ownerId
        ? await db.select().from(tournaments).where(eq(tournaments.createdByUserId, club.ownerId))
        : [];

    const clubMembers = await db
        .select()
        .from(users)
        .where(eq(users.clubId, club.id))
        .orderBy(desc(users.points));

    const isOwner = session?.userId === club.ownerId;

    return (
        <FeedLayout>
            <ClubProfileClient
                user={session ? { id: session.userId, email: session.email, publicMetadata: { role: session.role } } : null}
                club={JSON.parse(JSON.stringify(club))}
                members={JSON.parse(JSON.stringify(clubMembers))}
                userTournaments={JSON.parse(JSON.stringify(userTournaments))}
                isOwner={isOwner}
            />
        </FeedLayout>
    );
}
