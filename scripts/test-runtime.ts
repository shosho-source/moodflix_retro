import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function test() {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/1523145?api_key=${TMDB_API_KEY}`);
    const data = await res.json();
    console.log("Runtime:", data.runtime);
  } catch (e) {
    console.error(e);
  }
}
test();
