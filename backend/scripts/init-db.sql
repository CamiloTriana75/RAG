-- ============================================
-- RAG Backend — Database Initialization
-- Run this AFTER the tables are created by TypeORM
-- ============================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add the embedding column (vector type not supported by TypeORM)
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Create HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Index for filtering by document_id
CREATE INDEX IF NOT EXISTS idx_chunks_document_id
  ON document_chunks (document_id);

-- Index for filtering by user_id on documents
CREATE INDEX IF NOT EXISTS idx_documents_user_id
  ON documents (user_id);
