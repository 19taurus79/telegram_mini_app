import { create } from 'zustand';

export const useApplicationsStore = create((set) => ({
  applications: [],
  setApplications: (apps) => set({ applications: apps }),
}));
