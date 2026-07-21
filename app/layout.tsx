import { Space_Mono, Inter } from "next/font/google";
import type { Metadata } from "next";
import "material-symbols/outlined.css";
import "./globals.css";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

const inter = Inter({
  weight: ["400", "600", "800"],
  subsets: ["latin"],
  variable: "--font-inter",
});
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
    <html lang="en" className={`antialiased ${spaceMono.variable} ${inter.variable}`}>
      <head>
      </head>
      <body className="flex flex-col">
        {children}
      </body>
    </html>
  );
}
