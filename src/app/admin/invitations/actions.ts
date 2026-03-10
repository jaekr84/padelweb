"use server"

import { revalidatePath } from "next/cache";
import { SignJWT } from "jose";
import { checkSuperadmin } from "@/lib/auth";
import { getSession } from "@/lib/auth-server";

const INVITATION_SECRET = new TextEncoder().encode(process.env.INVITATION_SECRET || "padel_secret_key_123_change_me");

export async function generateInvitationLink(role: string) {
    if (!(await checkSuperadmin())) {
        throw new Error('No autorizado');
    }

    const session = await getSession();
    const userId = session?.userId;

    // Create a token that expires in 2 hours
    const token = await new SignJWT({ role, issuer: 'superadmin', createdBy: userId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(INVITATION_SECRET);

    // Dynamic base URL (replace with env var in production)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
            const link = await generateInvitationLink(role);
            return { success: true, link, message: 'Link generado con éxito (vence en 2hs)' };
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
