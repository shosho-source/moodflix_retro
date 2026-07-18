"use client";

import { useEffect, useState } from "react";
import Quiz from "@/components/Quiz";

export default function Home() {
  const [movieCount, setMovieCount] = useState<number | null>(null);
  const [genreCount, setGenreCount] = useState(16);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/movies");
        const data = await res.json();
        if (data.movies) {
          setMovieCount(data.movies.length);
          // Count unique genres
          const genres = new Set<string>();
          for (const m of data.movies) {
            for (const g of m.genres) genres.add(g);
          }
          setGenreCount(genres.size);
        }
      } catch {
        // fallback
      }
    }
    load();
  }, []);

  return (
    <div className="flex-1 flex flex-col" style={{ background: "var(--md-surface-dim)" }}>
      <header
        className="sticky top-0 z-10 border-b backdrop-blur"
        style={{
          borderColor: "var(--md-outline-variant)",
          background: "color-mix(in srgb, var(--md-surface-dim) 85%, transparent)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-[10px] flex items-center justify-center font-display text-sm"
              style={{ background: "var(--md-primary)", color: "var(--md-on-primary)" }}
            >
              M
            </div>
            <span className="font-display text-lg tracking-wide text-white">MoodFlix</span>
          </div>
          <p
            className="text-xs hidden sm:block uppercase tracking-[0.15em]"
            style={{ color: "var(--md-on-surface-variant)" }}
          >
            An MD3-inspired movie picker
          </p>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-10 sm:py-16">
          <Quiz />
        </div>

        <div className="max-w-3xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat value={movieCount ? movieCount.toString() : "…"} label="Movies" />
            <Stat value={genreCount.toString()} label="Genres" />
            <Stat value="TMDB" label="Powered by" />
          </div>
        </div>
      </main>

      <footer
        className="border-t py-6"
        style={{ borderColor: "var(--md-outline-variant)" }}
      >
        <p
          className="text-center text-xs"
          style={{ color: "var(--md-on-surface-variant)" }}
        >
          Movie data provided by TMDB.
        </p>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="rounded-[var(--md-shape-md)] py-5"
      style={{ background: "var(--md-surface-container-low)" }}
    >
      <p className="font-display text-2xl text-white">{value}</p>
      <p
        className="text-[11px] uppercase tracking-[0.15em] mt-1"
        style={{ color: "var(--md-on-surface-variant)" }}
      >
        {label}
      </p>
    </div>
  );
}
