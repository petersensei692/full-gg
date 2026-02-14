export function getImageUrl(storedPath: string): string {
  return `/api/images?path=${encodeURIComponent(storedPath)}`;
}
