import { sql } from "drizzle-orm";
import { users } from "@/db/schema";

// Cuentas de sistema: no aparecen en listados públicos ni de administración
// (ranking, gestión de usuarios, inscripciones, jugadores de club) y sobreviven
// a los resets de base de datos.
//
// Estaba duplicada en 8 archivos con contenidos distintos; centralizada acá
// para que agregar una cuenta la oculte en todos lados a la vez.

export const HIDDEN_USER_EMAILS = [
    "dev@jae.com",
    "jae@dev.com",
    "dkdunko@gmail.com",
    "ljckr84@gmail.com",
] as const;

/** Cuentas de demo que además se excluyen de algunos listados de admin. */
export const DEMO_USER_EMAILS = [
    "demo1@demo.com",
    "demo2@demo.com",
    "demo3@demo.com",
    "demo4@demo.com",
    "admin@admin.com",
] as const;

export const HIDDEN_AND_DEMO_EMAILS = [
    ...HIDDEN_USER_EMAILS,
    ...DEMO_USER_EMAILS,
] as string[];

export const isHiddenUser = (email?: string | null) =>
    !!email && (HIDDEN_USER_EMAILS as readonly string[]).includes(email);

/**
 * Los invitados del Desafío tampoco van en los listados generales de la app
 * (ranking de torneos, gestión de usuarios, socios del club, buscadores):
 * todavía no son cuentas, son jugadores cargados a mano por un admin.
 *
 * Sí aparecen en todo lo del Desafío, que es donde juegan. El COALESCE cubre las
 * filas anteriores a la migración, que tienen la columna en NULL.
 */
export const noEsInvitado = () => sql`COALESCE(${users.isGuest}, false) = false`;
