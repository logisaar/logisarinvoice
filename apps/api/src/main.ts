// Load .env relative to this file (works regardless of shell CWD)
import * as path from 'path'; // touched to restart
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Ensure uploads directories exist
  const uploadsDir = path.resolve(__dirname, '..', 'uploads', 'logos');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files (logos, etc.) as static assets — no auth required
  // Accessible at: /uploads/logos/<filename>
  app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

  // Security
  app.use(
    helmet({
      crossOriginOpenerPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5174',
      credentials: true,
    }),
  );

  app.use(cookieParser(process.env.COOKIE_SECRET));

  // Global prefix
  app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 3030;
  await app.listen(port);
  console.log(`\n🚀 PayLink Pro API running on: http://localhost:${port}/api`);
  console.log(`📊 pgAdmin available at:        http://localhost:5050`);
}
bootstrap();
