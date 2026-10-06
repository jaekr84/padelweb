/**
 * Etapas de inscripción de un torneo según sus dos fechas de apertura:
 * - "cerrada":   todavía no llegó `openDateClub` (ni la general).
 * - "prioridad": desde `openDateClub` hasta el día antes de `openDateGeneral`.
 *                Sólo jugadores con club, y con tope de equipos por club.
 * - "general":   desde `openDateGeneral`. Abierto a todos, sin tope por club.
 *
 * Las fechas son "YYYY-MM-DD" y se comparan como texto contra el día de hoy en
 * Buenos Aires, igual que el resto de las pantallas de torneos.
 */
export type RegistrationPhase = "cerrada" | "prioridad" | "general";

export function todayInBuenosAires() {
    return new Date().toLocaleString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).split(",")[0];
}

export function getRegistrationPhase(
    t: { openDateClub?: string | null; openDateGeneral?: string | null },
    today = todayInBuenosAires(),
): RegistrationPhase {
    if (t.openDateGeneral && today >= t.openDateGeneral) return "general";
    if (t.openDateClub && today >= t.openDateClub) return "prioridad";
    return "cerrada";
}

/** Tope de equipos por club en la etapa de prioridad (0 = sin tope). */
export function getMaxTeamsPerClub(modalidad: any): number {
    const mod = typeof modalidad === "string" ? JSON.parse(modalidad) : modalidad;
    const n = Number(mod?.maxTeamsPerClub || 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
