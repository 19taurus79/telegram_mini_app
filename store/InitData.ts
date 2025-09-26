import { create } from "zustand";

type InitData = {
  initData: string | null;
  setInitData: (data: string | null) => void;
};

export const useInitData = create<InitData>((set) => ({
  initData: null,
  setInitData: (data) => set({ initData: data }),
}));
