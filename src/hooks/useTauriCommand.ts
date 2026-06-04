import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useTauriCommand<T>(command: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (args?: Record<string, unknown>): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        const result = await invoke<T>(command, args);
        setData(result);
        return result;
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [command]
  );

  return { data, loading, error, execute };
}
