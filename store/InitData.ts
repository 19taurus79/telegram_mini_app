import { create } from "zustand";

// Додаємо ключове слово `export`, щоб тип був доступний для імпорту
export type InitData = {
  initData: string | null;
  setInitData: (data: string | null) => void;
  isSessionExpired: boolean;
  setSessionExpired: (expired: boolean) => void;
};

export const useInitData = create<InitData>((set) => ({
  initData: null,
  setInitData: (data) => set({ initData: data }),
  isSessionExpired: false,
  setSessionExpired: (expired) => set({ isSessionExpired: expired }),
}));
