import { db } from "@/db";
import { clubs, instructorProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import FeedLayout from "@/app/feed/layout";
import DirectoryClient from "./DirectoryClient";

export default async function DirectoryPage() {
    // Fetch data from database
    const allClubsAndCentros = await db.select().from(clubs);
    const allProfes = await db.select().from(instructorProfiles);

    const clubList = allClubsAndCentros.filter(c => c.type === "club");
    const centroList = allClubsAndCentros.filter(c => c.type === "centro");

    return (
        <FeedLayout>
            <DirectoryClient
                initialClubs={clubList}
                initialCentros={centroList}
                initialProfes={allProfes}
            />
        </FeedLayout>
    );
}
