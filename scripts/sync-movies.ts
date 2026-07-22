import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!TMDB_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function fetchFromTMDB(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
  url.searchParams.set("api_key", TMDB_API_KEY!);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB API Error: ${res.statusText}`);
  }
  return res.json();
}

async function runSync() {
  console.log("Starting daily movie ingestion sync...");
  let addedCount = 0;
  const LIMIT = 1000;
  let page = 1;

  while (addedCount < LIMIT && page <= 500) {
    console.log(`Fetching popular movies page ${page}...`);
    try {
      const data = await fetchFromTMDB('/movie/popular', { page: page.toString(), language: 'en-US' });
      const movies = data.results;
      
      if (!movies || movies.length === 0) break;

      for (const movie of movies) {
        if (addedCount >= LIMIT) break;

        // Skip low-quality entries
        if (movie.vote_count < 50 || !movie.overview) {
          continue;
        }

        // Check if already in Supabase
        const { data: existing } = await supabase
          .from('movies')
          .select('id')
          .eq('id', movie.id)
          .single();

        if (existing) {
          console.log(`Skipping TMDB ID ${movie.id} - already exists.`);
          continue;
        }

        // Fetch detailed info (credits + details for genres)
        const detail = await fetchFromTMDB(`/movie/${movie.id}`, { append_to_response: 'credits' });
        
        const genres = detail.genres?.map((g: any) => g.name) || [];
        const director = detail.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'Unknown';
        const releaseYear = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null;

        const vibeString = `Title: ${movie.title}. Year: ${releaseYear}. Genres: ${genres.join(', ')}. Director: ${director}. Overview: ${movie.overview}`;
        
        console.log(`Generating embedding for: ${movie.title}...`);
        try {
          const result = await model.embedContent(vibeString);
          const embedding = result.embedding.values;

          // Upsert to Supabase
          const { error } = await supabase.from('movies').upsert({
            id: movie.id,
            title: movie.title,
            overview: movie.overview,
            poster_path: movie.poster_path,
            genres: genres,
            director: director,
            release_year: releaseYear,
            vote_average: movie.vote_average,
            vote_count: movie.vote_count,
            embedding: embedding
          });

          if (error) {
            console.error(`Supabase Upsert Error for ${movie.id}:`, error.message);
          } else {
            console.log(`Added ${movie.title} (Total: ${++addedCount}/${LIMIT})`);
          }
        } catch (e: any) {
          console.error(`Embedding Error for ${movie.id}:`, e.message);
        }

        // Pacing delay (4 seconds) to respect Gemini free tier limits
        await delay(4000);
      }
      
      page++;
    } catch (e: any) {
      console.error(`Error on page ${page}:`, e.message);
      break;
    }
  }

  console.log(`Sync complete. Added ${addedCount} new movies.`);
}

runSync().catch(console.error);
