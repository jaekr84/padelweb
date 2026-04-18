"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlayersByClub } from "@/app/actions/players";

export function useClubPlayers(clubId: string | null) {
    const query = useQuery({
        queryKey: ["club-players", clubId],
        queryFn: () => getPlayersByClub(clubId!),
        enabled: !!clubId,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    return {
        ...query,
        players: query.data || [],
    };
}
