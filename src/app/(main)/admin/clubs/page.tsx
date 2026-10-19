import { redirect } from "next/navigation";
import { checkSuperadmin } from "@/lib/auth";
import ClubsClient from "./ClubsClient";
import { listClubs } from "./actions";

export default async function AdminClubsPage() {
    if (!(await checkSuperadmin())) {
        redirect("/home");
    }

    const clubs = await listClubs();

    return (
        <div className="min-h-screen bg-grid-carbon text-foreground flex flex-col">
            <ClubsClient initialClubs={JSON.parse(JSON.stringify(clubs))} />
        </div>
    );
}
