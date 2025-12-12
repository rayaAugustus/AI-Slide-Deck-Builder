import { GoogleGenAI, Type } from "@google/genai";
import { Slide, PresentationStyle } from "../types";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-types' });
const modelName = "gemini-2.5-flash";

const getStyleInstructions = (style: PresentationStyle) => {
  switch (style) {
    case 'tech-dark':
      return 'Background: #0f172a or dark gradients. Text: White/Gray-200. Accents: Neon Blue/Purple. Font: Monospace or Inter. Tech, futuristic vibe.';
    case 'corporate-blue':
      return 'Background: White. Text: Navy Blue/Black. Accents: Professional Blue. Clean, trustworthy, serif headers possible.';
    case 'creative-vivid':
      return 'Background: Bold colors or soft pastels. Typography: Large, expressive. Layout: Asymmetrical. Artistic vibe.';
    case 'modern-minimal':
    default:
      return 'Background: White or very light gray. Typography: Helvetica/Inter. Lots of whitespace. High contrast. Clean grid.';
  }
};

export const generateSlides = async (topic: string, style: PresentationStyle, count: number = 5): Promise<Slide[]> => {
  const styleGuide = getStyleInstructions(style);
  
  const systemInstruction = `
    You are a world-class UI/UX Designer and Frontend Engineer. 
    Your goal is to kill PowerPoint by creating stunning, HTML-based slides.
    
    Design Guidelines:
    1.  Container: 16:9 aspect ratio (approx 960px x 540px).
    2.  Style: ${styleGuide}
    3.  Layout: Use Flexbox and Grid heavily for responsive, perfect alignment. DO NOT use random absolute positioning unless creating a specific artistic collage.
    4.  Typography: Use system fonts (Inter, system-ui, sans-serif). Make headings huge and impactful.
    5.  Visuals: Use CSS gradients, shadows (box-shadow), and rounded corners (border-radius) to look modern.
    6.  Images: Use <img src="https://picsum.photos/seed/{random}/800/600" /> for placeholders.
    7.  Structure: NO <html>, <head>, or <body> tags. Return ONLY the content suitable for inside a <div>.
    8.  Editability: Mark major text elements with 'data-editable="true"'.
  `;

  const prompt = `Create a ${count}-slide presentation about "${topic}". 
  Return a JSON array where each object has 'id', 'htmlContent', and 'notes'.
  Slide 1 must be a Title Slide. Slide ${count} must be a Conclusion.
  Intermediate slides should cover key points with varied layouts (split screen, grid, centered statement).
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
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
    return JSON.parse(jsonText) as Slide[];
  } catch (error) {
    console.error("Error generating slides:", error);
    throw error;
  }
};

export const updateSlideContent = async (currentHtml: string, instruction: string): Promise<string> => {
  const systemInstruction = `
    You are an AI Design Assistant. Your job is to modify existing HTML slide content based on user instructions.
    Maintain the existing style/theme unless asked to change it.
    Improve the layout using Flexbox/Grid.
    Return ONLY the new HTML string. No Markdown, no JSON.
  `;

  const prompt = `
    CURRENT HTML:
    ${currentHtml}

    USER INSTRUCTION:
    ${instruction}

    Generate the updated HTML for this slide.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { systemInstruction }
    });
    return response.text || currentHtml;
  } catch (error) {
    console.error("Error updating slide:", error);
    return currentHtml;
  }
};