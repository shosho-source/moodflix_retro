export type Mood = "happy" | "neutral" | "sad";

export type Occasion = "solo" | "date" | "friends" | "partner" | "family";

export type Rating = "G" | "PG" | "PG-13" | "R";

export type Recency = "any" | "5" | "10" | "25";

export type Category =
  | "true-story"
  | "perspective-shift"
  | "nyc"
  | "spy-cop"
  | "space"
  | "wedding"
  | "heist"
  | "book"
  | "racing"
  | "girl-power"
  | "vegas"
  | "top-250"
  | "sad-ending"
  | "documentary"
  | "tv-series"
  | "coming-of-age"
  | "queer"
  | "anime";

export interface Movie {
  id: string;
  tmdbId?: number;
  title: string;
  year: number;
  runtime: number;
  genres: string[];
  moods: Mood[];
  occasions: Occasion[];
  rating: Rating;
  categories: Category[];
  blurb: string;
  hue: number; // for the generated poster gradient
  posterPath?: string | null; // TMDB poster URL
  backdropPath?: string | null; // High-res horizontal background
  trailerKey?: string | null; // YouTube video ID
  providers?: Array<{
    provider_id: number;
    provider_name: string;
    logo_path: string;
  }>;
  voteAverage?: number; // TMDB vote average (0–10)
  mediaType?: "movie" | "tv";
}

export interface QuizAnswers {
  mood: Mood | null;
  occasion: Occasion | null;
  genres: string[];
  recency: Recency | null;
  ratingsMatter: boolean | null;
  ratings: Rating[];
  category: Category | "none" | null;
  mediaPreference: "movies" | "tv" | "both" | null;
}

export const emptyAnswers: QuizAnswers = {
  mood: null,
  occasion: null,
  genres: [],
  recency: null,
  ratingsMatter: null,
  ratings: [],
  category: null,
  mediaPreference: null,
};
