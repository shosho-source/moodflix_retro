# MoodFlix

MoodFlix is a dynamic, quiz-based movie recommendation app that curates a personalized list of films based on your current mood, occasion, and preferences. It uses the TMDB API to fetch live movie data, ratings, and streaming providers, delivering a tailored cinematic experience.

## Setup Instructions

1. **Get a TMDB API Key**: Sign up at [TMDB](https://www.themoviedb.org/) and generate an API key (v3 auth).
2. **Configure Environment**: 
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   Then, open `.env.local` and replace `YOUR_TMDB_API_KEY_HERE` with your actual TMDB API key.
3. **Install Dependencies**:
   ```bash
   PUPPETEER_SKIP_DOWNLOAD=true npm install
   ```
4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js. Don't forget to set the `TMDB_API_KEY` environment variable in your Vercel project settings!
