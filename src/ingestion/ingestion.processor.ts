import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Job } from 'bullmq';
import { DocumentChunk } from './entities/document-chunk.entity';
import { Document, DocumentStatus } from '../documents/entities/document.entity';
import { IngestionService } from './ingestion.service';
import { AiService } from '../ai/ai.service';

interface IngestionJobData {
  documentId: string;
  filePath: string;
  mimeType: string;
  originalName: string;
}

@Processor('document-ingestion', {
  concurrency: 2,
})
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private readonly ingestionService: IngestionService,
    private readonly aiService: AiService,
    private readonly dataSource: DataSource,
    @InjectRepository(Document)
    private readonly documentsRepo: Repository<Document>,
    @InjectRepository(DocumentChunk)
    private readonly chunksRepo: Repository<DocumentChunk>,
  ) {
    super();
  }

  async process(job: Job<IngestionJobData>): Promise<void> {
    const { documentId, filePath, mimeType, originalName } = job.data;
    this.logger.log(`🔄 Processing document: ${originalName} (${documentId})`);

    try {
      // ── 1. Mark as PROCESSING ──────────────────────
      await this.documentsRepo.update(documentId, {
        status: DocumentStatus.PROCESSING,
      });

      // ── 2. Extract text ────────────────────────────
      await job.updateProgress(10);
      const text = await this.ingestionService.extractText(filePath, mimeType);

      if (!text || text.trim().length === 0) {
        throw new Error('No se pudo extraer texto del documento');
      }

      this.logger.log(`📝 Extracted ${text.length} characters from ${originalName}`);

      // ── 3. Split into chunks ───────────────────────
      await job.updateProgress(30);
      const chunks = this.ingestionService.splitIntoChunks(text);
      this.logger.log(`✂️ Split into ${chunks.length} chunks`);

      // ── 4. Generate embeddings in batches ──────────
      await job.updateProgress(50);
      const BATCH_SIZE = 10;
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const embeddings = await this.aiService.generateEmbeddings(batch);
        allEmbeddings.push(...embeddings);

        const progress = 50 + Math.floor((i / chunks.length) * 40);
        await job.updateProgress(progress);
      }

      this.logger.log(`🧮 Generated ${allEmbeddings.length} embeddings`);

      // ── 5. Store chunks + embeddings using raw SQL ─
      await job.updateProgress(90);
      await this.storeChunksWithEmbeddings(
        documentId,
        chunks,
        allEmbeddings,
        originalName,
      );

      // ── 6. Mark as COMPLETED ───────────────────────
      await this.documentsRepo.update(documentId, {
        status: DocumentStatus.COMPLETED,
        totalChunks: chunks.length,
      });

      await job.updateProgress(100);
      this.logger.log(`✅ Document processed successfully: ${originalName} (${chunks.length} chunks)`);

    } catch (error: any) {
      this.logger.error(`❌ Failed to process document ${originalName}: ${error.message}`);

      await this.documentsRepo.update(documentId, {
        status: DocumentStatus.FAILED,
        errorMessage: error.message,
      });

      throw error; // Re-throw for BullMQ retry logic
    }
  }

  /**
   * Store chunks with vector embeddings using raw SQL
   * because TypeORM doesn't support the vector type natively
   */
  private async storeChunksWithEmbeddings(
    documentId: string,
    chunks: string[],
    embeddings: number[][],
    sourceName: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < chunks.length; i++) {
        const vectorStr = `[${embeddings[i].join(',')}]`;

        await queryRunner.query(
          `INSERT INTO document_chunks (id, content, chunk_index, metadata, document_id, embedding)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::vector)`,
          [
            chunks[i],
            i,
            JSON.stringify({ source: sourceName, chunkIndex: i }),
            documentId,
            vectorStr,
          ],
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
