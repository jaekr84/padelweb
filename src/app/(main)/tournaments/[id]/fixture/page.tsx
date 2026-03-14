import { db } from "@/db";
import { tournaments, registrations, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import FixtureSetup from "../../fixture/FixtureSetup";


interface Props {
    params: Promise<{ id: string }>;
}

export default async function TournamentFixturePage({ params }: Props) {
    const { id } = await params;

    const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, id))
        .limit(1);

    if (!tournament) notFound();

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
        .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(inArray(users.id, registrantIds));

    const initialPlayers = dbRegistrations.map(reg => {
        const user = dbUsers.find(u => u.id === reg.userId);
        const namePart1 = user 
            ? ([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0])
            : "Jugador";
        const namePart2 = reg.partnerName || "Invitado";
        return {
            id: reg.id, // Using registration ID as player ID for the fixture
            name: `${namePart1} / ${namePart2}`,
            category: reg.category || undefined,
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
