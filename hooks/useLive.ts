import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { updateEditorTool, appendEditorTool, triggerSearchTool, configureAudioStudioTool, listEmailsTool, sendEmailTool, listCalendarEventsTool, createCalendarEventTool, deleteCalendarEventTool } from '../services/geminiService';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';
import { Asset, ProjectType, Message, TTSState, TTSCharacter } from '../types';
import { gmailService } from '../services/gmailService';
import { googleCalendarService } from '../services/googleCalendarService';

interface UseLiveProps {
    onUpdateEditor: (newContent: string) => void;
    onAppendEditor: (contentToAdd: string) => void;
    onTriggerSearch: (query: string) => Promise<string>;
    onConfigureTTS: (newState: Partial<TTSState>) => void;
    editorContent: string;
    assets: Asset[];
    projectType: ProjectType;
    chatHistory: Message[];
    gmailToken?: string;
    providerToken?: string; // Google OAuth Token for Calendar
}

export const useLive = ({ onUpdateEditor, onAppendEditor, onTriggerSearch, onConfigureTTS, editorContent, assets, projectType, chatHistory, gmailToken, providerToken }: UseLiveProps) => {
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
    const chatHistoryRef = useRef(chatHistory);

    // Update refs when props change
    useEffect(() => {
        currentEditorContentRef.current = editorContent;
    }, [editorContent]);

    useEffect(() => {
        chatHistoryRef.current = chatHistory;
    }, [chatHistory]);

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
                } catch (e) { console.error("Error closing session", e); }
            });
            sessionPromiseRef.current = null;
        }
    }, []);

    const start = useCallback(async () => {
        if (isActive || isConnecting) return;

        // 1. Check for Hardware/Browser Support before doing anything
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Microphone access is not supported in this browser or context (requires HTTPS).");
            return;
        }

        setIsConnecting(true);

        try {
            // 2. Initialize Microphone First (Fail fast if no mic)
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (err: any) {
                console.error("Mic Initialization Error:", err);
                setIsConnecting(false);
                if (err.name === 'NotFoundError' || err.message?.includes('device not found')) {
                    alert("No microphone found. Please connect a microphone and try again.");
                } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    alert("Microphone permission denied. Please allow access in your browser settings.");
                } else {
                    alert(`Could not access microphone: ${err.message}`);
                }
                return;
            }

            mediaStreamRef.current = stream;

            const apiKey = import.meta.env.VITE_GOOGLE_GENAI_API_KEY;
            if (!apiKey) {
                alert("Live Voice requires a VITE_GOOGLE_GENAI_API_KEY in .env (WebSockets cannot yet be proxied safely).");
                setIsConnecting(false);
                stop();
                return;
            }
            const ai = new GoogleGenAI({ apiKey });

            // Setup Output Audio
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;

            // Prepare System Instruction
            const assetDesc = assets.map(a => {
                if (a.type === 'link') return `- Link: ${a.url}`;
                if (a.type === 'pdf') return `- PDF File: ${a.name}`;
                return `- ${a.name} (${a.type})`;
            }).join('\n');

            // Format recent history to provide context
            const recentMsgs = chatHistoryRef.current
                .slice(-10) // Take last 10 messages
                .filter(m => m.role !== 'system')
                .map(m => `${m.role.toUpperCase()}: ${m.content}`)
                .join('\n');

            const systemInstruction = `You are Aura Assistant, the advanced production AI for Muse.
CURRENT MODE: ${projectType}
ASSETS: ${assets.length > 0 ? 'See list below.' : 'None.'}

CAPABILITIES:
1. 'appendEditor': Use this to ADD text to the story/document. Preferred for writing.
2. 'updateEditor': Use this ONLY for rewrites/fixes where you replace the whole text.
3. 'triggerChatSearch': Use for research.
4. 'configureAudioStudio': FULL CONTROL of the Audio/TTS studio. Use this to generate speech/audio dramas.
5. 'listEmails': Access the user's Gmail inbox. Read emails to them.
6. 'sendEmail': Send emails on their behalf. ALWAYS confirm the distinct content before sending.
7. 'listCalendarEvents': Check the user's schedule.
8. 'createCalendarEvent': Schedule meetings/deadlines.
9. 'deleteCalendarEvent': Remove events from the calendar.

CONTEXT (Recent Conversation):
${recentMsgs || "No previous context."}

${assetDesc ? `\nASSET LIST:\n${assetDesc}` : ''}
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
                        { functionDeclarations: [updateEditorTool, appendEditorTool, triggerSearchTool, configureAudioStudioTool, listEmailsTool, sendEmailTool, listCalendarEventsTool, createCalendarEventTool, deleteCalendarEventTool] }
                    ]
                },
                callbacks: {
                    onopen: async () => {
                        console.log("Live Session Opened");
                        setIsActive(true);
                        setIsConnecting(false);

                        // Start Audio Processing Pipeline
                        try {
                            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                            audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });

                            const source = audioContextRef.current.createMediaStreamSource(stream);
                            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                            processorRef.current = processor;

                            processor.onaudioprocess = (e) => {
                                const inputData = e.inputBuffer.getChannelData(0);

                                // Volume visualization calculation
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
                            console.error("Audio Pipeline Error", err);
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
                                        currentEditorContentRef.current = args.newContent;

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
                                } else if (fc.name === 'appendEditor') {
                                    const args = fc.args as any;
                                    console.log("Tool Call: appendEditor", args);
                                    if (args.contentToAdd) {
                                        onAppendEditor(args.contentToAdd);
                                        // Update local ref locally to keep sync
                                        currentEditorContentRef.current += "\n\n" + args.contentToAdd;

                                        sessionPromiseRef.current?.then(session => {
                                            session.sendToolResponse({
                                                functionResponses: [{
                                                    id: fc.id,
                                                    name: fc.name,
                                                    response: { result: "Content appended to editor." }
                                                }]
                                            });
                                        });
                                    }
                                } else if (fc.name === 'triggerChatSearch') {
                                    const args = fc.args as any;
                                    console.log("Tool Call: triggerChatSearch", args);
                                    if (args.query) {
                                        const searchResult = await onTriggerSearch(args.query);

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
                                } else if (fc.name === 'configureAudioStudio') {
                                    const args = fc.args as any;
                                    console.log("Tool Call: configureAudioStudio", args);

                                    const newState: Partial<TTSState> = {};
                                    if (args.mode) newState.mode = args.mode;
                                    if (args.script) newState.text = args.script;
                                    if (args.singleVoice) newState.selectedSingleVoice = args.singleVoice;

                                    if (args.characters) {
                                        newState.characters = args.characters.map((c: any) => ({
                                            character: c.name,
                                            voice: c.voice,
                                            settings: {
                                                description: c.settings?.description || '',
                                                style: c.settings?.style || '',
                                                pacing: c.settings?.pacing || '',
                                                accent: c.settings?.accent || ''
                                            },
                                            isExpanded: true,
                                            autoSetInput: c.settings?.description || '',
                                            isAutoSetting: false
                                        }));
                                    }

                                    if (args.autoGenerate) {
                                        newState.autoGenerateTrigger = true;
                                    }

                                    onConfigureTTS(newState);

                                    sessionPromiseRef.current?.then(session => {
                                        session.sendToolResponse({
                                            functionResponses: [{
                                                id: fc.id,
                                                name: fc.name,
                                                response: { result: "Audio Studio configured and generation started." }
                                            }]
                                        });
                                    });
                                } else if (fc.name === 'listEmails') {
                                    const args = fc.args as any;
                                    console.log("Tool Call: listEmails", args);

                                    if (!gmailToken) {
                                        sessionPromiseRef.current?.then(session => {
                                            session.sendToolResponse({
                                                functionResponses: [{
                                                    id: fc.id,
                                                    name: fc.name,
                                                    response: { result: "Error: Gmail not connected. Ask the user to connect via the Dashboard." }
                                                }]
                                            });
                                        });
                                    } else {
                                        gmailService.listMessages(gmailToken, args.count || 5)
                                            .then(emails => {
                                                sessionPromiseRef.current?.then(session => {
                                                    session.sendToolResponse({
                                                        functionResponses: [{
                                                            id: fc.id,
                                                            name: fc.name,
                                                            response: { result: JSON.stringify(emails) }
                                                        }]
                                                    });
                                                });
                                            })
                                            .catch(err => {
                                                console.error("Gmail List Error", err);
                                                sessionPromiseRef.current?.then(session => {
                                                    session.sendToolResponse({
                                                        functionResponses: [{
                                                            id: fc.id,
                                                            name: fc.name,
                                                            response: { result: "Failed to fetch emails." }
                                                        }]
                                                    });
                                                });
                                            });
                                    }
                                } else if (fc.name === 'sendEmail') {
                                    const args = fc.args as any;
                                    console.log("Tool Call: sendEmail", args);

                                    if (!gmailToken) {
                                        sessionPromiseRef.current?.then(session => {
                                            session.sendToolResponse({
                                                functionResponses: [{
                                                    id: fc.id,
                                                    name: fc.name,
                                                    response: { result: "Error: Gmail not connected." }
                                                }]
                                            });
                                        });
                                    } else {
                                        gmailService.sendEmail(gmailToken, args.to, args.subject, args.body)
                                            .then(() => {
                                                sessionPromiseRef.current?.then(session => {
                                                    session.sendToolResponse({
                                                        functionResponses: [{
                                                            id: fc.id,
                                                            name: fc.name,
                                                            response: { result: "Email sent successfully." }
                                                        }]
                                                    });
                                                });
                                            })
                                            .catch(err => {
                                                console.error("Gmail Send Error", err);
                                                sessionPromiseRef.current?.then(session => {
                                                    session.sendToolResponse({
                                                        functionResponses: [{
                                                            id: fc.id,
                                                            name: fc.name,
                                                            response: { result: "Failed to send email." }
                                                        }]
                                                    });
                                                });
                                            });
                                    }
                                } else if (fc.name === 'listCalendarEvents') {
                                    const args = fc.args as any;
                                    console.log("Tool Call: listCalendarEvents", args);
                                    if (!providerToken) {
                                        sessionPromiseRef.current?.then(session => {
                                            session.sendToolResponse({
                                                functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Error: No Calendar access. User must connect Google account." } }]
                                            });
                                        });
                                    } else {
                                        googleCalendarService.listEvents(providerToken)
                                            .then(events => {
                                                sessionPromiseRef.current?.then(session => {
                                                    session.sendToolResponse({
                                                        functionResponses: [{ id: fc.id, name: fc.name, response: { result: JSON.stringify(events) } }]
                                                    });
                                                });
                                            })
                                            .catch(err => {
                                                sessionPromiseRef.current?.then(session => {
                                                    session.sendToolResponse({
                                                        functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Failed to fetch events: " + err.message } }]
                                                    });
                                                });
                                            });
                                    }
                                } else if (fc.name === 'createCalendarEvent') {
                                    const args = fc.args as any;
                                    console.log("Tool Call: createCalendarEvent", args);
                                    if (!providerToken) {
                                        sessionPromiseRef.current?.then(session => {
                                            session.sendToolResponse({
                                                functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Error: No Calendar access." } }]
                                            });
                                        });
                                    } else {
                                        // Simple parsing or direct usage if AI provides ISO strings
                                        // AI usually provides YYYY-MM-DDTHH:MM:SS
                                        googleCalendarService.createEvent(providerToken, {
                                            summary: args.summary,
                                            description: args.description || '',
                                            start: args.startTime,
                                            end: args.endTime
                                        })
                                            .then(evt => {
                                                sessionPromiseRef.current?.then(session => {
                                                    session.sendToolResponse({
                                                        functionResponses: [{ id: fc.id, name: fc.name, response: { result: `Event created: ${evt.summary} at ${evt.start.dateTime}` } }]
                                                    });
                                                });
                                            })
                                            .catch(err => {
                                                sessionPromiseRef.current?.then(session => {
                                                    session.sendToolResponse({
                                                        functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Failed to create event: " + err.message } }]
                                                    });
                                                });
                                            });
                                    }
                                } else if (fc.name === 'deleteCalendarEvent') {
                                    const args = fc.args as any;
                                    console.log("Tool Call: deleteCalendarEvent", args);
                                    if (!providerToken) {
                                        sessionPromiseRef.current?.then(session => {
                                            session.sendToolResponse({
                                                functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Error: No Calendar access." } }]
                                            });
                                        });
                                    } else {
                                        googleCalendarService.deleteEvent(providerToken, args.eventId)
                                            .then(() => {
                                                sessionPromiseRef.current?.then(session => {
                                                    session.sendToolResponse({
                                                        functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Event deleted successfully." } }]
                                                    });
                                                });
                                            })
                                            .catch(err => {
                                                sessionPromiseRef.current?.then(session => {
                                                    session.sendToolResponse({
                                                        functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Failed to delete event: " + err.message } }]
                                                    });
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
                        setIsConnecting(false);
                        setIsActive(false);
                        stop();
                    }
                }
            });

        } catch (error) {
            console.error("Connection Error", error);
            setIsConnecting(false);
            alert("Failed to connect to AI Voice Service.");
        }
    }, [isActive, isConnecting, stop, assets, projectType, onUpdateEditor, onAppendEditor, onTriggerSearch, onConfigureTTS, chatHistory]);

    return {
        isActive,
        isConnecting,
        volume,
        start,
        stop
    };
};