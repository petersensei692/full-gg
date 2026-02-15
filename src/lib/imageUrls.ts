const apiBase = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL ?? "") : "";

export function getImageUrl(storedPath: string): string {
  return `${apiBase}/api/images?path=${encodeURIComponent(storedPath)}`;
}
