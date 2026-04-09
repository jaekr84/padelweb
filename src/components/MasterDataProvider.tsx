"use client";

import { usePlayers } from "@/hooks/use-players";
import React, { createContext, useContext, ReactNode } from "react";

/**
 * Early-fetches and provides master data like players, clubs, etc.
 * This ensures that when a user reaches a screen that needs it, it's likely already in cache.
 */

const MasterDataContext = createContext<{
  isReady: boolean;
} | undefined>(undefined);

export function MasterDataProvider({ children }: { children: ReactNode }) {
  // Pre-load players using the hook
  const { isLoading: isLoadingPlayers } = usePlayers();

  // You can add more pre-loads here (e.g., useClubs, useCategories if they were hooks)

  const value = {
    isReady: !isLoadingPlayers,
  };

  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
}

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error("useMasterData must be used within a MasterDataProvider");
  }
  return context;
}
