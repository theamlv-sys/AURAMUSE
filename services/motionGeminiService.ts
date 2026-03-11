import { GoogleGenAI, Modality } from "@google/genai";
import { callGeminiProxy } from './geminiService';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_GENAI_API_KEY || '' });
  }

  async researchTopic(prompt: string) {
    const systemInstruction = `You are a Research Assistant for a Motion Graphics Designer. 
      Your task is to research the topic, brand, or industry mentioned in the prompt: "${prompt}".
      
      Focus on:
      1. Brand values and visual identity (colors, fonts, mood).
      2. Modern design trends related to this specific topic.
      3. Key messaging that should be included in a 60s promotional video.
      4. Visual metaphors that translate well to motion graphics.
      
      Output a concise summary of your findings that will guide the SVG generation. Use Google Search to ensure accuracy.`;

    const response = await callGeminiProxy('gemini-3.1-pro-preview', 
      [{ parts: [{ text: prompt }] }],
      {
        temperature: 0.7,
        topP: 0.95,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        tools: [{ googleSearch: {} }] // Enable search for research
      }
    );

    const research = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean);

    return {
      research,
      sources: sources || []
    };
  }

  async generateSVG(prompt: string, isPromotional: boolean = false, researchContext?: string) {
    const duration = isPromotional ? "30 to 60 seconds" : "15 to 30 seconds";
    const complexity = isPromotional ? "multi-stage promotional sequence with cinematic transitions, text overlays, and professional motion curves" : "professional high-end motion graphics loop";

    const systemInstruction = `You are a world-class Motion Graphics Designer and SVG Expert. 
      
      Task: Create a professional, high-end animated SVG for the following request: "${prompt}". 
      
      ${researchContext ? `Research context to guide your design: \n${researchContext}\n` : ''}
      
      Technical Requirements:
      1. Output ONLY the raw SVG code. No markdown, no explanations.
      2. Include sophisticated CSS animations within a <style> tag. Use cubic-bezier timing functions for natural motion.
      3. Duration: ${duration}. Complexity: ${complexity}.
      4. Aesthetics: Use modern design trends—glassmorphism, mesh gradients, dynamic shadows, fluid organic paths, and high-end typography.
      5. Responsiveness: Use viewBox and width/height="100%".
      6. Structure: Use groups (<g>) to organize scenes. Use unique, descriptive IDs for all elements.
      7. Animation: For promotional videos, implement a multi-scene structure where elements transition in and out. Use opacity, transform (scale, rotate, translate), and filter (blur) animations.
      8. Quality: The result must look like it was made in After Effects or Figma, but implemented entirely in SVG/CSS.`;

    const response = await callGeminiProxy('gemini-3.1-pro-preview', 
      [{ parts: [{ text: prompt }] }],
      {
        temperature: 0.7,
        topP: 0.95,
        systemInstruction: { parts: [{ text: systemInstruction }] }
      }
    );

    let fullText = '';
    const parts = response.candidates?.[0]?.content?.parts || [];
    parts.forEach((part: any) => {
      // Gemini 3.1 Pro includes thought blocks and actual text blocks.
      if (part.text && !part.thought && !part.executableCode && !part.codeExecutionResult) {
          fullText += part.text;
      }
    });

    // Fallback if fullText is empty (e.g., structure was unexpected)
    if (!fullText) {
        fullText = response.text || '';
    }

    const svgMatch = fullText.match(/<svg[\s\S]*?<\/svg>/i);
    // Extract grounding metadata if available
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => chunk.web?.uri).filter(Boolean);
    
    return {
      code: svgMatch ? svgMatch[0] : fullText,
      sources: sources || []
    };
  }

  async refineSVG(currentSVG: string, editRequest: string) {
    const systemInstruction = `You are an expert SVG editor. Modify the following SVG code based on this request: "${editRequest}".
      
      Current SVG:
      ${currentSVG}
      
      Requirements:
      1. Output ONLY the updated raw SVG code.
      2. Maintain the existing animation structure unless specifically asked to change it.
      3. Ensure all IDs and styles remain consistent.
      4. Do not include any markdown formatting or explanations, just the <svg>...</svg> block.`;

    const response = await callGeminiProxy('gemini-3.1-pro-preview', 
      [{ parts: [{ text: editRequest }] }],
      {
        temperature: 0.4,
        topP: 0.95,
        systemInstruction: { parts: [{ text: systemInstruction }] }
      }
    );

    let fullText = '';
    const parts = response.candidates?.[0]?.content?.parts || [];
    parts.forEach((part: any) => {
      if (part.text && !part.thought && !part.executableCode && !part.codeExecutionResult) {
          fullText += part.text;
      }
    });

    if (!fullText) {
        fullText = response.text || '';
    }

    const svgMatch = fullText.match(/<svg[\s\S]*?<\/svg>/i);
    return svgMatch ? svgMatch[0] : fullText;
  }

  // Live API Session
  async connectLive(callbacks: {
    onopen?: () => void;
    onmessage?: (message: any) => void;
    onerror?: (error: any) => void;
    onclose?: () => void;
  }) {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_GENAI_API_KEY || '' });
    
    // Audio context for playback
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    let nextStartTime = 0;

    const session = await ai.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      callbacks: {
        onopen: async () => {
          callbacks.onopen?.();
          
          // Setup microphone
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioCtx = new AudioContext({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Convert to PCM 16-bit
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
              }
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
              session.sendRealtimeInput({
                media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
              });
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);
          } catch (err) {
            console.error('Microphone access denied:', err);
          }
        },
        onmessage: async (message) => {
          callbacks.onmessage?.(message);
          
          // Handle audio output
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const pcmData = new Int16Array(bytes.buffer);
            const floatData = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
              floatData[i] = pcmData[i] / 0x7FFF;
            }

            const buffer = audioContext.createBuffer(1, floatData.length, 24000);
            buffer.getChannelData(0).set(floatData);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            
            const startTime = Math.max(nextStartTime, audioContext.currentTime);
            source.start(startTime);
            nextStartTime = startTime + buffer.duration;
          }

          if (message.serverContent?.interrupted) {
            // Stop playback logic would go here
            nextStartTime = audioContext.currentTime;
          }
        },
        onerror: callbacks.onerror,
        onclose: callbacks.onclose,
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        systemInstruction: "You are a creative director for SVG motion graphics. Help the user describe a perfect animated SVG. Focus on CSS animations, vector paths, and geometric motion. When ready, summarize the request into a single prompt starting with 'Prompt: '.",
      },
    });

    return session;
  }
}

export const geminiService = new GeminiService();
