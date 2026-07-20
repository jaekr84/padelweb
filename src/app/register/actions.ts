"use server";
import { registrationRequests } from "@/db/schema";
import { db } from "@/db";
import { users, invitations } from "@/db/schema";
import { hashPassword } from "@/lib/auth-server";
import { eq, and, isNull, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { jwtVerify } from "jose";

const INVITATION_SECRET = new TextEncoder().encode(process.env.INVITATION_SECRET || "padel_secret_key_123_change_me");

export async function requestRegistrationAction(formData: FormData) {
    const fullName = formData.get("fullName") as string;
    const whatsapp = formData.get("whatsapp") as string;

    if (!fullName || !whatsapp) {
        return { error: "Faltan datos obligatorios" };
    }

    try {
        await db.insert(registrationRequests).values({
            id: crypto.randomUUID(),
            fullName,
            whatsapp,
            status: "pendiente"
        });
        return { success: true, message: "Solicitud enviada con éxito. Nos contactaremos pronto." };
    } catch (e: any) {
        console.error("Error requesting registration:", e);
        return { error: "Error al enviar solicitud" };
    }
}

export async function verifyTokenAction(token: string) {
    if (!token) return { valid: false };

    let payload: any;
    try {
        ({ payload } = await jwtVerify(token, INVITATION_SECRET));
    } catch (e) {
        return { valid: false, reason: "invalido" as const };
    }

    // La firma no alcanza: hay que mirar el estado real de la invitación para
    // que el formulario no se muestre con un link ya consumido o revocado.
    const jti = payload?.jti as string | undefined;
    if (!jti) return { valid: false, reason: "invalido" as const };

    const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, jti))
        .limit(1);

    if (!invitation) return { valid: false, reason: "invalido" as const };
    if (invitation.revokedAt) return { valid: false, reason: "revocada" as const };
    if (invitation.usedAt) return { valid: false, reason: "usada" as const };
    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
        return { valid: false, reason: "vencida" as const };
    }

    return { valid: true, role: invitation.role, email: invitation.email ?? undefined };
}


export async function registerAction(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phone = formData.get("phone") as string;
    const documentNumber = (formData.get("documentNumber") as string) || null;
    const birthDate = formData.get("birthDate") as string;
    const gender = formData.get("gender") as string;
    const invitationToken = formData.get("invitationToken") as string;
    const inviteClubId = formData.get("inviteClubId") as string;

    if (!email || !password || !firstName || !lastName || !phone || !birthDate || !gender) {
        return { error: "Faltan campos obligatorios" };
    }

    if (gender !== "masculino" && gender !== "femenino") {
        return { error: "Género no válido" };
    }

    // 1. Check if user already exists (email or document)
    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase())
    });

    if (existingUser) {
        return { error: "El email ya está registrado" };
    }

    if (documentNumber) {
        const existingDoc = await db.query.users.findFirst({
            where: eq(users.documentNumber, documentNumber)
        });
        if (existingDoc) {
            return { error: "El documento ya está registrado" };
        }
    }

    // 2. Rol según la invitación. Si vino un token tiene que ser válido: antes
    // se degradaba en silencio a "jugador" y la persona creía haberse
    // registrado como club. Ahora se corta con un mensaje claro.
    let role = (formData.get("role") as string) || "jugador";
    let invitationId: string | null = null;
    let invitationClubId: string | null = null;

    if (invitationToken) {
        let payload: any = null;
        try {
            ({ payload } = await jwtVerify(invitationToken, INVITATION_SECRET));
        } catch (e) {
            console.error("Invalid registration token:", e);
            return { error: "El link de invitación no es válido o ya venció. Pedí uno nuevo." };
        }

        const jti = payload?.jti as string | undefined;
        if (!jti) {
            // Links viejos (previos a la tabla) no se pueden consumir: se rechazan.
            return { error: "Este link de invitación es de una versión anterior. Pedí uno nuevo." };
        }

        const [invitation] = await db
            .select()
            .from(invitations)
            .where(eq(invitations.id, jti))
            .limit(1);

        if (!invitation) return { error: "La invitación no existe. Pedí un link nuevo." };
        if (invitation.revokedAt) return { error: "Esta invitación fue anulada. Pedí un link nuevo." };
        if (invitation.usedAt) return { error: "Este link de invitación ya fue usado." };
        if (new Date(invitation.expiresAt).getTime() < Date.now()) {
            return { error: "El link de invitación venció. Pedí uno nuevo." };
        }
        if (invitation.email && invitation.email !== email.toLowerCase()) {
            return { error: "Esta invitación es para otro correo electrónico." };
        }

        role = invitation.role;
        invitationId = invitation.id;
        invitationClubId = invitation.clubId;
    }

    // 3. Hash password
    const passwordHash = await hashPassword(password);

    // 4. Create user pending admin approval (no session until approved).
    // El alta y el consumo de la invitación van en la misma transacción: si el
    // registro falla, la invitación no se quema; si dos personas abren el mismo
    // link a la vez, el UPDATE condicional deja que solo una lo consuma.
    const userId = email.toLowerCase();
    try {
        await db.transaction(async (tx) => {
            await tx.insert(users).values({
                id: userId, // User wants email as ID
                email: userId,
                passwordHash,
                role,
                firstName,
                lastName,
                phone,
                documentNumber,
                birthDate,
                gender,
                clubId: inviteClubId || invitationClubId || null,
                approvalStatus: "pending",
            });

            if (invitationId) {
                const result: any = await tx
                    .update(invitations)
                    .set({ usedAt: new Date(), usedByUserId: userId })
                    .where(and(
                        eq(invitations.id, invitationId),
                        isNull(invitations.usedAt),
                        isNull(invitations.revokedAt),
                        gt(invitations.expiresAt, new Date()),
                    ));

                const affected = result?.[0]?.affectedRows ?? result?.affectedRows ?? 0;
                if (affected === 0) {
                    // Alguien la usó entre la validación y este punto.
                    throw new Error("INVITATION_ALREADY_USED");
                }
            }
        });
    } catch (e: any) {
        if (e?.message === "INVITATION_ALREADY_USED") {
            return { error: "Este link de invitación ya fue usado." };
        }
        console.error("Registration error:", e);
        return { error: "No se pudo completar el registro: " + e.message };
    }

    revalidatePath("/admin/requests");

    return {
        success: true,
        pendingApproval: true,
        message: "Cuenta creada. Un administrador debe aprobar tu acceso antes de que puedas iniciar sesión."
    };
}
