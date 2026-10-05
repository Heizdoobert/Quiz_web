import { GoogleGenAI } from '@google/genai';

async function test() {
  const ai = new GoogleGenAI({});
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Say hello in JSON {"msg": "hello"}',
    config: { responseMimeType: 'application/json' }
  });
  console.log(response.text);
}
test();
