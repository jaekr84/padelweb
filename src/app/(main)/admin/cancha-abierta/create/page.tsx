import { db } from "@/db";
import { categoriesTable, clubs } from "@/db/schema";
import { getManagedClubId } from "@/lib/managed-club";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import CreateEventForm from "./CreateEventForm";
import { eq } from "drizzle-orm";

export default async function CreateOpenCourtPage() {
    const session = await getSession();

    if (!session || (session.role !== "admin" && session.role !== "superadmin" && session.role !== "club")) {
        redirect("/home");
    }

    const categories = await db.select().from(categoriesTable).where(eq(categoriesTable.isActive, true));
    
    // Get club ID
    let clubId = "";
    if (session.role === "admin") {
        const club = await db.query.clubs.findFirst({
            where: eq(clubs.ownerId, session.userId),
        });
        clubId = club?.id || "";
    } else if (session.role === "club") {
        // El club propio primero: si no, un responsable que es socio de otro
        // club creaba la cancha abierta en ese otro club.
        clubId = (await getManagedClubId(session.userId)) || "";
    } else {
        // Superadmin might need to pick a club, but for now we take the first or a default
        const club = await db.query.clubs.findFirst();
        clubId = club?.id || "";
    }

    return (
        <div className="min-h-screen p-6 max-w-2xl mx-auto">
            <CreateEventForm categories={categories} clubId={clubId} />
        </div>
    );
}
