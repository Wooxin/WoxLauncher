import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { StoredAccount } from "../types";

function extractError(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const err = e as any;
    // Tauri serializes WoxError as { type, message }
    if (err.message) return err.message;
    // Standard Error
    if (err.toString !== Object.prototype.toString) return err.toString();
    // Fallback: try to stringify
    try { return JSON.stringify(err); } catch { return extractError(e); }
  }
  return extractError(e);
}

interface AccountState {
  accounts: StoredAccount[];
  activeAccount: StoredAccount | null;
  loading: boolean;
  error: string | null;
  fetchAccounts: () => Promise<void>;
  loginOffline: (username: string) => Promise<void>;
  msLogin: () => Promise<void>;
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
      set({ error: extractError(e), loading: false });
    }
  },

  loginOffline: async (username: string) => {
    set({ loading: true, error: null });
    try {
      await invoke("offline_auth", { username });
      await get().fetchAccounts();
    } catch (e) {
      set({ error: extractError(e), loading: false });
    }
  },

  msLogin: async () => {
    set({ loading: true, error: null });
    try {
      await invoke("ms_login");
      await get().fetchAccounts();
      set({ loading: false });
    } catch (e) {
      set({ error: extractError(e), loading: false });
    }
  },

  loginAuthlib: async (serverUrl: string, username: string, password: string) => {
    set({ loading: true, error: null });
    try {
      await invoke("authlib_login", { serverUrl, username, password });
      await get().fetchAccounts();
    } catch (e) {
      set({ error: extractError(e), loading: false });
    }
  },

  setActive: async (uuid: string) => {
    try {
      const account = await invoke<StoredAccount | null>("set_active_account", { uuid });
      set({ activeAccount: account });
    } catch (e) {
      set({ error: extractError(e) });
    }
  },

  deleteAccount: async (uuid: string) => {
    try {
      await invoke("delete_account", { uuid });
      await get().fetchAccounts();
    } catch (e) {
      set({ error: extractError(e) });
    }
  },
}));
