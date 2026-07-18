/**
 * Pre-fetch movies from TMDB and save as a static JSON file.
 * Run with: node scripts/fetch-movies.mjs
 */
import https from "node:https";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────
const API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
  // Try reading from .env.local
  const { readFileSync } = await import("node:fs");
  const envPath = join(__dirname, "..", ".env.local");
  try {
    const envContent = readFileSync(envPath, "utf-8");
    const match = envContent.match(/TMDB_API_KEY=["']?([^"'\s]+)["']?/);
    if (match) {
      process.env.TMDB_API_KEY = match[1];
    }
  } catch {
    // ignore
  }
}

const TMDB_KEY = process.env.TMDB_API_KEY;
if (!TMDB_KEY) {
  console.error("❌ Set TMDB_API_KEY in .env.local or environment");
  process.exit(1);
}

const TMDB_BASE = "https://api.themoviedb.org/3";

// ─── TMDB genre map ─────────────────────────────────────────────
const TMDB_GENRE_MAP = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  53: "Thriller", 10752: "War", 37: "Western",
};

const GENRE_TO_MOODS = {
  28: ["neutral", "happy"], 12: ["happy", "neutral"], 16: ["happy"],
  35: ["happy", "neutral"], 80: ["neutral"], 18: ["neutral", "sad"],
  10751: ["happy"], 14: ["happy", "neutral"], 36: ["neutral", "sad"],
  27: ["neutral"], 10402: ["happy"], 9648: ["neutral"],
  10749: ["happy", "neutral"], 878: ["neutral"], 53: ["neutral"],
  10752: ["sad", "neutral"], 37: ["neutral"],
};

const GENRE_TO_OCCASIONS = {
  28: ["friends", "solo"], 12: ["friends", "family"], 16: ["family"],
  35: ["friends", "date"], 80: ["solo", "friends"], 18: ["solo", "partner"],
  10751: ["family"], 14: ["friends", "solo"], 36: ["solo", "family"],
  27: ["friends", "solo"], 10402: ["date", "friends"], 9648: ["solo"],
  10749: ["date", "partner"], 878: ["solo", "friends"], 53: ["solo", "friends"],
  10752: ["solo"], 37: ["friends", "solo"],
};

const GENRE_HUES = {
  28: 8, 12: 25, 16: 48, 35: 45, 80: 0, 18: 220,
  10751: 130, 14: 280, 36: 40, 27: 330, 10749: 340,
  878: 200, 53: 15, 10752: 100, 37: 30,
};

// ─── HTTP helper ─────────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    }).on("error", reject);
  });
}

async function tmdbGet(path, params = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return httpGet(url.toString());
}

// ─── Fetch discover page ────────────────────────────────────────
async function discoverPage(page, extra = {}) {
  return tmdbGet("/discover/movie", {
    sort_by: "vote_average.desc",
    "vote_count.gte": "300",
    include_adult: "false",
    language: "en-US",
    with_original_language: "en",
    ...extra,
    page: String(page),
  });
}

// ─── Fetch movie detail ─────────────────────────────────────────
async function movieDetail(id) {
  return tmdbGet(`/movie/${id}`, {
    append_to_response: "release_dates,keywords",
    language: "en-US",
  });
}

// ─── Mapping functions ──────────────────────────────────────────
function mapCertification(cert) {
  switch (cert) {
    case "G": return "G";
    case "PG": return "PG";
    case "PG-13": return "PG-13";
    case "R": case "NC-17": return "R";
    default: return "PG-13";
  }
}

function getUSCert(detail) {
  const us = detail.release_dates?.results?.find((r) => r.iso_3166_1 === "US");
  if (!us) return "PG-13";
  const theatrical = us.release_dates.find((rd) => (rd.type === 3 || rd.type === 2) && rd.certification);
  if (theatrical) return mapCertification(theatrical.certification);
  const any = us.release_dates.find((rd) => rd.certification);
  return any ? mapCertification(any.certification) : "PG-13";
}

function inferMoods(genreIds, voteAvg) {
  const moods = new Set();
  for (const gid of genreIds) {
    (GENRE_TO_MOODS[gid] || []).forEach((m) => moods.add(m));
  }
  if (voteAvg >= 8.0 && genreIds.includes(18)) moods.add("happy");
  if (genreIds.includes(10749) && genreIds.includes(35)) moods.add("happy");
  if (genreIds.includes(10749) && genreIds.includes(18)) moods.add("sad");
  return moods.size > 0 ? [...moods] : ["neutral"];
}

function inferOccasions(genreIds, rating) {
  const occasions = new Set();
  for (const gid of genreIds) {
    (GENRE_TO_OCCASIONS[gid] || []).forEach((o) => occasions.add(o));
  }
  if (rating === "G" || rating === "PG") occasions.add("family");
  if (genreIds.includes(10749) && genreIds.includes(35)) {
    occasions.add("date");
    occasions.add("partner");
  }
  return occasions.size > 0 ? [...occasions] : ["solo", "friends"];
}

function inferCategories(genreIds, keywords, voteAvg, voteCount) {
  const cats = new Set();
  const kwNames = new Set(keywords.map((k) => k.name.toLowerCase()));

  if (kwNames.has("based on novel") || kwNames.has("based on a novel") || kwNames.has("novel")) cats.add("book");
  if (kwNames.has("based on true story") || kwNames.has("biography") || kwNames.has("true story") || kwNames.has("biographical")) cats.add("true-story");
  if (kwNames.has("new york city") || kwNames.has("new york") || kwNames.has("manhattan") || kwNames.has("brooklyn")) cats.add("nyc");
  if (kwNames.has("spy") || kwNames.has("espionage") || kwNames.has("police") || kwNames.has("detective") || kwNames.has("fbi") || kwNames.has("cia")) cats.add("spy-cop");
  if (kwNames.has("space") || kwNames.has("astronaut") || kwNames.has("outer space") || kwNames.has("spaceship") || kwNames.has("nasa")) cats.add("space");
  if (kwNames.has("wedding") || kwNames.has("bride") || kwNames.has("marriage ceremony")) cats.add("wedding");
  if (kwNames.has("heist") || kwNames.has("bank robbery") || kwNames.has("robbery") || kwNames.has("theft")) cats.add("heist");
  if (kwNames.has("car race") || kwNames.has("car racing") || kwNames.has("formula one") || kwNames.has("nascar") || kwNames.has("auto racing") || kwNames.has("racing")) cats.add("racing");
  if (kwNames.has("las vegas") || kwNames.has("casino") || kwNames.has("gambling")) cats.add("vegas");
  if (kwNames.has("female protagonist") || kwNames.has("feminism") || kwNames.has("strong woman") || kwNames.has("women's rights")) cats.add("girl-power");

  if (genreIds.includes(36)) cats.add("true-story");
  if (genreIds.includes(878)) cats.add("space");
  if (voteAvg >= 7.5 && voteCount >= 2000) cats.add("top-250");
  if (voteAvg >= 7.8 && genreIds.includes(18)) cats.add("perspective-shift");

  return [...cats];
}

function mapGenres(genreIds) {
  const genres = [];
  for (const gid of genreIds) {
    const name = TMDB_GENRE_MAP[gid];
    if (name && !genres.includes(name)) genres.push(name);
  }
  return genres.length > 0 ? genres : ["Drama"];
}

function hueFromGenres(genreIds) {
  for (const gid of genreIds) {
    if (GENRE_HUES[gid] !== undefined) return GENRE_HUES[gid];
  }
  return 210;
}

// ─── Main ───────────────────────────────────────────────────────
async function main() {
  console.log("🎬 Fetching movies from TMDB...\n");

  // Step 1: Discover pages (popular + top-rated + genre-specific)
  const popularParams = { sort_by: "popularity.desc", "vote_count.gte": "500" };
  const topRatedParams = { sort_by: "vote_average.desc", "vote_count.gte": "1000" };
  const genreParams = { sort_by: "vote_average.desc", "vote_count.gte": "200" };

  const batches = await Promise.all([
    discoverPage(1, popularParams),
    discoverPage(2, popularParams),
    discoverPage(3, popularParams),
    discoverPage(4, popularParams),
    discoverPage(5, popularParams),
    discoverPage(1, topRatedParams),
    discoverPage(2, topRatedParams),
    discoverPage(3, topRatedParams),
    discoverPage(4, topRatedParams),
    discoverPage(5, topRatedParams),
    discoverPage(1, { ...genreParams, with_genres: "35,10749" }),
    discoverPage(2, { ...genreParams, with_genres: "35,10749" }),
    discoverPage(1, { ...genreParams, with_genres: "878" }),
    discoverPage(1, { ...genreParams, with_genres: "28" }),
    discoverPage(2, { ...genreParams, with_genres: "28" }),
    discoverPage(1, { ...genreParams, with_genres: "16,10751" }),
    discoverPage(1, { ...genreParams, with_genres: "53,80" }),
    discoverPage(1, { ...genreParams, with_genres: "18,36" }),
  ]);

  const allRaw = batches.flatMap((b) => b.results || []);
  console.log(`  📥 Fetched ${allRaw.length} raw results`);

  // Deduplicate
  const seen = new Map();
  for (const m of allRaw) {
    if (!seen.has(m.id) && m.poster_path && m.release_date && m.title) {
      seen.set(m.id, m);
    }
  }
  const unique = [...seen.values()];
  console.log(`  📋 ${unique.length} unique movies after dedup\n`);

  // Step 2: Fetch details in batches of 30
  console.log("📡 Fetching movie details (runtime, certification, keywords)...");
  const BATCH = 30;
  const details = new Map();

  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((m) => movieDetail(m.id).catch(() => null))
    );
    for (const d of results) {
      if (d) details.set(d.id, d);
    }
    const pct = Math.min(100, Math.round(((i + BATCH) / unique.length) * 100));
    process.stdout.write(`\r  ⏳ ${pct}% (${Math.min(i + BATCH, unique.length)}/${unique.length})`);
    if (i + BATCH < unique.length) await new Promise((r) => setTimeout(r, 500));
  }
  console.log("\n");

  // Step 3: Build movie objects
  const movies = [];
  for (const raw of unique) {
    const detail = details.get(raw.id);
    const rating = detail ? getUSCert(detail) : raw.adult ? "R" : "PG-13";
    const keywords = detail?.keywords?.keywords ?? [];
    const runtime = detail?.runtime ?? 120;
    const year = parseInt(raw.release_date.split("-")[0], 10);
    if (isNaN(year) || year < 1970) continue;

    movies.push({
      id: `tmdb-${raw.id}`,
      tmdbId: raw.id,
      title: raw.title,
      year,
      runtime,
      genres: mapGenres(raw.genre_ids),
      moods: inferMoods(raw.genre_ids, raw.vote_average),
      occasions: inferOccasions(raw.genre_ids, rating),
      rating,
      categories: inferCategories(raw.genre_ids, keywords, raw.vote_average, raw.vote_count),
      blurb: raw.overview || "A must-watch film.",
      hue: hueFromGenres(raw.genre_ids),
      posterPath: raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : null,
      voteAverage: raw.vote_average,
    });
  }

  // Step 4: Write to JSON
  const outPath = join(__dirname, "..", "lib", "tmdb-movies.json");
  writeFileSync(outPath, JSON.stringify(movies, null, 2));
  console.log(`✅ Saved ${movies.length} movies to lib/tmdb-movies.json`);

  // Stats
  const moods = { happy: 0, neutral: 0, sad: 0 };
  const genres = {};
  for (const m of movies) {
    for (const mood of m.moods) moods[mood]++;
    for (const g of m.genres) genres[g] = (genres[g] || 0) + 1;
  }
  console.log(`\n📊 Mood distribution: happy=${moods.happy} neutral=${moods.neutral} sad=${moods.sad}`);
  console.log(`📊 Genres: ${Object.entries(genres).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g}(${n})`).join(", ")}`);
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
