-- ============================================
-- RAG Backend - Database Initialization
-- Safe to run on a blank Supabase/Postgres database.
-- ============================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enum used by the documents table
DO $$
BEGIN
  CREATE TYPE document_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name text NOT NULL,
  mime_type text NOT NULL,
  file_path text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  status document_status NOT NULL DEFAULT 'PENDING',
  total_chunks integer NOT NULL DEFAULT 0,
  error_message text,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Document chunks
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  chunk_index integer NOT NULL,
  metadata jsonb,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  embedding vector(384)
);

-- Indexes used by the API
CREATE INDEX IF NOT EXISTS idx_chunks_document_id
  ON document_chunks (document_id);

CREATE INDEX IF NOT EXISTS idx_documents_user_id
  ON documents (user_id);

DO $$
BEGIN
  BEGIN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops)';
  EXCEPTION
    WHEN undefined_object OR feature_not_supported THEN
      RAISE NOTICE 'HNSW not available, creating ivfflat index instead';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_chunks_embedding_ivf ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
  END;
END $$;
