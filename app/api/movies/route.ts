import { fetchTMDBMovies } from "@/lib/tmdb";

// ISR: revalidate every hour instead of force-dynamic on every request.
// This caches the TMDB response and revalidates in the background,
// saving rate limits and improving initial load speed.
export const revalidate = 3600;

export async function GET() {
  try {
    const movies = await fetchTMDBMovies();

    if (movies.length === 0) {
      throw new Error("TMDB returned no movies.");
    }

    return Response.json({ movies, source: "tmdb" });
  } catch (error) {
    console.error("TMDB fetch failed:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch movies from TMDB" }), { status: 500 });
  }
}
