-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create movies table
CREATE TABLE IF NOT EXISTS movies (
  id INT PRIMARY KEY, -- TMDB Movie ID
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  genres TEXT[] DEFAULT '{}',
  director TEXT,
  release_year INT,
  vote_average FLOAT,
  vote_count INT,
  embedding vector(768),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create HNSW vector index for cosine similarity search
CREATE INDEX IF NOT EXISTS movies_embedding_hnsw_idx 
ON movies 
USING hnsw (embedding vector_cosine_ops);

-- 4. Create Postgres RPC function for semantic matching
CREATE OR REPLACE FUNCTION match_movies(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.0,
  match_count INT DEFAULT 15,
  exclude_id INT DEFAULT NULL
)
RETURNS TABLE (
  id INT,
  title TEXT,
  overview TEXT,
  poster_path TEXT,
  genres TEXT[],
  director TEXT,
  release_year INT,
  vote_average FLOAT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$ BEGIN   RETURN QUERY   SELECT     m.id,     m.title,     m.overview,     m.poster_path,     m.genres,     m.director,     m.release_year,     m.vote_average,     (1 - (m.embedding <=> query_embedding))::FLOAT AS similarity   FROM movies m   WHERE m.embedding IS NOT NULL     AND (exclude_id IS NULL OR m.id != exclude_id)     AND (1 - (m.embedding <=> query_embedding)) >= match_threshold   ORDER BY m.embedding <=> query_embedding ASC   LIMIT match_count; END; $$;
