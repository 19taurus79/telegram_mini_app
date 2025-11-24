import { create } from "zustand";
export const useDisplayAddressStore = create((set) => ({
  addressData: {},
  setAddressData: (data) => set({ addressData: data }),
}));
