import type { JavaRuntime } from "../types";

export function getRequiredJavaMajor(gameVersion: string): number {
  const match = gameVersion.match(/^1\.(\d+)(?:\.(\d+))?/);
  if (!match) return 17;

  const minor = Number(match[1]);
  const patch = Number(match[2] ?? 0);

  if (minor > 20 || (minor === 20 && patch >= 5)) return 21;
  if (minor >= 18) return 17;
  if (minor === 17) return 16;
  return 8;
}

export function getJavaRuntimeMajor(runtime: JavaRuntime): number | null {
  const text = runtime.version || runtime.path || "";
  const match = text.match(/(?:^|[^\d])1\.(\d+)(?:[^\d]|$)|(?:^|[^\d])(\d{2})(?:[^\d]|$)/);
  if (!match) return null;
  return Number(match[1] ?? match[2]);
}

export function selectRuntimeForGameVersion(
  runtimes: JavaRuntime[],
  gameVersion: string,
  preferredPath?: string,
): JavaRuntime | null {
  if (preferredPath) {
    const preferred = runtimes.find((runtime) => {
      const major = getJavaRuntimeMajor(runtime);
      return runtime.path === preferredPath || runtime.version === preferredPath || String(major) === preferredPath;
    });
    if (preferred) return preferred;
  }

  const required = getRequiredJavaMajor(gameVersion);
  const candidates = runtimes
    .map((runtime) => ({ runtime, major: getJavaRuntimeMajor(runtime) }))
    .filter((item): item is { runtime: JavaRuntime; major: number } => item.major !== null)
    .filter((item) => item.major >= required)
    .sort((a, b) => a.major - b.major);

  return candidates[0]?.runtime ?? runtimes[0] ?? null;
}
