// Piezas compartidas por las server actions del Desafío.
//
// Este archivo NO lleva "use server" a propósito: exporta tipos y helpers
// sincrónicos, que en un módulo de acciones no estarían permitidos. Los
// archivos de actions lo importan normalmente.

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-server";

/**
 * Convención de retorno de todo el módulo: nunca se tira una excepción a la UI.
 * El error viaja como dato y la pantalla lo muestra en un toast sin romper el
 * render. (En el repo conviven `throw`, `{success}` y `{ok}`; acá se usa `{ok}`
 * en todas.)
 */
export type Resultado<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** Error de negocio esperable: su mensaje sí se le muestra al usuario. */
export class ErrorDesafio extends Error {}

/**
 * Envuelve el cuerpo de una action. Los `ErrorDesafio` llegan al usuario tal
 * cual; cualquier otra excepción se loguea y se devuelve genérica, para no
 * filtrar detalles de la base en un toast.
 */
export async function ejecutar<T>(etiqueta: string, fn: () => Promise<T>): Promise<Resultado<T>> {
    try {
        return { ok: true, data: await fn() };
    } catch (err: any) {
        if (err instanceof ErrorDesafio) return { ok: false, error: err.message };
        console.error(`[${etiqueta}]`, err);
        return { ok: false, error: "No se pudo completar la operación." };
    }
}

/** El módulo es de la app, no de un club: sólo admin y superadmin gestionan. */
export async function requerirAdmin() {
    const session = await getSession();
    if (!session?.userId) throw new ErrorDesafio("Necesitás iniciar sesión.");
    if (session.role !== "admin" && session.role !== "superadmin") {
        throw new ErrorDesafio("No tenés permiso para gestionar desafíos.");
    }
    return session;
}

/** Cualquier usuario logueado (inscripción, carga de resultado). */
export async function requerirSesion() {
    const session = await getSession();
    if (!session?.userId) throw new ErrorDesafio("Necesitás iniciar sesión.");
    return session;
}

export const esAdmin = (role?: string | null) => role === "admin" || role === "superadmin";

export function revalidarDesafio(desafioId?: string) {
    revalidatePath("/desafio");
    revalidatePath("/gestionDesafio");
    if (desafioId) {
        revalidatePath(`/desafio/${desafioId}`);
        revalidatePath(`/gestionDesafio/${desafioId}`);
    }
}

/**
 * Cuántos desafíos entran en una página de /desafio. Cada tarjeta cuesta varias
 * queries (inscriptos, pool, ranking), así que paginar acota el trabajo del
 * servidor además del largo de la pantalla.
 */
export const DESAFIOS_POR_PAGINA = 5;

/** Ids del proyecto: uuid v4 en varchar(36). */
export const nuevoId = () => crypto.randomUUID();

export const limpiar = (v?: string | null) => {
    const t = (v ?? "").trim();
    return t.length > 0 ? t : null;
};
