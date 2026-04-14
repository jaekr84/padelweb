"use server";
import crypto from "crypto";

import { db } from "@/db";
import { 
    openCourtEvents, 
    openCourtRegistrations, 
    openCourtCourts, 
    openCourtMatches,
    users
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

import { initializeOpenCourtTables } from "./init-db";

export async function createOpenCourtMatchAction(data: {
    eventId: string;
    courtId: string;
    t1p1Id: string;
    t1p2Id: string;
    t2p1Id: string;
    t2p2Id: string;
}) {
    try {
        const id = crypto.randomUUID();
        await db.insert(openCourtMatches).values({
            id,
            eventId: data.eventId,
            courtId: data.courtId,
            team1Player1Id: data.t1p1Id,
            team1Player2Id: data.t1p2Id,
            team2Player1Id: data.t2p1Id,
            team2Player2Id: data.t2p2Id,
            status: "in_progress",
            startedAt: null,
        });

        // Update court status
        await db.update(openCourtCourts)
            .set({ status: "occupied" })
            .where(eq(openCourtCourts.id, data.courtId));

        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

export async function createOpenCourtEventAction(data: {
    name: string;
    date: string;
    time: string;
    address: string;
    city: string;
    registrationFee: number;
    totalSlots: number;
    categories: string[];
    clubId: string;
}) {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
        throw new Error("No autorizado");
    }

    try {
        // Asegurar que las tablas existan con la estructura correcta
        await initializeOpenCourtTables();
        
        const id = crypto.randomUUID();
        await db.insert(openCourtEvents).values({
            id,
            clubId: data.clubId,
            name: data.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
            date: data.date,
            time: data.time,
            address: data.address,
            city: data.city.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
            registrationFee: data.registrationFee,
            totalSlots: data.totalSlots,
            categories: data.categories,
            status: "active",
        });

        revalidatePath("/admin/cancha-abierta");
        return { success: true, id };
    } catch (error) {
        console.error("Error creating open court event:", error);
        return { success: false, error: String(error) };
    }
}

export async function deleteOpenCourtEventAction(id: string) {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
        throw new Error("No autorizado");
    }

    try {
        // En un sistema real, podrías querer hacer soft delete o verificar dependencias
        await db.delete(openCourtMatches).where(eq(openCourtMatches.eventId, id));
        await db.delete(openCourtCourts).where(eq(openCourtCourts.eventId, id));
        await db.delete(openCourtRegistrations).where(eq(openCourtRegistrations.eventId, id));
        await db.delete(openCourtEvents).where(eq(openCourtEvents.id, id));

        revalidatePath("/admin/cancha-abierta");
        return { success: true };
    } catch (error) {
        console.error("Error deleting open court event:", error);
        return { success: false, error: String(error) };
    }
}

export async function addCourtToEventAction(eventId: string, courtNumber: number) {
    try {
        await db.insert(openCourtCourts).values({
            id: crypto.randomUUID(),
            eventId,
            courtNumber,
            isActive: true,
            status: "available",
        });
        revalidatePath(`/admin/cancha-abierta/${eventId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

export async function toggleCourtAction(courtId: string, isActive: boolean) {
    try {
        await db.update(openCourtCourts)
            .set({ isActive })
            .where(eq(openCourtCourts.id, courtId));
        revalidatePath("/admin/cancha-abierta");
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

export async function setPlayerPresenceAction(registrationId: string, status: "waiting" | "absent") {
    try {
        await db.update(openCourtRegistrations)
            .set({ status })
            .where(eq(openCourtRegistrations.id, registrationId));
        revalidatePath("/admin/cancha-abierta");
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

export async function createMatchAction(data: {
    eventId: string;
    courtId: string;
    t1p1Id: string;
    t1p2Id: string;
    t2p1Id: string;
    t2p2Id: string;
}) {
    try {
        const id = crypto.randomUUID();
        await db.insert(openCourtMatches).values({
            id,
            eventId: data.eventId,
            courtId: data.courtId,
            team1Player1Id: data.t1p1Id,
            team1Player2Id: data.t1p2Id,
            team2Player1Id: data.t2p1Id,
            team2Player2Id: data.t2p2Id,
            status: "in_progress",
        });

        // Update court status
        await db.update(openCourtCourts)
            .set({ status: "occupied" })
            .where(eq(openCourtCourts.id, data.courtId));

        revalidatePath(`/admin/cancha-abierta/${data.eventId}`);
        return { success: true, id };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

export async function finishMatchAction(matchId: string, score1: number, score2: number) {
    try {
        const [match] = await db.select().from(openCourtMatches).where(eq(openCourtMatches.id, matchId)).limit(1);
        if (!match) throw new Error("Match not found");

        await db.update(openCourtMatches)
            .set({ 
                score1, 
                score2, 
                status: "completed",
                finishedAt: new Date()
            })
            .where(eq(openCourtMatches.id, matchId));

        if (match.courtId) {
            await db.update(openCourtCourts)
                .set({ status: "available" })
                .where(eq(openCourtCourts.id, match.courtId));
        }

        revalidatePath(`/admin/cancha-abierta/${match.eventId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

export async function registerPlayerManualAction(eventId: string, userId: string) {
    try {
        const id = crypto.randomUUID();
        await db.insert(openCourtRegistrations).values({
            id,
            eventId,
            userId,
            sidePreference: "ambos",
            status: "waiting",
        });
        revalidatePath(`/admin/cancha-abierta/${eventId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}
export async function togglePaymentStatusAction(registrationId: string, hasPaid: boolean) {
    try {
        await db.update(openCourtRegistrations)
            .set({ hasPaid })
            .where(eq(openCourtRegistrations.id, registrationId));
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}
export async function bulkMarkAllAsPaidAction(eventId: string) {
    try {
        await db.update(openCourtRegistrations)
            .set({ hasPaid: true })
            .where(eq(openCourtRegistrations.eventId, eventId));
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

export async function bulkMarkAllAsPresentAction(eventId: string) {
    try {
        await db.update(openCourtRegistrations)
            .set({ status: 'waiting' })
            .where(eq(openCourtRegistrations.eventId, eventId));
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

export async function removeCourtAction(courtId: string) {
    try {
        // Cancelar partidos en progreso en esta cancha antes de borrarla
        await db.update(openCourtMatches)
            .set({ status: "completed" }) // Los marcamos como completados (o podrías usar 'cancelled')
            .where(and(eq(openCourtMatches.courtId, courtId), eq(openCourtMatches.status, "in_progress")));

        await db.delete(openCourtCourts).where(eq(openCourtCourts.id, courtId));
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

export async function finishOpenCourtMatchAction(matchId: string, score1: number, score2: number) {
    try {
        const match = await db.select().from(openCourtMatches).where(eq(openCourtMatches.id, matchId)).limit(1);
        if (!match[0]) return { success: false, error: "Partido no encontrado" };

        await db.update(openCourtMatches)
            .set({ 
                score1, 
                score2, 
                status: "completed",
                finishedAt: new Date()
            })
            .where(eq(openCourtMatches.id, matchId));

        // Liberar cancha
        if (match[0].courtId) {
            await db.update(openCourtCourts)
                .set({ status: "available" })
                .where(eq(openCourtCourts.id, match[0].courtId));
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

export async function startOpenCourtMatchAction(matchId: string) {
    try {
        await db.update(openCourtMatches)
            .set({ startedAt: new Date() })
            .where(eq(openCourtMatches.id, matchId));
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}
export async function joinOpenCourtEventAction(eventId: string, sidePreference: string) {
    const session = await getSession();
    if (!session?.userId) return { success: false, error: "Debes iniciar sesión para inscribirte" };

    try {
        // 1. Verificar si ya está inscripto
        const existing = await db.select()
            .from(openCourtRegistrations)
            .where(and(
                eq(openCourtRegistrations.eventId, eventId),
                eq(openCourtRegistrations.userId, session.userId)
            ))
            .limit(1);

        if (existing.length > 0) return { success: false, error: "Ya estás inscripto en este evento" };

        // 2. Verificar capacidad (Opcional, pero recomendado)
        const event = await db.query.openCourtEvents.findFirst({
            where: eq(openCourtEvents.id, eventId)
        });
        
        if (!event) return { success: false, error: "Evento no encontrado" };
        
        const regs = await db.select({ count: sql<number>`count(*)` })
            .from(openCourtRegistrations)
            .where(eq(openCourtRegistrations.eventId, eventId));
            
        if (event.totalSlots && Number(regs[0].count) >= event.totalSlots) {
            return { success: false, error: "Este evento ya está completo" };
        }

        // 3. Crear inscripción
        const id = crypto.randomUUID();
        await db.insert(openCourtRegistrations).values({
            id,
            eventId,
            userId: session.userId,
            sidePreference,
            status: "waiting",
            hasPaid: false
        });

        revalidatePath(`/cancha-abierta/${eventId}`);
        revalidatePath("/cancha-abierta");
        return { success: true };
    } catch (error) {
        console.error("Error joining event:", error);
        return { success: false, error: String(error) };
    }
}

export async function leaveOpenCourtEventAction(eventId: string) {
    const session = await getSession();
    if (!session?.userId) return { success: false, error: "Debes iniciar sesión" };

    try {
        await db.delete(openCourtRegistrations).where(
            and(
                eq(openCourtRegistrations.eventId, eventId),
                eq(openCourtRegistrations.userId, session.userId),
                sql`${openCourtRegistrations.status} IN ('waiting', 'absent')`
            )
        );

        revalidatePath(`/cancha-abierta/${eventId}`);
        revalidatePath("/cancha-abierta");
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}
