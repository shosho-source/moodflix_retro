"use client";

import Quiz from "@/components/Quiz";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col" style={{ background: "var(--md-surface-dim)" }}>
      <main className="flex-1 w-full max-w-[420px] sm:max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-16 flex flex-col justify-center">
        <ErrorBoundary>
          <Quiz />
        </ErrorBoundary>
      </main>
    </div>
  );
}
