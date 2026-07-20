"use server"

import { revalidatePath } from "next/cache";
import { SignJWT } from "jose";
import { checkSuperadmin } from "@/lib/auth";
import { getSession } from "@/lib/auth-server";
import { headers } from "next/headers";
import { db } from "@/db";
import { invitations } from "@/db/schema";
import { desc, eq, isNull, and } from "drizzle-orm";

const INVITATION_SECRET = new TextEncoder().encode(process.env.INVITATION_SECRET || "padel_secret_key_123_change_me");

const INVITATION_TTL_HOURS = 24;

/** ¿El texto que escribió el admin es un email o una nota suelta? */
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function generateInvitationLink(role: string, recipient?: string, clubId?: string) {
    if (!(await checkSuperadmin())) {
        throw new Error('No autorizado');
    }

    const session = await getSession();
    const userId = session?.userId;

    // La invitación vive en la base: el token solo la referencia por `jti`.
    // Así se puede consumir al usarse y revocar antes de tiempo, cosa que un
    // JWT suelto no permite (es válido hasta que expira, sin excepción).
    const jti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000);

    // Si el destinatario es un email, la invitación queda atada a ese correo
    // (solo esa persona puede usarla). Si es un nombre o teléfono, se guarda
    // como nota para saber a quién se le mandó, sin restringir el registro.
    const trimmed = recipient?.trim() || "";
    const isEmail = trimmed && looksLikeEmail(trimmed);

    await db.insert(invitations).values({
        id: jti,
        role,
        email: isEmail ? trimmed.toLowerCase() : null,
        label: trimmed && !isEmail ? trimmed : null,
        clubId: clubId || null,
        createdBy: userId || "desconocido",
        expiresAt,
    });

    const token = await new SignJWT({ role, issuer: 'superadmin', createdBy: userId, jti })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${INVITATION_TTL_HOURS}h`)
        .sign(INVITATION_SECRET);

    // Dynamic base URL based on request headers
    const headerList = await headers();
    const host = headerList.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";
    
    const baseUrl = host 
        ? `${protocol}://${host}` 
        : (process.env.NEXT_PUBLIC_APP_URL || "https://acap.ar");

    return `${baseUrl}/register?invitation=${token}`;
}

export async function createInvitation(formData: FormData) {
    // Verify role on the server action using the robust helper
    if (!(await checkSuperadmin())) {
        return { error: 'No autorizado' };
    }

    const email = formData.get('email') as string;
    const role = (formData.get('role') as string) || 'club';
    const type = formData.get('type') as string; // 'email' or 'link'

    if (type === 'link') {
        try {
            const link = await generateInvitationLink(role, email);
            return { success: true, link, message: 'Link generado con éxito (vence en 24hs)' };
        } catch (e: any) {
            return { error: e.message || 'Error al generar link' };
        }
    }

    // For now, since we removed Clerk, we just generate the link instead of sending an email
    // Later we can integrate Resend or something similar
    try {
        const link = await generateInvitationLink(role);
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
 * significaría que un dump o un backup filtrado alcanzan para registrarse. Como
 * el JWT es determinista (mismo secreto + mismo contenido = mismo token), se
 * vuelve a firmar acá con el `jti` y el vencimiento originales, así el link es
 * exactamente el mismo de antes y sigue siendo de un solo uso.
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
        role: invitation.role,
        issuer: "superadmin",
        createdBy: invitation.createdBy,
        jti: invitation.id,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
        .sign(INVITATION_SECRET);

    const headerList = await headers();
    const host = headerList.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";
    const baseUrl = host
        ? `${protocol}://${host}`
        : (process.env.NEXT_PUBLIC_APP_URL || "https://acap.ar");

    return { success: true, link: `${baseUrl}/register?invitation=${token}`, expiresAt };
}
