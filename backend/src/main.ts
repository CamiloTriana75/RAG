import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Global Validation Pipe ──────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── CORS ────────────────────────────────────────────
  app.enableCors({
  origin: [
    'https://rag-azure-alpha.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

  // ── Swagger Documentation ───────────────────────────
  const config = new DocumentBuilder()
    .setTitle('RAG API')
    .setDescription(
      'Retrieval-Augmented Generation backend — indexa documentos (PDF, DOCX, MD, CSV, XLSX) y responde preguntas usando OpenRouter para la generación y embeddings locales para la indexación.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('Auth', 'Registro y autenticación de usuarios')
    .addTag('Documents', 'Subida y gestión de documentos')
    .addTag('RAG', 'Motor de preguntas y respuestas')
    .addTag('Health', 'Estado del sistema')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ── Start ───────────────────────────────────────────
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 RAG API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
