import type { ModResult } from "../types";

const BASE = "https://api.modrinth.com/v2";

export async function searchModrinth(query: string, version?: string): Promise<ModResult[]> {
  const facets = version ? `&facets=[["versions:${version}"]]` : "";
  const url = `${BASE}/search?query=${encodeURIComponent(query)}&limit=20${facets}`;

  const resp = await fetch(url, {
    headers: { "User-Agent": "WoxLauncher/0.1.0" },
  });
  if (!resp.ok) throw new Error(`Modrinth API error: ${resp.status}`);

  const data = await resp.json();
  return data.hits.map((hit: any) => ({
    id: hit.project_id,
    source: "modrinth" as const,
    name: hit.title,
    summary: hit.description,
    iconUrl: hit.icon_url || "",
    downloads: hit.downloads || 0,
    categories: hit.categories || [],
    versions: hit.versions || [],
    author: hit.author || "",
  }));
}

export async function getModrinthMod(projectId: string): Promise<ModResult> {
  const url = `${BASE}/project/${projectId}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "WoxLauncher/0.1.0" },
  });
  if (!resp.ok) throw new Error(`Modrinth API error: ${resp.status}`);
  const data = await resp.json();
  return {
    id: data.id,
    source: "modrinth",
    name: data.title,
    summary: data.description,
    iconUrl: data.icon_url || "",
    downloads: data.downloads || 0,
    categories: data.categories || [],
    versions: data.game_versions || [],
    author: data.team || "",
  };
}

export async function getModrinthDownloadUrl(projectId: string, version?: string): Promise<{ url: string; filename: string } | null> {
  const params = version ? `?game_versions=["${encodeURIComponent(version)}"]` : "";
  const url = `${BASE}/project/${projectId}/version${params}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "WoxLauncher/0.1.0" },
  });
  if (!resp.ok) throw new Error(`Modrinth API error: ${resp.status}`);
  const versions = await resp.json();
  if (!versions?.length) return null;

  // Pick primarly file (first one) from latest version
  const latest = versions[0];
  const file = latest.files?.find((f: any) => f.primary) || latest.files?.[0];
  if (!file) return null;

  return { url: file.url, filename: file.filename };
}
