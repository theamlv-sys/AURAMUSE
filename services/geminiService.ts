import { Type, FunctionDeclaration, Tool } from "@google/genai";
import { Asset, ProjectType, AIResponse, VoiceName, AVAILABLE_VOICES, TTSCharacterSettings, StoryBibleEntry, SubscriptionTier } from "../types";
import { EXPERT_PROMPTS } from "../prompts";
import { supabase } from './supabaseClient';

// Helper to call the secure Gemini Proxy Supabase Function
// Key is now managed by Supabase Edge Functions for security

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
    };
  }
}

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
- Ads: High-conversion copy, punchy headlines, strong Call-to-Action (CTA), persuasive psychology.
- Commercials: Script format (Video/Audio columns), visual cues, timing-conscious, emotional hooks.
- Social Media: Viral hooks, engagement loops, platform-specific formatting (Threads, TikTok, LinkedIn), trend-aware.

When analyzing media (images/videos/PDFs), deeply interpret the content to fuel your writing.
If the user provides a YouTube link, it will be attached as a native video input. You are WATCHING the video — analyze the actual visual content, on-screen text, audio, spoken words, and scene changes directly. Provide insights based on what you see and hear, not just metadata or transcripts.

You have access to the user's current editor content.
CRITICAL INSTRUCTIONS FOR EDITOR MANIPULATION:
1. If the user asks to "add to", "continue", "write the next part", or "extend" the story, use the 'appendEditor' tool. This adds text to the end without deleting anything.
2. ONLY use the 'updateEditor' tool if the user asks to "rewrite", "fix", "edit", or "change" the existing content. 'updateEditor' REPLACES the entire content, so you must provide the FULL new text.

AUDIO STUDIO CONTROL:
You have full control over the Audio Studio via 'configureAudioStudio'.
If a user asks to "make these people speak", "turn this into audio", or "generate voices":
1. Analyze the text to find characters.
2. If multiple characters, set mode to 'multi'.
3. Extract their lines into a script format ("Char: Line").
4. Choose appropriate voices from the available list.
5. Define their 'settings' (style, pacing, accent) based on the context (e.g., "Martha" = Authoritative, Cold).
6. Set 'autoGenerate' to true to start the process immediately.
`;

export const updateEditorTool: FunctionDeclaration = {
  name: "updateEditor",
  description: "Replaces the ENTIRE text editor content. Use this ONLY for rewrites, fixes, or edits where the whole document changes. Do NOT use for adding new text.",
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

export const appendEditorTool: FunctionDeclaration = {
  name: "appendEditor",
  description: "Appends text to the END of the editor. Use this for continuing a story, adding new scenes, or extending the document. Safe for long texts.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      contentToAdd: {
        type: Type.STRING,
        description: "The text to add to the end of the document.",
      },
    },
    required: ["contentToAdd"],
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

export const configureAudioStudioTool: FunctionDeclaration = {
  name: "configureAudioStudio",
  description: "Configures and triggers the TTS Audio Studio. Use this to set up voices, scripts, and character styles for audio generation.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      mode: { type: Type.STRING, enum: ['single', 'multi'], description: "Single narrator or Ensemble cast (max 2 speakers)." },
      script: { type: Type.STRING, description: "The formatted script text (e.g. 'Name: Line')." },
      singleVoice: { type: Type.STRING, description: "Voice name for single mode." },
      characters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            voice: { type: Type.STRING, description: "One of the available voice names." },
            settings: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING, description: "Persona description e.g. 'Grumpy old man'" },
                style: { type: Type.STRING, description: "Emotional tone e.g. 'Whispering'" },
                pacing: { type: Type.STRING, description: "Speed e.g. 'Slow'" },
                accent: { type: Type.STRING, description: "Accent e.g. 'British'" }
              }
            }
          },
          required: ["name", "voice"]
        }
      },
      autoGenerate: { type: Type.BOOLEAN, description: "Set to true to immediately trigger audio generation." }
    },
    required: ["mode", "script"]
  }
};

export const listEmailsTool: FunctionDeclaration = {
  name: "listEmails",
  description: "Lists the user's recent emails from their Gmail inbox. Use this to find emails to read or reply to.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      count: { type: Type.NUMBER, description: "Number of emails to fetch (default 10)." },
      query: { type: Type.STRING, description: "Search query for filtering emails (e.g. 'is:unread', 'from:boss')." }
    }
  }
};

export const sendEmailTool: FunctionDeclaration = {
  name: "sendEmail",
  description: "Sends an email via the user's Gmail account. Use this ONLY after the user has explicitly confirmed the content.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      to: { type: Type.STRING, description: "Recipient email address." },
      subject: { type: Type.STRING, description: "Email subject line." },
      body: { type: Type.STRING, description: "The full HTML or text body of the email." }
    },
    required: ["to", "subject", "body"]
  }
};

export const listCalendarEventsTool: FunctionDeclaration = {
  name: "listCalendarEvents",
  description: "Lists upcoming events from the user's primary Google Calendar.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  }
};

export const createCalendarEventTool: FunctionDeclaration = {
  name: "createCalendarEvent",
  description: "Creates a new event in the user's Google Calendar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "Title of the event." },
      description: { type: Type.STRING, description: "Description or notes for the event." },
      startTime: { type: Type.STRING, description: "Start time in ISO 8601 format (e.g., 2023-10-27T10:00:00Z)." },
      endTime: { type: Type.STRING, description: "End time in ISO 8601 format." }
    },
    required: ["summary", "startTime", "endTime"]
  }
};

export const deleteCalendarEventTool: FunctionDeclaration = {
  name: "deleteCalendarEvent",
  description: "Deletes an event from the user's Google Calendar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: { type: Type.STRING, description: "The unique ID of the event to delete." }
    },
    required: ["eventId"]
  }
};

export const generateWriting = async (
  prompt: string,
  projectType: ProjectType,
  contextAssets: Asset[],
  history: { role: string; content: string }[],
  currentEditorContent: string,
  useSearch: boolean = false,
  storyBible: StoryBibleEntry[] = []
): Promise<AIResponse> => {
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

  // Separate YouTube links from regular web links
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/i;
  const youtubeAssets = linkAssets.filter(a => a.url && youtubeRegex.test(a.url));
  const nonYoutubeLinks = linkAssets.filter(a => a.url && !youtubeRegex.test(a.url));

  // Pass YouTube URLs as native file_data parts so Gemini WATCHES the video (audio + visual frames)
  for (const yt of youtubeAssets) {
    parts.push({
      fileData: {
        mimeType: 'video/*',
        fileUri: yt.url,
      }
    });
  }

  // Handle non-YouTube links by appending to prompt for Google Search
  let augmentedPrompt = prompt;
  if (nonYoutubeLinks.length > 0) {
    augmentedPrompt += `\n\n[CONTEXT LINKS]:\nThe user has provided the following external links. Use Google Search to retrieve their context/content if necessary:\n` + nonYoutubeLinks.map(a => `- ${a.url}`).join('\n');
  }
  if (youtubeAssets.length > 0) {
    augmentedPrompt += `\n\n[YOUTUBE VIDEOS ATTACHED]: ${youtubeAssets.length} YouTube video(s) have been attached above as native video input. You are WATCHING these videos — analyze the actual visual content, audio, and spoken words directly. Do NOT just summarize from metadata or transcripts. Describe what you actually see and hear.`;
  }

  // Add text prompt
  parts.push({ text: augmentedPrompt });

  // CONSTRUCT BIBLE CONTEXT
  let bibleContext = '';
  if (storyBible.length > 0) {
    const chars = storyBible.filter(e => e.category === 'character').map(e => `- ${e.name}: ${e.description}`).join('\n');
    const world = storyBible.filter(e => e.category === 'world').map(e => `- ${e.name}: ${e.description}`).join('\n');
    const style = storyBible.filter(e => e.category === 'style').map(e => `- ${e.name}: ${e.description}`).join('\n');

    bibleContext = `\n\nSTORY BIBLE (ALWAYS ADHERE TO THESE FACTS):\n`;
    if (chars) bibleContext += `CHARACTERS:\n${chars}\n`;
    if (world) bibleContext += `WORLD/LORE:\n${world}\n`;
    if (style) bibleContext += `STYLE/TONE:\n${style}\n`;
  }

  // Add current editor content as context (hidden from chat history visual but sent to model)
  const expertPersona = EXPERT_PROMPTS[projectType] || "You are a helpful creative writing assistant.";
  const augmentedSystemInstruction = SYSTEM_INSTRUCTION_BASE + `\n\n### EXPERT PERSONA (${projectType}):\n${expertPersona}\n` + `\nCurrent Mode: ${projectType}\n${bibleContext}\nCURRENT EDITOR CONTENT:\n"""\n${currentEditorContent}\n"""`;

  const tools: Tool[] = [];

  // CRITICAL: gemini-3-flash-preview requires googleSearch to be the ONLY tool if used.
  // Only enable search for explicit search requests or non-YouTube links (YouTube uses native file_data).
  const shouldEnableSearch = useSearch || nonYoutubeLinks.length > 0;

  if (shouldEnableSearch) {
    tools.push({ googleSearch: {} });
  } else {
    // Only enable editor updates if we are NOT searching
    tools.push({ functionDeclarations: [updateEditorTool, appendEditorTool] });
  }

  // Timeout helper — fail fast instead of hanging forever on long videos
  const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms))
    ]);
  };

  // Model fallback chain with timeouts (especially important for YouTube videos)
  const hasYouTube = youtubeAssets.length > 0;
  const models = [
    { id: 'gemini-3-flash-preview', timeout: hasYouTube ? 300000 : 120000 },    // 5 min for video, 2 min otherwise
    { id: 'gemini-2.5-flash-preview-04-17', timeout: hasYouTube ? 180000 : 120000 }, // 3 min for video
    { id: 'gemini-2.0-flash-exp', timeout: hasYouTube ? 240000 : 120000 },       // 4 min last resort
  ];

  for (let attempt = 0; attempt < models.length; attempt++) {
    const currentModel = models[attempt];
    try {
      if (attempt > 0) {
        console.warn(`Retrying with fallback model: ${currentModel.id}...`);
      }

      // Convert history to API format
      const historyParts = history.map(h => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.content }],
      }));

      // Combine history with new parts
      const fullContents = [
        ...historyParts,
        { role: 'user', parts: parts }
      ];

      const response = await withTimeout(
        callGeminiProxy(currentModel.id, fullContents, {
          systemInstruction: { parts: [{ text: augmentedSystemInstruction }] },
          tools: tools,
        }),
        currentModel.timeout,
        `${currentModel.id} video processing`
      );

      let editorUpdate: string | undefined;
      let editorAppend: string | undefined;

      const candidate = response.candidates?.[0];
      let responseText = candidate?.content?.parts?.[0]?.text || "";

      // Check for function calls (only relevant if search was NOT active)
      const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall);
      if (functionCalls && functionCalls.length > 0) {
        for (const p of functionCalls) {
          const call = p.functionCall;
          if (call.name === "updateEditor") {
            const args = call.args as any;
            if (args && args.newContent) {
              editorUpdate = args.newContent;
              if (!responseText) {
                responseText = "I've rewritten the document as requested.";
              }
            }
          } else if (call.name === "appendEditor") {
            const args = call.args as any;
            if (args && args.contentToAdd) {
              editorAppend = args.contentToAdd;
              if (!responseText) {
                responseText = "I've added new content to the end of the document.";
              }
            }
          }
        }
      }

      // Handle Grounding Metadata (Sources)
      if (candidate?.groundingMetadata?.groundingChunks) {
        const chunks = candidate.groundingMetadata.groundingChunks;
        const sources = chunks
          .map((chunk: any) => chunk.web?.uri ? `[${chunk.web.title || 'Source'}](${chunk.web.uri})` : null)
          .filter(Boolean);

        if (sources.length > 0) {
          const uniqueSources = Array.from(new Set(sources));
          responseText += `\n\n**Sources:**\n${uniqueSources.map(s => `- ${s}`).join('\n')}`;
        }
      }

      return { text: responseText, editorUpdate, editorAppend };

    } catch (error: any) {
      const msg = error?.message || error?.error?.message || String(error);
      const isRetryable = msg.includes('timed out') || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429') || msg.includes('overloaded') || msg.includes('too long') || msg.includes('RESOURCE_EXHAUSTED');

      if (isRetryable && attempt < models.length - 1) {
        console.warn(`Model ${currentModel.id} failed (${msg}), falling back...`);
        continue;
      }

      console.error("Gemini Generate Error:", error);
      const userMsg = msg.includes('timed out')
        ? `⏱️ This video is too long to process in real-time. Try a shorter clip (under 10 minutes works best), or ask about a specific timestamp range (e.g. "What happens at 5:00-10:00?").`
        : `Error: ${msg}`;
      return { text: userMsg };
    }
  }

  return { text: "All models failed. Please try again in a moment." };
};

export const generateVideoPromptFromText = async (text: string): Promise<string> => {
  const modelId = 'gemini-2.0-flash-exp';

  const prompt = `Create a highly visual, cinematic video generation prompt (max 250 characters) based on this text. Describe the scene, lighting, and action. Text: """${text.slice(0, 2000)}"""`;

  try {
    const response = await callGeminiProxy(modelId, { parts: [{ text: prompt }] });
    return response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (e) {
    console.error("Video Prompt Gen Error:", e);
    return "";
  }
}

/**
 * Helper to call the secure Gemini Proxy Supabase Function
 */
async function callGeminiProxy(model: string, contents: any, config: any = {}) {
  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: { model, contents, config }
  });

  if (error) {
    console.error(`Supabase Function Error (${model}):`, error);

    // Supabase wrap non-2xx responses in a generic Error string, putting our JSON in error.context
    let exactMessage = error.message;
    if (error.context) {
      if (typeof error.context === 'string') exactMessage += ' ' + error.context;
      else if (error.context.error) exactMessage = (error.context.error.message || JSON.stringify(error.context.error));
      else exactMessage = JSON.stringify(error.context);
    } else {
      // Also sometimes it's just attached to the object directly
      if ((error as any).error) {
        exactMessage = ((error as any).error.message || JSON.stringify((error as any).error));
      }
    }

    throw new Error(exactMessage || `Failed to call Gemini Proxy for ${model}`);
  }

  if (data?.error) {
    console.error(`Gemini API Error (${model}):`, data.error);
    const msg = data.error?.message || JSON.stringify(data.error);
    throw new Error(msg);
  }

  return data;
}

export const generateStoryboardImage = async (
  prompt: string,
  userTier: SubscriptionTier = 'FREE',
  aspectRatio: "16:9" | "1:1" | "9:16" = "16:9",
  modelId: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview' = 'gemini-2.5-flash-image'
): Promise<string> => {
  const maxRetries = modelId === 'gemini-3-pro-image-preview' ? 3 : 1;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let data;

      if (modelId === 'gemini-3-pro-image-preview') {
        data = await callGeminiProxy('gemini-3-pro-image-preview', prompt, {
          responseModalities: ['Text', 'Image'],
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: '2K',
          },
        });
      } else {
        data = await callGeminiProxy('gemini-2.5-flash-image', prompt, {
          imageConfig: {
            aspectRatio: aspectRatio,
          },
        });
      }

      // Gemini 3 Pro is a thinking model — skip thought parts, grab last final image
      let lastImageData: string | null = null;
      let lastMimeType: string = 'image/png';

      const parts = data.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.thought) continue;
        if (part.inlineData) {
          lastMimeType = part.inlineData.mimeType || 'image/png';
          lastImageData = part.inlineData.data || null;
        }
      }

      if (lastImageData) {
        return `data:${lastMimeType};base64,${lastImageData}`;
      }

      throw new Error("No image generated in response.");
    } catch (error: any) {
      const msg = error?.message || '';
      const isOverloaded = msg.includes('503') || msg.includes('429') ||
        msg.includes('high demand') || msg.includes('UNAVAILABLE') ||
        msg.includes('overloaded') || msg.includes('Resource exhausted');

      console.error(`Image Gen Attempt ${attempt}/${maxRetries}:`, msg);

      if (isOverloaded && attempt < maxRetries) {
        const delay = 3000 * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      if (isOverloaded) {
        throw new Error("Gemini 3 Pro is experiencing high demand right now. Please try again in a moment, or switch to Gemini 2.5 Flash.");
      }
      throw error;
    }
  }

  throw new Error("Image generation failed after retries.");
};

export const generateVeoVideo = async (prompt: string, imageBase64?: string): Promise<string> => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      throw new Error("API_KEY_REQUIRED");
    }
  }

  const modelId = 'veo-3.1-fast-generate-preview';

  try {
    // NOTE: Veo might require specialized handling or a different endpoint in the future.
    // For now, we attempt to proxy it. If the proxy doesn't support the videos endpoint,
    // this may need a dedicated backend function.
    const response = await callGeminiProxy(modelId, prompt, {
      videoConfig: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      },
      imageBase64: imageBase64 // Handled by proxy if supported
    });

    const videoUri = response.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video URI not found in response.");

    // For now, we fetch without the key and assume the proxy handled access or returns an accessible URI
    const fetchResult = await fetch(videoUri);
    const blob = await fetchResult.blob();
    return URL.createObjectURL(blob);

  } catch (error) {
    console.error("Video Gen Error:", error);
    throw error;
  }
};

export const analyzeMediaContext = async (assets: Asset[]): Promise<string> => {
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
    const response = await callGeminiProxy(modelId, { parts }, { tools });

    let text = response.candidates?.[0]?.content?.parts?.[0]?.text || "Analysis failed.";

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

// ----------------------
// NEW AUDIO TTS FEATURES
// ----------------------

// TTSDirectorConfig exported in types.ts now

export const analyzeScriptForVoices = async (text: string, direction?: string): Promise<{
  cast: { character: string, voice: VoiceName, reason: string }[],
  directorConfig: any
}> => {
  const modelId = 'gemini-3-flash-preview';

  const prompt = `
    Analyze the following text/script. 
    1. Identify distinct characters. Assign the BEST FIT voice from the available list:
    ${AVAILABLE_VOICES.map(v => `- ${v.name} (${v.gender}, ${v.style})`).join('\n')}
    
    2. Analyze the MOOD, SCENE, and STYLE of the text to generate "Director's Notes" for the audio generation.

    ${direction ? `USER DIRECTION: "${direction}". Use this to guide your choices.` : ''}

    Output JSON format:
    {
      "cast": [
         { "character": "Name", "voice": "VoiceName", "reason": "Why?" }
      ],
      "directorConfig": {
         "audioProfile": "Short description of the main persona/narrator",
         "scene": "Description of the physical scene and vibe",
         "style": "Emotional tone instructions (e.g. 'Whispered', 'Shouted', 'Vocal Smile')",
         "pacing": "Speed and rhythm instructions",
         "accent": "Suggested accent or dialect"
      }
    }
    
    TEXT:
    """${text.slice(0, 5000)}"""
    `;

  try {
    const response = await callGeminiProxy(modelId, { parts: [{ text: prompt }] }, { responseMimeType: "application/json" });
    const json = JSON.parse(response.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
    return {
      cast: json.cast || [{ character: "Narrator", voice: "Zephyr", reason: "Default" }],
      directorConfig: json.directorConfig || {}
    };
  } catch (e) {
    console.error("Voice Analysis Error", e);
    return {
      cast: [{ character: "Narrator", voice: "Zephyr", reason: "Error fallback" }],
      directorConfig: {}
    };
  }
}

export const analyzeCharacterStyle = async (userDescription: string): Promise<{ description: string, style: string, pacing: string, accent: string }> => {
  const modelId = 'gemini-3-flash-preview';
  const prompt = `
    Based on the user's description of a character, generate the audio director settings.
    USER DESCRIPTION: "${userDescription}"

    Output JSON format:
    {
        "description": "Short Audio Persona (e.g. 'Grumpy old man')",
        "style": "Emotional Tone (e.g. 'Whispering, angry')",
        "pacing": "Speed (e.g. 'Slow, deliberate')",
        "accent": "Accent (e.g. 'Southern US')"
    }
    `;

  try {
    const response = await callGeminiProxy(modelId, { parts: [{ text: prompt }] }, { responseMimeType: "application/json" });
    const json = JSON.parse(response.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
    return {
      description: json.description || '',
      style: json.style || '',
      pacing: json.pacing || '',
      accent: json.accent || ''
    };
  } catch (e) {
    return { description: userDescription, style: '', pacing: '', accent: '' };
  }
}

export const formatScriptForTTS = async (text: string, characters: string[]): Promise<string> => {
  const modelId = 'gemini-3-flash-preview';
  const prompt = `Rewrite the following text into a standard script format optimized for Multi-Speaker Text-to-Speech.
    
    CRITICAL CONSTRAINT: You MUST ONLY use the exact character names listed below as speaker tags. 
    CHARACTERS AVAILABLE: [${characters.map(c => `"${c}"`).join(', ')}]
    
    RULES:
    1. Every spoken line or paragraph MUST start with exactly one of the available names followed by a colon (e.g. "${characters[0] || 'CharacterName'}: ").
    2. DO NOT invent new characters. DO NOT use "Narrator" unless "Narrator" is explicitly listed in the available characters.
    3. If there is narration, assign it to the most logical character from the available list.
    4. Remove all visual stage directions (e.g. [sighs], (smiling)). The TTS engine reads text literally.
    5. Ensure the output is JUST the formatted script, nothing else.

    INPUT TEXT:
    """${text}"""
    `;

  try {
    const response = await callGeminiProxy(modelId, { parts: [{ text: prompt }] });
    return response.candidates?.[0]?.content?.parts?.[0]?.text || text;
  } catch (e) {
    console.error("Formatting Error", e);
    return text;
  }
}

export const generateSpeech = async (
  text: string,
  speakerConfig: { singleVoice?: VoiceName, multiSpeaker?: { character: string, voice: VoiceName, settings?: { description?: string, style?: string, pacing?: string, accent?: string } }[] },
  directorConfig?: any
): Promise<string> => {
  const modelId = 'gemini-2.5-flash-preview-tts';
  let speechConfig: any = {}; // Moved outside the try block so the catch block can access it

  try {
    let finalPrompt = text;

    // ------------------------------------------
    // CONSTRUCT THE PROMPT (Director Mode Wrapper)
    // ------------------------------------------
    if ((directorConfig && (directorConfig.scene || directorConfig.style)) || (speakerConfig.multiSpeaker && speakerConfig.multiSpeaker.length > 0)) {

      let profileSection = directorConfig?.audioProfile ? `# AUDIO PROFILE: ${directorConfig.audioProfile}\n` : '';
      let sceneSection = directorConfig?.scene ? `## THE SCENE: ${directorConfig.scene}\n` : '';

      let notesSection = '### DIRECTOR\'S NOTES\n';
      if (directorConfig?.style) notesSection += `General Style: ${directorConfig.style}\n`;
      if (directorConfig?.pacing) notesSection += `Pacing: ${directorConfig.pacing}\n`;
      if (directorConfig?.accent) notesSection += `Accent: ${directorConfig.accent}\n`;

      // CRITICAL: PER-SPEAKER DIRECTION
      if (speakerConfig.multiSpeaker && speakerConfig.multiSpeaker.length > 0) {
        const speakerInstructions = speakerConfig.multiSpeaker.map(s => {
          const voiceInfo = AVAILABLE_VOICES.find(v => v.name === s.voice);
          const sSettings = s.settings || {};
          let specific = '';
          if (sSettings.description) specific += ` [Persona: ${sSettings.description}]`;
          // STRENGTHENED PROMPT INSTRUCTION
          if (sSettings.style) specific += ` [MANDATORY STYLE/EMOTION: ${sSettings.style}]`;
          if (sSettings.pacing) specific += ` [MANDATORY PACING: ${sSettings.pacing}]`;
          if (sSettings.accent) specific += ` [MANDATORY ACCENT: ${sSettings.accent}]`;

          return `- ${s.character}: Voice=${s.voice} (${voiceInfo?.style}).${specific}`;
        }).join('\n');
        notesSection += `\n#### CAST INSTRUCTIONS:\n${speakerInstructions}\n`;
      }

      // For multi-speaker, adding strict instruction to prompt header
      if (speakerConfig.multiSpeaker && speakerConfig.multiSpeaker.length > 0) {
        const names = speakerConfig.multiSpeaker.map(s => s.character).join(' and ');
        finalPrompt = `${profileSection}\n${sceneSection}\n${notesSection}\n#### TRANSCRIPT\nTTS the following conversation between ${names}:\n${text}`;
      } else {
        finalPrompt = `${profileSection}\n${sceneSection}\n${notesSection}\n#### TRANSCRIPT\n${text}`;
      }
    } else {
      // Fallback simple prompt construction
      if (speakerConfig.multiSpeaker && speakerConfig.multiSpeaker.length > 0) {
        const names = speakerConfig.multiSpeaker.map(s => s.character).join(' and ');
        finalPrompt = `TTS the following conversation between ${names}:\n${text}`;
      }
    }

    // ------------------------------------------
    // CONFIGURE THE MODEL (Voices)
    // ------------------------------------------

    if (speakerConfig.multiSpeaker && speakerConfig.multiSpeaker.length > 1) {
      // MULTI SPEAKER MODE (STRICT MAX 2)
      const uniqueSpeakers = speakerConfig.multiSpeaker.slice(0, 2);

      const speakers = uniqueSpeakers.map(s => ({
        speaker: s.character,
        voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voice } }
      }));

      speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: speakers
        }
      };
    } else {
      // SINGLE SPEAKER MODE
      const voiceName = speakerConfig.singleVoice || 'Zephyr';
      speechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName }
        }
      };
    }

    const response = await callGeminiProxy(modelId, { parts: [{ text: finalPrompt }] }, {
      responseModalities: ["AUDIO"],
      speechConfig: speechConfig
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned.");

    return base64Audio;
  } catch (e: any) {
    console.error("TTS Generation Error", e);

    // Auto-Format Fallback: If it failed and we are in MULTI-SPEAKER mode, 
    // it's highly likely because the user didn't format the text with "Character: Line".
    // We will automatically format it and try ONE MORE TIME.
    if (speakerConfig.multiSpeaker && speakerConfig.multiSpeaker.length > 0) {
      console.log("Attempting automatic script formatting fallback...");
      try {
        const charNames = speakerConfig.multiSpeaker.map(s => s.character);
        const formattedText = await formatScriptForTTS(text, charNames);

        // Re-run the exact same prompt generation but with the formatted text
        let fallbackPrompt = formattedText;
        if (speakerConfig.multiSpeaker && speakerConfig.multiSpeaker.length > 0) {
          const names = speakerConfig.multiSpeaker.map(s => s.character).join(' and ');
          fallbackPrompt = `TTS the following conversation between ${names}:\n${formattedText}`;
        }

        const fallbackResponse = await callGeminiProxy(modelId, { parts: [{ text: fallbackPrompt }] }, {
          responseModalities: ["AUDIO"],
          speechConfig: speechConfig
        });

        const fallbackBase64 = fallbackResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (fallbackBase64) {
          console.log("Fallback formatting successful.");
          return fallbackBase64;
        }
      } catch (fallbackErr) {
        console.error("Fallback formatting also failed.", fallbackErr);
      }
    }

    throw e;
  }
}
// ----------------------
// GMAIL AI FEATURES
// ----------------------

export const generateEmailDraft = async (
  prompt: string,
  history: { role: string; content: string }[] = []
): Promise<string> => {
  const modelId = 'gemini-3-flash-preview';

  const systemInstruction = `You are an elite Executive Communications Director.
    Your goal is to write emails that sound 100% human, professional, and authentic.
    
    CRITICAL RULES:
    1. NO "AI" LANGUAGE: Do not use words like "tapestry", "delve", "testament", "underscores", "landscape", "foster", "spearhead".
    2. BE CONCISE: Executives don't read long emails. Get to the point.
    3. TONE: Confident, warm, but direct.
    4. FORMATTING: Use short paragraphs.
    5. OUTPUT: Return ONLY the email body. Do not include "Subject:" lines or "Here is the draft" meta-text unless explicitly asked for a subject line.
    `;

  try {
    const historyParts = history.map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

    const contents = [
      ...historyParts,
      { role: 'user', parts: [{ text: prompt }] }
    ];

    const response = await callGeminiProxy(modelId, contents, {
      systemInstruction: { parts: [{ text: systemInstruction }] }
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.text || "Draft generation failed.";

  } catch (error) {
    console.error("Email Draft Error:", error);
    return "Error generating draft.";
  }
};

// ----------------------
// DOMO SUITE SERVICES
// ----------------------

const DOMO_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash-preview-04-17', 'gemini-2.0-flash-exp'];

const domoGenerate = async (
  prompt: string,
  jsonMode: boolean = false
): Promise<string> => {
  for (let i = 0; i < DOMO_MODELS.length; i++) {
    try {
      const config: any = {};
      if (jsonMode) config.responseMimeType = "application/json";
      const response = await callGeminiProxy(DOMO_MODELS[i], { parts: [{ text: prompt }] }, config);
      return response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error: any) {
      const status = error?.status || error?.error?.code || error?.message || '';
      const isRetryable = String(status).includes('503') || String(status).includes('UNAVAILABLE') || String(status).includes('429') || String(status).includes('overloaded');
      if (isRetryable && i < DOMO_MODELS.length - 1) {
        console.warn(`Model ${DOMO_MODELS[i]} unavailable, falling back to ${DOMO_MODELS[i + 1]}...`);
        continue;
      }
      throw error;
    }
  }
  throw new Error("All models unavailable.");
};

export const generatePodcastScript = async (
  topic: string,
  format: 'talking_head' | 'solo_podcast' | 'interview' | 'panel' | 'two_hosts',
  hosts: string[],
  duration: string,
  style: string,
  additionalNotes: string = ''
): Promise<string> => {
  const modelId = 'gemini-3-flash-preview';

  const formatGuides: Record<string, string> = {
    talking_head: `FORMAT: Talking Head Video Script
    - Write for a single person speaking directly to camera
    - Include [LOOK AT CAMERA], [LEAN IN], [GESTURE] visual cues
    - Include [B-ROLL: description] cues for visual cutaways
    - Optimize for YouTube retention: pattern interrupts every 60-90 seconds`,
    solo_podcast: `FORMAT: Solo Podcast Episode
    - Write for audio-only consumption
    - Include vocal delivery notes: [PAUSE], [LOWER VOICE], [PICK UP PACE]
    - Include [SFX: description] for sound effect insertions
    - Optimize for listener engagement: stories, anecdotes, callbacks`,
    interview: `FORMAT: Interview/Conversation Podcast
    - Write HOST questions and expected talking points
    - Include follow-up probes and "pivot" questions
    - Mark HOST: and GUEST: throughout
    - Include [FOLLOW-UP IF...] conditional branches`,
    panel: `FORMAT: Panel Discussion
    - Write MODERATOR prompts and topic introductions
    - Include discussion questions that create productive tension
    - Mark MODERATOR:, PANELIST_1:, PANELIST_2: etc.
    - Include [OPEN TO PANEL] and [REDIRECT] cues`,
    two_hosts: `FORMAT: Two-Host Co-Hosted Podcast (Conversational)
    - Write for two equal co-hosts with distinct personalities (Host 1 & Host 2)
    - witty banter, dynamic back-and-forth, and high energy
    - Interruptions, finishing each other's sentences, and shared laughter
    - Mark HOST_1: and HOST_2: throughout
    - Structure: Banter Intro -> Deep Dive Topic -> Debate/Discussion -> Takeaways -> Outro`
  };

  const prompt = `You are the world's #1 podcast producer and script doctor. Shows you've produced have hit #1 on Apple Podcasts and videos have gone viral with 50M+ views. Your scripts are legendary for their hooks, pacing, and audience retention.

${formatGuides[format]}

DURATION TARGET: ${duration}
STYLE/TONE: ${style}
TOPIC: "${topic}"
HOSTS: ${hosts.join(' & ')}
${additionalNotes ? `ADDITIONAL CONTEXT: ${additionalNotes}` : ''}

CRITICAL REQUIREMENTS:
1. COLD OPEN (first 15 seconds): Start with the most provocative, curiosity-inducing moment — a shocking stat, bold claim, emotional moment, or cliffhanger. This is NOT the intro; this is the hook that stops people from scrolling.

2. INTRO/BRAND (15-30 seconds): Quick, punchy intro. "Welcome to [show name placeholder]..." Keep it SHORT.

3. SEGMENTS: Break the content into clearly labeled segments with:
   - Timing markers [MM:SS]
   - Delivery notes in [brackets]
   - Transition hooks that tease what's coming ("But here's where it gets really interesting...")
   - Pattern interrupts to reset attention every 60-90s

4. ENGAGEMENT HOOKS:
   - "Comment below if you've ever..."
   - "Most people don't know this, but..."
   - Rhetorical questions that make the viewer think

5. CTA + OUTRO: Natural, non-desperate call to action. Then a memorable sign-off.

6. SPEAKER NOTES: After each segment, include brief director's notes on emotional tone, energy level, and delivery tips.

Write the COMPLETE, production-ready script now. Make it so good that the host can read it cold and still sound incredible.`;

  try {
    const result = await domoGenerate(prompt, false);
    return result || "Script generation failed.";
  } catch (error) {
    console.error("Podcast Script Error:", error);
    return "Error generating script. " + (error instanceof Error ? error.message : '');
  }
};

export const generateNewsletterContent = async (
  topic: string,
  type: 'newsletter' | 'short_ebook' | 'longform_guide',
  style: string,
  additionalNotes: string = ''
): Promise<{ title: string; subtitle: string; sections: { heading: string; content: string; type: 'text' | 'callout' | 'quote' | 'stat' | 'list' | 'cta' }[] }> => {
  const modelId = 'gemini-3-flash-preview';

  const typeGuides: Record<string, string> = {
    newsletter: `TYPE: Newsletter (1500-2500 words)
    - Opening hook that makes readers feel they NEED to read this
    - 3-5 sections with clear value propositions
    - "Stat" callout sections with bold numbers
    - Pull quotes for visual variety
    - CTA section at the end
    - Keep paragraphs SHORT (2-3 sentences max)`,
    short_ebook: `TYPE: Short Ebook (3000-5000 words)
    - Professional title page content (title + subtitle + author placeholder)
    - Table of contents structure
    - 5-8 chapters/sections with deep content
    - Include "Key Takeaway" callout boxes
    - Expert quotes and statistical callouts
    - Conclusion with actionable next steps
    - About the Author placeholder section`,
    longform_guide: `TYPE: Long-form Guide (5000-8000 words)
    - Comprehensive, authoritative guide structure
    - 8-12 detailed sections/chapters
    - Include real-world examples and case studies
    - Step-by-step instructions where applicable
    - Pro Tips callout boxes throughout
    - Summary checklists per chapter
    - Resource appendix section`
  };

  const prompt = `You are a world-class content strategist and editor who has produced bestselling ebooks and newsletters with 500K+ subscribers. Your content is sharp, valuable, and beautifully structured.

${typeGuides[type]}
STYLE/AESTHETIC: ${style}
TOPIC: "${topic}"
${additionalNotes ? `ADDITIONAL CONTEXT: ${additionalNotes}` : ''}

OUTPUT FORMAT: Return ONLY valid JSON with this exact structure:
{
  "title": "The main title - make it compelling and click-worthy",
  "subtitle": "A subtitle that adds context and intrigue",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Rich content with **bold**, *italic*, and clean formatting. Use \\n for paragraph breaks. Make this SUBSTANTIAL and VALUABLE.",
      "type": "text"
    },
    {
      "heading": "A Striking Statistic",
      "content": "87% of professionals who read this report saw a measurable improvement.",
      "type": "stat"
    },
    {
      "heading": "",
      "content": "Innovation is not about ideas. It's about making ideas happen. — Scott Belsky",
      "type": "quote"
    },
    {
      "heading": "Key Takeaways",
      "content": "• Point one\\n• Point two\\n• Point three",
      "type": "list"
    },
    {
      "heading": "Pro Tip",
      "content": "An insider tip or advanced technique that adds extra value.",
      "type": "callout"
    },
    {
      "heading": "Ready to Get Started?",
      "content": "Your call-to-action content here.",
      "type": "cta"
    }
  ]
}

CRITICAL QUALITY RULES:
1. NO generic AI filler. Every sentence must provide real value.
2. NO words like "tapestry", "delve", "landscape", "foster", "spearhead", "harness", "synergy".
3. Write like a human expert — confident, conversational, authoritative.
4. Mix section types for visual variety: text, stat, quote, list, callout, cta.
5. Content must be SUBSTANTIAL — no thin sections. Each text section should be at least 2-3 rich paragraphs.
6. Use concrete examples, numbers, and actionable insights throughout.`;

  try {
    const result = await domoGenerate(prompt, true);
    const json = JSON.parse(result || "{}");
    return {
      title: json.title || "Untitled",
      subtitle: json.subtitle || "",
      sections: json.sections || [{ heading: "Error", content: "Failed to generate content.", type: "text" }]
    };
  } catch (error) {
    console.error("Newsletter Error:", error);
    return {
      title: "Generation Error",
      subtitle: "",
      sections: [{ heading: "Error", content: "Failed to generate content. " + (error instanceof Error ? error.message : ''), type: "text" }]
    };
  }
};

export const generateSlideContent = async (
  topic: string,
  slideCount: number,
  style: string,
  additionalNotes: string = ''
): Promise<{ title: string; slides: { title: string; bullets: string[]; notes: string; layout: 'title' | 'content' | 'two_column' | 'image_focus' | 'quote' | 'section_break' }[] }> => {
  const modelId = 'gemini-3-flash-preview';

  const prompt = `You are a world-class presentation designer and strategist who has created pitch decks that raised $100M+ and keynotes viewed by millions. Your slides are legendary for clarity, impact, and visual storytelling.

TOPIC: "${topic}"
SLIDE COUNT: ${slideCount} slides
STYLE: ${style}
${additionalNotes ? `ADDITIONAL CONTEXT: ${additionalNotes}` : ''}

OUTPUT FORMAT: Return ONLY valid JSON with this exact structure:
{
  "title": "Presentation Title",
  "slides": [
    {
      "title": "Opening Impact Title",
      "bullets": [],
      "notes": "Speaker notes for this slide. Include delivery tips, talking points, and timing suggestions.",
      "layout": "title"
    },
    {
      "title": "Agenda / What We'll Cover",
      "bullets": ["Topic 1: Brief description", "Topic 2: Brief description", "Topic 3: Brief description"],
      "notes": "Quick overview slide. Spend 15-20 seconds here.",
      "layout": "content"
    },
    {
      "title": "Section: [Topic Name]",
      "bullets": [],
      "notes": "Transition slide to next major section.",
      "layout": "section_break"
    },
    {
      "title": "Key Data Point",
      "bullets": ["Main insight with supporting detail", "Second point with evidence"],
      "notes": "Emphasize the contrast between expectation and reality.",
      "layout": "content"
    },
    {
      "title": "",
      "bullets": ["A powerful quote that reinforces your message — Attribution"],
      "notes": "Let the quote sit for 3-4 seconds before continuing.",
      "layout": "quote"
    }
  ]
}

CRITICAL PRESENTATION RULES:
1. LESS IS MORE: Max 4-5 bullet points per slide. Each bullet max 10-12 words.
2. ONE IDEA PER SLIDE: Don't cram. If a topic needs more, split into multiple slides.
3. SLIDE VARIETY: Alternate between layouts (content, quote, image_focus, section_break) for visual rhythm.
4. STORY ARC: Build a narrative — Problem → Evidence → Solution → Impact → Call to Action.
5. STICKY PHRASES: Use memorable, quotable language that audiences remember.
6. SPEAKER NOTES: These are critical — include what to SAY (not just what's on the slide), delivery tips, transitions, and timing.
7. OPENING: First slide must be a powerful title with a subtitle that creates curiosity.
8. CLOSING: Last slide should be a strong CTA or memorable takeaway, NOT a generic "Thank You".
9. NO AI LANGUAGE: No "tapestry", "delve", "landscape", "synergy", "harness".`;

  try {
    const result = await domoGenerate(prompt, true);
    const json = JSON.parse(result || "{}");
    return {
      title: json.title || "Untitled Presentation",
      slides: json.slides || [{ title: "Error", bullets: ["Failed to generate."], notes: "", layout: "content" }]
    };
  } catch (error) {
    console.error("Slides Error:", error);
    return {
      title: "Generation Error",
      slides: [{ title: "Error", bullets: ["Failed: " + (error instanceof Error ? error.message : '')], notes: "", layout: "content" }]
    };
  }
};

// --- YOUTUBE SEO ---
export const generateYouTubeMetadata = async (content: string): Promise<{ titles: string[], description: string, tags: string[], hashtags: string[] }> => {

  const prompt = `You are a YouTube SEO Expert. Analyze the script below and generate high-performing metadata.
    Output a JSON object with this exact schema:
    {
      "titles": ["string", "string", "string", "string", "string"],
      "description": "string",
      "tags": ["string", "string", ...],
      "hashtags": ["string", "string", ...]
    }
    
    Rules:
    - Titles: High CTR, punchy, under 60 chars.
    - Description: SEO-optimized, 3 sentences max summary + keywords.
    - Tags: 15 relevant keyword tags.
    - Hashtags: 3-5 relevant hashtags.
    - RESEARCH: Leverage your internal knowledge of current YouTube trends and search behaviors.

    SCRIPT/CONTENT:
    ${content.slice(0, 10000)}
    `;

  try {
    const text = await domoGenerate(prompt, true);
    return JSON.parse(text);
  } catch (e) {
    console.error("SEO Gen Error:", e);
    throw e;
  }
};

// --- SOCIAL MEDIA ---
export const generateSocialPost = async (content: string, platform: 'instagram' | 'tiktok' | 'twitter' | 'linkedin', tone: string): Promise<string> => {

  const prompt = `You are a Social Media Manager. Create a viral ${platform} post based on the content below.
    Tone: ${tone}
    Platform Rules:
    - Instagram: Visual description, engaging caption, 30 hashtags.
    - TikTok: Script for a short video, visual cues, trending sounds suggestion.
    - Twitter/X: Thread of 3-5 tweets or one punchy tweet, max 280 chars, 2 hashtags.
    - LinkedIn: Professional, value-driven, spacing for readability.

    CONTENT:
    ${content.slice(0, 5000)}
    `;

  try {
    return await domoGenerate(prompt, false);
  } catch (e) {
    console.error("Social Gen Error:", e);
    throw e;
  }
};

// --- THUMBNAIL HELPER ---
export const generateThumbnailPrompt = async (content: string): Promise<string> => {
  const prompt = `You are a YouTube Thumbnail Expert. Create a detailed, high-performing text-to-image prompt for the video script below.
    Rules:
    - Focus on visual elements, emotions, and composition.
    - Use art direction keywords (e.g., "hyper-realistic", "vibrant colors", "shocked expression").
    - NO text in the image (or minimal).
    - Output ONLY the prompt string.

    SCRIPT:
    ${content.slice(0, 5000)}
    `;

  try {
    return await domoGenerate(prompt, false);
  } catch (e) {
    console.error("Thumbnail Prompt Error:", e);
    throw e;
  }
};

export const generateThumbnailPromptFromAssets = async (inputPrompt: string, assets: Asset[]): Promise<string> => {
  // Use Gemini 2.5 Flash for visual analysis of assets (video/images)
  const modelId = 'gemini-2.5-flash-image';

  const parts: any[] = [];

  // Add assets to prompt
  for (const asset of assets) {
    if (asset.base64 && (asset.type === 'image' || asset.type === 'pdf')) {
      parts.push({
        inlineData: {
          mimeType: asset.mimeType,
          data: asset.base64
        }
      });
    } else if (asset.url && (asset.type === 'video' || asset.url.includes('youtube'))) {
      // Native video support
      parts.push({
        fileData: {
          mimeType: 'video/*',
          fileUri: asset.url
        }
      });
    }
  }

  const promptText = `You are a world-class YouTube Strategist and Art Director.
  TASK: Analyze the attached visual assets (images or video) and the user's idea: "${inputPrompt}".
  Create a detailed, high-performing text-to-image prompt for a YouTube Thumbnail that represents this content.
  
  RULES:
  1. Analyze the ACTUAL visual content (characters, setting, action, mood) from the attachments.
  2. Combine it with the user's idea.
  3. Design a thumbnail that has high CTR (Click Through Rate): bright, clear focal point, emotional facial expressions, high contrast.
  4. Output ONLY the text prompt for the image generator. Do NOT output descriptions of text overlays.
  5. Style: Hyper-realistic, 8k, cinematographic lighting, vibrant.
  `;

  parts.push({ text: promptText });

  try {
    const response = await callGeminiProxy(modelId, parts);
    return response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (e) {
    console.error("Asset Thumbnail Error:", e);
    throw e;
  }
};

export const generateYouTubeAnalysis = async (query: string): Promise<string> => {

  const parts: any[] = [];
  const tools: any[] = [{ googleSearch: {} }];

  // Detect YouTube video URL (watch, shorts, youtu.be)
  const ytVideoMatch = query.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/);
  const isYouTubeUrl = query.includes('youtube.com') || query.includes('youtu.be');

  if (ytVideoMatch) {
    // === YOUTUBE VIDEO URL ===
    // Pass the video directly as fileData so Gemini can actually WATCH the video
    const normalizedUrl = `https://www.youtube.com/watch?v=${ytVideoMatch[1]}`;
    parts.push({
      fileData: { fileUri: normalizedUrl }
    });
    parts.push({
      text: `You are a world-class YouTube Strategist & Video Analyst.

TASK: You have been given a YouTube video to analyze. Watch it carefully and provide a comprehensive analysis.

OUTPUT STRUCTURE (Markdown):
## 📊 Video Overview
Title, channel, topic, key takeaways from the content.

## 🎬 Content Breakdown
- Hook analysis (first 30 seconds)
- Structure and pacing
- Key talking points and timestamps
- Call-to-actions used

## 📈 Performance Indicators
Use Google Search to find real stats: view count, like ratio, comments, how it compares to channel average.

## 🎯 What Makes This Video Work (or Not)
Thumbnail effectiveness, title optimization, retention strategies, audience engagement.

## 🚀 Actionable Takeaways
What a creator can learn from this video. Specific, actionable insights.

## 🏷️ SEO & Discovery
Tags they likely used, search terms this ranks for, suggested improvements.

Be specific with timestamps and real observations from the video. No generic advice.`
    });
  } else if (isYouTubeUrl) {
    // === YOUTUBE CHANNEL / PLAYLIST URL ===
    // Use urlContext to crawl the channel page + googleSearch for stats
    tools.push({ urlContext: {} });
    parts.push({
      text: `You are a world-class YouTube Strategist & Channel Analyst.

TASK: Research and deeply analyze this YouTube channel: ${query}

Use URL context to read the actual channel page, and Google Search to find real stats and recent activity.

OUTPUT STRUCTURE (Markdown):
## 📊 Channel Overview
Channel name, niche, subscriber count, total views, upload frequency, joined date.

## 📈 Recent Performance
Last 5-10 video titles, their view counts, upload consistency, trending patterns.

## 🎯 Audience & Positioning
Who watches this channel, audience demographics, brand positioning, tone of content.

## 🚀 Content Strategy Analysis
What content types perform best, video length patterns, series vs standalone, shorts usage.

## ⚠️ Gap Analysis & Opportunities
What this channel is missing, untapped content ideas, competitor advantages.

## 🏷️ SEO & Discovery Strategy
Keywords they rank for, tag strategy, title patterns, description optimization.

Use REAL data from the actual channel. Cite specific video titles and numbers. No generic advice.`
    });
  } else {
    // === SEARCH TOPIC / KEYWORD / HANDLE ===
    // Use Google Search + URL context to research the topic across YouTube
    tools.push({ urlContext: {} });
    parts.push({
      text: `You are a world-class YouTube Strategist & Market Researcher.

TASK: Research the YouTube niche/topic/creator: "${query}"

Search for real, current data about this query on YouTube. If it's a creator handle (@name), find their channel and analyze it. If it's a topic, analyze the top creators and videos in this niche.

OUTPUT STRUCTURE (Markdown):
## 📊 Executive Summary
Key findings about this niche/creator.

## 📈 Market Overview
Top channels in this space, subscriber ranges, view count benchmarks, content saturation level.

## 🎯 Audience Insights
Who watches this type of content, demographics, peak engagement times, platform behavior.

## 🚀 Content Opportunities
Underserved sub-topics, trending formats, content gaps competitors aren't filling.

## ⚠️ Competitive Landscape
Top 5 creators, what they do well, their weaknesses, how to differentiate.

## 🏷️ SEO & Discovery Strategy
High-volume keywords, long-tail opportunities, optimal title formulas, tag recommendations.

Use REAL channel names, video titles, and numbers. Be specific and actionable. No generic advice.`
    });
  }

  try {
    const response = await callGeminiProxy('gemini-2.5-flash', { parts }, { tools });
    return response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (e) {
    console.error("YouTube Analysis Error:", e);
    throw e;
  }
};