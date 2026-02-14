import { getImageUrl } from "./imageUrls";

export interface UploadedImage {
  path: string;
  url: string;
}

export async function uploadImageBlob(blob: Blob): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("file", blob, "chart.webp");

  const res = await fetch("/api/images/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body?.message === "string" ? body.message : "Image upload failed";
    throw new Error(message);
  }

  const data = (await res.json()) as { path: string };
  return { path: data.path, url: getImageUrl(data.path) };
}

export async function deleteStoredImage(path: string): Promise<void> {
  const res = await fetch("/api/images/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body?.message === "string" ? body.message : "Image delete failed";
    throw new Error(message);
  }
}
