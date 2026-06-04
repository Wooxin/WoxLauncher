import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { JavaRuntime } from "../types";

interface JavaState {
  runtimes: JavaRuntime[];
  loading: boolean;
  error: string | null;
  fetchRuntimes: (customPath?: string) => Promise<void>;
}

export const useJavaStore = create<JavaState>((set) => ({
  runtimes: [],
  loading: false,
  error: null,

  fetchRuntimes: async (customPath?: string) => {
    set({ loading: true, error: null });
    try {
      const runtimes = await invoke<JavaRuntime[]>("detect_java", { customPath: customPath || null });
      set({ runtimes, loading: false });
    } catch (e) {
      set({ error: (typeof e === "object" && e !== null ? ((e as any).message || String(e)) : String(e)), loading: false });
    }
  },
}));
