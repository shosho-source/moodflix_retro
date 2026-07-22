import { NextResponse } from "next/server";
import { fetchSimilarMovies } from "@/lib/tmdb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const rawType = searchParams.get("type");
    const typeParam = rawType === "tv" ? "tv" : "movie";

    if (!idParam) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const tmdbId = parseInt(idParam, 10);
    if (isNaN(tmdbId)) {
      return NextResponse.json({ error: "Invalid id parameter" }, { status: 400 });
    }

    const movies = await fetchSimilarMovies(tmdbId, typeParam);

    return NextResponse.json({ results: movies });
  } catch (error) {
    console.error("API /similar error:", error);
    return NextResponse.json({ error: "Failed to fetch similar movies" }, { status: 500 });
  }
}
