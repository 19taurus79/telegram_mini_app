import { create } from "zustand";

export const useMapControlStore = create((set) => ({
  areApplicationsVisible: false,
  showHeatmap: false,
  
  setApplicationsVisible: (visible) => set({ areApplicationsVisible: visible }),
  toggleApplications: () => set((state) => ({ areApplicationsVisible: !state.areApplicationsVisible })),
  
  setShowHeatmap: (show) => set({ showHeatmap: show }),
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
}));
