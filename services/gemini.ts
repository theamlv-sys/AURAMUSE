import { GoogleGenAI } from "@google/genai";

export async function generateSVG(prompt: string, isPromotional: boolean = false) {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
  
  const duration = isPromotional ? "30 to 60 seconds" : "15 to 30 seconds";
  const complexity = isPromotional ? "multi-stage promotional sequence with cinematic transitions, text overlays, and professional motion curves" : "professional high-end motion graphics loop";

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are a world-class Motion Graphics Designer and SVG Expert. 
    
    Task: Create a professional, high-end animated SVG for the following request: "${prompt}". 
    
    Technical Requirements:
    1. Output ONLY the raw SVG code. No markdown, no explanations.
    2. Include sophisticated CSS animations within a <style> tag. Use cubic-bezier timing functions for natural motion.
    3. Duration: ${duration}. Complexity: ${complexity}.
    4. Aesthetics: Use modern design trends—glassmorphism, mesh gradients, dynamic shadows, fluid organic paths, and high-end typography.
    5. Responsiveness: Use viewBox and width/height="100%".
    6. Structure: Use groups (<g>) to organize scenes. Use unique, descriptive IDs for all elements.
    7. Animation: For promotional videos, implement a multi-scene structure where elements transition in and out. Use opacity, transform (scale, rotate, translate), and filter (blur) animations.
    8. Quality: The result must look like it was made in After Effects or Figma, but implemented entirely in SVG/CSS.`,
    config: {
      temperature: 0.7,
      topP: 0.95,
      tools: [{ googleSearch: {} }], // Allows the AI to research the prompt topic
    }
  });

  const text = response.text || '';
  // Extract just the SVG code from the response
  const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
  return svgMatch ? svgMatch[0] : text;
}
