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

        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'raguser'),
          password: config.get<string>('DB_PASSWORD', 'ragpassword123'),
          database: config.get<string>('DB_NAME', 'ragdb'),
          autoLoadEntities: true,
          synchronize,
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
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
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
