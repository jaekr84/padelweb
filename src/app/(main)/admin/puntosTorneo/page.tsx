import { getTournamentPointsConfig, getClubTournamentLimits } from "@/lib/settings-actions";
import AdminPointsClient from "./AdminPointsClient";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminPointsPage() {
    const session = await getSession();
    if (!session?.userId) redirect("/login");

    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (user?.role !== "superadmin") redirect("/home");

    const points = await getTournamentPointsConfig();
    const limits = await getClubTournamentLimits();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
            <AdminPointsClient initialPoints={points} initialLimits={limits} />
        </div>
    );
}
