"use client";

import { motion, AnimatePresence } from "framer-motion";
import { QuizAnswers, Rating } from "@/lib/types";
import OptionCard from "./OptionCard";
import Sprocket from "./Sprocket";
import {
  moodOptions,
  occasionOptions,
  recencyOptions,
  ratingOptions,
  categoryOptions,
  mediaPreferenceOptions,
} from "./QuizConstants";

interface QuizStepsProps {
  steps: string[];
  stepIndex: number;
  stepKey: string;
  answers: QuizAnswers;
  onUpdateAnswers: (updater: (a: QuizAnswers) => QuizAnswers) => void;
  onNext: () => void;
  onBack: () => void;
  canAdvance: boolean;
  genreChoices: string[];
  isDateOccasion: boolean;
  allGenres: boolean;
  onToggleAllGenres: () => void;
}

function Step({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display text-xl sm:text-2xl mb-1.5 uppercase font-bold">{title}</h2>
      {hint && (
        <p className="text-sm mb-5 font-mono">
          {hint}
        </p>
      )}
      {!hint && <div className="mb-5" />}
      <div className="grid gap-2.5 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export default function QuizSteps({
  steps,
  stepIndex,
  stepKey,
  answers,
  onUpdateAnswers,
  onNext,
  onBack,
  canAdvance,
  genreChoices,
  isDateOccasion,
  allGenres,
  onToggleAllGenres,
}: QuizStepsProps) {
  function toggleGenre(g: string) {
    onUpdateAnswers((a) => ({
      ...a,
      genres: a.genres.includes(g) ? a.genres.filter((x) => x !== g) : [...a.genres, g],
    }));
  }

  function toggleRating(r: Rating) {
    onUpdateAnswers((a) => ({
      ...a,
      ratings: a.ratings.includes(r) ? a.ratings.filter((x) => x !== r) : [...a.ratings, r],
    }));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-5 sm:mb-7 shrink-0">
        <Sprocket total={steps.length} current={stepIndex} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-2 -mr-2">
      <AnimatePresence mode="wait">
        <motion.div
          key={stepKey}
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -30, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {stepKey === "mood" && (
            <Step title="How are you today?">
              {moodOptions.map((o) => (
                <OptionCard
                  key={o.value}
                  label={o.label}
                  sublabel={o.sub}
                  selected={answers.mood === o.value}
                  onClick={() => onUpdateAnswers((a) => ({ ...a, mood: o.value }))}
                />
              ))}
            </Step>
          )}

          {stepKey === "occasion" && (
            <Step title="What's closest to your occasion?">
              {occasionOptions.map((o) => (
                <OptionCard
                  key={o.value}
                  label={o.label}
                  selected={answers.occasion === o.value}
                  onClick={() => onUpdateAnswers((a) => ({ ...a, occasion: o.value }))}
                />
              ))}
            </Step>
          )}

          {stepKey === "media" && (
            <Step title="Movies or TV Series?">
              {mediaPreferenceOptions.map((o) => (
                <OptionCard
                  key={o.value}
                  label={o.label}
                  selected={answers.mediaPreference === o.value}
                  onClick={() => onUpdateAnswers((a) => ({ ...a, mediaPreference: o.value }))}
                />
              ))}
            </Step>
          )}

          {stepKey === "genres" && (
            <Step
              title="Pick any genres you're into"
              hint="Multiple answers are possible — leave it empty to consider all genres."
            >
              {genreChoices.map((g) => (
                <OptionCard
                  key={g}
                  label={g}
                  multi
                  selected={answers.genres.includes(g)}
                  onClick={() => toggleGenre(g)}
                />
              ))}
              {isDateOccasion && (
                <OptionCard
                  label="I'd like to choose from all genres."
                  sublabel="Not recommended for movie dates."
                  multi
                  selected={allGenres}
                  onClick={onToggleAllGenres}
                />
              )}
            </Step>
          )}

          {stepKey === "recency" && (
            <Step title="How old can the movie be?">
              {recencyOptions.map((o) => (
                <OptionCard
                  key={o.value}
                  label={o.label}
                  selected={answers.recency === o.value}
                  onClick={() => onUpdateAnswers((a) => ({ ...a, recency: o.value }))}
                />
              ))}
            </Step>
          )}

          {stepKey === "ratings-gate" && (
            <Step title="Does the age rating matter?" hint="For example, only showing R-rated films.">
              <OptionCard
                label="Yes, let me choose."
                selected={answers.ratingsMatter === true}
                onClick={() => onUpdateAnswers((a) => ({ ...a, ratingsMatter: true }))}
              />
              <OptionCard
                label="No, it doesn't matter."
                selected={answers.ratingsMatter === false}
                onClick={() =>
                  onUpdateAnswers((a) => ({ ...a, ratingsMatter: false, ratings: [] }))
                }
              />
            </Step>
          )}

          {stepKey === "ratings" && (
            <Step title="Which ratings are okay?" hint="Multiple answers are possible.">
              {ratingOptions.map((o) => (
                <OptionCard
                  key={o.value}
                  label={`${o.label}-Rated`}
                  sublabel={o.sub}
                  multi
                  selected={answers.ratings.includes(o.value)}
                  onClick={() => toggleRating(o.value)}
                />
              ))}
            </Step>
          )}

          {stepKey === "category" && (
            <Step
              title="Any other category you're after?"
              hint="If nothing matches, this question is quietly ignored."
            >
              {categoryOptions.map((o) => (
                <OptionCard
                  key={o.value}
                  label={o.label}
                  selected={answers.category === o.value}
                  onClick={() => onUpdateAnswers((a) => ({ ...a, category: o.value }))}
                />
              ))}
            </Step>
          )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 sm:pt-6 border-t-2 border-[var(--retro-border)] shrink-0 bg-[var(--retro-surface)] z-10">
        <button
          onClick={onBack}
          className="brutalist-button py-3 px-6 text-sm"
        >
          &lt;&lt;&lt; Back
        </button>
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className="brutalist-button primary py-3 px-8 text-sm disabled:opacity-30 disabled:pointer-events-none"
        >
          {stepIndex === steps.length - 1 ? "Check results" : "Next"} &gt;&gt;&gt;
        </button>
      </div>
    </div>
  );
}
