
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listModels() {
  try {
    // The google-generative-ai SDK might not have a listModels method exposed on the client directly,
    // let's try a direct fetch to the REST API if the SDK doesn't support it, but let's just try to fetch using node fetch.
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
listModels();
