import type { ModResult } from "../types";

const BASE = "https://api.mcmod.cn/v2";

export async function searchMcmod(query: string, _version?: string): Promise<ModResult[]> {
  try {
    const url = `${BASE}/search?keyword=${encodeURIComponent(query)}&limit=20`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "WoxLauncher/0.1.0" },
    });
    if (!resp.ok) {
      // MCMod API might not be available, return empty
      return [];
    }
    const data = await resp.json();
    if (!data.data?.list) return [];

    return data.data.list.map((m: any) => ({
      id: String(m.id || m.modid),
      source: "mcmod" as const,
      name: m.name || m.title || "",
      summary: m.description || m.shortdesc || "",
      iconUrl: m.icon || m.logo || "",
      downloads: m.download_count || m.downloads || 0,
      categories: m.categories?.map((c: any) => c.name || c) || [],
      versions: m.mc_versions || m.versions || [],
      author: m.author || m.authors?.[0] || "",
    }));
  } catch {
    return [];
  }
}

export async function getMcmodMod(modId: string): Promise<any> {
  try {
    const url = `${BASE}/mod/${modId}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "WoxLauncher/0.1.0" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const m = data.data || data;
    return {
      id: String(m.id || modId),
      source: "mcmod" as const,
      name: m.name || "",
      summary: m.description || m.shortdesc || "",
      iconUrl: m.icon || m.logo || "",
      downloads: m.download_count || 0,
      categories: m.categories?.map((c: any) => c.name || c) || [],
      versions: m.mc_versions || [],
      author: m.author || "",
    };
  } catch {
    return null;
  }
}
