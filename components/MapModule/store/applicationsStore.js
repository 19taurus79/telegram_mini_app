import { create } from 'zustand';

export const useApplicationsStore = create((set) => ({
  applications: [],
  unmappedApplications: [],
  selectedClient: null,
  setApplications: (applications) => {
    const applicationsArray = Array.isArray(applications) ? applications : [];
    set({ applications: applicationsArray });
  },
  setUnmappedApplications: (applications) => {
    const applicationsArray = Array.isArray(applications) ? applications : [];
    set({ unmappedApplications: applicationsArray });
  },
  setSelectedClient: (client) => set({ selectedClient: client }),
  selectedManager: null,
  setSelectedManager: (manager) => set({ selectedManager: manager }),
}));
