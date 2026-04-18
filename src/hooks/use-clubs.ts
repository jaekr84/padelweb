"use client";

import { useQuery } from "@tanstack/react-query";
import { getClubs } from "@/app/actions/clubs";

export function useClubs() {
    const query = useQuery({
        queryKey: ["clubs"],
        queryFn: () => getClubs(),
        staleTime: 1000 * 60 * 30, // 30 minutes cache
        gcTime: 1000 * 60 * 60, // 1 hour memory
    });

    return {
        ...query,
        clubs: query.data || [],
    };
}
