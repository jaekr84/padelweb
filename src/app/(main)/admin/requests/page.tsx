import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import RequestsClient from "./RequestsClient";

export default async function RequestsPage() {
    const session = await getSession();

    const allowedRoles = ["superadmin", "admin"];
    if (!session || !allowedRoles.includes(session.role as string)) {
        redirect("/home");
    }

    return <RequestsClient />;
}
