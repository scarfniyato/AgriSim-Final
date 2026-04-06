const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.PROD ? "/api" : "/api");

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}
