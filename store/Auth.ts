import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware"; // Импортируем persist
import { User } from "@/types/types";

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null, accessToken: string | null) => void;
  setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user, accessToken) =>
        set({
          user,
          accessToken,
          isAuthenticated: !!user,
          isLoading: false,
        }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "auth-storage", // Имя, под которым состояние будет храниться в localStorage
      storage: createJSONStorage(() => localStorage), // Используем localStorage
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }), // Сохраняем только user и accessToken
    }
  )
);
