import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DocumentChunk } from './entities/document-chunk.entity';
import { Document } from '../documents/entities/document.entity';
import { IngestionService } from './ingestion.service';
import { IngestionProcessor } from './ingestion.processor';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentChunk, Document]),
    BullModule.registerQueue({ name: 'document-ingestion' }),
    AiModule,
  ],
  providers: [IngestionService, IngestionProcessor],
  exports: [IngestionService],
})
export class IngestionModule {}
