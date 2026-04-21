import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { DocumentChunk } from './entities/document-chunk.entity';
import { Document, DocumentStatus } from '../documents/entities/document.entity';
import { IngestionService } from './ingestion.service';
import { AiService } from '../ai/ai.service';
import { SupabaseStorageService } from '../common/supabase.service';

interface IngestionJobData {
  documentId: string;
  filePath: string;
  mimeType: string;
  originalName: string;
  fileSize?: number;
  preferredSheet?: string;
  isSupabase?: boolean;
}

@Processor('document-ingestion', {
  concurrency: 2,
})
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);
  private readonly jobTimeoutMs: number;
  private readonly insertBatchSize: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly ingestionService: IngestionService,
    private readonly aiService: AiService,
    private readonly dataSource: DataSource,
    @InjectRepository(Document)
    private readonly documentsRepo: Repository<Document>,
    @InjectRepository(DocumentChunk)
    private readonly chunksRepo: Repository<DocumentChunk>,
    private readonly supabase: SupabaseStorageService,
  ) {
    super();

    const timeoutRaw = Number(
      this.configService.get<string>('INGESTION_JOB_TIMEOUT_MS', '600000'),
    );
    this.jobTimeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0
      ? timeoutRaw
      : 600000;

    const batchRaw = Number(
      this.configService.get<string>('INGESTION_INSERT_BATCH_SIZE', '100'),
    );
    this.insertBatchSize = Number.isFinite(batchRaw) && batchRaw > 0
      ? Math.floor(batchRaw)
      : 100;
  }

  private ensureWithinTimeout(startedAt: number, stage: string): void {
    const elapsed = Date.now() - startedAt;
    if (elapsed <= this.jobTimeoutMs) {
      return;
    }

    throw new Error(
      `Ingestion timeout after ${Math.floor(this.jobTimeoutMs / 1000)}s while ${stage}`,
    );
  }

  private memorySnapshot(label: string): void {
    const mem = process.memoryUsage();
    const toMb = (value: number) => (value / (1024 * 1024)).toFixed(1);
    this.logger.log(
      `📊 Memory[${label}] rss=${toMb(mem.rss)}MB heapUsed=${toMb(mem.heapUsed)}MB heapTotal=${toMb(mem.heapTotal)}MB`,
    );
  }

  async process(job: Job<IngestionJobData>): Promise<void> {
    const {
      documentId,
      filePath,
      mimeType,
      originalName,
      fileSize,
      preferredSheet,
      isSupabase,
    } = job.data;
    const startedAt = Date.now();
    const sizeMb =
      typeof fileSize === 'number'
        ? (fileSize / (1024 * 1024)).toFixed(2)
        : 'unknown';

    this.logger.log(
      `🔄 Processing document: ${originalName} (${documentId}) sizeMB=${sizeMb}${preferredSheet ? ` sheet=${preferredSheet}` : ''}`,
    );
    this.memorySnapshot('start');

    let tempFilePath = filePath;

    try {
      this.ensureWithinTimeout(startedAt, 'updating status to PROCESSING');
      await this.documentsRepo.update(documentId, {
        status: DocumentStatus.PROCESSING,
      });

      await job.updateProgress(10);

      if (isSupabase) {
        this.ensureWithinTimeout(startedAt, 'downloading file from Supabase');
        const buffer = await this.supabase.downloadFile(filePath);
        const ext = path.extname(filePath);
        tempFilePath = path.join('uploads', `${documentId}${ext}`);
        fs.writeFileSync(tempFilePath, buffer);
      }

      this.ensureWithinTimeout(startedAt, 'extracting text');
      const text = await this.ingestionService.extractText(tempFilePath, mimeType, {
        preferredSheet,
      });

      if (!text || text.trim().length === 0) {
        throw new Error('No se pudo extraer texto del documento');
      }

      this.logger.log(`📝 Extracted ${text.length} characters from ${originalName}`);
      this.memorySnapshot('after-extract');

      // ── 3. Split into chunks ───────────────────────
      this.ensureWithinTimeout(startedAt, 'splitting text into chunks');
      await job.updateProgress(30);
      const chunks = this.ingestionService.splitIntoChunks(text);
      this.logger.log(`✂️ Split into ${chunks.length} chunks`);

      // ── 4. Generate embeddings in batches ──────────
      this.ensureWithinTimeout(startedAt, 'generating embeddings');
      await job.updateProgress(50);
      const BATCH_SIZE = 10;
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        this.ensureWithinTimeout(startedAt, 'generating embeddings');
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const embeddings = await this.aiService.generateEmbeddings(batch);
        allEmbeddings.push(...embeddings);

        const progress = 50 + Math.floor((i / chunks.length) * 40);
        await job.updateProgress(progress);
      }

      this.logger.log(`🧮 Generated ${allEmbeddings.length} embeddings`);
      this.memorySnapshot('after-embeddings');

      if (allEmbeddings.length !== chunks.length) {
        throw new Error(
          `Mismatch generating embeddings. chunks=${chunks.length}, embeddings=${allEmbeddings.length}`,
        );
      }

      // ── 5. Store chunks + embeddings using raw SQL ─
      this.ensureWithinTimeout(startedAt, 'persisting chunks and embeddings');
      await job.updateProgress(90);
      await this.storeChunksWithEmbeddings(
        documentId,
        chunks,
        allEmbeddings,
        originalName,
        startedAt,
      );
      this.memorySnapshot('after-persist');

      // ── 6. Mark as COMPLETED ───────────────────────
      this.ensureWithinTimeout(startedAt, 'marking document as completed');
      await this.documentsRepo.update(documentId, {
        status: DocumentStatus.COMPLETED,
        totalChunks: chunks.length,
      });

      await job.updateProgress(100);
      const durationMs = Date.now() - startedAt;
      this.logger.log(`✅ Document processed successfully: ${originalName} (${chunks.length} chunks)`);
      this.logger.log(
        `📈 Ingestion metrics doc=${documentId} fileMB=${sizeMb} chars=${text.length} chunks=${chunks.length} durationMs=${durationMs}`,
      );

    } catch (error: any) {
      this.logger.error(`❌ Failed to process document ${originalName}: ${error.message}`);

      await this.documentsRepo.update(documentId, {
        status: DocumentStatus.FAILED,
        errorMessage: error.message,
      });

      throw error;
    } finally {
      if (isSupabase && tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
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
    startedAt: number,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let offset = 0; offset < chunks.length; offset += this.insertBatchSize) {
        this.ensureWithinTimeout(startedAt, 'storing chunk batches');

        const end = Math.min(offset + this.insertBatchSize, chunks.length);
        const values: string[] = [];
        const params: Array<string | number> = [];

        for (let i = offset; i < end; i++) {
          const vectorStr = `[${embeddings[i].join(',')}]`;
          const base = params.length;
          values.push(
            `(gen_random_uuid(), $${base + 1}, $${base + 2}, $${base + 3}::jsonb, $${base + 4}, $${base + 5}::vector)`,
          );
          params.push(
            chunks[i],
            i,
            JSON.stringify({ source: sourceName, chunkIndex: i }),
            documentId,
            vectorStr,
          );
        }

        await queryRunner.query(
          `INSERT INTO document_chunks (id, content, chunk_index, metadata, document_id, embedding)
           VALUES ${values.join(', ')}`,
          params,
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
