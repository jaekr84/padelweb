"use client";

import { usePlayers } from "@/hooks/use-players";
import React, { createContext, useContext, ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Early-fetches and provides master data like players, clubs, etc.
 * This ensures that when a user reaches a screen that needs it, it's likely already in cache.
 */

const MasterDataContext = createContext<{
  isReady: boolean;
} | undefined>(undefined);

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Only pre-load if we are in the app, not in the landing or auth pages
  const shouldPreload = pathname !== "/" && pathname !== "/login" && pathname !== "/register";

  // Pre-load players using the hook
  const { isLoading: isLoadingPlayers } = usePlayers({ enabled: shouldPreload });

  const value = {
    isReady: shouldPreload ? !isLoadingPlayers : true,
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
