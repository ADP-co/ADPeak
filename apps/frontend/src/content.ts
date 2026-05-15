export const DEFAULT_API_URL = "http://127.0.0.1:8000";

export function resolveApiUrl(value: string | undefined): string {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : DEFAULT_API_URL;
}
