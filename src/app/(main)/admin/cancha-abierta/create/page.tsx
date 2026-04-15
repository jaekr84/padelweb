import { db } from "@/db";
import { categoriesTable, clubs } from "@/db/schema";
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
