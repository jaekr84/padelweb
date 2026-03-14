import { db } from "@/db";
import { tournaments, categoriesTable } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import CreateTournamentForm from "./CreateTournamentForm";

type Props = {
    searchParams: Promise<{ edit?: string }>;
};

export default async function CreateTournamentPage({ searchParams }: Props) {
    const params = await searchParams;
    const editId = params?.edit;

    const allCategoriesFromDb = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(asc(categoriesTable.categoryOrder));

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
                modalidad: t.modalidad as any,
            };
        }
    }

    return <CreateTournamentForm initialData={initialData} allCategoriesFromDb={allCategoriesFromDb.map(c => c.name)} />;
}
