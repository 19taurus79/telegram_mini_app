import { create } from "zustand";

type Delivery = {
  delivery: {
    product: string;
    quantity: number;
    client: string;
    manager: string;
    order: string;
    id: string;
  }[];
  setDelivery: (delivery: {
    product: string;
    quantity: number;
    client: string;
    manager: string;
    order: string;
    id: string;
  }) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearDelivery: () => void;
  removeClientDelivery: (client: string) => void;
};

const initialDelivery: Delivery = {
  delivery: [],
  setDelivery: () => {},
  updateQuantity: () => {},
  clearDelivery: () => {},
  removeClientDelivery: () => {},
};
export const useDelivery = create<Delivery>((set) => ({
  delivery: initialDelivery.delivery,
  setDelivery: (delivery: {
    product: string;
    quantity: number;
    client: string;
    manager: string;
    order: string;
    id: string;
  }) =>
    set((state) => {
      const index = state.delivery.findIndex((item) => item.id === delivery.id);
      if (index !== -1) {
        return {
          delivery: state.delivery.filter((item) => item.id !== delivery.id),
        };
      } else {
        return { delivery: [...state.delivery, delivery] };
      }
    }),
  // ✅ Обновить только количество
  updateQuantity: (id: string, quantity: number) =>
    set((state) => ({
      delivery: state.delivery.map((item) =>
        item.id === id ? { ...item, quantity } : item
      ),
    })),
  clearDelivery: () => set({ delivery: initialDelivery.delivery }),
  removeClientDelivery: (client: string) =>
    set((state) => ({
      delivery: state.delivery.filter((item) => item.client !== client),
    })),
}));
