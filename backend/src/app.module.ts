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

function isEnabled(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }
  return false;
}

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

        const sslEnabled = isEnabled(config.get<string | boolean>('DB_SSL'));

        // Some managed Postgres providers may return IPv6 first.
        // Render instances can fail with ENETUNREACH on IPv6 in certain setups.
        const rawIpFamily = config.get<string>('DB_IP_FAMILY');
        const parsedFamily = rawIpFamily ? Number(rawIpFamily) : NaN;
        const family = parsedFamily === 4 || parsedFamily === 6 ? parsedFamily : undefined;

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
          ...(family ? { extra: { family } } : {}),
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
          // Parse REDIS_URL explicitly to avoid runtime differences where `url`
          // may be treated as `host` by intermediate wrappers.
          try {
            const parsed = new URL(redisUrl);
            const connection: any = {
              host: parsed.hostname,
              port: parsed.port ? Number(parsed.port) : 6379,
            };

            if (parsed.username) connection.username = parsed.username;
            if (parsed.password) connection.password = parsed.password;
            if (parsed.protocol === 'rediss:') connection.tls = {};

            return { connection };
          } catch {
            throw new Error('REDIS_URL is invalid. Expected format: redis(s)://user:password@host:port');
          }
        }

        const connection: any = {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        };

        const password = config.get<string>('REDIS_PASSWORD');
        if (password) connection.password = password;

        const tlsEnabled = isEnabled(config.get<string | boolean>('REDIS_TLS'));

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
