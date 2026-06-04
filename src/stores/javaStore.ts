import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { JavaRuntime } from "../types";

interface JavaState {
  runtimes: JavaRuntime[];
  loading: boolean;
  error: string | null;
  fetchRuntimes: () => Promise<void>;
}

export const useJavaStore = create<JavaState>((set) => ({
  runtimes: [],
  loading: false,
  error: null,

  fetchRuntimes: async () => {
    set({ loading: true, error: null });
    try {
      const runtimes = await invoke<JavaRuntime[]>("detect_java");
      set({ runtimes, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
