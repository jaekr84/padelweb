"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllPlayers } from "@/app/actions/players";

export function usePlayers() {
  const query = useQuery({
    queryKey: ["players"],
    queryFn: () => getAllPlayers(),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
    gcTime: 1000 * 60 * 60, // Keep in memory for 1 hour
  });

  return {
    ...query,
    players: query.data || [],
  };
}
