require('dotenv').config({path: '.env.local'});
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const prompt = `A user searched for a movie using the query: "V FOR VENDETTAS". They might have made a typo. If it's a very clear typo of a well-known movie, reply with ONLY the exact movie title. If it is NOT a clear typo, or you are unsure, or it's just a random word, reply with "UNKNOWN".`;

genAI.getGenerativeModel({ model: 'gemini-pro' })
  .generateContent(prompt)
  .then(res => console.log("RESPONSE:", res.response.text()))
  .catch(console.error);
