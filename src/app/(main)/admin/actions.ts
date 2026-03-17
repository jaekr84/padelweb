"use server";

import { db } from "@/db";
import { 
    users, 
    clubs, 
    tournaments, 
    registrations, 
    tournamentGroups, 
    groupMatches, 
    bracketMatches, 
    posts, 
    postComments, 
    marketplaceItems, 
    registrationRequests, 
    clubRequests,
    categoriesTable
} from "@/db/schema";
import { eq, not } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

export async function resetDatabaseAction() {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
        throw new Error("No autorizado");
    }

    try {
        console.log("[resetDatabaseAction] Iniciando blanqueo de base de datos...");

        // Eliminar en orden de dependencias para evitar errores de FK (aunque MySQL con Drizzle a veces es flexible, mejor ser precavidos)
        await db.delete(postComments);
        await db.delete(posts);
        await db.delete(marketplaceItems);
        await db.delete(groupMatches);
        await db.delete(bracketMatches);
        await db.delete(tournamentGroups);
        await db.delete(registrations);
        await db.delete(registrationRequests);
        await db.delete(clubRequests);
        await db.delete(tournaments);
        await db.delete(clubs);
        
        // Eliminar todos los usuarios que NO sean superadmin
        await db.delete(users).where(not(eq(users.role, "superadmin")));
        
        // También blanqueamos categorías por si mueren con el resto de la data de prueba
        await db.delete(categoriesTable);

        console.log("[resetDatabaseAction] Blanqueo completado con éxito.");
        
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[resetDatabaseAction] Error durante el reset:", error);
        return { success: false, error: String(error) };
    }
}
