import { db } from "@/db";
import { clubs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";

import DirectoryClient from "./DirectoryClient";

export default async function DirectoryPage() {
    const session = await getSession();
    const isLoggedIn = !!session;

    // Fetch only clubs from database
    const clubList = await db.select().from(clubs).where(eq(clubs.type, "club"));

    return (
        <DirectoryClient initialClubs={clubList} isLoggedIn={isLoggedIn} />
    );
}
