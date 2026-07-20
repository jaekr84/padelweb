import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { getResetCounts } from "./actions";
import ResetDatabaseClient from "./ResetDatabaseClient";

export const dynamic = "force-dynamic";

export default async function ResetDatabasePage() {
    const session = await getSession() as { userId: string; role: string } | null;

    // Doble candado: la página redirige y además cada action revalida el rol.
    if (!session || session.role !== "superadmin") {
        redirect("/home");
    }

    const counts = await getResetCounts();

    return <ResetDatabaseClient initialCounts={counts} />;
}
