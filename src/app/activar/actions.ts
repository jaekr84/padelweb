"use server";

// Activación de un jugador invitado: la persona elige su email y su contraseña
// sobre la cuenta que el admin ya le había creado, conservando todo lo que jugó.
//
// Es deliberadamente distinto del registro con invitación (`/register`): aquel
// INSERTA una cuenta nueva con `id = email`. Acá no se crea nada, se completa
// una fila que ya existe — por eso el id sigue siendo el uuid del invitado y el
// historial no se toca.

import { db } from "@/db";
import { invitations, users } from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { jwtVerify } from "jose";
import { hashPassword } from "@/lib/auth-server";

const SECRETO_INVITACION = new TextEncoder().encode(
    process.env.INVITATION_SECRET || "padel_secret_key_123_change_me"
);

export type EstadoToken =
    | { valido: true; nombre: string; jti: string; userId: string }
    | { valido: false; motivo: "invalido" | "vencida" | "usada" | "anulada" | "activada" };

/**
 * Valida el link. Devuelve sólo el nombre de pila: la página no tiene por qué
 * mostrarle a quien abra el link ningún otro dato de la persona.
 */
export async function validarToken(token: string): Promise<EstadoToken> {
    let jti: string | undefined;
    let userId: string | undefined;

    try {
        const { payload } = await jwtVerify(token, SECRETO_INVITACION);
        if (payload.tipo !== "activacion") return { valido: false, motivo: "invalido" };
        jti = typeof payload.jti === "string" ? payload.jti : undefined;
        userId = typeof payload.sub === "string" ? payload.sub : undefined;
    } catch {
        // Firma inválida o expirada: para el usuario es lo mismo.
        return { valido: false, motivo: "vencida" };
    }
    if (!jti || !userId) return { valido: false, motivo: "invalido" };

    const [inv] = await db.select().from(invitations).where(eq(invitations.id, jti)).limit(1);
    if (!inv || inv.targetUserId !== userId) return { valido: false, motivo: "invalido" };
    if (inv.revokedAt) return { valido: false, motivo: "anulada" };
    if (inv.usedAt) return { valido: false, motivo: "usada" };
    if (new Date(inv.expiresAt).getTime() < Date.now()) return { valido: false, motivo: "vencida" };

    const [u] = await db
        .select({ firstName: users.firstName, isGuest: users.isGuest })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
    if (!u) return { valido: false, motivo: "invalido" };
    // Si ya dejó de ser invitado, el link no puede volver a tocar la cuenta:
    // si no, sería una forma de cambiarle la contraseña a un jugador real.
    if (!u.isGuest) return { valido: false, motivo: "activada" };

    return { valido: true, nombre: u.firstName || "jugador", jti, userId };
}

export async function activarCuenta(token: string, email: string, password: string) {
    const estado = await validarToken(token);
    if (!estado.valido) {
        const mensajes = {
            invalido: "El link no es válido. Pedile uno nuevo al administrador.",
            vencida: "El link venció. Pedile uno nuevo al administrador.",
            usada: "Este link ya se usó. Entrá con tu email y contraseña.",
            anulada: "El link fue anulado. Pedile uno nuevo al administrador.",
            activada: "Esta cuenta ya está activada. Entrá con tu email y contraseña.",
        } as const;
        return { ok: false as const, error: mensajes[estado.motivo] };
    }

    const limpio = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
        return { ok: false as const, error: "Poné un email válido." };
    }
    if (password.length < 8) {
        return { ok: false as const, error: "La contraseña tiene que tener al menos 8 caracteres." };
    }

    const [ocupado] = await db.select({ id: users.id }).from(users).where(eq(users.email, limpio)).limit(1);
    if (ocupado && ocupado.id !== estado.userId) {
        return { ok: false as const, error: "Ya hay una cuenta con ese email. Avisale al administrador para que las una." };
    }

    const hash = await hashPassword(password);

    try {
        await db.transaction(async (tx) => {
            await tx
                .update(users)
                .set({ email: limpio, passwordHash: hash, isGuest: false })
                .where(and(eq(users.id, estado.userId), eq(users.isGuest, true)));

            // El UPDATE condicional es el que decide: si dos personas abren el
            // mismo link a la vez, sólo una lo consume.
            const r: any = await tx
                .update(invitations)
                .set({ usedAt: new Date(), usedByUserId: estado.userId })
                .where(
                    and(
                        eq(invitations.id, estado.jti),
                        isNull(invitations.usedAt),
                        isNull(invitations.revokedAt),
                        gt(invitations.expiresAt, new Date())
                    )
                );
            const filas = r?.[0]?.affectedRows ?? r?.affectedRows ?? 0;
            if (filas === 0) throw new Error("LINK_YA_USADO");
        });
    } catch (e: any) {
        if (e?.message === "LINK_YA_USADO") {
            return { ok: false as const, error: "Este link ya se usó. Entrá con tu email y contraseña." };
        }
        console.error("[activarCuenta]", e);
        return { ok: false as const, error: "No se pudo activar la cuenta. Probá de nuevo." };
    }

    return { ok: true as const };
}
