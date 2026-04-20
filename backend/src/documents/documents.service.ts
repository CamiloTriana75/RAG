import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Document, DocumentStatus } from './entities/document.entity';
import { SupabaseStorageService } from '../common/supabase.service';

export interface ExtractedInfoResponse {
  documentId: string;
  status: DocumentStatus;
  totalChunks: number;
  stats: {
    characters: number;
    words: number;
    lines: number;
  };
  signals: {
    emails: string[];
    dates: string[];
    amounts: string[];
    references: string[];
  };
  previewChunks: Array<{
    chunkIndex: number;
    content: string;
    metadata: Record<string, any> | null;
  }>;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentsRepo: Repository<Document>,
    @InjectQueue('document-ingestion')
    private readonly ingestionQueue: Queue,
    private readonly dataSource: DataSource,
    private readonly supabase: SupabaseStorageService,
  ) {}

  async upload(
    file: Express.Multer.File,
    userId: string,
  ): Promise<Document> {
    this.logger.log(`📥 Upload request - file: ${file.originalname}, size: ${file.size}, hasBuffer: ${!!file.buffer}`);

    let filePath: string;
    let fileUrl: string | undefined;

    if (this.supabase.isConfigured()) {
      this.logger.log(`☁️ Uploading to Supabase...`);
      const uploadResult = await this.supabase.uploadFile(file, userId);
      filePath = uploadResult.filePath;
      fileUrl = uploadResult.url;
      this.logger.log(`✅ Uploaded to Supabase: ${filePath}`);
    } else {
      this.logger.warn(`💾 Supabase not configured, using local storage: ${file.path}`);
      filePath = file.path;
    }

    const document = this.documentsRepo.create({
      originalName: file.originalname,
      mimeType: file.mimetype,
      filePath,
      fileUrl,
      size: file.size,
      status: DocumentStatus.PENDING,
      userId,
    });

    const saved = await this.documentsRepo.save(document);
    this.logger.log(`📄 Document uploaded: ${saved.originalName} (${saved.id})`);

    await this.ingestionQueue.add(
      'process-document',
      {
        documentId: saved.id,
        filePath: saved.filePath,
        mimeType: saved.mimeType,
        originalName: saved.originalName,
        isSupabase: this.supabase.isConfigured(),
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    this.logger.log(`📨 Ingestion job enqueued for document: ${saved.id}`);
    return saved;
  }

  async findAllByUser(userId: string): Promise<Document[]> {
    return this.documentsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'originalName',
        'mimeType',
        'size',
        'status',
        'totalChunks',
        'errorMessage',
        'createdAt',
      ],
    });
  }

  async findOneByUser(id: string, userId: string): Promise<Document> {
    const document = await this.documentsRepo.findOne({
      where: { id, userId },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    return document;
  }

  async deleteByUser(id: string, userId: string): Promise<void> {
    const document = await this.documentsRepo.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    if (document.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar este documento');
    }

    if (this.supabase.isConfigured() && document.filePath) {
      try {
        await this.supabase.deleteFile(document.filePath);
      } catch (error) {
        this.logger.warn(`Could not delete file from Supabase: ${error}`);
      }
    }

    await this.documentsRepo.remove(document);
    this.logger.log(`🗑️ Document deleted: ${document.originalName} (${id})`);
  }

  async getExtractedInfoByUser(
    id: string,
    userId: string,
  ): Promise<ExtractedInfoResponse> {
    const document = await this.findOneByUser(id, userId);

    const rows: Array<{
      chunk_index: number;
      content: string;
      metadata: Record<string, any> | null;
    }> = await this.dataSource.query(
      `SELECT chunk_index, content, metadata
       FROM document_chunks
       WHERE document_id = $1
       ORDER BY chunk_index ASC
       LIMIT 12`,
      [id],
    );

    const combinedText = rows.map((row) => row.content).join('\n');
    const words = combinedText
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean).length;
    const lines = combinedText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean).length;

    return {
      documentId: document.id,
      status: document.status,
      totalChunks: document.totalChunks,
      stats: {
        characters: combinedText.length,
        words,
        lines,
      },
      signals: this.extractSignals(combinedText),
      previewChunks: rows.slice(0, 6).map((row) => ({
        chunkIndex: row.chunk_index,
        content:
          row.content.length > 420
            ? `${row.content.substring(0, 420)}...`
            : row.content,
        metadata: row.metadata ?? null,
      })),
    };
  }

  private extractSignals(text: string): {
    emails: string[];
    dates: string[];
    amounts: string[];
    references: string[];
  } {
    const collect = (regexp: RegExp, max = 8): string[] => {
      const found = text.match(regexp) ?? [];
      return Array.from(new Set(found.map((item) => item.trim()))).slice(0, max);
    };

    return {
      emails: collect(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, 6),
      dates: collect(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g, 8),
      amounts: collect(/(?:USD|EUR|COP|\$)\s?\d[\d.,]*/gi, 8),
      references: collect(/\b(?:factura|contrato|orden|pedido|cliente|proveedor)\b/gi, 8),
    };
  }
}
