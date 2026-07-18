"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("MoodFlix error boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2
            className="font-display text-3xl mb-4"
            style={{ color: "var(--md-on-surface)" }}
          >
            Something went wrong
          </h2>
          <p
            className="mb-8 text-sm max-w-xs"
            style={{ color: "var(--md-on-surface-variant)" }}
          >
            An unexpected error occurred. Please try reloading the page.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="relative overflow-hidden font-display uppercase tracking-wide text-sm px-7 py-3 rounded-full"
            style={{
              background: "var(--md-primary)",
              color: "var(--md-on-primary)",
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
