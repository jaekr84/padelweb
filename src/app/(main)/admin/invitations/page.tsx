import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import InvitationsClient from "./InvitationsClient";
import { listInvitations } from "./actions";
import { getRegistrationMode } from "@/lib/registration-mode";

export default async function InvitationsPage() {
    const session = await getSession();

    if (!session || session.role !== "superadmin") {
        redirect("/home");
    }

    const [invitations, registrationMode] = await Promise.all([
        listInvitations(),
        getRegistrationMode(),
    ]);

    return (
        <div className="min-h-screen bg-grid-carbon text-foreground flex flex-col">
            <InvitationsClient initialInvitations={invitations} initialRegistrationMode={registrationMode} />
        </div>
    );
}
