"use server";

import { db } from "@/db";
import { tournaments, posts, bracketMatches, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

export async function publishTournamentResults(tournamentId: string) {
    try {
        const session = await getSession();
        if (!session?.userId) throw new Error("No estás autenticado");

        // Verify role
        const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, session.userId)).limit(1);
        if (!user || (user.role !== 'superadmin' && user.role !== 'club')) {
            throw new Error("No tenés permisos para realizar esta acción");
        }

        // Fetch tournament
        const [tournament] = await db
            .select()
            .from(tournaments)
            .where(eq(tournaments.id, tournamentId))
            .limit(1);

        if (!tournament) throw new Error("Torneo no encontrado");

        // Fetch the final match results (round 0 is the final in this system)
        const dbBracketMatches = await db
            .select()
            .from(bracketMatches)
            .where(eq(bracketMatches.tournamentId, tournamentId));

        // Find the match for the final (round 0, slot 0)
        const finalMatch = dbBracketMatches.find(m => m.round === 0);
        
        let content = `🏆 ¡TORNEO FINALIZADO!\n\n${tournament.name.toUpperCase()}\n\n`;

        if (finalMatch && finalMatch.confirmed && finalMatch.winnerName) {
            content += `¡Felicitaciones a los campeones!\n🥇 GANADORES: ${finalMatch.winnerName}\n`;
            
            if (finalMatch.team1Name && finalMatch.team2Name && finalMatch.score1 !== null && finalMatch.score2 !== null) {
                content += `\nResultado de la final:\n${finalMatch.team1Name} [${finalMatch.score1} - ${finalMatch.score2}] ${finalMatch.team2Name}`;
            }
        } else {
            // Fallback if no bracket found (maybe an Americano without bracket)
            content += `¡El torneo ha concluido exitosamente! Gracias a todos por participar.`;
        }

        // Create post
        await db.insert(posts).values({
            id: crypto.randomUUID(),
            userId: session.userId,
            content: content,
            imageUrl: tournament.imageUrl,
            createdAt: new Date(),
        });

        revalidatePath("/home");
        return { ok: true };
    } catch (error: any) {
        console.error("[publishTournamentResults] Error:", error);
        return { ok: false, error: error.message };
    }
}
