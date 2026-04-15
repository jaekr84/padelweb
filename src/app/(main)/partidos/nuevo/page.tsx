import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import CreateMatchClient from "./CreateMatchClient";
import { db } from "@/db";
import { categoriesTable } from "@/db/schema";

export default async function NewMatchPage() {
    const session = await getSession();
    if (!session) {
        redirect("/login");
    }

    const categories = await db.select().from(categoriesTable).where(eq(categoriesTable.isActive, true));

    return (
        <CreateMatchClient categories={JSON.parse(JSON.stringify(categories))} />
    );
}

import { eq } from "drizzle-orm";
