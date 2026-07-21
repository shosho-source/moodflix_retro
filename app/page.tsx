"use client";

import Quiz from "@/components/Quiz";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col bg-[var(--retro-bg)] overflow-hidden">
      <main className="flex-1 w-full max-w-[420px] sm:max-w-4xl mx-auto p-4 flex flex-col justify-center overflow-hidden">
        <ErrorBoundary>
          <Quiz />
        </ErrorBoundary>
      </main>
    </div>
  );
}
