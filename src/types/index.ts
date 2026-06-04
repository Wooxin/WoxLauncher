// Instance
export interface InstanceConfig {
  id: string;
  name: string;
  gameVersion: string;
  loaderType: LoaderType;
  loaderVersion: string;
  javaVersion: string;
  jvmArgs: string[];
  gameArgs: string[];
  resolutionWidth: number;
  resolutionHeight: number;
  createdAt: string;
  lastPlayedAt: string | null;
}

export type LoaderType = "vanilla" | "fabric" | "forge" | "quilt" | "neoforge" | "liteloader" | "rift" | "optifine";

export interface MinecraftVersion {
  id: string;
  versionType: string;
  releaseTime: string;
}

// Java
export type JavaVendor = "zulu" | "oracle" | "adoptium" | "graalvm";

export interface JavaRuntime {
  id: string;
  vendor: JavaVendor;
  version: string;
  path: string;
  installed: boolean;
}

// Download
export interface DownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
  speed: string;
  status: "idle" | "downloading" | "verifying" | "done" | "error";
  fileName: string;
}

// Auth
export type AuthMode = "microsoft" | "offline" | "authlib";

export interface AccountInfo {
  username: string;
  uuid: string;
  accessToken: string;
  authMode: AuthMode;
  authServerUrl?: string;
}

// Mod
export type ModSource = "modrinth" | "curseforge" | "mcmod";

export interface ModResult {
  id: string;
  source: ModSource;
  name: string;
  summary: string;
  iconUrl: string;
  downloads: number;
  categories: string[];
  versions: string[];
  author: string;
}

export interface ModDetail extends ModResult {
  description: string;
  screenshots: string[];
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  license: string;
  updatedAt: string;
}
