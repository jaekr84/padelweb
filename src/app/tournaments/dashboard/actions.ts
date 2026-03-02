"use server";

import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([\w-]{11})/,
        /youtube\.com\/embed\/([\w-]{11})/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

export async function startTournament(tournamentId: string, youtubeUrl?: string) {
    const ytId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;
    await db
        .update(tournaments)
        .set({
            status: "en_curso",
            ...(youtubeUrl && ytId ? { youtubeUrl } : {}),
        })
        .where(eq(tournaments.id, tournamentId));
    revalidatePath("/tournaments");
    revalidatePath(`/tournaments/${tournamentId}/live`);
}

export async function startEliminatorias(tournamentId: string) {
    await db
        .update(tournaments)
        .set({ status: "en_eliminatorias" })
        .where(eq(tournaments.id, tournamentId));
    revalidatePath("/tournaments");
    revalidatePath(`/tournaments/${tournamentId}/live`);
}

export async function finishTournament(tournamentId: string) {
    await db
        .update(tournaments)
        .set({ status: "finalizado" })
        .where(eq(tournaments.id, tournamentId));
    revalidatePath("/tournaments");
    revalidatePath(`/tournaments/${tournamentId}/live`);
}

export async function updateYoutubeUrl(tournamentId: string, youtubeUrl: string) {
    await db
        .update(tournaments)
        .set({ youtubeUrl })
        .where(eq(tournaments.id, tournamentId));
    revalidatePath(`/tournaments/${tournamentId}/live`);
}
