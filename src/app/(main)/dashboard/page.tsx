import { db } from "@/db";
import { users, tournaments, registrations, clubs, openCourtEvents, contactMessages, registrationRequests } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { sql, eq, and, isNotNull } from "drizzle-orm";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const session = await getSession();
    if (!session || session.role !== "superadmin") redirect("/home");

    const [
        // Usuarios por rol
        totalJugadores,
        totalAdmins,
        totalClubs,

        // Género
        masculino,
        femenino,

        // Lado de juego
        drive,
        reves,
        ambos,

        // Categorías
        categorias,

        // Torneos por estado
        torneosDraft,
        torneosPublished,
        torneosEnCurso,
        torneosFinalizados,

        // Inscripciones
        totalInscripciones,

        // Cancha abierta
        totalCanchaAbierta,

        // Solicitudes y mensajes pendientes
        solicitudesPendientes,
        mensajesPendientes,

        // Usuarios activos vs inactivos
        totalActivos,
        totalBaneados,

        // Usuarios con foto
        conFoto,

        // Usuarios con ubicación
        conUbicacion,

    ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "jugador")),
        db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "superadmin")),
        db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "club")),

        db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "jugador"), eq(users.gender, "masculino"))),
        db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "jugador"), eq(users.gender, "femenino"))),

        db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "jugador"), eq(users.side, "drive"))),
        db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "jugador"), eq(users.side, "reves"))),
        db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "jugador"), eq(users.side, "ambos"))),

        db.select({ category: users.category, count: sql<number>`count(*)` }).from(users).where(eq(users.role, "jugador")).groupBy(users.category),

        db.select({ count: sql<number>`count(*)` }).from(tournaments).where(eq(tournaments.status, "draft")),
        db.select({ count: sql<number>`count(*)` }).from(tournaments).where(eq(tournaments.status, "published")),
        db.select({ count: sql<number>`count(*)` }).from(tournaments).where(sql`${tournaments.status} IN ('en_curso','en_eliminatorias')`),
        db.select({ count: sql<number>`count(*)` }).from(tournaments).where(eq(tournaments.status, "finalizado")),

        db.select({ count: sql<number>`count(*)` }).from(registrations),

        db.select({ count: sql<number>`count(*)` }).from(openCourtEvents),

        db.select({ count: sql<number>`count(*)` }).from(registrationRequests).where(eq(registrationRequests.status, "pendiente")),
        db.select({ count: sql<number>`count(*)` }).from(contactMessages).where(eq(contactMessages.status, "pendiente")),

        db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "jugador"), eq(users.isActive, true))),
        db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "jugador"), isNotNull(users.bannedUntil))),

        db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "jugador"), isNotNull(users.imageUrl))),

        db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "jugador"), isNotNull(users.location))),
    ]);

    const stats = {
        usuarios: {
            jugadores: totalJugadores[0]?.count ?? 0,
            admins: totalAdmins[0]?.count ?? 0,
            clubs: totalClubs[0]?.count ?? 0,
            activos: totalActivos[0]?.count ?? 0,
            baneados: totalBaneados[0]?.count ?? 0,
            conFoto: conFoto[0]?.count ?? 0,
            conUbicacion: conUbicacion[0]?.count ?? 0,
        },
        genero: {
            masculino: masculino[0]?.count ?? 0,
            femenino: femenino[0]?.count ?? 0,
            sinEspecificar: (totalJugadores[0]?.count ?? 0) - (masculino[0]?.count ?? 0) - (femenino[0]?.count ?? 0),
        },
        lado: {
            drive: drive[0]?.count ?? 0,
            reves: reves[0]?.count ?? 0,
            ambos: ambos[0]?.count ?? 0,
            sinEspecificar: (totalJugadores[0]?.count ?? 0) - (drive[0]?.count ?? 0) - (reves[0]?.count ?? 0) - (ambos[0]?.count ?? 0),
        },
        categorias: categorias.map(c => ({ category: c.category || "Sin categoría", count: c.count }))
            .sort((a, b) => a.category.localeCompare(b.category)),
        torneos: {
            draft: torneosDraft[0]?.count ?? 0,
            publicados: torneosPublished[0]?.count ?? 0,
            enCurso: torneosEnCurso[0]?.count ?? 0,
            finalizados: torneosFinalizados[0]?.count ?? 0,
        },
        inscripciones: totalInscripciones[0]?.count ?? 0,
        canchaAbierta: totalCanchaAbierta[0]?.count ?? 0,
        pendientes: {
            solicitudes: solicitudesPendientes[0]?.count ?? 0,
            mensajes: mensajesPendientes[0]?.count ?? 0,
        },
    };

    return <DashboardClient stats={stats} />;
}
