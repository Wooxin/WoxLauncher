import type { LoaderType } from "./types";

export const ALL_LOADERS: LoaderType[] = [
  "vanilla", "fabric", "forge", "quilt", "neoforge", "liteloader", "rift", "optifine",
];

export const LOADER_KEYS: Record<LoaderType, string> = {
  vanilla: "common.vanilla",
  fabric: "common.fabric",
  forge: "common.forge",
  quilt: "common.quilt",
  neoforge: "common.neoforge",
  liteloader: "common.liteloader",
  rift: "common.rift",
  optifine: "common.optifine",
};
