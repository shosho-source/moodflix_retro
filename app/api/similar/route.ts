import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchSimilarMovies } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function GET(request: NextRequest) {
  try {
    const idParam = request.nextUrl.searchParams.get("id");
    const typeParam = request.nextUrl.searchParams.get("type") === "tv" ? "tv" : "movie";

    if (!idParam) {
      return Response.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const tmdbId = parseInt(idParam, 10);
    if (isNaN(tmdbId)) {
      return Response.json({ error: "Invalid id parameter" }, { status: 400 });
    }

    // Only movies are in our vector DB right now
    if (typeParam === "movie") {
      // 2. Query Supabase for that movie's pre-computed embedding
      const { data: sourceMovie } = await supabase
        .from('movies')
        .select('embedding')
        .eq('id', tmdbId)
        .single();

      if (sourceMovie && sourceMovie.embedding) {
        // 3. Primary Path: pass embedding to match_movies RPC
        const { data: matchedMovies, error } = await supabase.rpc('match_movies', {
          query_embedding: sourceMovie.embedding,
          match_threshold: 0.65, // Use strict threshold so we don't get randoms
          match_count: 15,
          exclude_id: tmdbId
        });

        if (!error && matchedMovies && matchedMovies.length > 2) {
          // Adapt to frontend movie interface expectations
          interface DBRecord { id: number; title: string; overview: string; poster_path: string | null; vote_average: number; genres?: string[]; release_year?: number | null; [key: string]: unknown; }
          const formattedResults = matchedMovies.map((m: DBRecord) => ({
            ...m,
            tmdbId: m.id,
            id: `tmdb-${m.id}`,
            year: m.release_year,
            voteAverage: m.vote_average,
            posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
            blurb: m.overview
          }));

          return Response.json({ results: formattedResults });
        }
      }
    }

    // 4. Fallback Path: Fetch recommendations from TMDB
    console.log("Vector match not found, falling back to TMDB similar...");
    const movies = await fetchSimilarMovies(tmdbId, typeParam);
    return Response.json({ results: movies });

  } catch (error) {
    console.error("API /similar error:", error);
    return Response.json({ error: "Failed to fetch similar movies" }, { status: 500 });
  }
}
