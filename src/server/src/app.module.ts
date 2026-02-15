import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FondamentalModule } from './fondamental/fondamental.module';
import { ImagesModule } from './images/images.module';

// Load root .env when running from project root or from src/server
const cwd = process.cwd();
const rootEnv = path.resolve(cwd, cwd.replace(/[/\\]+$/, '').endsWith('server') ? '..' : '.', '.env');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: rootEnv }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const password = config.get<string>('DB_PASSWORD') ?? process.env.DB_PASSWORD;
        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST') ?? process.env.DB_HOST ?? 'localhost',
          port: parseInt(config.get<string>('DB_PORT') ?? process.env.DB_PORT ?? '5432', 10),
          username: config.get<string>('DB_USERNAME') ?? process.env.DB_USERNAME ?? 'postgres',
          password: String(password ?? process.env.DB_PASSWORD ?? ''),
          database: config.get<string>('DB_DATABASE') ?? 'gg',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: config.get<string>('DB_SYNCHRONIZE') === 'true',
          migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        };
      },
    }),
    FondamentalModule,
    ImagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
