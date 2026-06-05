import type { ModResult, ProjectKind } from "../types";

const BASE = "https://api.curseforge.com/v1";
// CurseForge API key — public key for WoxLauncher
// Users can set their own key in Settings
const API_KEY = "$2a$10$pE7E9N2CQMq7Mq8YvVL8YeXF7SHNW1vKv1CN1ZvJhOQ1gU6m8HXvS";

async function cfFetch(path: string): Promise<any> {
  const resp = await fetch(`${BASE}${path}`, {
    headers: {
      "x-api-key": API_KEY,
      "Accept": "application/json",
    },
  });
  if (!resp.ok) throw new Error(`CurseForge API error: ${resp.status}`);
  return resp.json();
}

export async function searchCurseForge(query: string, version?: string, kind: ProjectKind = "mod"): Promise<ModResult[]> {
  const classId = kind === "modpack" ? 4471 : 6;
  const data = await cfFetch(
    `/mods/search?gameId=432&classId=${classId}&searchFilter=${encodeURIComponent(query)}&pageSize=20&sortField=2&sortOrder=desc` +
    (version ? `&gameVersion=${version}` : "")
  );

  return data.data.map((m: any) => ({
    id: String(m.id),
    source: "curseforge" as const,
    name: m.name,
    summary: m.summary,
    iconUrl: m.logo?.thumbnailUrl || "",
    downloads: m.downloadCount || 0,
    categories: m.categories?.map((c: any) => c.name) || [],
    versions: m.latestFiles?.map((f: any) => f.gameVersions || []).flat() || [],
    author: m.authors?.[0]?.name || "",
  }));
}

export async function getCurseForgeDownloadUrl(modId: string, version?: string): Promise<{ url: string; filename: string } | null> {
  const params = new URLSearchParams({ pageSize: "20" });
  if (version) params.set("gameVersion", version);
  const data = await cfFetch(`/mods/${modId}/files?${params.toString()}`);
  const file = data.data?.find((f: any) => f.downloadUrl) || data.data?.[0];
  if (!file) return null;
  const url = file.downloadUrl || `https://www.curseforge.com/api/v1/mods/${modId}/files/${file.id}/download-url`;
  return { url, filename: file.fileName || `${modId}-${file.id}.zip` };
}

export async function getCurseForgeMod(modId: string): Promise<any> {
  const data = await cfFetch(`/mods/${modId}`);
  const mod = data.data;
  return {
    id: String(mod.id),
    source: "curseforge" as const,
    name: mod.name,
    summary: mod.summary,
    iconUrl: mod.logo?.thumbnailUrl || "",
    downloads: mod.downloadCount || 0,
    categories: mod.categories?.map((c: any) => c.name) || [],
    versions: mod.latestFiles?.map((f: any) => f.gameVersions || []).flat() || [],
    author: mod.authors?.[0]?.name || "",
    description: mod.description || mod.summary,
  };
}
