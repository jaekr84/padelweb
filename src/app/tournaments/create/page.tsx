import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { eq } from "drizzle-orm";
import CreateTournamentForm from "./CreateTournamentForm";

type Props = {
    searchParams: Promise<{ edit?: string }>;
};

export default async function CreateTournamentPage({ searchParams }: Props) {
    const params = await searchParams;
    const editId = params?.edit;

    let initialData = null;

    if (editId) {
        const rows = await db
            .select()
            .from(tournaments)
            .where(eq(tournaments.id, editId))
            .limit(1);

        if (rows[0]) {
            const t = rows[0];
            initialData = {
                id: t.id,
                name: t.name,
                description: t.description,
                surface: t.surface,
                startDate: t.startDate,
                endDate: t.endDate,
                categories: t.categories,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                pointsConfig: t.pointsConfig as any,
                imageUrl: t.imageUrl ?? null,
            };
        }
    }

    return <CreateTournamentForm initialData={initialData} />;
}
