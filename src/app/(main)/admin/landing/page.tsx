import { redirect } from "next/navigation";
import { checkSuperadmin } from "@/lib/auth";
import { getLandingVariant, LANDING_VARIANTS } from "@/lib/landing";
import LandingPickerClient from "./LandingPickerClient";

export default async function AdminLandingPage() {
    if (!(await checkSuperadmin())) {
        redirect("/home");
    }

    const active = await getLandingVariant();

    return (
        <div className="min-h-screen bg-grid-carbon text-foreground p-6">
            <LandingPickerClient variants={[...LANDING_VARIANTS]} initialActive={active} />
        </div>
    );
}
