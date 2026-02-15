import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { ImagesService } from './images.service';

@Controller('api/images')
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  @Get()
  getImage(@Query('path') pathParam: string, @Res() res: Response) {
    if (!pathParam?.trim()) {
      throw new BadRequestException('Image path is required');
    }
    const storedPath = decodeURIComponent(pathParam).replace(/^["']|["']$/g, '').trim();
    try {
      const absolutePath = this.images.getAbsolutePathForRead(storedPath);
      const stream = createReadStream(absolutePath);
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      stream.pipe(res);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT' || (e as Error).message?.includes('not found')) {
        throw new NotFoundException('Image not found');
      }
      throw e;
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@UploadedFile() file: { buffer?: Buffer; mimetype?: string }) {
    if (!file?.buffer) {
      throw new BadRequestException('Missing image file');
    }
    const fileType = file.mimetype ?? '';
    if (fileType && !fileType.startsWith('image/')) {
      throw new BadRequestException('Invalid image type');
    }
    const storedPath = this.images.saveImageBuffer(file.buffer, 'chart');
    return { path: storedPath };
  }

  @Delete('delete')
  deleteImage(@Body('path') storedPath: string) {
    if (!storedPath || typeof storedPath !== 'string') {
      throw new BadRequestException('Image path is required');
    }
    try {
      this.images.deleteImageByPath(storedPath.trim());
    } catch {
      // ignore if file already missing
    }
    return { ok: true };
  }
}
