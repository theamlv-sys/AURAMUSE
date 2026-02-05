import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { updateEditorTool, triggerSearchTool } from '../services/geminiService';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';
import { Asset, ProjectType } from '../types';

interface UseLiveProps {
    onUpdateEditor: (newContent: string) => void;
    onTriggerSearch: (query: string) => Promise<string>;
    editorContent: string;
    assets: Asset[];
    projectType: ProjectType;
}

export const useLive = ({ onUpdateEditor, onTriggerSearch, editorContent, assets, projectType }: UseLiveProps) => {
    const [isActive, setIsActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [volume, setVolume] = useState(0);
    
    // Refs for audio handling to avoid stale closures in callbacks
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const currentEditorContentRef = useRef(editorContent);
    
    // Update ref when prop changes
    useEffect(() => {
        currentEditorContentRef.current = editorContent;
    }, [editorContent]);

    const stop = useCallback(() => {
        setIsActive(false);
        setIsConnecting(false);
        setVolume(0);

        // Cleanup Input
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        // Cleanup Output
        if (outputAudioContextRef.current) {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }

        // Close Session
        if (sessionPromiseRef.current) {
             sessionPromiseRef.current.then(session => {
                 try {
                     session.close();
                 } catch(e) { console.error("Error closing session", e); }
             });
             sessionPromiseRef.current = null;
        }
    }, []);

    const start = useCallback(async () => {
        if (isActive || isConnecting) return;
        setIsConnecting(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Setup Output Audio
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;

            // Prepare System Instruction
            const assetDesc = assets.map(a => {
                if(a.type === 'link') return `- Link: ${a.url}`;
                if(a.type === 'pdf') return `- PDF File: ${a.name} (Content is available if you read the file)`;
                return `- ${a.name} (${a.type})`;
            }).join('\n');

            const systemInstruction = `You are Muse's Voice Mode, a highly capable, autonomous creative writing partner.
            You are connected to a text editor and a media library.
            
            CURRENT MODE: ${projectType}
            
            YOUR CAPABILITIES:
            1. You can see the content of the editor.
            2. You can EDIT the editor content directly using the 'updateEditor' tool.
            3. You know about the user's uploaded assets (listed below).
            4. IMPORTANT: If the user asks you to search the web, research a topic, or look up information, use the 'triggerChatSearch' tool. You cannot search the web directly yourself. Tell the user you are putting the results in the chat.
            
            BEHAVIOR:
            - Be concise and conversational.
            - When the user asks for changes, use the 'updateEditor' tool immediately.
            - If research is needed, use 'triggerChatSearch'.
            - Offer creative suggestions proactively.
            - Speak with a professional yet warm creative director persona.
            
            CURRENT ASSETS:
            ${assetDesc}
            
            INITIAL EDITOR CONTENT:
            """
            ${currentEditorContentRef.current}
            """
            `;

            // Connect to Live API
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                    },
                    systemInstruction: systemInstruction,
                    tools: [
                        { functionDeclarations: [updateEditorTool, triggerSearchTool] }
                    ]
                },
                callbacks: {
                    onopen: async () => {
                        console.log("Live Session Opened");
                        setIsActive(true);
                        setIsConnecting(false);

                        // Start Input Stream
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                            mediaStreamRef.current = stream;
                            
                            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                            audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
                            
                            const source = audioContextRef.current.createMediaStreamSource(stream);
                            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                            processorRef.current = processor;

                            processor.onaudioprocess = (e) => {
                                const inputData = e.inputBuffer.getChannelData(0);
                                
                                // Volume visualization
                                let sum = 0;
                                for (let i = 0; i < inputData.length; i++) {
                                    sum += inputData[i] * inputData[i];
                                }
                                setVolume(Math.sqrt(sum / inputData.length));

                                const pcmBlob = createPcmBlob(inputData);
                                sessionPromiseRef.current?.then(session => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };

                            source.connect(processor);
                            processor.connect(audioContextRef.current.destination);
                        } catch (err) {
                            console.error("Mic Error", err);
                            stop();
                        }
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        // Handle Audio Output
                        const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData && outputAudioContextRef.current) {
                             const ctx = outputAudioContextRef.current;
                             const bytes = base64ToUint8Array(audioData);
                             try {
                                 const audioBuffer = await decodeAudioData(bytes, ctx, 24000);
                                 
                                 const source = ctx.createBufferSource();
                                 source.buffer = audioBuffer;
                                 source.connect(ctx.destination);
                                 
                                 const currentTime = ctx.currentTime;
                                 const startTime = Math.max(currentTime, nextStartTimeRef.current);
                                 source.start(startTime);
                                 nextStartTimeRef.current = startTime + audioBuffer.duration;
                             } catch (e) {
                                 console.error("Decoding error", e);
                             }
                        }

                        // Handle Tool Calls
                        if (msg.toolCall) {
                            for (const fc of msg.toolCall.functionCalls) {
                                if (fc.name === 'updateEditor') {
                                    const args = fc.args as any;
                                    console.log("Tool Call: updateEditor", args);
                                    if (args.newContent) {
                                        onUpdateEditor(args.newContent);
                                        // Update our ref so we know the state
                                        currentEditorContentRef.current = args.newContent;
                                        
                                        // Respond
                                        sessionPromiseRef.current?.then(session => {
                                            session.sendToolResponse({
                                                functionResponses: [{
                                                    id: fc.id,
                                                    name: fc.name,
                                                    response: { result: "Editor updated successfully." }
                                                }]
                                            });
                                        });
                                    }
                                } else if (fc.name === 'triggerChatSearch') {
                                    const args = fc.args as any;
                                    console.log("Tool Call: triggerChatSearch", args);
                                    if (args.query) {
                                        // Await the result from the chat interface's search
                                        const searchResult = await onTriggerSearch(args.query);
                                        
                                        // Respond to the voice model with the ACTUAL result
                                        sessionPromiseRef.current?.then(session => {
                                            session.sendToolResponse({
                                                functionResponses: [{
                                                    id: fc.id,
                                                    name: fc.name,
                                                    response: { result: searchResult }
                                                }]
                                            });
                                        });
                                    }
                                }
                            }
                        }
                    },
                    onclose: () => {
                        console.log("Live Session Closed");
                        stop();
                    },
                    onerror: (err) => {
                        console.error("Live Session Error", err);
                        stop();
                    }
                }
            });

        } catch (error) {
            console.error("Connection Error", error);
            setIsConnecting(false);
        }
    }, [isActive, isConnecting, stop, assets, projectType, onUpdateEditor, onTriggerSearch]);

    return {
        isActive,
        isConnecting,
        volume,
        start,
        stop
    };
};