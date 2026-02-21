import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import { readAppConfig, resolveDatabasePath } from './database/app-config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FondamentalModule } from './fondamental/fondamental.module';
import { ImagesModule } from './images/images.module';
import { SettingsModule } from './settings/settings.module';

const cwd = process.cwd();
const rootEnv = path.resolve(cwd, cwd.replace(/[/\\]+$/, '').endsWith('server') ? '..' : '.', '.env');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: rootEnv }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => {
        const appConfig = readAppConfig();
        const databasePath = resolveDatabasePath(appConfig);
        return {
          type: 'better-sqlite3',
          database: databasePath,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
        };
      },
    }),
    SettingsModule,
    FondamentalModule,
    ImagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
