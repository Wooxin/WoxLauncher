import { useQuery } from "@tanstack/react-query";
import { searchModrinth } from "../services/modrinth";
import { searchCurseForge } from "../services/curseforge";
import { searchMcmod } from "../services/mcmod";
import type { ModSource } from "../types";

export function useModSearch(query: string, source: ModSource, version?: string) {
  return useQuery({
    queryKey: ["mods", source, query, version],
    queryFn: async () => {
      if (!query.trim()) return [];
      switch (source) {
        case "modrinth":
          return searchModrinth(query, version);
        case "curseforge":
          return searchCurseForge(query, version);
        case "mcmod":
          return searchMcmod(query, version);
        default:
          return [];
      }
    },
    enabled: query.trim().length > 0,
  });
}
