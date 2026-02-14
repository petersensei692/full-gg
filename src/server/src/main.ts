import { config } from 'dotenv';
import * as path from 'path';

// Load .env from project root (main.ts lives in src/server/src or dist)
const rootEnv = path.resolve(__dirname, '../../..', '.env');
config({ path: rootEnv });

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({ origin: frontendUrl, credentials: true });

  const config = new DocumentBuilder()
    .setTitle('GG Backend API')
    .setDescription('API documentation for GG backend. Use this reference for frontend implementation.')
    .setVersion('1.0')
    .addTag('fondamental', 'Fondamental module: assets and related entities')
    .addTag('weekly', 'Weekly module: calendar and watchlist')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
