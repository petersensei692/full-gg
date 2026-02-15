import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import * as path from 'path';

@Injectable()
export class ImagesService {
  constructor(private readonly config: ConfigService) {}

  private getImagesFolderPath(): string {
    const envPath = this.config.get<string>('IMAGES_FOLDER_PATH');
    if (!envPath?.trim()) {
      throw new Error('IMAGES_FOLDER_PATH is not set');
    }
    const trimmed = envPath.trim().replace(/^["']|["']$/g, '');
    return path.normalize(trimmed);
  }

  private resolveImagesDir(): string {
    const folderPath = this.getImagesFolderPath();
    return path.isAbsolute(folderPath)
      ? folderPath
      : path.join(process.cwd(), folderPath);
  }

  private toForwardSlashes(input: string): string {
    return input.replace(/\\/g, '/');
  }

  /** Resolve stored path (absolute or relative) to filesystem path; throws if outside images dir. */
  resolveAbsolutePath(storedPath: string): string {
    if (!storedPath?.trim()) {
      throw new Error('Image path is required');
    }
    const normalized = storedPath.replace(/^["']|["']$/g, '').trim();
    const baseDir = this.resolveImagesDir();
    const absolutePath = path.isAbsolute(normalized)
      ? path.normalize(normalized)
      : path.join(baseDir, path.normalize(normalized));
    const relative = path.relative(baseDir, absolutePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Image path is outside allowed directory');
    }
    return absolutePath;
  }

  saveImageBuffer(buffer: Buffer, prefix = 'chart'): string {
    const folderPath = this.getImagesFolderPath();
    const imagesDir = this.resolveImagesDir();
    if (!existsSync(imagesDir)) {
      mkdirSync(imagesDir, { recursive: true });
    }
    const stat = existsSync(imagesDir);
    if (!stat) {
      throw new Error(`IMAGES_FOLDER_PATH is not a directory: ${imagesDir}`);
    }
    const filename = `${prefix}-${Date.now()}.webp`;
    const filePath = path.join(imagesDir, filename);
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, buffer);
    const storedPath = path.join(folderPath, filename);
    return this.toForwardSlashes(storedPath);
  }

  deleteImageByPath(storedPath: string): void {
    if (!storedPath?.trim()) return;
    const absolutePath = this.resolveAbsolutePath(storedPath);
    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
    }
  }

  /** Resolve stored path and return absolute path if file exists; throws if missing or invalid. */
  getAbsolutePathForRead(storedPath: string): string {
    const absolutePath = this.resolveAbsolutePath(storedPath);
    if (!existsSync(absolutePath)) {
      const err = new Error('Image not found') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    }
    return absolutePath;
  }

  readImageByPath(storedPath: string): Buffer {
    const absolutePath = this.getAbsolutePathForRead(storedPath);
    return readFileSync(absolutePath);
  }
}
