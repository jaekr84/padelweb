import { db } from "@/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

export async function initializeOpenCourtTables() {
    console.log("Iniciando creación de tablas de Cancha Abierta...");
    
    try {
        // Verificación de estructura antigua
        try {
            // Intentamos una operación que fallará si la columna no existe
            await db.execute(sql`SELECT address from open_court_events LIMIT 1`);
        } catch (e: any) {
            // Si el error es "Unknown column", borramos la tabla
            if (e.message?.includes("Unknown column") || e.message?.includes("doesn't exist")) {
                console.log("Estructura incompatible detectada. Reseteando tabla...");
                await db.execute(sql`DROP TABLE IF EXISTS open_court_events`);
            }
        }

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS open_court_events (
                id varchar(255) PRIMARY KEY,
                club_id varchar(255) NOT NULL,
                name varchar(255) NOT NULL,
                date varchar(255) NOT NULL,
                time varchar(255) NOT NULL,
                address varchar(255) NOT NULL,
                city varchar(255) NOT NULL,
                registration_fee int NOT NULL DEFAULT 0,
                total_slots int NOT NULL DEFAULT 0,
                categories json NOT NULL,
                status enum('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
                created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Reset de inscripciones si falta la columna de pago
        try {
            await db.execute(sql`SELECT has_paid from open_court_registrations LIMIT 1`);
        } catch (e) {
            console.log("Estructura de inscripciones vieja detectada. Reseteando...");
            await db.execute(sql`DROP TABLE IF EXISTS open_court_registrations`);
        }

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS open_court_registrations (
                id varchar(255) PRIMARY KEY,
                event_id varchar(255) NOT NULL,
                user_id varchar(255) NOT NULL,
                side_preference enum('drive', 'reves', 'ambos') NOT NULL DEFAULT 'ambos',
                has_paid boolean NOT NULL DEFAULT false,
                status enum('waiting', 'playing', 'finished', 'absent') NOT NULL DEFAULT 'waiting',
                created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Reset de canchas si es necesario
        try {
            await db.execute(sql`SELECT is_active from open_court_courts LIMIT 1`);
        } catch (e) {
            await db.execute(sql`DROP TABLE IF EXISTS open_court_courts`);
        }

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS open_court_courts (
                id varchar(255) PRIMARY KEY,
                event_id varchar(255) NOT NULL,
                court_number int NOT NULL,
                is_active boolean NOT NULL DEFAULT true,
                status enum('available', 'occupied', 'maintenance') NOT NULL DEFAULT 'available'
            )
        `);

        // Reset de partidos si los nombres de columnas no coinciden
        try {
            await db.execute(sql`SELECT t1_p1_id from open_court_matches LIMIT 1`);
        } catch (e) {
            console.log("Estructura de partidos vieja detectada. Reseteando...");
            await db.execute(sql`DROP TABLE IF EXISTS open_court_matches`);
        }

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS open_court_matches (
                id varchar(255) PRIMARY KEY,
                event_id varchar(255) NOT NULL,
                court_id varchar(255),
                t1_p1_id varchar(255) NOT NULL,
                t1_p2_id varchar(255) NOT NULL,
                t2_p1_id varchar(255) NOT NULL,
                t2_p2_id varchar(255) NOT NULL,
                score1 int,
                score2 int,
                status enum('in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'in_progress',
                started_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                finished_at timestamp
            )
        `);

        console.log("Tablas creadas exitosamente.");
        return { success: true };
    } catch (error) {
        console.error("Error creando tablas:", error);
        return { success: false, error: String(error) };
    }
}
