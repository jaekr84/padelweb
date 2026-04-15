import { db } from "@/db";
import { publicMatches, publicMatchRegistrations, users, categoriesTable } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { eq, desc, inArray } from "drizzle-orm";
import PartidosClient from "./PartidosClient";

export default async function PartidosPage() {
    const session = await getSession();
    
    // Fetch matches with creator info
    const matchesData = await db
        .select({
            match: publicMatches,
            creator: {
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                imageUrl: users.imageUrl,
                category: users.category,
            }
        })
        .from(publicMatches)
        .leftJoin(users, eq(publicMatches.creatorId, users.id))
        .where(eq(publicMatches.status, "open"))
        .orderBy(desc(publicMatches.createdAt));

    if (matchesData.length === 0) {
        return (
            <PartidosClient 
                initialMatches={[]} 
                isLoggedIn={!!session}
                currentUserId={session?.userId}
                cities={[]}
                categories={[]}
            />
        );
    }

    const matchIds = matchesData.map(m => m.match.id);

    // Fetch registrations for these matches with user info
    const registrationsData = await db
        .select({
            registration: publicMatchRegistrations,
            user: {
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                imageUrl: users.imageUrl,
            }
        })
        .from(publicMatchRegistrations)
        .where(inArray(publicMatchRegistrations.matchId, matchIds))
        .leftJoin(users, eq(publicMatchRegistrations.userId, users.id));

    // Combine the data
    const matches = matchesData.map(m => ({
        ...m.match,
        creator: m.creator,
        registrations: registrationsData
            .filter(r => r.registration.matchId === m.match.id)
            .map(r => ({
                ...r.registration,
                user: r.user
            }))
    }));

    // Also get all unique cities/zones for filters
    const cities = Array.from(new Set(matches.map(m => m.city))).filter(Boolean) as string[];
    
    // Fetch all active categories from the database
    const allCategories = await db.select().from(categoriesTable).where(eq(categoriesTable.isActive, true));
    const categories = allCategories.map(c => c.name);

    return (
        <PartidosClient 
            initialMatches={JSON.parse(JSON.stringify(matches))} 
            isLoggedIn={!!session}
            currentUserId={session?.userId}
            cities={cities}
            categories={categories}
        />
    );
}
