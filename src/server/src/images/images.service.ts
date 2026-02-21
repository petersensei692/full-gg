import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import * as path from 'path';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class ImagesService {
  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  private resolveImagesDir(): string {
    let fromSettings = this.settings.getImagesPath();
    if (fromSettings) {
      fromSettings = fromSettings.replace(/^["']+|["']+$/g, '').trim();
      if (fromSettings) return path.normalize(fromSettings);
    }
    const envPath = this.config.get<string>('IMAGES_FOLDER_PATH');
    if (!envPath?.trim()) {
      throw new Error('IMAGES_FOLDER_PATH is not set. Set it in .env or choose a directory in Settings.');
    }
    const trimmed = envPath.trim().replace(/^["']|["']$/g, '');
    const normalized = path.normalize(trimmed);
    return path.isAbsolute(normalized) ? normalized : path.join(process.cwd(), normalized);
  }

  private getImagesFolderPath(): string {
    if (this.settings.getImagesPath()) return '';
    const envPath = this.config.get<string>('IMAGES_FOLDER_PATH');
    if (!envPath?.trim()) return '';
    return envPath.trim().replace(/^["']|["']$/g, '');
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
    const imagesDir = this.resolveImagesDir();
    if (!existsSync(imagesDir)) {
      mkdirSync(imagesDir, { recursive: true });
    }
    const filename = `${prefix}-${Date.now()}.webp`;
    const filePath = path.join(imagesDir, filename);
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, buffer);
    const folderPath = this.getImagesFolderPath();
    const storedPath = folderPath ? path.join(folderPath, filename) : filename;
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
