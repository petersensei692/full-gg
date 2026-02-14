import { promises as fs } from "fs";
import path from "path";

function getImagesFolderPath(): string {
  const envPath = process.env.IMAGES_FOLDER_PATH;
  if (!envPath) {
    throw new Error("IMAGES_FOLDER_PATH is not set");
  }
  const trimmed = envPath.trim().replace(/^["']|["']$/g, "");
  return path.normalize(trimmed);
}

function resolveImagesDir(): string {
  const folderPath = getImagesFolderPath();
  return path.isAbsolute(folderPath)
    ? folderPath
    : path.join(process.cwd(), folderPath);
}

function toForwardSlashes(input: string): string {
  return input.replace(/\\/g, "/");
}

export async function saveImageBuffer(
  buffer: Buffer,
  prefix = "chart"
): Promise<string> {
  const folderPath = getImagesFolderPath();
  const imagesDir = resolveImagesDir();
  await fs.mkdir(imagesDir, { recursive: true });
  const stat = await fs.stat(imagesDir).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`IMAGES_FOLDER_PATH is not a directory: ${imagesDir}`);
  }

  const filename = `${prefix}-${Date.now()}.webp`;
  const filePath = path.join(imagesDir, filename);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);

  const storedPath = path.join(folderPath, filename);
  return toForwardSlashes(storedPath);
}

export async function deleteImageByPath(storedPath: string): Promise<void> {
  if (!storedPath) return;
  const normalized = storedPath.replace(/^["']|["']$/g, "");
  const absolutePath = path.isAbsolute(normalized)
    ? normalized
    : path.join(resolveImagesDir(), normalized);
  await fs.unlink(absolutePath);
}

export async function readImageByPath(storedPath: string): Promise<Buffer> {
  if (!storedPath) {
    throw new Error("Image path is required");
  }
  const normalized = storedPath.replace(/^["']|["']$/g, "");
  const absolutePath = path.isAbsolute(normalized)
    ? normalized
    : path.join(resolveImagesDir(), normalized);
  return fs.readFile(absolutePath);
}
