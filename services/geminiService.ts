import { GoogleGenAI, Type } from "@google/genai";
import { Slide } from "../types";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-types' });

export const generateSlides = async (topic: string, count: number = 5): Promise<Slide[]> => {
  const model = "gemini-2.5-flash";
  
  const systemInstruction = `
    You are an expert presentation designer and front-end developer. 
    Your task is to generate HTML code for presentation slides based on a topic.
    
    Rules for HTML generation:
    1. Each slide must be a self-contained HTML fragment suitable for placement inside a 16:9 aspect ratio container (approx 960px x 540px).
    2. Use inline styles primarily for positioning and colors to ensure portability.
    3. Use absolute positioning (position: absolute) for elements to allow for drag-and-drop editing later, or simple flexbox layouts.
    4. Provide placeholder images from https://picsum.photos/400/300 if images are needed.
    5. Ensure text contrast is accessible.
    6. Do not include <html>, <head>, or <body> tags. Just the content div's inner HTML.
    7. Mark editable elements: add 'data-type="text"' to headings/paragraphs, 'data-type="image"' to images.
  `;

  const prompt = `Create a ${count}-slide presentation about "${topic}". 
  Return a JSON array where each object has an 'id' (unique string), 'htmlContent' (string), and 'notes' (string for speaker notes).
  Make the design professional, clean, and modern. Use a color palette that matches the topic.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              htmlContent: { type: Type.STRING },
              notes: { type: Type.STRING }
            },
            required: ["id", "htmlContent"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No content generated");

    const slides = JSON.parse(jsonText) as Slide[];
    return slides;
  } catch (error) {
    console.error("Error generating slides:", error);
    throw error;
  }
};