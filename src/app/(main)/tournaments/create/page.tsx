import { db } from "@/db";
import { tournaments, categoriesTable } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import CreateTournamentForm, { InitialData } from "./CreateTournamentForm";

type Props = {
    searchParams: Promise<{ edit?: string }>;
};

import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export default async function CreateTournamentPage({ searchParams }: Props) {
    const session = await getSession();
    if (session?.role !== "superadmin") {
        redirect("/home");
    }

    const params = await searchParams;
    const editId = params?.edit;

    const allCategoriesFromDb = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(asc(categoriesTable.categoryOrder));

    let initialData: InitialData | null = null;

    if (editId) {
        const rows = await db
            .select()
            .from(tournaments)
            .where(eq(tournaments.id, editId))
            .limit(1);

        if (rows[0]) {
            const t = rows[0];
            const tModalidad = t.modalidad as any;
            initialData = {
                id: t.id,
                name: t.name,
                description: t.description,
                surface: t.surface,
                startDate: t.startDate,
                endDate: t.endDate,
                openDateClub: t.openDateClub ?? null,
                openDateGeneral: t.openDateGeneral ?? null,
                categories: t.categories as string[] | null,
                pointsConfig: t.pointsConfig as InitialData["pointsConfig"],
                imageUrl: t.imageUrl ?? null,
                maxSlots: tModalidad?.maxSlots ?? 0,
                modalidad: tModalidad,
            };
        }
    }

    return <CreateTournamentForm initialData={initialData} allCategoriesFromDb={allCategoriesFromDb.map(c => c.name)} />;
}
