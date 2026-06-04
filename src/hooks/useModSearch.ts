import { useQuery } from "@tanstack/react-query";
import { searchModrinth } from "../services/modrinth";
import { searchCurseForge } from "../services/curseforge";
import { searchMcmod } from "../services/mcmod";
import type { ModSource } from "../types";

export function useModSearch(query: string, source: ModSource, version?: string) {
  return useQuery({
    queryKey: ["mods", source, query, version],
    queryFn: async () => {
      switch (source) {
        case "modrinth":
          return searchModrinth(query.trim() || version || "", version);
        case "curseforge":
          return searchCurseForge(query, version);
        case "mcmod":
          return searchMcmod(query, version);
        default:
          return [];
      }
    },
    enabled: true,
  });
}
