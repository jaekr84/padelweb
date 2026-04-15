import { getSponsors } from "@/app/actions/sponsors";
import SponsorManagementClient from "./SponsorManagementClient";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export default async function AdminSponsorsPage() {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
        redirect("/home");
    }

    const sponsorsData = await getSponsors();

    return (
        <div className="p-6">
            <SponsorManagementClient initialSponsors={JSON.parse(JSON.stringify(sponsorsData))} />
        </div>
    );
}
