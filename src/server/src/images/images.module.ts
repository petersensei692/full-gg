import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    ConfigModule,
    SettingsModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [ImagesController],
  providers: [ImagesService],
})
export class ImagesModule {}
