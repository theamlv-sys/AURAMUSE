import { GoogleGenAI, Type, FunctionDeclaration, Tool, Schema, Modality } from "@google/genai";
import { Asset, ProjectType, AIResponse, VoiceName, AVAILABLE_VOICES, TTSCharacterSettings, StoryBibleEntry } from "../types";

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

export const generateWriting = async (
  prompt: string,
  projectType: ProjectType,
  contextAssets: Asset[],
  history: { role: string; content: string }[],
  currentEditorContent: string,
  useSearch: boolean = false,
  storyBible: StoryBibleEntry[] = []
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
  const augmentedSystemInstruction = SYSTEM_INSTRUCTION_BASE + `\nCurrent Mode: ${projectType}\n${bibleContext}\nCURRENT EDITOR CONTENT:\n"""\n${currentEditorContent}\n"""`;

  const tools: Tool[] = [];
  
  // CRITICAL: gemini-3-flash-preview requires googleSearch to be the ONLY tool if used.
  // If useSearch is true OR we have links (implying need for search), we enable googleSearch and DISABLE editor tools.
  const shouldEnableSearch = useSearch || linkAssets.length > 0;

  if (shouldEnableSearch) {
    tools.push({ googleSearch: {} });
  } else {
    // Only enable editor updates if we are NOT searching
    tools.push({ functionDeclarations: [updateEditorTool, appendEditorTool] });
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
    let editorAppend: string | undefined;
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

    return { text: responseText, editorUpdate, editorAppend };

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

// ----------------------
// NEW AUDIO TTS FEATURES
// ----------------------

// TTSDirectorConfig exported in types.ts now

export const analyzeScriptForVoices = async (text: string, direction?: string): Promise<{
    cast: { character: string, voice: VoiceName, reason: string }[],
    directorConfig: any
}> => {
    const ai = getAI();
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
        const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json"
            }
        });
        const json = JSON.parse(response.text || "{}");
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
    const ai = getAI();
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
        const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        const json = JSON.parse(response.text || "{}");
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
    const ai = getAI();
    const modelId = 'gemini-3-flash-preview';
    const prompt = `Rewrite the following text into a standard script format optimized for Multi-Speaker Text-to-Speech.
    
    CHARACTERS AVAILABLE: ${characters.join(', ')}
    
    RULES:
    1. Every spoken line MUST start with "CharacterName: ".
    2. If there is narration (non-dialogue), look for a character named "Narrator". If it exists, prefix with "Narrator: ". If not, assign it to the most appropriate character or remove if it's purely visual/unspoken.
    3. Keep the dialogue content exactly as is, just fix the formatting.
    4. Ensure the output is JUST the script, nothing else.

    INPUT TEXT:
    """${text}"""
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts: [{ text: prompt }] }
        });
        return response.text || text;
    } catch(e) {
        console.error("Formatting Error", e);
        return text;
    }
}

export const generateSpeech = async (
    text: string, 
    speakerConfig: { singleVoice?: VoiceName, multiSpeaker?: { character: string, voice: VoiceName, settings?: { description?: string, style?: string, pacing?: string, accent?: string } }[] },
    directorConfig?: any
): Promise<string> => {
    const ai = getAI();
    const modelId = 'gemini-2.5-flash-preview-tts';

    try {
        let speechConfig: any = {};
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

        const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts: [{ text: finalPrompt }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: speechConfig
            }
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data returned.");

        return base64Audio;
    } catch (e) {
        console.error("TTS Generation Error", e);
        throw e;
    }
}