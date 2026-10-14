# lib/sdk/gemini.ts
lines:6 exports:gemini
---
import { GoogleGenAI } from '@google/genai';

// Reads GEMINI_API_KEY from the environment. A fresh client per call keeps tests simple.
export function gemini() {
  return new GoogleGenAI({});
}
