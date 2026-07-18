"use client";

import Quiz from "@/components/Quiz";

export default function Home() {
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
            <span className="font-display text-lg tracking-wide text-[var(--md-on-surface)]">MoodFlix</span>
          </div>
          <p
            className="text-xs hidden sm:block uppercase tracking-[0.15em]"
            style={{ color: "var(--md-on-surface-variant)" }}
          >
            An MD3-inspired movie picker
          </p>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-16 flex flex-col justify-center">
        <Quiz />
      </main>
    </div>
  );
}
