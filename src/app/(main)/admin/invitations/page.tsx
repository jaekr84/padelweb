import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import InvitationsClient from "./InvitationsClient";

export default async function InvitationsPage() {
    const session = await getSession();

    if (!session || session.role !== "superadmin") {
        redirect("/home");
    }

    return (
        <div className="min-h-screen bg-grid-carbon text-white flex flex-col">
            <InvitationsClient />
        </div>
    );
}
