import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import FixtureClient from "./FixtureClient";

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

    return (
        <FixtureClient
            tournamentId={tournament.id}
            tournamentName={tournament.name}
        />
    );
}
