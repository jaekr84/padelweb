import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Cómo se dan de alta los jugadores nuevos:
 * - "invitacion": sólo con un link de invitación válido (sin link se pide acceso).
 * - "abierta": cualquiera completa el formulario; la invitación sigue sirviendo
 *   para vincular a la persona con un club. La cuenta queda `pending` hasta que
 *   un admin la aprueba.
 * - "libre": igual que "abierta", pero la cuenta nace aprobada y la persona
 *   puede iniciar sesión enseguida (también si llegó con invitación).
 *
 * Vive fuera de un archivo "use server" a propósito: la lectura se reexpone
 * como acción donde hace falta, pero la escritura sólo existe detrás de
 * `checkSuperadmin` en admin/invitations/actions.ts.
 */
export type RegistrationMode = "invitacion" | "abierta" | "libre";

export const REGISTRATION_MODES: readonly RegistrationMode[] = ["invitacion", "abierta", "libre"];

export const isRegistrationMode = (v: unknown): v is RegistrationMode =>
    REGISTRATION_MODES.includes(v as RegistrationMode);

export const REGISTRATION_MODE_KEY = "registration_mode";

export async function getRegistrationMode(): Promise<RegistrationMode> {
    try {
        const [setting] = await db
            .select()
            .from(systemSettings)
            .where(eq(systemSettings.key, REGISTRATION_MODE_KEY))
            .limit(1);

        // Ante cualquier valor desconocido o error, se cae al modo cerrado.
        return isRegistrationMode(setting?.value) ? setting.value : "invitacion";
    } catch (err) {
        console.error("Error fetching registration mode:", err);
        return "invitacion";
    }
}

export async function setRegistrationMode(mode: RegistrationMode) {
    const [existing] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, REGISTRATION_MODE_KEY))
        .limit(1);

    if (existing) {
        await db.update(systemSettings)
            .set({ value: mode })
            .where(eq(systemSettings.key, REGISTRATION_MODE_KEY));
    } else {
        await db.insert(systemSettings).values({
            id: crypto.randomUUID(),
            key: REGISTRATION_MODE_KEY,
            value: mode,
        });
    }
}
