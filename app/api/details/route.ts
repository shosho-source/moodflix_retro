import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const idParam = request.nextUrl.searchParams.get("id");
    
    if (!idParam) {
      return Response.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
    
    let res;
    for (let i = 0; i < 3; i++) {
      try {
        res = await fetch(`https://api.themoviedb.org/3/movie/${idParam}?api_key=${TMDB_API_KEY}&append_to_response=watch/providers,videos`);
        if (res.ok) break;
      } catch (err) {
        if (i === 2) throw err;
        await new Promise(r => setTimeout(r, 500)); 
      }
    }
    
    if (!res || !res.ok) {
      throw new Error("Failed to fetch from TMDB after 3 attempts");
    }
    
    const data = await res.json();
    
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
    
    const videos = data.videos?.results || [];
    const trailer = videos.find((v: { type: string; site: string; key: string }) => v.type === "Trailer" && v.site === "YouTube") 
                 || videos.find((v: { type: string; site: string; key: string }) => v.site === "YouTube");
    
    return Response.json({ 
      providers: uniqueProviders, 
      trailerKey: trailer?.key || null, 
      runtime: data.runtime || null 
    });
  } catch (error) {
    console.error("API /details error:", error);
    return Response.json({ providers: [], trailerKey: null, runtime: null }, { status: 500 });
  }
}
