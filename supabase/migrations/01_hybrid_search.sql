-- 1. Enable the trigram extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Drop the old RPC if it exists to avoid parameter conflicts
DROP FUNCTION IF EXISTS hybrid_search_movies;

-- 3. Create the new Hybrid Search RPC
CREATE OR REPLACE FUNCTION hybrid_search_movies(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  match_count int DEFAULT 15
) RETURNS TABLE (
  id int,
  title text,
  overview text,
  poster_path text,
  release_year int,
  vote_average float,
  genres text[],
  similarity_score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    movies.id,
    movies.title,
    movies.overview,
    movies.poster_path,
    movies.release_year,
    movies.vote_average,
    movies.genres,
    -- Hybrid scoring formula: 
    -- 1. Fuzzy Text Match (similarity) 
    -- 2. AI Vector Match (1 - cosine distance) if embedding provided
    -- 3. Popularity boost (log of vote count)
    (
      GREATEST(similarity(movies.title, query_text), similarity(movies.director, query_text)) * 1.5 + 
      (CASE WHEN query_embedding IS NOT NULL THEN (1 - (movies.embedding <=> query_embedding)) * 1.0 ELSE 0 END) +
      (log(GREATEST(movies.vote_count, 1)) * 0.1)
    )::float AS similarity_score
  FROM movies
  WHERE 
    -- Filter matches: must have at least some fuzzy text match OR some vector match
    similarity(movies.title, query_text) > 0.15 
    OR similarity(movies.director, query_text) > 0.15
    OR (query_embedding IS NOT NULL AND 1 - (movies.embedding <=> query_embedding) > 0.4)
  ORDER BY similarity_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
