-- enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- create table
CREATE TABLE document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  content TEXT,
  embedding VECTOR(1536),
  token_length INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- index
CREATE INDEX document_chunks_embedding_idx
ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);