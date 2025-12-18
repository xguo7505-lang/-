
import { GoogleGenAI } from "@google/genai";

export async function generateMagicalGreeting(userName: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Write a short, magical, rhyming Christmas wish (max 30 words) for a person named ${userName || 'Friend'}. Make it sound like a spell being cast.`,
    config: {
        systemInstruction: "You are a mystical Christmas Wizard. Use evocative, festive language."
    }
  });

  return response.text || "May snowflakes dance and magic glow, in every heart where wonders grow.";
}
