import { db } from "@/db";
import { categoriesTable, clubs, openCourtEvents, users } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import CreateEventForm from "../../create/CreateEventForm";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Editar evento",
    description: "Datos del evento de cancha abierta.",
};

/** Las categorías vienen como JSON y el driver las devuelve sin parsear. */
function categoriasDe(json: unknown): string[] {
    let valor = json;
    if (typeof valor === "string") {
        try { valor = JSON.parse(valor); } catch { return []; }
    }
    return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : [];
}

export default async function EditOpenCourtPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin" && session.role !== "club")) {
        redirect("/home");
    }

    const { id } = await params;

    const [evento] = await db
        .select()
        .from(openCourtEvents)
        .where(eq(openCourtEvents.id, id))
        .limit(1);

    if (!evento) notFound();

    // El permiso fino lo vuelve a chequear la acción al guardar; acá sólo se
    // evita mostrarle el formulario a un club que no es dueño del evento.
    if (session.role === "club" || session.role === "admin") {
        const [usuario] = await db
            .select({ clubId: users.clubId })
            .from(users)
            .where(eq(users.id, session.userId))
            .limit(1);

        const club = await db.query.clubs.findFirst({
            where: eq(clubs.ownerId, session.userId),
        });

        if (usuario?.clubId !== evento.clubId && club?.id !== evento.clubId) {
            redirect("/admin/cancha-abierta");
        }
    }

    const categories = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true));

    return (
        <div className="min-h-screen p-6 max-w-2xl mx-auto">
            <CreateEventForm
                categories={categories}
                clubId={evento.clubId}
                eventId={evento.id}
                initialData={{
                    name: evento.name,
                    date: evento.date,
                    time: evento.time,
                    address: evento.address,
                    city: evento.city,
                    registrationFee: evento.registrationFee,
                    totalSlots: evento.totalSlots,
                    categories: categoriasDe(evento.categories),
                }}
            />
        </div>
    );
}
