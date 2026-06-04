import { create } from "zustand";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { DownloadProgress } from "../types";

interface DownloadState {
  downloads: Record<string, DownloadProgress>;
  activeCount: number;
  isListening: boolean;
  unlisten: UnlistenFn | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: {},
  activeCount: 0,
  isListening: false,
  unlisten: null,

  startListening: async () => {
    if (get().isListening) return;
    const unlisten = await listen<DownloadProgress>("download:progress", (event) => {
      const progress = event.payload;
      set((state) => {
        const next = { ...state.downloads, [progress.fileName]: progress };
        const active = Object.values(next).filter(
          (d) => d.status === "downloading" || d.status === "verifying"
        ).length;
        return { downloads: next, activeCount: active };
      });
    });
    set({ isListening: true, unlisten });
  },

  stopListening: () => {
    const { unlisten } = get();
    if (unlisten) unlisten();
    set({ isListening: false, unlisten: null });
  },
}));
