import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  theme: "dark" | "light";
  keepOpen: boolean;
  downloadMirror: "bmclapi" | "official" | "mcbbs";
  maxDownloadThreads: number;
  defaultJvmArgs: string;
  maxMemoryGb: number;
  setTheme: (theme: "dark" | "light") => void;
  setKeepOpen: (keepOpen: boolean) => void;
  setDownloadMirror: (mirror: "bmclapi" | "official" | "mcbbs") => void;
  setMaxDownloadThreads: (threads: number) => void;
  setDefaultJvmArgs: (args: string) => void;
  setMaxMemoryGb: (gb: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      keepOpen: true,
      downloadMirror: "bmclapi",
      maxDownloadThreads: 4,
      defaultJvmArgs: "-Xmx2G -XX:+UseG1GC",
      maxMemoryGb: 2,
      setTheme: (theme) => set({ theme }),
      setKeepOpen: (keepOpen) => set({ keepOpen }),
      setDownloadMirror: (downloadMirror) => set({ downloadMirror }),
      setMaxDownloadThreads: (maxDownloadThreads) => set({ maxDownloadThreads }),
      setDefaultJvmArgs: (defaultJvmArgs) => set({ defaultJvmArgs }),
      setMaxMemoryGb: (maxMemoryGb) => set({ maxMemoryGb }),
    }),
    {
      name: "woxlauncher-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
