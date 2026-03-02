"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

export async function linkRoleToUser(role: string, invitedByClubId?: string | null) {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("No estás autenticado");
    }

    // List of allowed roles
    const allowedRoles = ["jugador", "club", "profesor", "centro_de_padel"];
    if (!allowedRoles.includes(role)) {
        throw new Error("Rol inválido");
    }

    // Attach role to publicMetadata
    // Using Clerk V5 APIs (clerkClient().users...)
    try {
        const client = await clerkClient()
        const metadataParams: any = { role };
        if (invitedByClubId) {
            metadataParams.invitedByClubId = invitedByClubId;
        }

        await client.users.updateUserMetadata(userId, {
            publicMetadata: metadataParams,
        });
        return { success: true };
    } catch (err) {
        console.error("Error setting role in Clerk", err);
        return { success: false, error: "Hubo un error al asignar el rol" };
    }
}
