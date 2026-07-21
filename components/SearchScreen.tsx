"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Movie } from "@/lib/types";
import MovieResult from "./MovieResult";
import PosterCard from "./PosterCard";

type SearchStage = "search" | "detail";

export default function SearchScreen() {
  const [stage, setStage] = useState<SearchStage>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  async function selectMovie(movie: Movie) {
    setSelectedMovie(movie);
    setStage("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToSearch() {
    setStage("search");
    setSelectedMovie(null);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" >
      <main className="flex-1 w-full max-w-[420px] sm:max-w-4xl mx-auto p-4 sm:px-6 sm:py-8 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          {stage === "search" && (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <div className="brutalist-box brutalist-shadow p-6 sm:p-10 w-full" >
                {/* Header with back link */}
                <div className="flex items-center gap-3 mb-6">
                  <Link
                    href="/"
                    className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
                    
                  >
                    <span className="material-symbols-outlined text-[22px]">arrow_back</span>
                  </Link>
                  <h1 className="font-display text-2xl sm:text-3xl tracking-tight" >
                    Search Movies
                  </h1>
                </div>

                {/* Search input */}
                <div className="search-input-wrapper mb-6">
                  <span className="material-symbols-outlined search-input-icon">search</span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type a movie name..."
                    className="search-input"
                    autoFocus
                  />
                  {query && (
                    <button
                      onClick={() => { setQuery(""); setResults([]); }}
                      className="search-input-clear"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                </div>

                {/* Loading state */}
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-8 h-8 rounded-full border-[3px] border-[var(--retro-accent)] border-t-transparent"
                    />
                  </div>
                )}

                {/* No results */}
                {!loading && query.trim().length >= 2 && results.length === 0 && (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-[48px] mb-4 block" >movie_off</span>
                    <p className="text-sm" >
                      No movies found for &quot;{query}&quot;
                    </p>
                  </div>
                )}

                {/* Results list */}
                {!loading && results.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {results.map((movie) => (
                      <button
                        key={movie.id}
                        onClick={() => selectMovie(movie)}
                        className="search-result-card"
                      >
                        
                        <div className="w-12 h-[72px] rounded-none overflow-hidden shrink-0 bg-[#ddd]">
                          {movie.posterPath && (
                            <Image
                              src={movie.posterPath}
                              alt={movie.title}
                              width={48}
                              height={72}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-display text-[15px] font-bold truncate" >
                            {movie.title}
                          </p>
                          <p className="text-xs mt-0.5" >
                            {movie.year} · {movie.genres.slice(0, 3).join(", ")}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {movie.voteAverage != null && movie.voteAverage > 0 && (
                              <span className="flex items-center gap-0.5 text-xs font-medium" >
                                <span className="material-symbols-outlined text-[12px]">star</span>
                                {movie.voteAverage.toFixed(1)}
                              </span>
                            )}
                            <span className="text-xs" >
                              {movie.runtime} min
                            </span>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-[20px] shrink-0" >
                          chevron_right
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Empty state hint */}
                {!loading && query.trim().length < 2 && results.length === 0 && (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-[48px] mb-4 block" >theaters</span>
                    <p className="text-sm" >
                      Search for any movie to see details and find similar films.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {stage === "detail" && selectedMovie && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <div className="brutalist-box brutalist-shadow p-4 sm:p-6 w-full" >
                <MovieResult
                  movie={selectedMovie}
                  showHeader={false}
                  onRestart={backToSearch}
                  restartLabel="Back to Search"
                  onSelectSimilar={selectMovie}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
