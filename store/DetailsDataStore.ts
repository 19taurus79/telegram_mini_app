import { create } from "zustand";
import { MovedData, Order, Remains } from "@/types/types";

interface DetailsDataState {
  remains: Remains[] | null;
  orders: Order[] | null;
  movedProducts: MovedData[] | null;
  setRemains: (data: Remains[] | null) => void;
  setOrders: (data: Order[] | null) => void;
  setMovedProducts: (data: MovedData[] | null) => void;
}

export const useDetailsDataStore = create<DetailsDataState>((set) => ({
  remains: null,
  orders: null,
  movedProducts: null,
  setRemains: (data) => set({ remains: data }),
  setOrders: (data) => set({ orders: data }),
  setMovedProducts: (data) => set({ movedProducts: data }),
}));