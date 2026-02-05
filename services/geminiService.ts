import { GoogleGenAI, Type, FunctionDeclaration, Tool, Schema } from "@google/genai";
import { Asset, ProjectType, AIResponse } from "../types";

// Helper to ensure we get a fresh instance with the latest key if selected
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION_BASE = `You are Muse, the world's most advanced creative writing assistant. 
Your goal is to write in a purely human style—nuanced, emotional, and devoid of "AI" clichés (e.g., "tapestry", "delve", "testament").
You are an expert in all formats:
- Novels: Deep POV, "show don't tell", evocative imagery.
- Screenplays: Standard industry formatting, visual storytelling.
- YouTube Scripts: High retention hooks, conversational flow, clear segmenting.
- Essays/Reports: Rigorous, structured, academic or professional tone.
- Children's Books: Age-appropriate vocabulary, engaging rhythm.
- Professional Emails: Concise, persuasive, and perfectly calibrated tone.
- Technical Documentation: Clear, accurate, and easy to follow.
- Lyrics/Poetry: Rhythmic, metaphor-rich, and emotionally resonant.

When analyzing media (images/videos/PDFs), deeply interpret the content to fuel your writing.
If the user provides a YouTube link, use Google Search to find information about it if you don't know it.

You have access to the user's current editor content.
If the user asks you to "edit", "rewrite", "fix", or "change" the document, use the 'updateEditor' tool.
Provide the FULL new content for the editor in the 'newContent' parameter. Do not provide just a diff.
`;

export const updateEditorTool: FunctionDeclaration = {
  name: "updateEditor",
  description: "Updates the text editor content. Use this to perform edits, rewrites, or append text when explicitly asked by the user.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      newContent: {
        type: Type.STRING,
        description: "The full text content that should replace the current editor content.",
      },
    },
    required: ["newContent"],
  },
};

export const triggerSearchTool: FunctionDeclaration = {
  name: "triggerChatSearch",
  description: "Triggers a Google Search in the main chat interface. Use this when the user asks you to search the web, look something up, or find information online.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The search query to execute in the chat.",
      },
    },
    required: ["query"],
  },
};

export const generateWriting = async (
  prompt: string,
  projectType: ProjectType,
  contextAssets: Asset[],
  history: { role: string; content: string }[],
  currentEditorContent: string,
  useSearch: boolean = false
): Promise<AIResponse> => {
  const ai = getAI();
  // Using gemini-3-flash-preview as requested for Search Grounding
  const modelId = 'gemini-3-flash-preview';

  const parts: any[] = [];
  const linkAssets = contextAssets.filter(a => a.type === 'link');

  // Add file assets (images, videos, pdfs)
  for (const asset of contextAssets) {
    if (asset.base64 && (asset.type === 'image' || asset.type === 'video' || asset.type === 'pdf')) {
      parts.push({
        inlineData: {
          mimeType: asset.mimeType,
          data: asset.base64,
        },
      });
    }
  }

  // Handle Links by appending to prompt
  let augmentedPrompt = prompt;
  if (linkAssets.length > 0) {
      augmentedPrompt += `\n\n[CONTEXT LINKS]:\nThe user has provided the following external links. Use Google Search to retrieve their context/content if necessary:\n` + linkAssets.map(a => `- ${a.url}`).join('\n');
  }

  // Add text prompt
  parts.push({ text: augmentedPrompt });

  // Add current editor content as context (hidden from chat history visual but sent to model)
  const augmentedSystemInstruction = SYSTEM_INSTRUCTION_BASE + `\nCurrent Mode: ${projectType}\n\nCURRENT EDITOR CONTENT:\n"""\n${currentEditorContent}\n"""`;

  const tools: Tool[] = [];
  
  // CRITICAL: gemini-3-flash-preview requires googleSearch to be the ONLY tool if used.
  // If useSearch is true OR we have links (implying need for search), we enable googleSearch and DISABLE updateEditor.
  const shouldEnableSearch = useSearch || linkAssets.length > 0;

  if (shouldEnableSearch) {
    tools.push({ googleSearch: {} });
  } else {
    // Only enable editor update if we are NOT searching
    tools.push({ functionDeclarations: [updateEditorTool] });
  }

  try {
    const chat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: augmentedSystemInstruction,
        tools: tools,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.content }],
      })),
    });

    const result = await chat.sendMessage({
      message: parts,
    });

    let editorUpdate: string | undefined;
    let responseText = result.text || "";

    // Check for function calls (only relevant if search was NOT active)
    const functionCalls = result.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        if (call.name === "updateEditor") {
          const args = call.args as any;
          if (args && args.newContent) {
            editorUpdate = args.newContent;
            if (!responseText) {
                responseText = "I've updated the editor with your changes.";
            }
          }
        }
      }
    }

    // Handle Grounding Metadata (Sources)
    if (result.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = result.candidates[0].groundingMetadata.groundingChunks;
        const sources = chunks
            .map((chunk: any) => chunk.web?.uri ? `[${chunk.web.title || 'Source'}](${chunk.web.uri})` : null)
            .filter(Boolean);
            
        if (sources.length > 0) {
            const uniqueSources = Array.from(new Set(sources));
            responseText += `\n\n**Sources:**\n${uniqueSources.map(s => `- ${s}`).join('\n')}`;
        }
    }

    return { text: responseText, editorUpdate };

  } catch (error) {
    console.error("Gemini Generate Error:", error);
    return { text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

export const generateVideoPromptFromText = async (text: string): Promise<string> => {
    const ai = getAI();
    // Use flash for fast summarization
    const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
    const prompt = `Create a highly visual, cinematic video generation prompt (max 250 characters) based on this text. Describe the scene, lighting, and action. Text: """${text.slice(0, 2000)}"""`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
}

export const generateStoryboardImage = async (prompt: string, aspectRatio: "16:9" | "1:1" | "9:16" = "16:9"): Promise<string> => {
  const ai = getAI();
  const modelId = 'gemini-3-pro-image-preview';
  
  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "2K" 
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};

export const generateVeoVideo = async (prompt: string, imageBase64?: string): Promise<string> => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      throw new Error("API_KEY_REQUIRED");
    }
  }

  const ai = getAI();
  const modelId = 'veo-3.1-fast-generate-preview'; 

  try {
    let operation;
    
    if (imageBase64) {
        operation = await ai.models.generateVideos({
            model: modelId,
            prompt: prompt,
            image: {
                imageBytes: imageBase64,
                mimeType: 'image/png' 
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });
    } else {
        operation = await ai.models.generateVideos({
            model: modelId,
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });
    }

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); 
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video URI not found in response.");

    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error) {
    console.error("Video Gen Error:", error);
    throw error;
  }
};

export const analyzeMediaContext = async (assets: Asset[]): Promise<string> => {
    const ai = getAI();
    // Switched to gemini-3-flash-preview for robust tool use (search)
    const modelId = 'gemini-3-flash-preview'; 

    if (assets.length === 0) return "No media to analyze.";

    const parts: any[] = [];
    
    for (const asset of assets) {
        if (asset.base64 && (asset.type === 'image' || asset.type === 'video' || asset.type === 'pdf')) {
            parts.push({
                inlineData: {
                    mimeType: asset.mimeType,
                    data: asset.base64!
                }
            });
        } else if (asset.type === 'link') {
            parts.push({ text: `[Link]: ${asset.url}` });
        }
    }

    parts.push({ text: "Analyze these assets (images, videos, PDFs, Links) deeply. Describe the mood, content, potential storylines, and setting details. If there are links, use Google Search to find out what they are about." });

    const tools: Tool[] = [];
    // If links are present, MUST use googleSearch and CANNOT use other tools (though we have none here)
    if (assets.some(a => a.type === 'link')) {
        tools.push({ googleSearch: {} });
    }

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts },
            config: { tools }
        });
        
        let text = response.text || "Analysis failed.";

        // Handle Grounding Metadata (Sources)
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            const chunks = response.candidates[0].groundingMetadata.groundingChunks;
            const sources = chunks
                .map((chunk: any) => chunk.web?.uri ? `[${chunk.web.title || 'Source'}](${chunk.web.uri})` : null)
                .filter(Boolean);
                
            if (sources.length > 0) {
                const uniqueSources = Array.from(new Set(sources));
                text += `\n\n**Sources:**\n${uniqueSources.map(s => `- ${s}`).join('\n')}`;
            }
        }
        
        return text;
    } catch (e) {
        console.error("Analysis Error", e);
        return "Error analyzing media. " + (e instanceof Error ? e.message : "");
    }
}