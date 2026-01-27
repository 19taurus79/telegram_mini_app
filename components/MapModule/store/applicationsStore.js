import { create } from 'zustand';

export const useApplicationsStore = create((set) => ({
  applications: [],
  unmappedApplications: [],
  selectedClient: null,
  selectedDelivery: null,
  selectedDeliveries: [],
  
  // --- НОВЫЕ ПОЛЯ ---
  multiSelectedItems: [], // Хранилище для выделенных элементов
  selectionType: null, // 'applications', 'clients', etc.
  setMultiSelectedItems: (items, type) => set({ 
    multiSelectedItems: items, 
    selectionType: type,
    selectedClient: null, // Сбрасываем одиночное выделение
    selectedDeliveries: [] 
  }),
  clearMultiSelectedItems: () => set({ multiSelectedItems: [], selectionType: null }),
  // --- КОНЕЦ НОВЫХ ПОЛЕЙ ---

  setApplications: (applications) => {
    const applicationsArray = Array.isArray(applications) ? applications : [];
    set({ applications: applicationsArray });
  },
  setUnmappedApplications: (applications) => {
    const applicationsArray = Array.isArray(applications) ? applications : [];
    set({ unmappedApplications: applicationsArray });
  },
  setSelectedClient: (client) => set({ 
    selectedClient: client, 
    selectedDelivery: null, 
    selectedDeliveries: [],
    multiSelectedItems: [], // Сбрасываем множественное выделение
    selectionType: null
  }),
  setSelectedDelivery: (delivery) => set({ 
    selectedDelivery: delivery, 
    selectedClient: null, 
    selectedDeliveries: delivery ? [delivery] : [],
    multiSelectedItems: [], // Сбрасываем множественное выделение
    selectionType: null
  }),
  setSelectedDeliveries: (deliveries) => set({
    selectedDeliveries: Array.isArray(deliveries) ? deliveries : [],
    selectedDelivery: deliveries?.length === 1 ? deliveries[0] : null,
    selectedClient: null,
    multiSelectedItems: [], // Сбрасываем множественное выделение
    selectionType: null
  }),
  toggleSelectedDelivery: (delivery) => set((state) => {
    const isSelected = state.selectedDeliveries.some(d => d.id === delivery.id);
    const newSelection = isSelected 
      ? state.selectedDeliveries.filter(d => d.id !== delivery.id)
      : [...state.selectedDeliveries, delivery];
    
    return {
      selectedDeliveries: newSelection,
      selectedDelivery: newSelection.length === 1 ? newSelection[0] : null,
      selectedClient: null,
      multiSelectedItems: [],
      selectionType: null
    };
  }),
  clearSelectedDeliveries: () => set({ selectedDeliveries: [], selectedDelivery: null }),
  selectedManager: null,
  setSelectedManager: (manager) => set({ selectedManager: manager }),
  isEditDeliveryModalOpen: false,
  setIsEditDeliveryModalOpen: (isOpen) => set({ isEditDeliveryModalOpen: isOpen }),
  deliveries: [],
  setDeliveries: (deliveries) => set({ deliveries: Array.isArray(deliveries) ? deliveries : [] }),
  updateDeliveries: (updatedBatch) => set((state) => {
    const updatedMap = new Map(updatedBatch.map(d => [d.id, d]));
    
    // Update the main deliveries list as well
    const newDeliveries = state.deliveries.map(d => updatedMap.get(d.id) || d);

    return {
      deliveries: newDeliveries,
      selectedDeliveries: state.selectedDeliveries.map(d => updatedMap.get(d.id) || d),
      selectedDelivery: state.selectedDelivery ? (updatedMap.get(state.selectedDelivery.id) || state.selectedDelivery) : null
    };
  }),
  removeDelivery: (deliveryId) => set((state) => {
    const newDeliveries = state.deliveries.filter(d => d.id !== deliveryId);
    const newSelectedDeliveries = state.selectedDeliveries.filter(d => d.id !== deliveryId);
    
    return {
      deliveries: newDeliveries,
      selectedDeliveries: newSelectedDeliveries,
      selectedDelivery: state.selectedDelivery?.id === deliveryId ? null : state.selectedDelivery
    };
  }),
}));
