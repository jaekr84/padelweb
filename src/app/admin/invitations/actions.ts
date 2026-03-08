"use server"

import { clerkClient, auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function createClubInvitation(formData: FormData) {
    const { sessionClaims } = await auth();

    // Verify role on the server action
    if (sessionClaims?.metadata?.role !== 'superadmin') {
        return { error: 'No autorizado' };
    }

    const email = formData.get('email') as string;

    if (!email) {
        return { error: 'El email es requerido' };
    }

    try {
        const client = await clerkClient();

        // Use clerk client to create an invitation
        const invitation = await client.invitations.createInvitation({
            emailAddress: email,
            publicMetadata: {
                role: 'club' // Add "club" role to the public_metadata
            },
            ignoreExisting: true // if they somehow exist, ignore
        });

        revalidatePath('/admin/invitations');
        return { success: true, message: 'Invitación enviada a ' + email };
    } catch (e: any) {
        console.error("Error creating invitation:", e);
        return { error: e.message || 'Error al enviar invitación' };
    }
}
