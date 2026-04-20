import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DocumentsModule } from './documents/documents.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { AiModule } from './ai/ai.module';
import { RagModule } from './rag/rag.module';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    // ── Environment config ──────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ── TypeORM + PostgreSQL + pgvector ─────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const syncRaw = config.get<string>('DB_SYNCHRONIZE');
        const synchronize =
          typeof syncRaw === 'string'
            ? ['1', 'true', 'yes', 'on'].includes(syncRaw.toLowerCase())
            : config.get<string>('NODE_ENV') !== 'production';

        const rawSsl = config.get<string>('DB_SSL');
        const sslEnabled =
          typeof rawSsl === 'string'
            ? ['1', 'true', 'yes', 'on'].includes(rawSsl.toLowerCase())
            : Boolean(rawSsl);

        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'raguser'),
          password: config.get<string>('DB_PASSWORD', 'ragpassword123'),
          database: config.get<string>('DB_NAME', 'ragdb'),
          autoLoadEntities: true,
          synchronize,
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
        };
      },
      dataSourceFactory: async (options) => {
        const { DataSource } = await import('typeorm');
        if (!options) throw new Error('Invalid DB options passed');
        const dataSource = new DataSource(options);
        // Permitir que TypeORM reconozca el tipo 'vector' nativamente
        (dataSource.driver as any).supportedDataTypes.push('vector');
        await dataSource.initialize();
        return dataSource;
      },
    }),

    // ── BullMQ + Redis ──────────────────────────────
    // Supports: REDIS_URL (recommended for hosted providers like Upstash)
    // or REDIS_HOST/REDIS_PORT with optional REDIS_PASSWORD and REDIS_TLS
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');

        if (redisUrl) {
          // Allow passing the full redis URL (e.g. redis://:pwd@host:port or rediss://...)
          // BullMQ / ioredis expect an options object; pass the URL as `url`.
          return { connection: { url: redisUrl } as any };
        }

        const connection: any = {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        };

        const password = config.get<string>('REDIS_PASSWORD');
        if (password) connection.password = password;

        const rawTls = config.get<string | boolean>('REDIS_TLS');
        const tlsEnabled =
          typeof rawTls === 'boolean'
            ? rawTls
            : typeof rawTls === 'string'
            ? ['1', 'true', 'yes', 'on'].includes(rawTls.toLowerCase())
            : false;

        if (tlsEnabled) {
          connection.tls = {};
        }

        return { connection };
      },
    }),

    // ── Feature modules ─────────────────────────────
    AuthModule,
    UsersModule,
    DocumentsModule,
    IngestionModule,
    AiModule,
    RagModule,
    HealthModule,
  ],
})
export class AppModule {}
