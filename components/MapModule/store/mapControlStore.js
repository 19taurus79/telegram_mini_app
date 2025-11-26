import { create } from "zustand";

export const useMapControlStore = create((set) => ({
  areApplicationsVisible: false,
  showHeatmap: false,
  areClientsVisible: false,
  
  setApplicationsVisible: (visible) => set({ areApplicationsVisible: visible }),
  toggleApplications: () => set((state) => ({ areApplicationsVisible: !state.areApplicationsVisible })),
  
  setShowHeatmap: (show) => set({ showHeatmap: show }),
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),

  setClientsVisible: (visible) => set({ areClientsVisible: visible }),
  toggleClients: () => set((state) => ({ areClientsVisible: !state.areClientsVisible })),
}));
