import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  theme: "dark" | "light";
  keepOpen: boolean;
  setTheme: (theme: "dark" | "light") => void;
  setKeepOpen: (keepOpen: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      keepOpen: true,
      setTheme: (theme) => set({ theme }),
      setKeepOpen: (keepOpen) => set({ keepOpen }),
    }),
    {
      name: "woxlauncher-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
