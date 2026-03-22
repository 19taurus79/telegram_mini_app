import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => {
        if (state.theme === 'light') return { theme: 'dark' };
        if (state.theme === 'dark') return { theme: 'system' };
        // If system, switch to the opposite of current OS preference
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return { theme: isSystemDark ? 'light' : 'dark' };
      }),
    }),
    {
      name: 'theme-storage', // key in localStorage
    }
  )
);
