import { create } from "zustand";
export const useGeocodeStore = create((set) => ({
  geocodeData: [],
  setGeocodeData: (data) =>
    set({ geocodeData: Array.isArray(data) ? data : [data] }),
}));
