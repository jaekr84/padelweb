"use server"

import { revalidatePath } from "next/cache";
import { SignJWT } from "jose";
import { checkSuperadmin } from "@/lib/auth";
import { getSession } from "@/lib/auth-server";
import { headers } from "next/headers";
import { db } from "@/db";
import { invitations, clubs } from "@/db/schema";
import { desc, eq, isNull, and } from "drizzle-orm";

const INVITATION_SECRET = new TextEncoder().encode(process.env.INVITATION_SECRET || "padel_secret_key_123_change_me");

const INVITATION_TTL_HOURS = 24;

/**
 * Una invitación siempre da rol "jugador", nunca uno elevado. Es un valor fijo
 * y no un parámetro a propósito: un link es una credencial que circula por
 * WhatsApp, así que no puede ser la vía para crear cuentas de club ni de admin.
 * Esos roles se asignan a mano desde la gestión de usuarios.
 */
const INVITATION_ROLE = "jugador";

/** ¿El texto que escribió el admin es un email o una nota suelta? */
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

async function resolveBaseUrl() {
    const headerList = await headers();
    const host = headerList.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";
    return host
        ? `${protocol}://${host}`
        : (process.env.NEXT_PUBLIC_APP_URL || "https://acap.ar");
}

/**
 * Núcleo de emisión, compartido por el alta de admin y la del club. Está acá y
 * no duplicado en cada acción para que las garantías (24hs, un solo uso, rol
 * fijo) no puedan divergir entre los dos caminos.
 *
 * `clubId` nunca llega desde el cliente: cada llamador lo resuelve del lado del
 * servidor a partir de quién es.
 */
async function issueInvitation(opts: { createdBy: string; recipient?: string; clubId?: string | null }) {
    // La invitación vive en la base: el token solo la referencia por `jti`.
    // Así se puede consumir al usarse y revocar antes de tiempo, cosa que un
    // JWT suelto no permite (es válido hasta que expira, sin excepción).
    const jti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000);

    // Si el destinatario es un email, la invitación queda atada a ese correo
    // (solo esa persona puede usarla). Si es un nombre o teléfono, se guarda
    // como nota para saber a quién se le mandó, sin restringir el registro.
    const trimmed = opts.recipient?.trim() || "";
    const isEmail = trimmed && looksLikeEmail(trimmed);

    await db.insert(invitations).values({
        id: jti,
        role: INVITATION_ROLE,
        email: isEmail ? trimmed.toLowerCase() : null,
        label: trimmed && !isEmail ? trimmed : null,
        clubId: opts.clubId || null,
        createdBy: opts.createdBy,
        expiresAt,
    });

    const token = await new SignJWT({ role: INVITATION_ROLE, createdBy: opts.createdBy, jti })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${INVITATION_TTL_HOURS}h`)
        .sign(INVITATION_SECRET);

    return `${await resolveBaseUrl()}/register?invitation=${token}`;
}

export async function generateInvitationLink(recipient?: string, clubId?: string) {
    if (!(await checkSuperadmin())) {
        throw new Error('No autorizado');
    }

    const session = await getSession();
    return issueInvitation({
        createdBy: session?.userId || "desconocido",
        recipient,
        clubId,
    });
}

/**
 * Link que genera el propio club para sumar un jugador. Mismas garantías que el
 * de admin: rol "jugador", 24hs, un solo uso y revocable.
 *
 * El club se resuelve por `ownerId` desde la sesión y no se recibe por
 * parámetro: si viniera del cliente, un club podría emitir invitaciones que
 * vinculan gente a otro club.
 */
export async function generateClubInvitationLink(recipient?: string) {
    const session = await getSession();
    if (!session?.userId) return { error: "No autorizado" };

    const [club] = await db
        .select({ id: clubs.id })
        .from(clubs)
        .where(eq(clubs.ownerId, session.userId))
        .limit(1);

    if (!club) return { error: "Tu usuario no tiene un club asociado" };

    const link = await issueInvitation({
        createdBy: session.userId,
        recipient,
        clubId: club.id,
    });

    return { success: true, link };
}

export async function createInvitation(formData: FormData) {
    // Verify role on the server action using the robust helper
    if (!(await checkSuperadmin())) {
        return { error: 'No autorizado' };
    }

    const email = formData.get('email') as string;
    const type = formData.get('type') as string; // 'email' or 'link'

    if (type === 'link') {
        try {
            const link = await generateInvitationLink(email);
            return { success: true, link, message: 'Link generado con éxito (vence en 24hs)' };
        } catch (e: any) {
            return { error: e.message || 'Error al generar link' };
        }
    }

    // For now, since we removed Clerk, we just generate the link instead of sending an email
    // Later we can integrate Resend or something similar
    try {
        const link = await generateInvitationLink();
        return {
            success: true,
            link,
            message: `Para ${email}: Copia este link para enviarlo manualmente.`
        };
    } catch (e: any) {
        return { error: e.message || 'Error al generar invitación' };
    }
}

export type InvitationStatus = "pendiente" | "usada" | "vencida" | "revocada";

/** Lista las invitaciones con su estado derivado, para el panel de admin. */
export async function listInvitations() {
    if (!(await checkSuperadmin())) return [];

    const rows = await db
        .select()
        .from(invitations)
        .orderBy(desc(invitations.createdAt))
        .limit(100);

    const now = Date.now();
    return rows.map(inv => {
        const status: InvitationStatus =
            inv.revokedAt ? "revocada"
                : inv.usedAt ? "usada"
                    : new Date(inv.expiresAt).getTime() < now ? "vencida"
                        : "pendiente";
        return { ...inv, status };
    });
}

/** Anula una invitación que todavía no se usó. */
export async function revokeInvitation(id: string) {
    if (!(await checkSuperadmin())) {
        return { error: "No autorizado" };
    }

    const result: any = await db
        .update(invitations)
        .set({ revokedAt: new Date() })
        // Solo si sigue sin usarse: una invitación ya consumida no se "desusa".
        .where(and(eq(invitations.id, id), isNull(invitations.usedAt), isNull(invitations.revokedAt)));

    const affected = result?.[0]?.affectedRows ?? result?.affectedRows ?? 0;
    if (affected === 0) {
        return { error: "La invitación ya fue usada, revocada o no existe" };
    }

    revalidatePath("/admin/invitations");
    return { success: true };
}

/**
 * Reconstruye el link de una invitación pendiente para poder reenviarlo.
 *
 * El token no se guarda en la base a propósito: es una credencial y guardarla
 * significaría que un dump o un backup filtrado alcanzan para registrarse. Se
 * emite uno nuevo apuntando al mismo `jti` y con el vencimiento original, así
 * que reenviar no crea una segunda invitación ni extiende la validez: los dos
 * links son la misma invitación y el primero que se use la consume.
 */
export async function getInvitationLink(id: string) {
    if (!(await checkSuperadmin())) {
        return { error: "No autorizado" };
    }

    const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, id))
        .limit(1);

    if (!invitation) return { error: "La invitación no existe" };
    if (invitation.revokedAt) return { error: "Esta invitación fue anulada" };
    if (invitation.usedAt) return { error: "Esta invitación ya fue usada" };

    const expiresAt = new Date(invitation.expiresAt);
    if (expiresAt.getTime() < Date.now()) return { error: "Esta invitación venció" };

    // Vencimiento original, no 24hs nuevas: reenviar no extiende la validez.
    const token = await new SignJWT({
        // Fijo, no `invitation.role`: una fila vieja podría tener otro rol.
        role: INVITATION_ROLE,
        createdBy: invitation.createdBy,
        jti: invitation.id,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
        .sign(INVITATION_SECRET);

    return { success: true, link: `${await resolveBaseUrl()}/register?invitation=${token}`, expiresAt };
}
