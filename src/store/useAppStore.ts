import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
    // UI state
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    sponsorsVisible: boolean;
    setSponsorsVisible: (visible: boolean) => void;
    
    // Filtering state (example for tournaments)
    tournamentFilter: {
        status: string;
        category: string;
        search: string;
        role: string;
        gender: string;
    };
    setTournamentFilter: (filter: Partial<AppState["tournamentFilter"]>) => void;
    resetFilters: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            sidebarOpen: false,
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            sponsorsVisible: true,
            setSponsorsVisible: (visible) => set({ sponsorsVisible: visible }),
            
            tournamentFilter: {
                status: "all",
                category: "all",
                search: "",
                role: "all",
                gender: "all",
            },
            setTournamentFilter: (filter) =>
                set((state) => ({
                    tournamentFilter: { ...state.tournamentFilter, ...filter },
                })),
            resetFilters: () =>
                set({
                    tournamentFilter: {
                        status: "all",
                        category: "all",
                        search: "",
                        role: "all",
                        gender: "all",
                    },
                }),
        }),
        {
            name: "padelweb-storage",
            // Only persist UI state, not temporary filters if preferred
            partialize: (state) => ({ 
                sidebarOpen: state.sidebarOpen,
                sponsorsVisible: state.sponsorsVisible 
            }),
        }
    )
);
