import { fetchTMDBMovies } from "@/lib/tmdb";
import { movies as fallbackMovies } from "@/lib/movies";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const movies = await fetchTMDBMovies();

    if (movies.length === 0) {
      // If TMDB returns nothing, use fallback
      return Response.json({ movies: fallbackMovies, source: "fallback" });
    }

    return Response.json({ movies, source: "tmdb" });
  } catch (error) {
    console.error("TMDB fetch failed, using fallback:", error);
    return Response.json({ movies: fallbackMovies, source: "fallback" });
  }
}
