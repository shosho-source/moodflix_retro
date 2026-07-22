"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Movie } from "@/lib/types";
import PosterCard from "./PosterCard";
import TrailerModal from "./TrailerModal";

interface MovieResultProps {
  movie: Movie;
  /** Match score (0-N). Omit to hide the match badge. */
  score?: number;
  /** Max possible score. */
  maxScore?: number;
  /** 0-indexed position in the result set. */
  resultIndex?: number;
  /** Total number of matches. */
  totalMatches?: number;
  /** Called when user wants the next recommendation. */
  onNext?: () => void;
  /** Called when user wants to restart the quiz. */
  onRestart?: () => void;
  /** Label for the restart button (defaults to "Retake Quiz"). */
  restartLabel?: string;
  /** Label for the next button (defaults to "Next"). */
  nextLabel?: string;
  /** Whether to show the result header ("Tonight's pick"). Set false for search results. */
  showHeader?: boolean;
  /** Called when a similar movie is selected. */
  onSelectSimilar?: (movie: Movie) => void;
}

function MatchBadge({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 border-2 border-[var(--retro-border)] whitespace-nowrap bg-[var(--retro-fg)] text-[var(--retro-surface)] uppercase font-mono"
    >
      <span>[✓]</span>
      {pct}% MATCH
    </span>
  );
}

export default function MovieResult({
  movie,
  score,
  maxScore,
  resultIndex,
  totalMatches,
  onNext,
  onRestart,
  restartLabel = "Retake Quiz",
  nextLabel,
  showHeader = true,
  onSelectSimilar,
}: MovieResultProps) {
  const [showTrailer, setShowTrailer] = useState(false);
  const [expandedBlurbId, setExpandedBlurbId] = useState<string | null>(null);
  const expandedBlurb = expandedBlurbId === movie.id;
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [showProviders, setShowProviders] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [prevMovieId, setPrevMovieId] = useState(movie.id);
  if (movie.id !== prevMovieId) {
    setPrevMovieId(movie.id);
    setSimilarMovies([]);
    setShowProviders(false);
    setShowTrailer(false);
    setExpandedBlurbId(null);
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [movie.id]);

  useEffect(() => {

    if (movie.tmdbId) {
      const abortController = new AbortController();
      const type = movie.mediaType || "movie";
      fetch(`/api/similar?id=${movie.tmdbId}&type=${type}`, { signal: abortController.signal })
        .then(r => r.json())
        .then(d => setSimilarMovies(d.results || []))
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error("Error fetching similar movies:", err);
          }
        });
        
      return () => abortController.abort();
    }
  }, [movie.tmdbId, movie.mediaType]);

  const uniqueProviders: Array<{ provider_id: number; provider_name: string; logo_path: string }> = [];
  if (movie.providers) {
    const seen = new Set();
    for (const p of movie.providers) {
      const name = p.provider_name.toLowerCase();
      let normalized = name;
      if (name.includes("amazon") || name.includes("prime")) normalized = "amazon";
      else if (name.includes("paramount")) normalized = "paramount";
      else if (name.includes("apple")) normalized = "apple";
      else if (name.includes("disney")) normalized = "disney";
      else if (name.includes("hulu")) normalized = "hulu";
      else if (name.includes("max") || name.includes("hbo")) normalized = "max";
      else if (name.includes("netflix")) normalized = "netflix";
      else if (name.includes("peacock")) normalized = "peacock";
      
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueProviders.push(p);
      }
    }
  }

  const getProviderLink = (providerName: string, title: string) => {
    const enc = encodeURIComponent(title);
    const p = providerName.toLowerCase();
    if (p.includes("netflix")) return `https://www.netflix.com/search?q=${enc}`;
    if (p.includes("amazon") || p.includes("prime")) return `https://www.amazon.com/s?k=${enc}&i=instant-video`;
    if (p.includes("disney")) return `https://www.disneyplus.com/search?q=${enc}`;
    if (p.includes("apple")) return `https://tv.apple.com/search?term=${enc}`;
    if (p.includes("hulu")) return `https://www.hulu.com/search?q=${enc}`;
    if (p.includes("hbo") || p.includes("max")) return `https://play.max.com/search?q=${enc}`;
    if (p.includes("paramount")) return `https://www.paramountplus.com/search/?q=${enc}`;
    if (p.includes("peacock")) return `https://www.peacocktv.com/search?q=${enc}`;
    if (p.includes("crunchyroll")) return `https://www.crunchyroll.com/search?q=${enc}`;
    return `https://www.justwatch.com/us/search?q=${enc}`;
  };

  const hasMatchBadge = score !== undefined && maxScore !== undefined;
  const hasNavigation = resultIndex !== undefined && totalMatches !== undefined;

  return (
    <>
      {movie.backdropPath && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 z-[-1]"
          style={{
            backgroundImage: `url(${movie.backdropPath})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[8px]" />
        </motion.div>
      )}
      <div className="flex flex-col animate-in slide-in-from-bottom-8 fade-in duration-700 w-full h-full">
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 sm:pr-2"
        >
        {showHeader && (
          <div className="flex flex-wrap items-center justify-between gap-y-3 mb-4 sm:mb-6 shrink-0 w-full border-b-2 border-[var(--retro-border)] pb-4">
            <div className="flex items-center gap-2 font-mono text-xs sm:text-sm uppercase tracking-wider font-bold">
              <span>&gt;&gt;</span>
              <span>CINEMATIC_OUTPUT</span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              {hasMatchBadge && <MatchBadge score={score} max={maxScore} />}
              {hasNavigation && (
                <span className="text-xs sm:text-sm whitespace-nowrap font-mono font-bold border-l-2 border-[var(--retro-border)] pl-4">
                  {resultIndex + 1} / {totalMatches}
                </span>
              )}
            </div>
          </div>
        )}
        
        <div className="pb-4 sm:pb-6 flex flex-col items-center sm:flex-row gap-4 sm:gap-8 w-full">
          <div className="w-32 sm:w-48 shrink-0 drop-shadow-lg mx-auto sm:mx-0">
            <PosterCard movie={movie} />
          </div>
          <div className="flex-1 flex flex-col items-center text-center sm:items-start sm:text-left w-full mt-2 sm:mt-0">
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
              {movie.genres.map((g) => (
                <span
                  key={g}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2 py-1 border border-[var(--retro-border)] uppercase"
                >
                  {g}
                </span>
              ))}
              <span
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2 py-1 border border-[var(--retro-border)] uppercase bg-[var(--retro-fg)] text-[var(--retro-surface)]"
              >
                {movie.rating}
              </span>
            </div>
            <h2 className="font-display uppercase text-2xl sm:text-4xl mb-1 sm:mb-2 font-bold leading-none tracking-tighter">
              {movie.title}{" "}
            </h2>
            <p className="flex items-center justify-center sm:justify-start gap-3 text-xs sm:text-sm mb-1 font-mono uppercase tracking-widest font-bold">
              <span>{movie.year}</span>
              <span className="w-1 h-1 bg-[var(--retro-border)]"></span>
              <span>{movie.runtime} MIN</span>
              <span className="w-1 h-1 bg-[var(--retro-border)]"></span>
              <span>IMDB {movie.voteAverage != null && movie.voteAverage > 0 ? movie.voteAverage.toFixed(1) : "N/A"}</span>
            </p>
            <div className="mt-2 sm:mt-4 leading-relaxed text-left w-full sm:text-left text-center">
              <p className={`${expandedBlurb ? '' : 'line-clamp-3'} text-xs sm:text-sm font-medium transition-all`}>
                {movie.blurb}
              </p>
              {movie.blurb.length > 130 && (
                <button 
                  onClick={() => setExpandedBlurbId(expandedBlurb ? null : movie.id)}
                  className="text-[10px] sm:text-xs font-mono font-bold mt-1 sm:mt-2 uppercase text-[var(--retro-border)] hover:text-white transition-colors"
                >
                  [{expandedBlurb ? "READ_LESS" : "READ_MORE"}]
                </button>
              )}
            </div>

            <div className="mt-6 w-full brutalist-box text-left shrink-0">
              {/* Mobile toggle button */}
              <button 
                onClick={() => setShowProviders(!showProviders)}
                className="w-full p-3 flex sm:hidden items-center justify-between hover:bg-[var(--retro-border)] hover:text-white transition-colors"
              >
                <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
                  <span className="text-[10px]">&gt;&gt;</span>
                  STREAMING_SOURCES
                </p>
                <span className="font-mono font-bold text-xs">
                  {showProviders ? "[-]" : "[+]"}
                </span>
              </button>

              {/* Content area: hidden on mobile unless toggled, always block on sm */}
              <div className={`p-3 sm:p-4 ${showProviders ? 'block' : 'hidden sm:block'} border-t-2 sm:border-t-0 border-[var(--retro-border)]`}>
                {/* Desktop header */}
                <p className="hidden sm:flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] mb-3">
                  <span className="text-xs">&gt;&gt;</span>
                  STREAMING_SOURCES
                </p>
                {uniqueProviders.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {uniqueProviders.map(p => (
                      <a
                        key={p.provider_id}
                        href={getProviderLink(p.provider_name, movie.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-transform hover:scale-110 inline-block"
                      >
                        <Image 
                          src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} 
                          alt={p.provider_name}
                          title={`Watch on ${p.provider_name}`}
                          width={32}
                          height={32}
                          className="w-8 h-8 border border-[var(--retro-border)] bg-white cursor-pointer" 
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono font-bold">
                    [NO_DATA_AVAILABLE]
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-row sm:justify-start gap-4 shrink-0 pt-3 pb-3 sm:pt-4 sm:pb-4 mt-4 sm:mt-8 border-t-2 border-[var(--retro-border)] sticky bottom-0 bg-[var(--retro-surface)] z-30 w-full relative">
          
          {movie.trailerKey && (
            <button
              onClick={() => setShowTrailer(true)}
              className="brutalist-button py-2 sm:py-3 px-2 sm:px-6 text-xs sm:text-sm"
            >
              <span className="sm:hidden">[TRAILER]</span>
              <span className="hidden sm:inline">[PLAY_TRAILER]</span>
            </button>
          )}
          {onRestart && (
            <button
              onClick={onRestart}
              className={`brutalist-button py-2 sm:py-3 px-6 text-xs sm:text-sm ${!movie.trailerKey ? 'col-span-2' : ''}`}
            >
              {restartLabel}
            </button>
          )}
          {onNext && (
            <button
              onClick={() => {
                setShowTrailer(false);
                onNext();
              }}
              className="col-span-2 sm:col-auto brutalist-button primary py-2 sm:py-3 px-8 text-sm sm:text-base flex-1"
            >
              <span className="sm:hidden">{nextLabel || "NEXT_RECORD >>"}</span>
              <span className="hidden sm:inline">{nextLabel || "NEXT_RECORD >>"}</span>
            </button>
          )}
        </div>

        {similarMovies.length > 0 && (
          <div className="mt-8 shrink-0 w-full pt-4 border-t-2 border-[var(--retro-border)]">
            <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] mb-4">
              <span className="text-xs">&gt;&gt;</span>
              SIMILAR_TITLES
            </p>
            <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 snap-x w-full">
              {similarMovies.map(sm => (
                <div 
                  key={sm.id} 
                  className="w-24 sm:w-32 shrink-0 snap-start cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => {
                    onSelectSimilar?.(sm);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <PosterCard movie={sm} />
                  <p className="text-[10px] sm:text-xs font-mono mt-2 truncate font-bold uppercase" title={sm.title}>{sm.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      {showTrailer && movie.trailerKey && (
        <TrailerModal trailerKey={movie.trailerKey} onClose={() => setShowTrailer(false)} />
      )}
    </>
  );
}
