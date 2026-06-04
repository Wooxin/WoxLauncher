import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Auto-detect suitable Minecraft memory from system RAM
function detectMemoryGb(): number {
  // navigator.deviceMemory returns GB (0.25, 0.5, 1, 2, 4, 8, 16, etc.)
  const deviceRam = (navigator as any).deviceMemory;
  if (typeof deviceRam === "number") {
    // Use half of system RAM, max 8GB for Minecraft
    return Math.min(Math.floor(deviceRam / 2), 8);
  }
  return 2; // default 2GB if can't detect
}

function getAutoJvmArgs(): string {
  const gb = detectMemoryGb();
  return `-Xmx${gb}G -XX:+UseG1GC`;
}

interface SettingsState {
  theme: "dark" | "light";
  keepOpen: boolean;
  autoMemory: boolean;
  downloadMirror: "bmclapi" | "official" | "mcbbs";
  maxDownloadThreads: number;
  defaultJvmArgs: string;
  maxMemoryGb: number;
  javaInstallPath: string;
  setTheme: (theme: "dark" | "light") => void;
  setKeepOpen: (keepOpen: boolean) => void;
  setAutoMemory: (auto: boolean) => void;
  setDownloadMirror: (mirror: "bmclapi" | "official" | "mcbbs") => void;
  setMaxDownloadThreads: (threads: number) => void;
  setDefaultJvmArgs: (args: string) => void;
  setMaxMemoryGb: (gb: number) => void;
  setJavaInstallPath: (path: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      keepOpen: true,
      autoMemory: true,
      downloadMirror: "bmclapi",
      maxDownloadThreads: 4,
      defaultJvmArgs: getAutoJvmArgs(),
      maxMemoryGb: detectMemoryGb(),
      javaInstallPath: "",
      setTheme: (theme) => set({ theme }),
      setKeepOpen: (keepOpen) => set({ keepOpen }),
      setAutoMemory: (auto) => set((s) => ({
        autoMemory: auto,
        defaultJvmArgs: auto ? getAutoJvmArgs() : s.defaultJvmArgs,
        maxMemoryGb: auto ? detectMemoryGb() : s.maxMemoryGb,
      })),
      setDownloadMirror: (downloadMirror) => set({ downloadMirror }),
      setMaxDownloadThreads: (maxDownloadThreads) => set({ maxDownloadThreads }),
      setDefaultJvmArgs: (defaultJvmArgs) => set({ defaultJvmArgs }),
      setMaxMemoryGb: (maxMemoryGb) => set({ maxMemoryGb }),
      setJavaInstallPath: (javaInstallPath) => set({ javaInstallPath }),
    }),
    {
      name: "woxlauncher-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export { detectMemoryGb, getAutoJvmArgs };
