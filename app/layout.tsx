import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoodFlix — A movie, picked for you",
  description:
    "Answer a few quick questions and get one movie recommendation at a time. No lists, no scrolling, no registration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
