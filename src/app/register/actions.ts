"use server";
import { registrationRequests } from "@/db/schema";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, setSession } from "@/lib/auth-server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
    try {
        const { payload } = await jwtVerify(token, INVITATION_SECRET);
        return { valid: !!payload, role: payload?.role as string };
    } catch (e) {
        return { valid: false };
    }
}


export async function registerAction(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phone = formData.get("phone") as string;
    const documentNumber = formData.get("documentNumber") as string;
    const birthDate = formData.get("birthDate") as string;
    const gender = formData.get("gender") as string;
    const invitationToken = formData.get("invitationToken") as string;
    const inviteClubId = formData.get("inviteClubId") as string;

    if (!email || !password || !firstName || !lastName) {
        return { error: "Faltan campos obligatorios" };
    }

    // 1. Check if user already exists
    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase())
    });

    if (existingUser) {
        return { error: "El email ya está registrado" };
    }

    // 2. Determine role from invitation or default
    let role = (formData.get("role") as string) || "jugador";
    if (invitationToken) {
        try {
            const { payload } = await jwtVerify(invitationToken, INVITATION_SECRET);
            if (payload && payload.role) {
                role = payload.role as string;
            }
        } catch (e) {
            console.error("Invalid registration token:", e);
        }
    }

    // 3. Hash password
    const passwordHash = await hashPassword(password);

    // 4. Create user
    try {
        await db.insert(users).values({
            id: email.toLowerCase(), // User wants email as ID
            email: email.toLowerCase(),
            passwordHash,
            role,
            firstName,
            lastName,
            phone,
            documentNumber,
            birthDate,
            gender,
        });

        // 5. Set session
        await setSession(email.toLowerCase(), email.toLowerCase(), role);

    } catch (e: any) {
        console.error("Registration error:", e);
        return { error: "No se pudo completar el registro: " + e.message };
    }

    revalidatePath("/home");
    
    let redirectUrl = "/onboarding";
    const params = new URLSearchParams();
    if (invitationToken) params.set("invitation", invitationToken);
    if (inviteClubId) params.set("invite", inviteClubId);
    
    const queryString = params.toString();
    if (queryString) redirectUrl += `?${queryString}`;
    
    redirect(redirectUrl);
}
