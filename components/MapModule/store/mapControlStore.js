import { create } from "zustand";

export const useMapControlStore = create((set) => ({
  areApplicationsVisible: false,
  areClientsVisible: false,
  areDeliveriesVisible: true,
  selectedStatuses: [],
  
  availableStatuses: [],
  
  setApplicationsVisible: (visible) => set((state) => ({ 
    areApplicationsVisible: typeof visible === 'function' ? visible(state.areApplicationsVisible) : visible 
  })),
  toggleApplications: () => set((state) => ({ areApplicationsVisible: !state.areApplicationsVisible })),
  
  setClientsVisible: (visible) => set((state) => ({ 
    areClientsVisible: typeof visible === 'function' ? visible(state.areClientsVisible) : visible 
  })),
  toggleClients: () => set((state) => ({ areClientsVisible: !state.areClientsVisible })),

  setDeliveriesVisible: (visible) => set((state) => ({ 
    areDeliveriesVisible: typeof visible === 'function' ? visible(state.areDeliveriesVisible) : visible 
  })),
  toggleDeliveries: () => set((state) => ({ areDeliveriesVisible: !state.areDeliveriesVisible })),

  setAvailableStatuses: (statuses) => set({ availableStatuses: statuses }),
  setSelectedStatuses: (statuses) => set((state) => ({ 
    selectedStatuses: typeof statuses === 'function' ? statuses(state.selectedStatuses) : statuses 
  })),
  toggleStatus: (status) => set((state) => ({
    selectedStatuses: state.selectedStatuses.includes(status)
      ? state.selectedStatuses.filter(s => s !== status)
      : [...state.selectedStatuses, status]
  })),
}));
