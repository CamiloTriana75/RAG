import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AiService } from '../ai/ai.service';

interface SearchResult {
  id: string;
  content: string;
  chunk_index: number;
  metadata: Record<string, any>;
  document_id: string;
  document_name: string;
  similarity: number;
}

export interface RagResponse {
  answer: string;
  sources: {
    documentId: string;
    documentName: string;
    chunkContent: string;
    chunkIndex: number;
    similarity: number;
  }[];
  processingTime: number;
}

interface RagQueryOptions {
  documentIds?: string[];
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly topK: number;
  private readonly minSimilarity: number;
  private readonly forceSmartModel: boolean;

  constructor(
    private readonly dataSource: DataSource,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) {
    const topKRaw = Number(this.configService.get<string>('RAG_TOP_K', '8'));
    const minSimilarityRaw = Number(
      this.configService.get<string>('RAG_MIN_SIMILARITY', '0.15'),
    );

    this.topK = Number.isFinite(topKRaw)
      ? this.clampNumber(Math.floor(topKRaw), 3, 20)
      : 8;
    this.minSimilarity = Number.isFinite(minSimilarityRaw)
      ? this.clampNumber(minSimilarityRaw, 0.05, 0.95)
      : 0.15;
    this.forceSmartModel = this.isEnabled(
      this.configService.get<string>('RAG_FORCE_SMART_MODEL', 'false'),
    );
  }

  private isEnabled(value: string | boolean | undefined): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
    }
    return false;
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  async query(
    question: string,
    userId: string,
    options: RagQueryOptions = {},
  ): Promise<RagResponse> {
    const startTime = Date.now();

    // ── 1. Embed the question ────────────────────────
    this.logger.log(`🔍 RAG query: "${question}"`);
    const queryEmbedding = await this.aiService.generateEmbedding(question);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    // ── 2. Semantic search with pgvector ─────────────
    const scopedDocumentIds = Array.isArray(options.documentIds)
      ? Array.from(new Set(options.documentIds.filter(Boolean)))
      : [];

    const docFilterSql =
      scopedDocumentIds.length > 0
        ? 'AND d.id = ANY($3::uuid[])'
        : '';

    const queryParams: unknown[] = [vectorStr, userId];
    if (scopedDocumentIds.length > 0) {
      queryParams.push(scopedDocumentIds);
    }
    queryParams.push(this.topK);
    const limitParam = scopedDocumentIds.length > 0 ? '$4' : '$3';

    const results: SearchResult[] = await this.dataSource.query(
      `SELECT
         dc.id,
         dc.content,
         dc.chunk_index,
         dc.metadata,
         dc.document_id,
         d.original_name AS document_name,
         1 - (dc.embedding <=> $1::vector) AS similarity
       FROM document_chunks dc
       JOIN documents d ON dc.document_id = d.id
       WHERE d.user_id = $2
         AND d.status = 'COMPLETED'
         ${docFilterSql}
       ORDER BY dc.embedding <=> $1::vector
       LIMIT ${limitParam}`,
      queryParams,
    );

    // ── 3. Filter by similarity threshold ────────────
    const relevantResults = results.filter(
      (r) => r.similarity > this.minSimilarity,
    );

    if (relevantResults.length === 0) {
      return {
        answer:
          'No encontré información relevante en tus documentos para responder esta pregunta. Asegúrate de haber subido documentos relacionados con el tema.',
        sources: [],
        processingTime: Date.now() - startTime,
      };
    }

    this.logger.log(
      `📊 Found ${relevantResults.length} relevant chunks (best similarity: ${relevantResults[0].similarity.toFixed(3)}, topK=${this.topK}, minSim=${this.minSimilarity})`,
    );

    // ── 4. Build context from retrieved chunks ───────
    const context = relevantResults
      .map(
        (r, i) =>
          `[Fuente ${i + 1}: ${r.document_name}, fragmento ${r.chunk_index + 1}]\n${r.content}`,
      )
      .join('\n\n---\n\n');

    // ── 5. Generate answer with LLM ──────────────────
    const bestSimilarity = relevantResults[0]?.similarity ?? 0;
    const preferSmartModel =
      this.forceSmartModel ||
      bestSimilarity < Math.max(this.minSimilarity + 0.08, 0.25) ||
      question.length > 280;

    const answer = await this.aiService.chat(question, context, {
      preferSmartModel,
    });

    // ── 6. Build response with sources ───────────────
    const sources = relevantResults.map((r) => ({
      documentId: r.document_id,
      documentName: r.document_name,
      chunkContent:
        r.content.length > 200
          ? r.content.substring(0, 200) + '...'
          : r.content,
      chunkIndex: r.chunk_index,
      similarity: Math.round(r.similarity * 1000) / 1000,
    }));

    const processingTime = Date.now() - startTime;
    this.logger.log(`✅ RAG response generated in ${processingTime}ms`);

    return { answer, sources, processingTime };
  }
}
