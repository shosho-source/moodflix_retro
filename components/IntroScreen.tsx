"use client";

import Link from "next/link";

interface IntroScreenProps {
  movieCount: number;
  genreCount: number;
  onStartQuiz: () => void;
}

export default function IntroScreen({ movieCount, genreCount, onStartQuiz }: IntroScreenProps) {
  return (
    <div className="text-left pt-8 sm:pt-0 font-mono h-full flex flex-col min-h-0 overflow-hidden">
      <div className="mb-4 sm:mb-8 border-b-2 border-[var(--retro-border)] pb-2 flex justify-between shrink-0">
        <span className="font-bold uppercase">Moodflix_OS v1.0</span>
        <span>{new Date().getFullYear()}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <h1 className="font-display font-bold uppercase text-4xl sm:text-7xl mb-2 sm:mb-4 tracking-tighter leading-none animate-in fade-in duration-700">
          Evolve<br/>
          the way<br/>
          you watch
        </h1>
        
        <p className="text-xs sm:text-sm max-w-md mb-4 sm:mb-10 animate-in fade-in duration-700 delay-150 uppercase">
          [INITIALIZATION] — Answer diagnostic questions to calculate the perfect cinematic output for your exact parameters. Zero buffering. 100% accuracy.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch gap-4 animate-in fade-in duration-700 delay-300">
        <button
          onClick={onStartQuiz}
          className="brutalist-button primary py-4 px-8 flex justify-between items-center text-lg w-full sm:w-auto"
        >
          <span>Start Assessment</span>
          <span className="ml-4">&gt;&gt;&gt;</span>
        </button>

        <Link
          href="/search"
          className="brutalist-button py-4 px-8 text-center text-lg flex items-center justify-center w-full sm:w-auto"
        >
          Manual Override (Search)
        </Link>
      </div>

      <div className="mt-auto pt-4 sm:pt-6 animate-in fade-in duration-1000 delay-500 shrink-0">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-left mb-4 sm:mb-8">
          <div className="border-l-2 border-[var(--retro-border)] pl-3">
            <p className="text-[10px] uppercase tracking-widest mb-1">Index Size</p>
            <p className="font-display font-bold text-xl">{movieCount > 0 ? movieCount : "..."}</p>
          </div>
          <div className="border-l-2 border-[var(--retro-border)] pl-3">
            <p className="text-[10px] uppercase tracking-widest mb-1">Parameters</p>
            <p className="font-display font-bold text-xl">{genreCount > 0 ? genreCount : "..."}</p>
          </div>
          <div className="border-l-2 border-[var(--retro-border)] pl-3">
            <p className="text-[10px] uppercase tracking-widest mb-1">Source</p>
            <p className="font-display font-bold text-xl">TMDB API</p>
          </div>
        </div>
        
          <div className="flex justify-between items-center text-[10px] uppercase tracking-widest">
            <span>{`///`} SYSTEM_READY</span>
            <span>{`[DATA_STREAM_ACTIVE]`}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
