export function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error === null || error === undefined) return "Unknown error";
  if (typeof error !== "object") return String(error);

  const maybeError = error as { message?: unknown };
  if (typeof maybeError.message === "string" && maybeError.message.trim()) {
    return maybeError.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
