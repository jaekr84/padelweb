
import { db } from "@/db";
import { users, registrations, categoriesTable, bracketMatches, tournaments } from "@/db/schema";
import { eq, and, sql, asc } from "drizzle-orm";
import PromotionManager from "./promotion-manager";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export default async function PromotionsPage() {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
        redirect("/");
    }

    const currentYear = new Date().getFullYear();

    // 1. Fetch all players
    const players = await db.select().from(users).where(eq(users.role, "jugador"));

    // 2. Fetch categories
    const categories = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(asc(categoriesTable.categoryOrder));

    // 3. Fetch all finals (round 0) participations and wins
    const finalsData = await db
        .select({
            team1Id: bracketMatches.team1Id,
            team2Id: bracketMatches.team2Id,
            winnerId: bracketMatches.winnerId,
            tournamentId: bracketMatches.tournamentId,
        })
        .from(bracketMatches)
        .innerJoin(tournaments, eq(bracketMatches.tournamentId, tournaments.id))
        .where(
            and(
                eq(bracketMatches.round, 0),
                eq(bracketMatches.confirmed, true),
                sql`YEAR(${tournaments.createdAt}) = ${currentYear}`
            )
        );

    // Fetch registrations for these finals to get user IDs
    const regIds = new Set<string>();
    finalsData.forEach(f => {
        if (f.team1Id) regIds.add(f.team1Id);
        if (f.team2Id) regIds.add(f.team2Id);
    });

    const playerStats: Record<string, { titles: number, finals: number }> = {};

    if (regIds.size > 0) {
        const regs = await db
            .select({
                id: registrations.id,
                userId: registrations.userId,
                partnerUserId: registrations.partnerUserId,
                category: registrations.category,
            })
            .from(registrations)
            .where(sql`${registrations.id} IN ${Array.from(regIds)}`);

        const regToData: Record<string, { users: string[], category: string }> = {};
        regs.forEach(r => {
            regToData[r.id] = {
                users: [r.userId, r.partnerUserId].filter(Boolean) as string[],
                category: r.category || ""
            };
        });

        finalsData.forEach(f => {
            // Get all participants in this final
            const t1 = f.team1Id ? regToData[f.team1Id] : null;
            const t2 = f.team2Id ? regToData[f.team2Id] : null;
            const winnersData = f.winnerId ? regToData[f.winnerId] : null;

            // Para cada finalista, solo sumar si la categorÃ­a de la final coincide con la categorÃ­a actual del usuario
            [t1, t2].filter(Boolean).forEach(team => {
                team!.users.forEach(uid => {
                    const user = players.find(p => p.id === uid);
                    if (user && user.category === team!.category) {
                        if (!playerStats[uid]) playerStats[uid] = { titles: 0, finals: 0 };
                        playerStats[uid].finals++;
                    }
                });
            });

            // Para cada ganador, solo sumar si coincide la categorÃ­a
            if (winnersData) {
                winnersData.users.forEach(uid => {
                    const user = players.find(p => p.id === uid);
                    if (user && user.category === winnersData.category) {
                        if (!playerStats[uid]) playerStats[uid] = { titles: 0, finals: 0 };
                        playerStats[uid].titles++;
                    }
                });
            }
        });
    }



    const candidatePlayers = players.map(u => ({
        id: u.id,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email.split("@")[0],
        email: u.email,
        category: u.category || "D",
        points: u.points || 0,
        titles: playerStats[u.id]?.titles || 0,
        finals: playerStats[u.id]?.finals || 0,
    }));

    return (
        <PromotionManager 
            initialPlayers={candidatePlayers}
            categories={categories}
        />
    );
}
