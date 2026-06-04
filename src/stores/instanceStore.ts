import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { InstanceConfig } from "../types";

interface InstanceState {
  instances: InstanceConfig[];
  selectedId: string | null;
  loading: boolean;
  fetchInstances: () => Promise<void>;
  createInstance: (config: InstanceConfig) => Promise<InstanceConfig>;
  deleteInstance: (id: string) => Promise<void>;
}

export const useInstanceStore = create<InstanceState>((set, get) => ({
  instances: [],
  selectedId: null,
  loading: false,

  fetchInstances: async () => {
    set({ loading: true });
    const instances = await invoke<InstanceConfig[]>("list_instances");
    set({ instances, loading: false });
  },

  createInstance: async (config) => {
    const created = await invoke<InstanceConfig>("create_instance", {
      config,
    });
    set({ instances: [...get().instances, created] });
    return created;
  },

  deleteInstance: async (id) => {
    await invoke("delete_instance", { id });
    set({ instances: get().instances.filter((i) => i.id !== id) });
  },
}));
