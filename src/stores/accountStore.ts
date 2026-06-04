import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { StoredAccount } from "../types";

interface AccountState {
  accounts: StoredAccount[];
  activeAccount: StoredAccount | null;
  loading: boolean;
  error: string | null;
  fetchAccounts: () => Promise<void>;
  loginOffline: (username: string) => Promise<void>;
  startMicrosoftLogin: () => Promise<{ deviceCode: string; userCode: string; verificationUri: string; interval: number; expiresIn: number }>;
  pollMicrosoftToken: (deviceCode: string) => Promise<void>;
  loginAuthlib: (serverUrl: string, username: string, password: string) => Promise<void>;
  setActive: (uuid: string) => Promise<void>;
  deleteAccount: (uuid: string) => Promise<void>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  activeAccount: null,
  loading: false,
  error: null,

  fetchAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const accounts = await invoke<StoredAccount[]>("list_accounts");
      const active = await invoke<StoredAccount | null>("get_active_account");
      set({ accounts, activeAccount: active, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  loginOffline: async (username: string) => {
    set({ loading: true, error: null });
    try {
      await invoke("offline_auth", { username });
      await get().fetchAccounts();
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  startMicrosoftLogin: async () => {
    const data = await invoke<{ deviceCode: string; userCode: string; verificationUri: string; interval: number; expiresIn: number }>("ms_device_code");
    return {
      deviceCode: data.deviceCode,
      userCode: data.userCode,
      verificationUri: data.verificationUri,
      interval: data.interval,
      expiresIn: data.expiresIn,
    };
  },

  pollMicrosoftToken: async (deviceCode: string) => {
    set({ loading: true, error: null });
    try {
      await invoke("ms_poll_token", { deviceCode });
      await get().fetchAccounts();
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  loginAuthlib: async (serverUrl: string, username: string, password: string) => {
    set({ loading: true, error: null });
    try {
      await invoke("authlib_login", { serverUrl, username, password });
      await get().fetchAccounts();
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  setActive: async (uuid: string) => {
    try {
      const account = await invoke<StoredAccount | null>("set_active_account", { uuid });
      set({ activeAccount: account });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deleteAccount: async (uuid: string) => {
    try {
      await invoke("delete_account", { uuid });
      await get().fetchAccounts();
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
