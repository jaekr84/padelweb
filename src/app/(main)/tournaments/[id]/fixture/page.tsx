import { db } from "@/db";
import { tournaments, registrations, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import FixtureSetup from "../../fixture/FixtureSetup";


interface Props {
    params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function TournamentFixturePage({ params }: Props) {
    const { id } = await params;

    const [tournament] = await db
        .select({
            id: tournaments.id,
            name: tournaments.name,
            status: tournaments.status,
            createdByUserId: tournaments.createdByUserId,
        })
        .from(tournaments)
        .where(eq(tournaments.id, id))
        .limit(1);

    if (!tournament) notFound();
    
    // Authorization check
    const session = await getSession();
    const isSuperAdmin = session?.role === 'superadmin';
    const isOwner = tournament.createdByUserId === session?.userId;

    if (!isOwner && !isSuperAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-6">
                <div className="bg-card border border-border p-8 rounded-3xl text-center shadow-xl">
                    <h1 className="text-2xl font-black uppercase text-red-500 mb-4">No autorizado</h1>
                    <p className="text-white/60">No tenés permisos para configurar este torneo.</p>
                </div>
            </div>
        );
    }

    // Fetch registered players
    const dbRegistrations = await db
        .select({
            id: registrations.id,
            userId: registrations.userId,
            partnerName: registrations.partnerName,
            category: registrations.category,
        })
        .from(registrations)
        .where(eq(registrations.tournamentId, id));

    // Also fetch the names of the registrants to build the "Team Name"
    const registrantIds = dbRegistrations.map(r => r.userId);
    const dbUsers = await db
        .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, gender: users.gender })
        .from(users)
        .where(inArray(users.id, registrantIds));

    const initialPlayers = dbRegistrations.map(reg => {
        const user = dbUsers.find(u => u.id === reg.userId);
        const namePart1 = user 
            ? ([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0])
            : "Jugador";
        const namePart2 = reg.partnerName || "Invitado";
        return {
            id: reg.id,
            name: `${namePart1} / ${namePart2}`,
            category: reg.category || undefined,
            email: user?.email || undefined,
            gender: user?.gender || undefined,
        };
    });

    // If already started, redirect to manage
    if (tournament.status !== "published" && tournament.status !== "draft") {
        redirect(`/tournaments/${id}/manage`);
    }

    return (
        <FixtureSetup
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            initialStatus={tournament.status}
            initialPlayers={initialPlayers}
        />
    );
}
