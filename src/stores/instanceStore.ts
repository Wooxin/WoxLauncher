import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { InstanceConfig } from "../types";
import { formatError } from "../utils/error";

interface InstanceState {
  instances: InstanceConfig[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  fetchInstances: () => Promise<void>;
  createInstance: (config: InstanceConfig) => Promise<InstanceConfig>;
  deleteInstance: (id: string) => Promise<void>;
}

export const useInstanceStore = create<InstanceState>((set, get) => ({
  instances: [],
  selectedId: null,
  loading: false,
  error: null,

  fetchInstances: async () => {
    set({ loading: true, error: null });
    try {
      const instances = await invoke<InstanceConfig[]>("list_instances");
      set({ instances, loading: false });
    } catch (e) {
      set({ error: formatError(e), loading: false });
    }
  },

  createInstance: async (config) => {
    try {
      const created = await invoke<InstanceConfig>("create_instance", {
        config,
      });
      set({ instances: [...get().instances, created] });
      return created;
    } catch (e) {
      set({ error: formatError(e) });
      throw e;
    }
  },

  deleteInstance: async (id) => {
    try {
      await invoke("delete_instance", { id });
      set({ instances: get().instances.filter((i) => i.id !== id) });
    } catch (e) {
      set({ error: formatError(e) });
    }
  },
}));
