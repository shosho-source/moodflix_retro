import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const TMDB_API_KEY = process.env.TMDB_API_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Fallback background TMDB enrichment helper
async function enrichAndSaveFromTMDB(tmdbMovie: any) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbMovie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`);
    const detail = await res.json();
    
    const genres = detail.genres?.map((g: any) => g.name) || [];
    const director = detail.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'Unknown';
    const releaseYear = detail.release_date ? parseInt(detail.release_date.split('-')[0]) : null;

    const vibeString = `Title: ${detail.title}. Year: ${releaseYear}. Genres: ${genres.join(', ')}. Director: ${director}. Overview: ${detail.overview}`;
    
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const embedResult = await model.embedContent(vibeString);
    
    await supabase.from('movies').upsert({
      id: detail.id,
      title: detail.title,
      overview: detail.overview,
      poster_path: detail.poster_path,
      genres: genres,
      director: director,
      release_year: releaseYear,
      vote_average: detail.vote_average,
      vote_count: detail.vote_count,
      embedding: embedResult.embedding.values
    });
  } catch (error) {
    console.error("Background auto-expansion failed:", error);
  }
}

// Format the quiz answers into a natural language prompt
function formatQuizPrompt(answers: any): string {
  const parts = [];
  if (answers.occasion && answers.occasion !== "none") parts.push(`A movie for ${answers.occasion}.`);
  if (answers.mood && answers.mood !== "none") parts.push(`Mood: ${answers.mood}.`);
  if (answers.genres && answers.genres.length > 0) parts.push(`Genres: ${answers.genres.join(", ")}.`);
  if (answers.recency && answers.recency !== "any") parts.push(`Era: Last ${answers.recency} years.`);
  if (answers.ratingsMatter && answers.ratings && answers.ratings.length > 0) {
    parts.push(`Rating: ${answers.ratings.join(" or ")}.`);
  }
  return parts.join(" ");
}

// B. Search Bar Request (Hybrid Text Match)
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return Response.json({ results: [] });
  }

  try {
    // 1. Local Search: Query Supabase using PostgreSQL pattern matching
    const { data: localMovies, error } = await supabase
      .from('movies')
      .select('*')
      .or(`title.ilike.%${query}%,director.ilike.%${query}%`)
      .limit(15);
      
    if (error) throw error;

    let results = localMovies || [];

    // 2. TMDB Live Fallback
    if (results.length < 3) {
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`);
      const tmdbData = await res.json();
      
      const tmdbResults = (tmdbData.results || []).filter((m: any) => m.poster_path && m.overview && m.vote_count > 5).slice(0, 5);
      
      for (const tmdbMovie of tmdbResults) {
        if (!results.find(r => r.id === tmdbMovie.id)) {
          // Format basic properties to match what the frontend expects
          results.push({
            id: tmdbMovie.id,
            title: tmdbMovie.title,
            overview: tmdbMovie.overview,
            poster_path: tmdbMovie.poster_path,
            release_year: tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.split('-')[0]) : null,
            vote_average: tmdbMovie.vote_average
          });
          
          // 3. Background Database Auto-Expansion
          enrichAndSaveFromTMDB(tmdbMovie); // Don't await, run in background
        }
      }
    }

    // Adapt to frontend movie interface expectations
    const formattedResults = results.map(m => ({
      ...m,
      tmdbId: m.id,
      id: `tmdb-${m.id}`,
      year: m.release_year,
      posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      blurb: m.overview
    }));

    return Response.json({ results: formattedResults });
  } catch (error) {
    console.error("Hybrid text search failed:", error);
    return Response.json({ results: [], error: "Search failed" }, { status: 500 });
  }
}

// A. Quiz Recommendation Request (Vector Match)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = formatQuizPrompt(body);
    
    if (!prompt) {
      return Response.json({ results: [] });
    }

    // 2. Use Gemini to generate a vector for the prompt
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const embedResult = await model.embedContent(prompt);
    const queryVector = embedResult.embedding.values;

    // 3. Call Supabase RPC match_movies
    const { data: matchedMovies, error } = await supabase.rpc('match_movies', {
      query_embedding: queryVector,
      match_threshold: 0.0,
      match_count: 15
    });

    if (error) throw error;

    // Adapt to frontend movie interface expectations
    const formattedResults = (matchedMovies || []).map((m: any) => ({
      ...m,
      tmdbId: m.id,
      id: `tmdb-${m.id}`,
      year: m.release_year,
      posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      blurb: m.overview
    }));

    return Response.json({ results: formattedResults });
  } catch (error) {
    console.error("Vector match failed:", error);
    return Response.json({ results: [], error: "Recommendation failed" }, { status: 500 });
  }
}
