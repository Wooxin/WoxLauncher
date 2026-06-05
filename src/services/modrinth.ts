import type { LoaderType, ModResult, ModVersionFile, ProjectKind } from "../types";

const BASE = "https://api.modrinth.com/v2";

export async function searchModrinth(query: string, version?: string, kind: ProjectKind = "mod"): Promise<ModResult[]> {
  const facets = [[`project_type:${kind}`]];
  if (version) facets.push([`versions:${version}`]);
  const params = new URLSearchParams({
    query,
    limit: "20",
    facets: JSON.stringify(facets),
  });
  const url = `${BASE}/search?${params.toString()}`;

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

function normalizedLoader(loader?: LoaderType): string | undefined {
  if (!loader || loader === "vanilla") return undefined;
  if (loader === "neoforge") return "neoforge";
  if (loader === "forge") return "forge";
  if (loader === "fabric") return "fabric";
  if (loader === "quilt") return "quilt";
  return undefined;
}

export async function getModrinthVersions(projectId: string, version?: string, loader?: LoaderType): Promise<ModVersionFile[]> {
  const params = new URLSearchParams();
  if (version) params.set("game_versions", JSON.stringify([version]));
  const normalized = normalizedLoader(loader);
  if (normalized) params.set("loaders", JSON.stringify([normalized]));
  const url = `${BASE}/project/${projectId}/version${params.toString() ? `?${params.toString()}` : ""}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "WoxLauncher/0.1.0" },
  });
  if (!resp.ok) throw new Error(`Modrinth API error: ${resp.status}`);
  const versions = await resp.json();
  return (versions || []).flatMap((versionInfo: any) => {
    const file = versionInfo.files?.find((f: any) => f.primary) || versionInfo.files?.[0];
    if (!file) return [];
    return [{
      versionId: versionInfo.id,
      versionName: versionInfo.name || versionInfo.version_number || versionInfo.id,
      gameVersions: versionInfo.game_versions || [],
      loaders: versionInfo.loaders || [],
      datePublished: versionInfo.date_published || "",
      fileName: file.filename,
      url: file.url,
      sha1: file.hashes?.sha1,
      size: file.size || 0,
    }];
  });
}

export async function getModrinthDownloadUrl(projectId: string, version?: string, loader?: LoaderType): Promise<{ url: string; filename: string; sha1?: string } | null> {
  const versions = await getModrinthVersions(projectId, version, loader);
  if (!versions.length) return null;

  // Pick primary file from the latest matching version.
  const latest = versions[0];
  return { url: latest.url, filename: latest.fileName, sha1: latest.sha1 };
}
