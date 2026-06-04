import { useQuery } from "@tanstack/react-query";
import { searchModrinth } from "../services/modrinth";
import type { ModSource } from "../types";

export function useModSearch(query: string, source: ModSource, version?: string) {
  return useQuery({
    queryKey: ["mods", source, query, version],
    queryFn: async () => {
      if (!query.trim()) return [];
      switch (source) {
        case "modrinth":
          return searchModrinth(query, version);
        default:
          return [];
      }
    },
    enabled: query.trim().length > 0,
  });
}
