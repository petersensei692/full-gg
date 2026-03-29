import { config } from 'dotenv';
import * as path from 'path';

// Load .env from project root (main.ts lives in src/server/src or dist)
const rootEnv = path.resolve(__dirname, '../../..', '.env');
config({ path: rootEnv });

import { json, urlencoded } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { seedAssets } from './database/seeds/asset.seed';
import { seedPairsPipsValues, seedTradesForPairs } from './database/seeds/analytics.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Increase body size limit for large notes (default ~100kb)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const isElectron = !!process.env.APP_DATA_PATH;
  app.enableCors({
    origin: isElectron ? true : frontendUrl,
    credentials: true,
  });

  // In production (Electron), bind to loopback only for internal routing
  const port = parseInt(process.env.PORT ?? '5000', 10);
  const host = process.env.APP_DATA_PATH ? '127.0.0.1' : undefined;

  const config = new DocumentBuilder()
    .setTitle('GG Backend API')
    .setDescription('API documentation for GG backend. Use this reference for frontend implementation.')
    .setVersion('1.0')
    .addTag('fondamental', 'Fondamental module: assets and related entities')
    .addTag('weekly', 'Weekly module: calendar and watchlist')
    .addTag('analytics', 'Analytics module')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  if (host) {
    await app.listen(port, host);
  } else {
    await app.listen(port);
  }

  try {
    const dataSource = app.get(DataSource);
    await seedAssets(dataSource);
    await seedPairsPipsValues(dataSource);
    await seedTradesForPairs(dataSource);
  } catch (err) {
    console.error('Seed failed:', err);
  }
}
bootstrap();
