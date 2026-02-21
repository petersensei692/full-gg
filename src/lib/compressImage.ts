/** WebP quality: 1 = 100% (full quality, no loss) */
const WEBP_QUALITY = 1;

/** Max dimension (width or height) to avoid huge canvas/buffer allocations (Array buffer allocation failed) */
const MAX_DIMENSION = 2048;
/** Max file size (bytes) to process - ~25MB */
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Converts an image to WebP at 100% quality, preserving original dimensions and full quality.
 * @param file - Image file from paste or file input
 * @returns Promise resolving to Base64 data URL (data:image/webp;base64,...) or null on failure
 */
export async function compressImage(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  if (file.size > MAX_FILE_BYTES) return null;

  return new Promise((resolve) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        },
        "image/webp",
        WEBP_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Returns a Blob of the image as WebP at full quality for API upload.
 */
export async function compressImageToBlob(file: File): Promise<Blob | null> {
  try {
    const dataUrl = await compressImage(file);
    if (!dataUrl) return null;

    const res = await fetch(dataUrl);
    return res.blob();
  } catch {
    return null;
  }
}
