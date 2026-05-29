import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string; // Уникальный ID строки: `${contract_supplement}_${nomenclature}_${party_sign || ""}_${buying_season || ""}`
  product: string; // Полное имя товара (включая серию и сезон)
  nomenclature: string;
  party_sign?: string;
  buying_season?: string;
  different: number; // Разница (кол-во к перемещению/заказу)
  orders_q: number; // Потребность по строке
  client: string;
  contract_supplement: string;
  manager: string;
  buh: number;
  skl: number;
  qok: string;
  line_of_business?: string;
};

interface OrderCartState {
  selectedItems: CartItem[];
  toggleItem: (item: CartItem) => void;
  setItems: (items: CartItem[]) => void;
  clearCart: () => void;
  hasItem: (id: string) => boolean;
}

export const useOrderCart = create<OrderCartState>()(
  persist(
    (set, get) => ({
      selectedItems: [],
      toggleItem: (item) =>
        set((state) => {
          const exists = state.selectedItems.some((i) => i.id === item.id);
          if (exists) {
            return { selectedItems: state.selectedItems.filter((i) => i.id !== item.id) };
          } else {
            return { selectedItems: [...state.selectedItems, item] };
          }
        }),
      setItems: (items) => set({ selectedItems: items }),
      clearCart: () => set({ selectedItems: [] }),
      hasItem: (id) => get().selectedItems.some((i) => i.id === id),
    }),
    {
      name: "order-cart-storage",
    }
  )
);
