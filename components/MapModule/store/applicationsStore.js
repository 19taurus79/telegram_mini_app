import { create } from 'zustand';

export const useApplicationsStore = create((set) => ({
  applications: [],
  selectedClient: null,
  setApplications: (applications) => {
    const applicationsArray = Array.isArray(applications) ? applications : [];
    set({ applications: applicationsArray });
  },
  setSelectedClient: (client) => set({ selectedClient: client }),
}));
