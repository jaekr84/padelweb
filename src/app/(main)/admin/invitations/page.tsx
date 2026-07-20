import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import InvitationsClient from "./InvitationsClient";
import { listInvitations } from "./actions";

export default async function InvitationsPage() {
    const session = await getSession();

    if (!session || session.role !== "superadmin") {
        redirect("/home");
    }

    const invitations = await listInvitations();

    return (
        <div className="min-h-screen bg-grid-carbon text-white flex flex-col">
            <InvitationsClient initialInvitations={invitations} />
        </div>
    );
}
