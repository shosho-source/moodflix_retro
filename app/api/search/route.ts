import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CATEGORY_KEYWORD_MAP } from "@/lib/tmdb";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const TMDB_API_KEY = process.env.TMDB_API_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Fallback background TMDB enrichment helper
async function enrichAndSaveFromTMDB(tmdbMovie: { id: number; title: string; overview: string; poster_path: string | null; vote_average: number; vote_count: number; release_date?: string }) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbMovie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`);
    const detail = await res.json();
    
    const genres = detail.genres?.map((g: { name: string }) => g.name) || [];
    const director = detail.credits?.crew?.find((c: { job: string; name: string }) => c.job === 'Director')?.name || 'Unknown';
    const releaseYear = detail.release_date ? parseInt(detail.release_date.split('-')[0]) : null;

    const vibeString = `Title: ${detail.title}. Year: ${releaseYear}. Genres: ${genres.join(', ')}. Director: ${director}. Overview: ${detail.overview}`;
    
    let vector: number[] | null = null;
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const embedResult = await model.embedContent(vibeString);
      vector = embedResult.embedding.values.slice(0, 768);
    } catch (aiErr) {
      console.warn("Background AI embedding skipped (Quota/Network):", aiErr);
    }
    
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
      embedding: vector
    });
  } catch (error) {
    console.error("Background auto-expansion failed entirely:", error);
  }
}

// Format the quiz answers into a natural language prompt
function formatQuizPrompt(answers: { occasion?: string; mood?: string; genres?: string[]; recency?: string; category?: string; ratingsMatter?: boolean; ratings?: string[] }): string {
  const parts = [];
  if (answers.occasion && answers.occasion !== "none") parts.push(`A movie for ${answers.occasion}.`);
  if (answers.mood && answers.mood !== "none") parts.push(`Mood: ${answers.mood}.`);
  if (answers.genres && answers.genres.length > 0) parts.push(`Genres: ${answers.genres.join(", ")}.`);
  if (answers.recency && answers.recency !== "any") parts.push(`Era: Last ${answers.recency} years.`);
  if (answers.category && answers.category !== "none") parts.push(`Category: ${answers.category}.`);
  if (answers.ratingsMatter && answers.ratings && answers.ratings.length > 0) {
    parts.push(`Rating: ${answers.ratings.join(" or ")}.`);
  }
  return parts.join(" ");
}


interface DBRecord {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  release_year?: number | null;
  genres?: string[];
  [key: string]: unknown;
}

interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  [key: string]: unknown;
}

async function formatAndPrefetchMovie(m: DBRecord) {
  let trailerKey = null;
  let runtime = null;
  let providers: Provider[] = [];
  
  let genres = m.genres || [];
  
  let data = null;
  for (let i = 0; i < 3; i++) {
    try {
      const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${m.id}?api_key=${TMDB_API_KEY}&append_to_response=watch/providers,videos`);
      if (tmdbRes.ok) {
        data = await tmdbRes.json();
        break;
      } else if (tmdbRes.status === 429) {
        await new Promise(r => setTimeout(r, 600 * (i + 1))); // Backoff
      } else {
        break; // e.g., 404
      }
    } catch (err) {
      if (i === 2) {
         console.error(`Prefetch completely failed for movie ${m.id} after 3 retries:`, err);
      } else {
         await new Promise(r => setTimeout(r, 600 * (i + 1)));
      }
    }
  }
  
  if (data) {
    const usData = data['watch/providers']?.results?.US || {};
    const allUsProviders = [
      ...(usData.flatrate || []),
      ...(usData.free || []),
      ...(usData.ads || []),
      ...(usData.rent || []),
      ...(usData.buy || [])
    ];
    const uniqueProviders = [];
    const seen = new Set();
    for (const p of allUsProviders) {
      if (!seen.has(p.provider_id)) {
        seen.add(p.provider_id);
        uniqueProviders.push(p);
      }
    }
    providers = uniqueProviders;
    runtime = data.runtime || null;
    
    if (data.genres && data.genres.length > 0) {
      genres = data.genres.map((g: { name: string }) => g.name);
    }
    
    if (data.poster_path) {
      m.poster_path = data.poster_path;
    }
    
    const videos = data.videos?.results || [];
    const trailer = videos.find((v: { type: string; site: string; key: string }) => v.type === 'Trailer' && v.site === 'YouTube') 
                 || videos.find((v: { type: string; site: string; key: string }) => v.site === 'YouTube');
    trailerKey = trailer?.key || null;
  }

  return {
    ...m,
    tmdbId: m.id,
    id: `tmdb-${m.id}`,
    year: m.release_year,
    voteAverage: m.vote_average,
    posterPath: m.poster_path 
      ? (m.poster_path.startsWith('http') ? m.poster_path : `https://image.tmdb.org/t/p/w500${m.poster_path}`) 
      : null,
    blurb: m.overview,
    genres,
    trailerKey,
    runtime,
    providers
  };
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

    const results = localMovies || [];

    // 2. TMDB Live Fallback
    if (results.length < 3) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`);
        if (res.ok) {
          const tmdbData = await res.json();
          
          const tmdbResults = (tmdbData.results || []).filter((m: { poster_path: string | null; overview: string; vote_count: number }) => m.poster_path && m.overview && m.vote_count > 5).slice(0, 5);
          
          for (const tmdbMovie of tmdbResults) {
            if (!results.find(r => Number(r.id) === tmdbMovie.id)) {
              results.push({
                id: tmdbMovie.id,
                title: tmdbMovie.title,
                overview: tmdbMovie.overview,
                poster_path: tmdbMovie.poster_path,
                release_year: tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.split('-')[0]) : null,
                vote_average: tmdbMovie.vote_average,
                genres: []
              });
              
              enrichAndSaveFromTMDB(tmdbMovie); 
            }
          }
        }
      } catch (err) {
        console.error("TMDB search fallback failed, ignoring:", err);
      }
    }

    // Adapt to frontend movie interface expectations and prefetch details
    const formattedResults = await Promise.all(results.map(formatAndPrefetchMovie));

    return Response.json({ results: formattedResults });
  } catch (error) {
    console.error("Hybrid text search failed:", error);
    return Response.json({ results: [], error: "Search failed", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// A. Quiz Recommendation Request (Vector Match with Smart Fallback)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = formatQuizPrompt(body);
    
    if (!prompt) {
      return Response.json({ results: [] });
    }

    interface DBRecord { id: number; title: string; overview: string; poster_path: string | null; vote_average: number; genres?: string[]; release_year?: number | null; [key: string]: unknown; }
    let filteredMovies: DBRecord[] = [];
    
    if (body.category === "queer") {
      let dbQuery = supabase.from('movies').select('*')
        .or('overview.ilike.%gay%,overview.ilike.%lesbian%,overview.ilike.%queer%,overview.ilike.%lgbt%,overview.ilike.%transgender%,overview.ilike.%homosexual%');
        
      if (body.recency && body.recency !== "any") {
        const cutoff = new Date().getFullYear() - parseInt(body.recency, 10);
        dbQuery = dbQuery.gte('release_year', cutoff);
      }
      
      const { data: queerData } = await dbQuery
        .order('vote_average', { ascending: false })
        .limit(50);
        
      filteredMovies = (queerData || []).sort(() => 0.5 - Math.random());

    } else {
      try {
        // 1. Use Gemini to generate a vector for the prompt
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const embedResult = await model.embedContent(prompt);
      const queryVector = embedResult.embedding.values.slice(0, 768);

      // 2. Call Supabase RPC match_movies with higher count for post-filtering
      const { data: matchedMovies, error } = await supabase.rpc('match_movies', {
        query_embedding: queryVector,
        match_threshold: 0.0,
        match_count: 50
      });

      if (error) throw error;
      filteredMovies = matchedMovies || [];
    } catch (aiError) {
      console.warn("AI Vector search failed. Executing smart SQL fallback...", aiError);
      
      // Fallback Strategy: Map mood/occasion to implicit genres
      const targetGenres = new Set<string>();
      if (body.genres) body.genres.forEach((g: string) => targetGenres.add(g));
      
      if (body.mood === "happy") ["Comedy", "Family", "Animation", "Music", "Romance"].forEach(g => targetGenres.add(g));
      if (body.mood === "sad") ["Drama", "History", "War"].forEach(g => targetGenres.add(g));
      if (body.occasion === "date") ["Romance", "Comedy"].forEach(g => targetGenres.add(g));
      if (body.occasion === "family") ["Family", "Animation"].forEach(g => targetGenres.add(g));
      if (body.category === "anime") targetGenres.add("Animation");
      
      let dbQuery = supabase.from('movies').select('*');
      
      if (body.recency && body.recency !== "any") {
        const cutoff = new Date().getFullYear() - parseInt(body.recency, 10);
        dbQuery = dbQuery.gte('release_year', cutoff);
      }
      
      // Get a large pool of highly-rated movies to ensure variety
      const { data: fallbackData } = await dbQuery
        .gte('vote_average', 6.0)
        .order('vote_average', { ascending: false })
        .limit(100);
        
      const pool = fallbackData || [];
      
      // Sort by how many target genres match
      if (targetGenres.size > 0) {
        pool.sort((a, b) => {
          const aMatches = (a.genres || []).filter((g: string) => targetGenres.has(g)).length;
          const bMatches = (b.genres || []).filter((g: string) => targetGenres.has(g)).length;
          return bMatches - aMatches;
        });
      }
      
      // Take top 30 best matches, then shuffle them for variety
      filteredMovies = pool.slice(0, 30).sort(() => 0.5 - Math.random());
    }
    }
    
    // Strict Post-Filtering (applies to both Vector and Fallback results)
    
    // Strict Genre Filter
    if (body.genres && body.genres.length > 0) {
      const selectedGenres = body.genres.map((g: string) => g.toLowerCase());
      filteredMovies = filteredMovies.filter((m: DBRecord) => {
        if (!m.genres || m.genres.length === 0) return false;
        return selectedGenres.some((sg: string) => m.genres!.some((mg: string) => mg.toLowerCase().includes(sg)));
      });
    }
    
    // Strict Recency Filter
    if (body.recency && body.recency !== "any") {
      const currentYear = new Date().getFullYear();
      const cutoff = parseInt(body.recency, 10);
      if (!isNaN(cutoff)) {
        filteredMovies = filteredMovies.filter((m: DBRecord) => m.release_year && m.release_year >= currentYear - cutoff);
      }
    }
    
    // Generalized TMDB Backfill if local DB falls short
    if (filteredMovies.length < 15) {
      console.log(`Only found ${filteredMovies.length} movies locally. Backfilling from TMDB...`);
      try {
        const params = new URLSearchParams({
          api_key: TMDB_API_KEY,
          sort_by: "vote_average.desc",
          "vote_count.gte": "50"
        });

        if (body.recency && body.recency !== "any") {
          const cutoff = new Date().getFullYear() - parseInt(body.recency, 10);
          params.set("primary_release_date.gte", `${cutoff}-01-01`);
        }

        if (body.category && body.category !== "none") {
          const kws = CATEGORY_KEYWORD_MAP[body.category as keyof typeof CATEGORY_KEYWORD_MAP];
          if (kws && kws.length > 0) {
            params.set("with_keywords", kws.join("|"));
          }
          if (body.category === "documentary") params.set("with_genres", "99");
          if (body.category === "top-250") params.set("vote_count.gte", "10000");
        }

        const tmdbUrl = `https://api.themoviedb.org/3/discover/movie?${params.toString()}`;
        const res = await fetch(tmdbUrl);
        if (res.ok) {
          const tmdbData = await res.json();
          for (const tm of (tmdbData.results || []).filter((tm: { poster_path: string | null }) => tm.poster_path)) {
            if (filteredMovies.length >= 15) break;
            if (!filteredMovies.find(m => m.id === tm.id)) {
              filteredMovies.push({
                id: tm.id,
                title: tm.title,
                overview: tm.overview,
                poster_path: tm.poster_path,
                vote_average: tm.vote_average,
                release_year: tm.release_date ? parseInt(tm.release_date.split('-')[0]) : null,
              });
              enrichAndSaveFromTMDB(tm);
            }
          }
        }
      } catch (err) {
        console.error("TMDB generalized backfill failed:", err);
      }
    }

    // Truncate to top 15 after strict filtering and potential backfill
    filteredMovies = filteredMovies.slice(0, 15);

    // Adapt to frontend movie interface expectations and prefetch details
    const formattedResults = await Promise.all(filteredMovies.map(async (m: DBRecord) => {
      let trailerKey = null;
      let runtime = null;
      let providers = [];
      
      let genres = m.genres || [];
      
      let data = null;
      for (let i = 0; i < 3; i++) {
        try {
          const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${m.id}?api_key=${TMDB_API_KEY}&append_to_response=watch/providers,videos`);
          if (tmdbRes.ok) {
            data = await tmdbRes.json();
            break;
          } else if (tmdbRes.status === 429) {
            await new Promise(r => setTimeout(r, 600 * (i + 1))); // Backoff
          } else {
            break; // e.g., 404
          }
        } catch (err) {
          // Network errors like ECONNRESET
          if (i === 2) {
             console.error(`Prefetch completely failed for movie ${m.id} after 3 retries:`, err);
          } else {
             await new Promise(r => setTimeout(r, 600 * (i + 1)));
          }
        }
      }
      
      if (data) {
        const usData = data['watch/providers']?.results?.US || {};
        const allUsProviders = [
          ...(usData.flatrate || []),
          ...(usData.free || []),
          ...(usData.ads || []),
          ...(usData.rent || []),
          ...(usData.buy || [])
        ];
        const uniqueProviders = [];
        const seen = new Set();
        for (const p of allUsProviders) {
          if (!seen.has(p.provider_id)) {
            seen.add(p.provider_id);
            uniqueProviders.push(p);
          }
        }
        providers = uniqueProviders;
        runtime = data.runtime || null;
        
        if (data.genres && data.genres.length > 0) {
          genres = data.genres.map((g: { name: string }) => g.name);
        }
        
        if (data.poster_path) {
          m.poster_path = data.poster_path;
        }
        
        const videos = data.videos?.results || [];
        const trailer = videos.find((v: { type: string; site: string; key: string }) => v.type === "Trailer" && v.site === "YouTube") 
                     || videos.find((v: { type: string; site: string; key: string }) => v.site === "YouTube");
        trailerKey = trailer?.key || null;
      }

      return {
        ...m,
        tmdbId: m.id,
        id: `tmdb-${m.id}`,
        year: m.release_year,
        voteAverage: m.vote_average,
        posterPath: m.poster_path 
          ? (m.poster_path.startsWith('http') ? m.poster_path : `https://image.tmdb.org/t/p/w500${m.poster_path}`) 
          : null,
        blurb: m.overview,
        genres,
        trailerKey,
        runtime,
        providers
      };
    }));

    return Response.json({ results: formattedResults });
  } catch (error) {
    console.error("Quiz endpoint failed:", error);
    return Response.json({ results: [], error: "Recommendation failed" }, { status: 500 });
  }
}
