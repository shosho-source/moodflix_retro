import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testKey() {
  const apiKey = process.env.GEMINI_API_KEY!;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text: "Hello" }] },
      // Try passing outputDimensionality in the request? No, it's not documented clearly in this SDK. Let's just slice it.
    });
    console.log("Vector length:", result.embedding.values.length);
    console.log("Sliced length:", result.embedding.values.slice(0, 768).length);
  } catch (e) {
    console.error("SDK Error:", e instanceof Error ? e.message : String(e));
  }
}

testKey();
