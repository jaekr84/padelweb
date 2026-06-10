"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllPlayers } from "@/app/actions/players";

export function usePlayers(options: { enabled?: boolean; includeManual?: boolean } = {}) {
  const query = useQuery({
    queryKey: ["players", options.includeManual ? "all" : "platform"],
    queryFn: () => getAllPlayers(options.includeManual ?? false),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
    gcTime: 1000 * 60 * 60, // Keep in memory for 1 hour
    enabled: options.enabled,
  });

  return {
    ...query,
    players: query.data || [],
  };
}
