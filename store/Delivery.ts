import { create } from "zustand";
import { persist } from "zustand/middleware";

// Добавляем тип для объекта партии
type Party = {
  moved_q: number;
  party: string;
};

// Обновляем DeliveryItem, добавляя поле `parties`
type DeliveryItem = {
  product: string;
  quantity: number;
  client: string;
  manager: string;
  order: string;
  id: string;
  parties: Party[]; // <--- ВАШЕ ДОБАВЛЕНИЕ
};

type DeliveryState = {
  delivery: DeliveryItem[];
  setDelivery: (item: DeliveryItem) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearDelivery: () => void;
  removeClientDelivery: (client: string) => void;
  hasItem: (id: string) => boolean;
};

export const useDelivery = create<DeliveryState>()(
  persist(
    (set, get) => ({
      delivery: [],
      // Логика setDelivery не меняется, т.к. она работает со всем объектом `item`
      setDelivery: (item) =>
        set((state) => {
          if (get().hasItem(item.id)) {
            return {
              delivery: state.delivery.filter((d) => d.id !== item.id),
            };
          } else {
            return { delivery: [...state.delivery, item] };
          }
        }),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          delivery: state.delivery.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        })),
      clearDelivery: () => set({ delivery: [] }),
      removeClientDelivery: (client) =>
        set((state) => ({
          delivery: state.delivery.filter((item) => item.client !== client),
        })),
      // Реализация селектора
      hasItem: (id) => get().delivery.some((item) => item.id === id),
    }),
    {
      name: "delivery-storage", // Имя ключа в localStorage
    }
  )
);
