import { create } from "zustand";

export const useMapControlStore = create((set) => ({
  areApplicationsVisible: false,
  areClientsVisible: false,
  areDeliveriesVisible: true,
  selectedStatuses: [],
  selectedDates: [],
  
  availableStatuses: [],

  // Координати для програмного переміщення карти
  flyToCoords: null,
  setFlyToCoords: (coords) => set({ flyToCoords: coords }),

  // Запит на відкриття EditClientModal (дані клієнта або null для нового)
  editClientRequest: null,
  setEditClientRequest: (data) => set({ editClientRequest: data }),
  
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

  setSelectedDates: (dates) => set((state) => ({
    selectedDates: typeof dates === 'function' ? dates(state.selectedDates) : dates
  })),
  toggleDate: (date, isMulti) => set((state) => {
    if (isMulti) {
      const isSelected = state.selectedDates.includes(date);
      return {
        selectedDates: isSelected
          ? state.selectedDates.filter(d => d !== date)
          : [...state.selectedDates, date]
      };
    } else {
      // If clicking the only selected date, clear it. Otherwise, set to just this date.
      const isOnlySelected = state.selectedDates.length === 1 && state.selectedDates[0] === date;
      return {
        selectedDates: isOnlySelected ? [] : [date]
      };
    }
  }),
  clearDateFilters: () => set({ selectedDates: [] }),
}));

