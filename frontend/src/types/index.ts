/* ─── Auth ─────────────────────────────────────────── */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
}

export interface User {
  id: string;
  email: string;
}

/* ─── Documents ────────────────────────────────────── */
export type DocumentStatus = "pending" | "processing" | "completed" | "failed";

export interface Document {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
  chunksCount?: number;
  totalChunks?: number;
  errorMessage?: string | null;
}

export interface ExtractedSignals {
  emails: string[];
  dates: string[];
  amounts: string[];
  references: string[];
}

export interface ExtractedPreviewChunk {
  chunkIndex: number;
  content: string;
  metadata?: Record<string, unknown> | null;
}

export interface DocumentExtractedInfo {
  documentId: string;
  status: string;
  totalChunks: number;
  stats: {
    characters: number;
    words: number;
    lines: number;
  };
  signals: ExtractedSignals;
  previewChunks: ExtractedPreviewChunk[];
}

export interface UploadResponse {
  id: string;
  originalName: string;
  status: string;
  message: string;
}

/* ─── RAG ──────────────────────────────────────────── */
export interface Source {
  documentId: string;
  documentName: string;
  chunkContent: string;
  chunkIndex: number;
  similarity: number;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
  processingTime: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  processingTime?: number;
  timestamp: Date;
}

/* ─── Health ───────────────────────────────────────── */
export interface HealthStatus {
  status: string;
  uptime: number;
  timestamp: string;
}
