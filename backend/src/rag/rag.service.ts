import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly aiService: AiService,
  ) {}

  async query(question: string, userId: string): Promise<RagResponse> {
    const startTime = Date.now();

    // ── 1. Embed the question ────────────────────────
    this.logger.log(`🔍 RAG query: "${question}"`);
    const queryEmbedding = await this.aiService.generateEmbedding(question);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    // ── 2. Semantic search with pgvector ─────────────
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
       ORDER BY dc.embedding <=> $1::vector
       LIMIT 5`,
      [vectorStr, userId],
    );

    // ── 3. Filter by similarity threshold ────────────
    const relevantResults = results.filter((r) => r.similarity > 0.15);

    if (relevantResults.length === 0) {
      return {
        answer:
          'No encontré información relevante en tus documentos para responder esta pregunta. Asegúrate de haber subido documentos relacionados con el tema.',
        sources: [],
        processingTime: Date.now() - startTime,
      };
    }

    this.logger.log(
      `📊 Found ${relevantResults.length} relevant chunks (best similarity: ${relevantResults[0].similarity.toFixed(3)})`,
    );

    // ── 4. Build context from retrieved chunks ───────
    const context = relevantResults
      .map(
        (r, i) =>
          `[Fuente ${i + 1}: ${r.document_name}, fragmento ${r.chunk_index + 1}]\n${r.content}`,
      )
      .join('\n\n---\n\n');

    // ── 5. Generate answer with LLM ──────────────────
    const answer = await this.aiService.chat(question, context);

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
