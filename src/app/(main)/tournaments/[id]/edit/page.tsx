import { db } from "@/db";
import { tournaments, categoriesTable } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import CreateTournamentForm from "../../create/CreateTournamentForm";

interface Props {
    params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditTournamentPage({ params }: Props) {
    const { id } = await params;
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, id))
        .limit(1);

    if (!tournament) {
        notFound();
    }

    // Authorization check
    const isSuperAdmin = session.role === "superadmin";
    if (tournament.createdByUserId !== session.userId && !isSuperAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-6">
                <div className="bg-card border border-border p-8 rounded-3xl text-center shadow-xl">
                    <h1 className="text-2xl font-black uppercase text-red-500 mb-4">No autorizado</h1>
                    <p className="text-white/60">No tenés permisos para editar este torneo.</p>
                </div>
            </div>
        );
    }

    // Prevention of editing finished tournaments
    if (tournament.status === "finalizado") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-6">
                <div className="bg-card border border-border p-8 rounded-3xl text-center shadow-xl">
                    <h1 className="text-2xl font-black uppercase text-amber-500 mb-4">Torneo Finalizado</h1>
                    <p className="text-white/60">Este torneo ya ha finalizado y no puede ser editado.</p>
                </div>
            </div>
        );
    }


    // Fetch categories for the form
    const dbCategories = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(asc(categoriesTable.categoryOrder));
    
    const categories = dbCategories.map(c => c.name);

    // Safe parsing for categories
    let parsedCategories: string[] = [];
    try {
        if (Array.isArray(tournament.categories)) {
            parsedCategories = tournament.categories as string[];
        } else if (typeof tournament.categories === 'string' && tournament.categories.trim().startsWith('[')) {
            parsedCategories = JSON.parse(tournament.categories);
        } else if (typeof tournament.categories === 'string' && tournament.categories.trim() !== '') {
            parsedCategories = [tournament.categories.trim()];
        }
    } catch (e) {
        console.error("Error parsing categories:", e);
    }

    // Safe parsing for modalidad
    let parsedModalidad: any = tournament.modalidad;
    try {
        if (typeof tournament.modalidad === 'string' && tournament.modalidad.trim().startsWith('{')) {
            parsedModalidad = JSON.parse(tournament.modalidad);
        }
    } catch (e) {
        console.error("Error parsing modalidad:", e);
    }

    // Prepare initial data for the form
    const initialData = {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        openDateClub: tournament.openDateClub,
        openDateGeneral: tournament.openDateGeneral,
        categories: parsedCategories,
        pointsConfig: tournament.pointsConfig as any,
        imageUrl: tournament.imageUrl,
        surface: tournament.surface,
        modalidad: parsedModalidad,
    };

    return (
        <CreateTournamentForm 
            initialData={initialData} 
            allCategoriesFromDb={categories.length > 0 ? categories : undefined}
        />
    );
}
