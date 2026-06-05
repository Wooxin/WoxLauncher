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
  fullscreen: boolean;
  useInstanceSettings: boolean;
  createdAt: string;
  lastPlayedAt: string | null;
  downloaded: boolean;
}

export interface ImportedModpack {
  instance: InstanceConfig;
  format: string;
  installedFiles: number;
  downloadedFiles: number;
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

export interface StoredAccount {
  username: string;
  uuid: string;
  accessToken: string;
  authMode: "microsoft" | "offline" | "authlib";
  authServerUrl?: string;
  refreshToken?: string;
  lastUsedAt: string;
}

// Mod
export type ModSource = "modrinth" | "curseforge" | "mcmod";
export type ProjectKind = "mod" | "modpack";

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

export interface LocalModFile {
  fileName: string;
  path: string;
  size: number;
  modifiedAt: string;
  enabled: boolean;
}

export interface ModVersionFile {
  versionId: string;
  versionName: string;
  gameVersions: string[];
  loaders: string[];
  datePublished: string;
  fileName: string;
  url: string;
  sha1?: string;
  size: number;
}
