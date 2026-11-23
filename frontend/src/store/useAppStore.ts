import { create } from "zustand";

export interface TrackSummary {
  code: string;
  current_status: string;
  current_location: string;
  updated_at: string;
}

interface AppState {
  recentSearches: string[];
  lastTracked: TrackSummary | null;
  activeSlide: number;
  addRecentSearch: (code: string) => void;
  setLastTracked: (item: TrackSummary | null) => void;
  setActiveSlide: (index: number) => void;
  clearRecentSearches: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  recentSearches: [],
  lastTracked: null,
  activeSlide: 0,

  addRecentSearch: (code) =>
    set((state) => {
      const clean = code.trim().toUpperCase();
      if (!clean) return state;
      const next = [clean, ...state.recentSearches.filter((c) => c !== clean)].slice(0, 5);
      return { recentSearches: next };
    }),

  setLastTracked: (item) => set({ lastTracked: item }),
  setActiveSlide: (index) => set({ activeSlide: index }),
  clearRecentSearches: () => set({ recentSearches: [] }),
}));
