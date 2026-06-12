import { create } from 'zustand';
import type { Language } from '../locales/translations';

interface AppState {
  language: Language;
  darkMode: boolean;
  setLanguage: (language: Language) => void;
  setDarkMode: (darkMode: boolean) => void;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: 'th',
  darkMode: false,
  setLanguage: (language) => set({ language }),
  setDarkMode: (darkMode) => set({ darkMode }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
}));
