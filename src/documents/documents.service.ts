import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Document, DocumentStatus } from './entities/document.entity';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentsRepo: Repository<Document>,
    @InjectQueue('document-ingestion')
    private readonly ingestionQueue: Queue,
  ) {}

  async upload(
    file: Express.Multer.File,
    userId: string,
  ): Promise<Document> {
    // Create document record
    const document = this.documentsRepo.create({
      originalName: file.originalname,
      mimeType: file.mimetype,
      filePath: file.path,
      size: file.size,
      status: DocumentStatus.PENDING,
      userId,
    });

    const saved = await this.documentsRepo.save(document);
    this.logger.log(`📄 Document uploaded: ${saved.originalName} (${saved.id})`);

    // Enqueue ingestion job
    await this.ingestionQueue.add(
      'process-document',
      {
        documentId: saved.id,
        filePath: saved.filePath,
        mimeType: saved.mimeType,
        originalName: saved.originalName,
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

    // Delete will cascade to chunks due to DB relation
    await this.documentsRepo.remove(document);
    this.logger.log(`🗑️ Document deleted: ${document.originalName} (${id})`);
  }
}
