-- enable extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- create table
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT,
  content TEXT,
  embedding VECTOR(768),
  chunk_index INT,
  token_length INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- index
CREATE INDEX document_chunks_embedding_idx
ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

