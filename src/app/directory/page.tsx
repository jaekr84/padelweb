import { db } from "@/db";
import { clubs } from "@/db/schema";
import { eq } from "drizzle-orm";
import FeedLayout from "@/app/feed/layout";
import DirectoryClient from "./DirectoryClient";

export default async function DirectoryPage() {
    // Fetch only clubs from database
    const clubList = await db.select().from(clubs).where(eq(clubs.type, "club"));

    return (
        <FeedLayout>
            <DirectoryClient initialClubs={clubList} />
        </FeedLayout>
    );
}
