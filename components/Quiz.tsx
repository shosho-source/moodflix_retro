"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Movie, QuizAnswers, emptyAnswers } from "@/lib/types";
import { recommend, scoreMovie, maxScore } from "@/lib/recommend";
import { genreList, dateGenres } from "@/lib/movies";
import SplashScreen from "./SplashScreen";
import IntroScreen from "./IntroScreen";
import QuizSteps from "./QuizSteps";
import MovieResult from "./MovieResult";

type Stage = "intro" | "quiz" | "result" | "empty" | "loading" | "splash" | "error";

export default function Quiz() {
  const [stage, setStage] = useState<Stage>("splash");
  const [answers, setAnswers] = useState<QuizAnswers>(emptyAnswers);
  const [stepIndex, setStepIndex] = useState(0);
  const [resultIndex, setResultIndex] = useState(0);
  const [overrideMovie, setOverrideMovie] = useState<Movie | null>(null);
  const [allGenres, setAllGenres] = useState(false);
  const [sessionSeed] = useState(() => Date.now());

  // Movie pool from TMDB API
  const [moviePool, setMoviePool] = useState<Movie[]>([]);
  const [, setMovieSource] = useState<string>("loading");

  const genreCount = useMemo(() => {
    const genres = new Set<string>();
    moviePool.forEach(m => m.genres.forEach(g => genres.add(g)));
    return genres.size;
  }, [moviePool]);

  // Fetch movies from API on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const fetchPromise = fetch("/api/movies").then(res => res.json());
        const minTimerPromise = new Promise(resolve => setTimeout(resolve, 4000));
        
        const [data] = await Promise.all([fetchPromise, minTimerPromise]);

        if (!cancelled) {
          if (!data.movies || data.movies.length === 0) {
            throw new Error("No movies returned");
          }
          setMoviePool(data.movies);
          setMovieSource(data.source ?? "unknown");
          setStage("intro");
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to load movies:", e);
          setStage("error");
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const isDateOccasion = answers.occasion === "date" || answers.occasion === "partner";
  const genreChoices = isDateOccasion && !allGenres ? dateGenres : genreList;

  const steps = useMemo(() => {
    const base = ["mood", "occasion", "media", "genres", "recency", "ratings-gate"];
    if (answers.ratingsMatter) base.push("ratings");
    base.push("category");
    return base;
  }, [answers.ratingsMatter]);

  // Compute recommendations using the scored engine
  const results = useMemo(
    () => recommend(answers, [], moviePool, sessionSeed),
    [answers, moviePool, sessionSeed]
  );

  const current = results[resultIndex] ?? null;
  const totalMatches = results.length;

  // Score for current movie
  const currentScore = current ? scoreMovie(current, answers) : 0;
  const currentMaxScore = maxScore(answers);

  const stepKey = steps[stepIndex];
  const canAdvance =
    (stepKey === "mood" && !!answers.mood) ||
    (stepKey === "occasion" && !!answers.occasion) ||
    (stepKey === "media" && !!answers.mediaPreference) ||
    stepKey === "genres" ||
    (stepKey === "recency" && !!answers.recency) ||
    (stepKey === "ratings-gate" && answers.ratingsMatter !== null) ||
    stepKey === "ratings" ||
    stepKey === "category";

  function next() {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      const finalResults = recommend(answers, [], moviePool, sessionSeed);
      setResultIndex(0);
      setStage(finalResults.length > 0 ? "result" : "empty");
    }
  }

  function back() {
    if (stepIndex === 0) {
      setStage("intro");
    } else {
      setStepIndex(stepIndex - 1);
    }
  }

  function restart() {
    setAnswers(emptyAnswers);
    setStepIndex(0);
    setResultIndex(0);
    setOverrideMovie(null);
    setStage("intro");
  }

  function nextRecommendation() {
    if (resultIndex < totalMatches - 1) {
      setResultIndex(resultIndex + 1);
    } else {
      setResultIndex(0);
    }
  }

  return (
    <div className="brutalist-box brutalist-shadow p-4 sm:p-6 w-full h-full max-h-full relative flex flex-col overflow-hidden">
      <div className="absolute top-0 left-0 w-full border-b-2 border-[var(--retro-border)] p-1 text-xs font-mono font-bold flex justify-between bg-[var(--retro-fg)] text-[var(--retro-surface)] z-10 shrink-0">
        <span>sys.run_quiz</span>
        <span>[{stage.toUpperCase()}]</span>
      </div>
      <div className="pt-6 flex-1 overflow-hidden flex flex-col relative">
      {stage === "intro" && (
        <IntroScreen
          movieCount={moviePool.length}
          genreCount={genreCount}
          onStartQuiz={() => setStage("quiz")}
        />
      )}

      {stage === "quiz" && (
        <QuizSteps
          steps={steps}
          stepIndex={stepIndex}
          stepKey={stepKey}
          answers={answers}
          onUpdateAnswers={(updater) => setAnswers(updater)}
          onNext={next}
          onBack={back}
          canAdvance={canAdvance}
          genreChoices={genreChoices}
          isDateOccasion={isDateOccasion}
          allGenres={allGenres}
          onToggleAllGenres={() => setAllGenres((v) => !v)}
        />
      )}

      {stage === "result" && (overrideMovie || current) && (
        <MovieResult
          movie={overrideMovie || current!}
          score={overrideMovie ? undefined : currentScore}
          maxScore={overrideMovie ? undefined : currentMaxScore}
          resultIndex={overrideMovie ? undefined : resultIndex}
          totalMatches={overrideMovie ? undefined : totalMatches}
          onNext={overrideMovie ? () => setOverrideMovie(null) : nextRecommendation}
          nextLabel={overrideMovie ? "<< Back to Results" : undefined}
          onRestart={restart}
          onSelectSimilar={setOverrideMovie}
        />
      )}

      {stage === "empty" && (
        <div className="text-center py-20">
          <h2 className="font-display font-bold text-3xl mb-4 uppercase">No exact matches</h2>
          <p className="mb-8 font-mono text-sm">
            Try broadening your answers or selecting different genres.
          </p>
          <button
            onClick={restart}
            className="brutalist-button w-full py-4 text-lg"
          >
            Retake quiz
          </button>
        </div>
      )}

      {stage === "error" && (
        <div className="text-center py-20 text-[var(--retro-error)] bg-red-900/20 p-4 border-2 border-red-500">
          <h2 className="font-display font-bold text-3xl mb-4 uppercase">SYSTEM_FAILURE</h2>
          <p className="mb-8 font-mono text-sm text-red-200">
            Unable to connect to the TMDB API. Please ensure your API key is configured correctly in .env.local (or on Vercel) and that TMDB is reachable.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="brutalist-button w-full py-4 text-lg border-red-500 text-red-500 hover:bg-red-500 hover:text-black"
          >
            REBOOT_SYSTEM
          </button>
        </div>
      )}

      <AnimatePresence>
        {stage === "splash" && <SplashScreen visible={true} />}
      </AnimatePresence>
      </div>
    </div>
  );
}
