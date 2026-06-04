import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { JavaRuntime } from "../types";

interface JavaState {
  runtimes: JavaRuntime[];
  loading: boolean;
  fetchRuntimes: () => Promise<void>;
}

export const useJavaStore = create<JavaState>((set) => ({
  runtimes: [],
  loading: false,

  fetchRuntimes: async () => {
    set({ loading: true });
    const runtimes = await invoke<JavaRuntime[]>("detect_java");
    set({ runtimes, loading: false });
  },
}));
