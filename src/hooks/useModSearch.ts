import { useQuery } from "@tanstack/react-query";
import { searchModrinth } from "../services/modrinth";
import { searchCurseForge } from "../services/curseforge";
import { searchMcmod } from "../services/mcmod";
import type { ModSource, ProjectKind } from "../types";

export function useModSearch(
  query: string,
  source: ModSource,
  version?: string,
  kind: ProjectKind = "mod",
  enabled = true,
) {
  return useQuery({
    queryKey: ["projects", kind, source, query, version],
    queryFn: async () => {
      switch (source) {
        case "modrinth":
          return searchModrinth(query.trim() || version || "", version, kind);
        case "curseforge":
          return searchCurseForge(query, version, kind);
        case "mcmod":
          return searchMcmod(query, version, kind);
        default:
          return [];
      }
    },
    enabled,
  });
}
