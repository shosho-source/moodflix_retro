import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CATEGORY_KEYWORD_MAP, fetchTMDBWithRetry } from "@/lib/tmdb";
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
  similarity?: number;
  source?: "database" | "tmdb";
  [key: string]: unknown;
}

interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  [key: string]: unknown;
}

async function formatAndPrefetchMovie(m: DBRecord, isTV: boolean = false) {
  let trailerKey = null;
  let runtime = null;
  let providers: Provider[] = [];
  
  let genres = m.genres || [];
  
  let rating = null;
  
  let data = null;
  try {
    const endpoint = isTV ? 'tv' : 'movie';
    const append = isTV 
      ? 'watch/providers,videos,content_ratings' 
      : 'watch/providers,videos,release_dates';
    data = await fetchTMDBWithRetry(`https://api.themoviedb.org/3/${endpoint}/${m.id}?api_key=${TMDB_API_KEY}&append_to_response=${append}`);
  } catch (err) {
    console.error(`Prefetch completely failed for movie ${m.id} after 3 retries:`, err);
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
    
    if (isTV) {
      const usRating = data.content_ratings?.results?.find((r: { iso_3166_1: string, rating: string }) => r.iso_3166_1 === 'US');
      rating = usRating ? usRating.rating : null;
    } else {
      const usRelease = data.release_dates?.results?.find((r: { iso_3166_1: string, release_dates: { certification: string }[] }) => r.iso_3166_1 === 'US');
      if (usRelease && usRelease.release_dates && usRelease.release_dates.length > 0) {
        rating = usRelease.release_dates.find((rd: { certification: string }) => rd.certification)?.certification || usRelease.release_dates[0].certification || null;
      }
    }
  }

  return {
    ...m,
    tmdbId: m.id,
    id: `tmdb-${m.id}`,
    mediaType: isTV ? "tv" : "movie",
    year: m.release_year,
    voteAverage: m.vote_average,
    posterPath: m.poster_path 
      ? (m.poster_path.startsWith('http') ? m.poster_path : `https://image.tmdb.org/t/p/w500${m.poster_path}`) 
      : null,
    blurb: m.overview,
    genres,
    trailerKey,
    runtime,
    providers,
    rating,
    matchPercentage: m.similarity !== undefined && m.similarity !== null ? Math.round(m.similarity * 100) : undefined,
    source: m.source || "database"
  };
}

// B. Search Bar Request (Hybrid Text Match)
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return Response.json({ results: [] });
  }

  try {
    const results: DBRecord[] = [];
    
    // Tier 1: Local Option B (Hybrid AI + Trigram)
    let queryVector: number[] | null = null;
    const words = query.trim().split(/\s+/).length;
    
    // Protect Gemini quota: only vectorize conceptual queries (>= 3 words)
    if (words >= 3) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const embedResult = await model.embedContent(query);
        queryVector = embedResult.embedding.values.slice(0, 768);
      } catch (err) {
        console.error("AI Vector search for manual query failed, falling back to pure fuzzy text:", err);
      }
    }
    
    const { data: localMovies, error } = await supabase.rpc('hybrid_search_movies', {
      query_text: query,
      query_embedding: queryVector,
      match_count: 10
    });
    
    if (error) {
      console.error("Hybrid RPC failed (Make sure you ran the 01_hybrid_search.sql script in Supabase!):", error);
    } else if (localMovies && localMovies.length > 0) {
      // If we didn't vectorize (short query), the SQL RPC falls back to trigram similarity > 0.15. 
      // This is WAY too low for 1-2 word queries and returns garbage matches (e.g. "John Wick" for "WILD").
      // We must strictly filter these local results in memory.
      const q = query.toLowerCase();
      const filteredLocal = queryVector === null 
        ? localMovies.filter((m: DBRecord) => {
            const t = (m.title || "").toLowerCase();
            const d = (typeof m.director === 'string' ? m.director : "").toLowerCase();
            // We do NOT use similarity_score here because the SQL RPC bloats it with vote_count.
            // Strict substring match ensures we don't get 'Iron Man' for 'MANIPULATE'.
            // If they made a typo, they will fail this and hit TMDB's superior search API fallback!
            return t.includes(q) || d.includes(q);
          })
        : localMovies;
        
      results.push(...filteredLocal);
    }
    
    // Tier 2: TMDB Live Fallback (For uncatalogued/new movies)
    // We trigger this if local DB has fewer than 10 matches, to ensure we 'top up' with global hits.
    if (results.length < 10) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`);
        const tmdbData = res.ok ? await res.json() : null;
        let tmdbResults = tmdbData ? (tmdbData.results || []).filter((m: { poster_path: string | null; overview: string; vote_count: number }) => m.poster_path && m.overview && m.vote_count > 5) : [];
        
        // Ultra-Smart AI Typo Recovery for TMDB
        if (tmdbResults.length === 0) {
           try {
             const chatModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
             const prompt = `A user searched for a movie using the query: "${query}". They might have made a typo. If it's a very clear typo of a well-known movie, reply with ONLY the exact movie title. If it is NOT a clear typo, or you are unsure, or it's just a random word, reply with "UNKNOWN".`;
             const result = await chatModel.generateContent(prompt);
             const correctedQuery = result.response.text().trim().replace(/['"]/g, '');
             
             if (correctedQuery && correctedQuery !== "UNKNOWN" && correctedQuery.toLowerCase() !== query.toLowerCase()) {
                 console.log(`AI corrected typo from "${query}" to "${correctedQuery}"`);
                 const retryRes = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(correctedQuery)}&include_adult=false`);
                 if (retryRes.ok) {
                    const retryData = await retryRes.json();
                    tmdbResults = (retryData.results || []).filter((m: { poster_path: string | null; overview: string; vote_count: number }) => m.poster_path && m.overview && m.vote_count > 5);
                 }
             }
           } catch (aiErr) {
             console.error("AI Typo Recovery failed:", aiErr);
           }
        }
        
        tmdbResults = tmdbResults.slice(0, 5);
        
        for (const tmdbMovie of tmdbResults) {
          if (!results.find(r => Number(r.id) === tmdbMovie.id)) {
            results.push({
              id: tmdbMovie.id,
              title: tmdbMovie.title,
              overview: tmdbMovie.overview,
              poster_path: tmdbMovie.poster_path,
              release_year: tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.split('-')[0]) : null,
              vote_average: tmdbMovie.vote_average,
              genres: [],
              source: "tmdb"
            });
            
            // Auto-ingest new TMDB hits into local Supabase vector DB silently
            enrichAndSaveFromTMDB(tmdbMovie); 
          }
        }
      } catch (err) {
        console.error("TMDB search fallback failed:", err);
      }
    }

    // Adapt to frontend movie interface expectations and prefetch details
    const formattedResults = await Promise.all(results.map(m => formatAndPrefetchMovie(m)));

    return Response.json({ results: formattedResults });
  } catch (error) {
    console.error("Search pipeline failed:", error);
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

    interface DBRecord { id: number; title: string; overview: string; poster_path: string | null; vote_average: number; genres?: string[]; release_year?: number | null; similarity?: number; source?: "database" | "tmdb"; [key: string]: unknown; }
    let filteredMovies: DBRecord[] = [];
    
    const isTV = body.mediaPreference === "tv";

    if (isTV) {
      filteredMovies = [];
    } else {
      try {
        // 1. Use Gemini to generate a vector for the prompt
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const embedResult = await model.embedContent(prompt);
      const queryVector = embedResult.embedding.values.slice(0, 768);

      // 2. Call Supabase RPC match_movies with higher count for post-filtering
      const { data: matchedMovies, error } = await supabase.rpc('match_movies', {
        query_embedding: queryVector,
        match_threshold: 0.55,
        match_count: 50
      });

      if (error) throw error;
      filteredMovies = matchedMovies || [];
    } catch (aiError) {
      console.warn("AI Vector search failed. Executing smart SQL fallback...", aiError);
      
      // If user selected a specific Category, local SQL fallback cannot accurately filter it.
      // We must skip SQL fallback so TMDB backfill perfectly handles the category.
      if (body.category && body.category !== "none") {
        console.warn("Category requested. Skipping local SQL fallback to guarantee TMDB category backfill.");
        filteredMovies = [];
      } else {
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
    
    // Strict Anime Filter
    if (body.category === "anime") {
      filteredMovies = filteredMovies.filter((m: DBRecord) => {
        const ov = (m.overview || "").toLowerCase();
        return ov.includes("anime") || ov.includes("japan") || ov.includes("manga") || ov.includes("tokyo");
      });
    } else {
      // Prevent Anime from bleeding into other categories (unless Animation genre explicitly requested)
      const requestedAnimation = body.genres && body.genres.some((g: string) => g.toLowerCase() === "animation");
      if (!requestedAnimation) {
        filteredMovies = filteredMovies.filter((m: DBRecord) => {
          const ov = (m.overview || "").toLowerCase();
          return !ov.includes("anime") && !ov.includes("manga");
        });
      }
    }
    
    // Strict Category Text Filter for local vector matches
    if (body.category && body.category !== "none") {
      if (body.category === "top-250") {
        filteredMovies = filteredMovies.filter((m: DBRecord) => m.vote_average >= 8.0);
      } else if (body.category === "documentary") {
        filteredMovies = filteredMovies.filter((m: DBRecord) => m.genres && m.genres.some((g: string) => g.toLowerCase() === "documentary"));
      } else if (body.category !== "anime" && body.category !== "tv-series") {
        const catMatches: Record<string, string[]> = {
          "true-story": ["true story", "based on", "biography", "real life", "true events"],
          "perspective-shift": ["thought-provoking", "perspective", "life-changing", "profound"],
          "nyc": ["new york", "nyc", "manhattan", "brooklyn"],
          "spy-cop": ["spy", "police", "detective", "cia", "fbi", "agent", "cop", "undercover"],
          "space": ["space", "astronaut", "alien", "planet", "galaxy", "sci-fi"],
          "wedding": ["wedding", "marriage", "bride", "groom"],
          "heist": ["heist", "robbery", "thief", "steal", "bank"],
          "book": ["based on", "novel", "book", "author"],
          "racing": ["racing", "car", "race", "driver"],
          "girl-power": ["female", "woman", "feminist", "girl", "heroine"],
          "vegas": ["vegas", "casino", "gambling"],
          "sad-ending": ["tragedy", "tragic", "heartbreak", "sad"]
        };
        
        const kws = catMatches[body.category] || [];
        if (kws.length > 0) {
          filteredMovies = filteredMovies.filter((m: DBRecord) => {
            const text = ((m.title || "") + " " + (m.overview || "")).toLowerCase();
            return kws.some(kw => text.includes(kw));
          });
        }
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
          if (isTV) {
            params.set("first_air_date.gte", `${cutoff}-01-01`);
          } else {
            params.set("primary_release_date.gte", `${cutoff}-01-01`);
          }
        }

          if (body.category && body.category !== "none") {
          const kws = CATEGORY_KEYWORD_MAP[body.category as keyof typeof CATEGORY_KEYWORD_MAP];
          if (kws && kws.length > 0) {
            params.set("with_keywords", kws.join("|"));
          }
          if (body.category === "documentary") params.set("with_genres", "99");
          if (body.category === "top-250") params.set("vote_count.gte", "10000");
          if (body.category === "anime") {
            params.set("with_original_language", "ja");
            params.set("with_genres", "16"); // Animation
          } else {
            const requestedAnimation = body.genres && body.genres.some((g: string) => g.toLowerCase() === "animation");
            if (!requestedAnimation) {
              params.set("without_keywords", "210024,287501"); // Exclude anime keywords
            }
          }
        }
        
        // Also strictly enforce requested genres in the TMDB fallback if they exist
        if (body.genres && body.genres.length > 0 && body.category !== "anime" && body.category !== "documentary") {
          const REVERSE_GENRE_MAP: Record<string, string> = {
            "action": "28", "adventure": "12", "animation": "16", "comedy": "35", "crime": "80",
            "documentary": "99", "drama": "18", "family": "10751", "fantasy": "14", "history": "36",
            "horror": "27", "music": "10402", "mystery": "9648", "romance": "10749", "science fiction": "878",
            "thriller": "53", "war": "10752", "western": "37"
          };
          const tmdbGenreIds = body.genres.map((g: string) => REVERSE_GENRE_MAP[g.toLowerCase()]).filter(Boolean);
          if (tmdbGenreIds.length > 0) {
            params.set("with_genres", tmdbGenreIds.join(","));
          }
        }

        const tmdbUrl = `https://api.themoviedb.org/3/discover/${isTV ? 'tv' : 'movie'}?${params.toString()}`;
        const tmdbData = await fetchTMDBWithRetry(tmdbUrl);
          for (const tm of (tmdbData.results || []).filter((tm: { poster_path: string | null }) => tm.poster_path)) {
            if (filteredMovies.length >= 15) break;
            if (!filteredMovies.find(m => m.id === tm.id)) {
              filteredMovies.push({
                id: tm.id,
                title: tm.title || tm.name,
                overview: tm.overview,
                poster_path: tm.poster_path,
                vote_average: tm.vote_average,
                release_year: tm.release_date ? parseInt(tm.release_date.split('-')[0]) : (tm.first_air_date ? parseInt(tm.first_air_date.split('-')[0]) : null),
                source: "tmdb"
              });
              if (!isTV) enrichAndSaveFromTMDB(tm);
            }
          }
      } catch (err) {
        console.error("TMDB generalized backfill failed:", err);
      }
    }

    // Truncate to top 15 after strict filtering and potential backfill
    filteredMovies = filteredMovies.slice(0, 15);

    // Adapt to frontend movie interface expectations and prefetch details using the shared utility
    const formattedResults = await Promise.all(filteredMovies.map(m => formatAndPrefetchMovie(m, isTV)));

    return Response.json({ results: formattedResults });
  } catch (error) {
    console.error("Quiz endpoint failed:", error);
    return Response.json({ results: [], error: "Recommendation failed" }, { status: 500 });
  }
}
