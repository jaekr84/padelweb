import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import RequestsClient from "./RequestsClient";

export default async function RequestsPage() {
    const session = await getSession();

    if (!session || session.role !== "superadmin") {
        redirect("/home");
    }

    return <RequestsClient />;
}
