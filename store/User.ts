import { create } from "zustand";
import { User } from "@/types/types";

export const useUser = create<{
  userData: User | null;
  setUserData: (data: User | null) => void;
}>((set) => ({
  userData: null,
  setUserData: (data) => set({ userData: data }),
}));
