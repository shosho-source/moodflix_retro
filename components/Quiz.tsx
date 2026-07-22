"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Movie, QuizAnswers, emptyAnswers } from "@/lib/types";
import { genreList, dateGenres } from "@/lib/genre-lists";
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

  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [movieCount, setMovieCount] = useState<number>(500);

  // Simulate loading delay for the intro splash screen and fetch db stats
  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Fetch actual movie count from DB
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.count) {
            setMovieCount(data.count);
          }
        }
      } catch (err) {
        console.error("Failed to fetch DB stats:", err);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (!cancelled) {
        setStage("intro");
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

  const current = searchResults[resultIndex] ?? null;
  const totalMatches = searchResults.length;

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

  async function next() {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setStage("loading");
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(answers),
        });
        const data = await res.json();
        const fetchedResults = data.results || [];
        setSearchResults(fetchedResults);
        setResultIndex(0);
        setStage(fetchedResults.length > 0 ? "result" : "empty");
      } catch (error) {
        console.error("Failed to fetch recommendations:", error);
        setStage("error");
      }
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
          movieCount={movieCount}
          genreCount={genreList.length}
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
          resultIndex={overrideMovie ? undefined : resultIndex}
          totalMatches={overrideMovie ? undefined : totalMatches}
          onNext={overrideMovie ? () => setOverrideMovie(null) : nextRecommendation}
          nextLabel={overrideMovie ? "<< Back to Results" : undefined}
          onRestart={restart}
          onSelectSimilar={setOverrideMovie}
        />
      )}

      {stage === "loading" && (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[var(--retro-bg)] border-2 border-[var(--retro-border)] min-h-[400px]">
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="text-lg sm:text-xl font-bold font-mono uppercase text-center glitch-anim"
          >
            {"> ANALYZING PREFERENCES..."}
            <br/>
            {"> SEARCHING INDEX..."}
          </motion.div>
        </div>
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
