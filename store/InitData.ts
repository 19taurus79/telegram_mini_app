import { create } from "zustand";

// Додаємо ключове слово `export`, щоб тип був доступний для імпорту
export type InitData = {
  initData: string | null;
  setInitData: (data: string | null) => void;
};

export const useInitData = create<InitData>((set) => ({
  initData: null,
  setInitData: (data) => set({ initData: data }),
}));
