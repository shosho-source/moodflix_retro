import { Movie, QuizAnswers, Category } from "./types";

const ratingOrder: Record<string, number> = { G: 0, PG: 1, "PG-13": 2, R: 3 };

// ─── Scoring weights ─────────────────────────────────────────────
const WEIGHTS = {
  mood: 4,
  occasion: 3,
  genreMatch: 2,   // per matching genre
  recency: 1,
  rating: 1,
  category: 2,
  tmdbRating: 1,   // bonus for highly rated films
};

// ─── Individual matchers ─────────────────────────────────────────
function moodScore(movie: Movie, mood: QuizAnswers["mood"]): number {
  if (!mood) return WEIGHTS.mood; // no filter → full score
  return movie.moods.includes(mood) ? WEIGHTS.mood : 0;
}

function occasionScore(movie: Movie, occasion: QuizAnswers["occasion"]): number {
  if (!occasion) return WEIGHTS.occasion;
  return movie.occasions.includes(occasion) ? WEIGHTS.occasion : 0;
}

function genreScore(movie: Movie, selectedGenres: string[]): number {
  if (selectedGenres.length === 0) return WEIGHTS.genreMatch; // no filter → base score
  let score = 0;
  for (const g of selectedGenres) {
    if (g === "Romantic Comedy") {
      if (movie.genres.includes("Romance") && movie.genres.includes("Comedy")) {
        score += WEIGHTS.genreMatch;
      }
    } else if (movie.genres.includes(g)) {
      score += WEIGHTS.genreMatch;
    }
  }
  return score;
}

function recencyScore(movie: Movie, recency: QuizAnswers["recency"]): number {
  if (!recency || recency === "any") return WEIGHTS.recency;
  const currentYear = new Date().getFullYear();
  const span = parseInt(recency, 10);
  return currentYear - movie.year <= span ? WEIGHTS.recency : 0;
}

function ratingScore(movie: Movie, answers: QuizAnswers): number {
  // User's clarification: rating filter works as ≤ max selected
  // If user selects R → show all. If user selects PG-13 → show G, PG, PG-13
  if (!answers.ratingsMatter || answers.ratings.length === 0) return WEIGHTS.rating;
  const maxAllowed = Math.max(...answers.ratings.map((r) => ratingOrder[r]));
  return ratingOrder[movie.rating] <= maxAllowed ? WEIGHTS.rating : 0;
}

function categoryScore(movie: Movie, category: QuizAnswers["category"]): number {
  if (!category || category === "none") return 0; // no bonus, no penalty
  return movie.categories.includes(category as Category) ? WEIGHTS.category : 0;
}

function tmdbBonus(movie: Movie): number {
  // Small bonus for higher-rated movies to break ties
  const avg = movie.voteAverage ?? 0;
  if (avg >= 8.0) return WEIGHTS.tmdbRating;
  if (avg >= 7.0) return WEIGHTS.tmdbRating * 0.5;
  return 0;
}

// ─── Total score for a movie ─────────────────────────────────────
export function scoreMovie(movie: Movie, answers: QuizAnswers): number {
  return (
    moodScore(movie, answers.mood) +
    occasionScore(movie, answers.occasion) +
    genreScore(movie, answers.genres) +
    recencyScore(movie, answers.recency) +
    ratingScore(movie, answers) +
    categoryScore(movie, answers.category) +
    tmdbBonus(movie)
  );
}

// Max possible score (for match % calculation)
export function maxScore(answers: QuizAnswers): number {
  const genreMax =
    answers.genres.length > 0
      ? answers.genres.length * WEIGHTS.genreMatch
      : WEIGHTS.genreMatch;

  return (
    WEIGHTS.mood +
    WEIGHTS.occasion +
    genreMax +
    WEIGHTS.recency +
    WEIGHTS.rating +
    (answers.category && answers.category !== "none" ? WEIGHTS.category : 0) +
    WEIGHTS.tmdbRating
  );
}

// ─── Seeded shuffle (deterministic per session) ──────────────────
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Score-based recommendation engine.
 *
 * 1. Scores every movie against the user's answers
 * 2. Hard-filters movies that fail critical criteria (mood + occasion)
 *    — but only if the filter doesn't empty the pool
 * 3. Sorts by score descending, shuffles within same-score tiers
 * 4. Returns the ranked list
 */
export function recommend(
  answers: QuizAnswers,
  exclude: string[] = [],
  moviePool: Movie[] = [],
  seed: number = Date.now(),
): Movie[] {
  let pool = moviePool.filter((m) => !exclude.includes(m.id));

  if (pool.length === 0) return [];

  // Hard filters with graceful fallback:
  // If a filter would empty the pool, skip it
  const hardFilters: Array<(m: Movie) => boolean> = [
    (m) => (answers.mood ? m.moods.includes(answers.mood) : true),
    (m) => (answers.occasion ? m.occasions.includes(answers.occasion) : true),
    (m) =>
      answers.ratingsMatter && answers.ratings.length > 0
        ? ratingOrder[m.rating] <= Math.max(...answers.ratings.map((r) => ratingOrder[r]))
        : true,
    (m) => {
      if (!answers.recency || answers.recency === "any") return true;
      const span = parseInt(answers.recency, 10);
      return new Date().getFullYear() - m.year <= span;
    },
  ];

  for (const filter of hardFilters) {
    const narrowed = pool.filter(filter);
    if (narrowed.length > 0) pool = narrowed;
  }

  // Score remaining movies
  const scored = pool.map((movie) => ({
    movie,
    score: scoreMovie(movie, answers),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Shuffle within same-score tiers for variety
  const result: Movie[] = [];
  let i = 0;
  while (i < scored.length) {
    let j = i;
    while (j < scored.length && scored[j].score === scored[i].score) {
      j++;
    }
    // Tier from i to j-1 (same score)
    const tier = scored.slice(i, j).map((s) => s.movie);
    const shuffled = seededShuffle(tier, seed + i);
    result.push(...shuffled);
    i = j;
  }

  return result;
}
