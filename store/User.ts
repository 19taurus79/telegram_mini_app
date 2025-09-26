import { create } from "zustand";

type User = {
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  is_allowed: boolean;
  is_admin: boolean;
  full_name_for_orders: string;
};
export const useUser = create<{
  userData: User | null;
  setUserData: (data: User | null) => void;
}>((set) => ({
  userData: null,
  setUserData: (data) => set({ userData: data }),
}));
