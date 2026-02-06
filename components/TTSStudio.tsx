import React, { useState, useEffect, useRef } from 'react';
import { Asset, AVAILABLE_VOICES, VoiceName, TTSState, TTSCharacter, TTSDirectorConfig, TTSCharacterSettings, SubscriptionTier, TIERS } from '../types';
import { generateSpeech, analyzeScriptForVoices, formatScriptForTTS, analyzeCharacterStyle } from '../services/geminiService';
import { base64ToUint8Array, pcmToWav } from '../utils/audioUtils';

interface TTSStudioProps {
    editorContent: string;
    onAddAsset: (asset: Asset) => void;
    ttsState: TTSState;
    onUpdateState: (newState: Partial<TTSState>) => void;
    checkLimit: (type: 'video' | 'image' | 'voice' | 'ensemble' | 'audio', amount?: number) => boolean;
    trackUsage: (type: 'video' | 'image' | 'voice' | 'audio', amount?: number) => void;
    userTier: SubscriptionTier;
}

const TTSStudio: React.FC<TTSStudioProps & { theme: 'dark' | 'light' }> = ({ editorContent, onAddAsset, ttsState, onUpdateState, checkLimit, trackUsage, userTier, theme }) => {
    // Destructure state from props for easier access
    const { text, mode, selectedSingleVoice, isDirectorMode, directorConfig, characters, direction, autoGenerateTrigger } = ttsState;

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isFormatting, setIsFormatting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
    const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);

    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // Sync editor content only if text is empty on mount (or handle explicitly)
    useEffect(() => {
        if (!text && editorContent) {
            onUpdateState({ text: editorContent });
        }
    }, [editorContent]); // Only run when editor content changes and text is empty

    // Auto-Generate Effect
    useEffect(() => {
        if (autoGenerateTrigger && text && !isGenerating) {
            handleGenerate();
            // Reset trigger
            onUpdateState({ autoGenerateTrigger: false });
        }
    }, [autoGenerateTrigger, text]);

    const playPreview = async (voice: VoiceName, e: React.MouseEvent) => {
        e.stopPropagation();
        if (previewingVoice) return;
        setPreviewingVoice(voice);
        try {
            const previewText = `Hello, I am ${voice}. This is a preview of my voice.`;
            const base64 = await generateSpeech(previewText, { singleVoice: voice });
            const pcm = base64ToUint8Array(base64);
            const wav = pcmToWav(pcm);
            const url = URL.createObjectURL(wav);
            const audio = new Audio(url);
            audio.play();
            audio.onended = () => setPreviewingVoice(null);
        } catch (err) {
            console.error(err);
            setPreviewingVoice(null);
        }
    };

    const handleAnalyze = async () => {
        if (!text) return;
        setIsAnalyzing(true);
        try {
            const result = await analyzeScriptForVoices(text, direction);
            const mapped = result.cast.slice(0, 2).map(r => ({
                character: r.character,
                voice: r.voice as VoiceName,
                settings: { description: '', style: '', pacing: '', accent: '' },
                autoSetInput: '',
                isAutoSetting: false,
                isExpanded: true
            }));

            let newDirectorConfig = { ...directorConfig };
            let newIsDirectorMode = isDirectorMode;

            if (result.directorConfig) {
                newDirectorConfig = { ...newDirectorConfig, ...result.directorConfig };
                if (result.directorConfig.scene || result.directorConfig.style) {
                    newIsDirectorMode = true;
                }
            }

            onUpdateState({
                characters: mapped,
                directorConfig: newDirectorConfig,
                isDirectorMode: newIsDirectorMode,
                mode: mapped.length > 1 ? 'multi' : 'single'
            });

        } catch (e) {
            alert("Could not analyze characters. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCharacterAutoSet = async (idx: number) => {
        const char = characters[idx];
        if (!char.autoSetInput) return;

        const newChars = [...characters];
        newChars[idx].isAutoSetting = true;
        onUpdateState({ characters: newChars });

        try {
            const result = await analyzeCharacterStyle(char.autoSetInput);
            const updatedChars = [...characters]; // Re-read latest
            updatedChars[idx].settings = {
                description: result.description,
                style: result.style,
                pacing: result.pacing,
                accent: result.accent
            };
            updatedChars[idx].isAutoSetting = false;
            updatedChars[idx].isExpanded = true;
            onUpdateState({ characters: updatedChars });
        } catch (e) {
            const updatedChars = [...characters];
            updatedChars[idx].isAutoSetting = false;
            onUpdateState({ characters: updatedChars });
        }
    };

    const handleAutoFormat = async () => {
        if (!text || characters.length === 0) {
            alert("Please make sure you have text and at least one character defined.");
            return;
        }
        setIsFormatting(true);
        try {
            const charNames = characters.map(c => c.character);
            const formattedText = await formatScriptForTTS(text, charNames);
            onUpdateState({ text: formattedText });
        } catch (e) {
            alert("Failed to format script.");
        } finally {
            setIsFormatting(false);
        }
    };

    const insertLine = (charName: string) => {
        const newLine = `\n${charName}: `;
        onUpdateState({ text: text + newLine });
        // Focus textarea and scroll to bottom
        setTimeout(() => {
            if (textAreaRef.current) {
                textAreaRef.current.focus();
                textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight;
            }
        }, 50);
    };

    const updateCharacter = (idx: number, field: keyof TTSCharacter, value: any) => {
        const newChars = [...characters];
        (newChars[idx] as any)[field] = value;
        onUpdateState({ characters: newChars });
    }

    const updateCharacterSettings = (idx: number, field: keyof TTSCharacterSettings, value: string) => {
        const newChars = [...characters];
        newChars[idx].settings[field] = value;
        onUpdateState({ characters: newChars });
    }

    const toggleCharacterExpand = (idx: number) => {
        const newChars = [...characters];
        newChars[idx].isExpanded = !newChars[idx].isExpanded;
        onUpdateState({ characters: newChars });
    }

    const handleGenerate = async () => {
        if (mode === 'multi' && characters.length === 0) {
            alert("Please add at least one character.");
            return;
        }

        if (!checkLimit('audio', text.length)) return;

        setIsGenerating(true);
        setLastAudioUrl(null);
        try {
            let speakerConfig: any = {};
            if (mode === 'single') {
                speakerConfig = { singleVoice: selectedSingleVoice };
            } else {
                // Map our rich state to the expected format
                speakerConfig = {
                    multiSpeaker: characters.map(c => ({
                        character: c.character,
                        voice: c.voice,
                        // Pass the combined settings as 'style' to the service
                        settings: c.settings
                    }))
                };
            }

            const base64Pcm = await generateSpeech(
                text,
                speakerConfig,
                // IMPORTANT: Only pass global director config in Single mode. 
                // In Multi mode, we rely on per-character settings.
                mode === 'single' && isDirectorMode ? directorConfig : undefined
            );

            const pcmData = base64ToUint8Array(base64Pcm);
            const wavBlob = pcmToWav(pcmData);
            const url = URL.createObjectURL(wavBlob);

            setLastAudioUrl(url);
            trackUsage('audio', text.length); // Track based on character count

            const newAsset: Asset = {
                id: Date.now().toString(),
                type: 'audio',
                name: `Audio - ${mode === 'single' ? selectedSingleVoice : 'Cast'} - ${new Date().toLocaleTimeString()}`,
                url: url,
                mimeType: 'audio/wav',
                base64: base64Pcm
            };
            onAddAsset(newAsset);

        } catch (e) {
            console.error(e);
            alert("Failed to generate audio. Ensure your script uses the 'Character: Line' format.");
        } finally {
            setIsGenerating(false);
        }
    }

    const isDark = theme === 'dark';
    const bgMain = isDark ? 'bg-gray-900' : 'bg-gray-50';
    const bgSec = isDark ? 'bg-gray-800' : 'bg-gray-100';
    const bgCard = isDark ? 'bg-gray-850' : 'bg-white';
    const textMain = isDark ? 'text-gray-200' : 'text-gray-900';
    const textSec = isDark ? 'text-gray-400' : 'text-gray-500';
    const border = isDark ? 'border-gray-800' : 'border-gray-200';
    const inputBg = isDark ? 'bg-gray-800' : 'bg-white';
    const inputBorder = isDark ? 'border-gray-700' : 'border-gray-300';

    return (
        <div className={`flex flex-col h-full ${bgMain} ${textMain} transition-colors duration-500 relative overflow-hidden`}>
            {userTier === 'FREE' && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center bg-gray-950/40 backdrop-blur-md">
                    <div className="bg-muse-600 text-white w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-muse-500/50 shadow-2xl animate-bounce-slow">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-white mb-2">Professional Audio Studio</h2>
                    <p className="text-gray-300 max-w-xs mb-8">Upgrade to Muse Auteur or Showrunner to generate cinematic voiceovers and ensemble casts.</p>
                    <button
                        onClick={() => (window as any).showSubModal?.()}
                        className="px-8 py-3 bg-muse-600 text-white rounded-xl font-bold hover:bg-muse-500 transition-all shadow-xl active:scale-95"
                    >
                        Unlock Studio
                    </button>
                    <p className={`mt-6 text-[10px] uppercase tracking-widest text-gray-500`}>Auteur & Showrunner Exclusive</p>
                </div>
            )}
            <div className={`p-4 border-b ${border} ${bgMain} flex justify-between items-center transition-colors duration-500`}>
                <h2 className={`font-serif font-bold text-xl flex items-center gap-2 ${textMain}`}>
                    <span className="text-muse-500">🎙️</span> Audio Studio
                </h2>
                <div className={`flex ${bgSec} rounded-lg p-1 text-xs font-medium`}>
                    <button
                        onClick={() => onUpdateState({ mode: 'single' })}
                        className={`px-3 py-1.5 rounded-md transition-all ${mode === 'single' ? 'bg-muse-600 text-white shadow' : `${textSec} hover:${textMain}`}`}
                    >
                        Narrator
                    </button>
                    <button
                        onClick={() => {
                            if (checkLimit('ensemble')) {
                                onUpdateState({ mode: 'multi' });
                            }
                        }}
                        className={`px-3 py-1.5 rounded-md transition-all ${mode === 'multi' ? 'bg-muse-600 text-white shadow' : `${textSec} hover:${textMain}`}`}
                    >
                        Ensemble Cast
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Top Analysis Bar - ONLY SINGLE MODE */}
                {mode === 'single' && (
                    <div className={`${bgCard} border ${inputBorder} rounded-xl p-3 flex gap-2 items-center shadow-sm`}>
                        <span className="text-lg">✨</span>
                        <input
                            type="text"
                            value={direction}
                            onChange={(e) => onUpdateState({ direction: e.target.value })}
                            placeholder="Tell AI how this should sound (e.g. 'Scary ghost story', 'Preaching father')"
                            className={`flex-1 bg-transparent border-none focus:ring-0 text-sm ${textMain} placeholder-gray-500`}
                        />
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !text}
                            className="bg-muse-600 hover:bg-muse-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 whitespace-nowrap shadow-sm"
                        >
                            {isAnalyzing ? 'Analyzing...' : 'Auto-Set Voices & Direction'}
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Script & Config */}
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex gap-2 items-center flex-wrap">
                                    <label className={`text-xs font-medium ${textSec} uppercase tracking-wider`}>Script / Timeline</label>
                                    {mode === 'multi' && (
                                        <button
                                            onClick={handleAutoFormat}
                                            disabled={isFormatting || characters.length === 0}
                                            className={`text-[10px] ${bgSec} hover:${bgMain} text-muse-500 px-2 py-0.5 rounded border ${inputBorder} transition-colors`}
                                        >
                                            {isFormatting ? 'Formatting...' : '✨ Auto-Format Script'}
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-4 items-center">
                                    <span className={`text-[10px] font-mono ${text.length > TIERS[userTier].limits.maxAudioCharsPerGen ? 'text-red-500 font-bold' : textSec}`}>
                                        {text.length.toLocaleString()} / {TIERS[userTier].limits.maxAudioCharsPerGen.toLocaleString()} chars
                                    </span>
                                    <button
                                        onClick={() => onUpdateState({ text: editorContent })}
                                        className="text-xs text-muse-500 hover:text-muse-600 font-medium"
                                    >
                                        Import from Editor
                                    </button>
                                </div>
                            </div>

                            {/* Timeline Builder Toolbar */}
                            {mode === 'multi' && characters.length > 0 && (
                                <div className={`flex flex-wrap gap-2 mb-2 p-2 ${bgCard} rounded-lg border ${inputBorder}`}>
                                    <span className={`text-[10px] uppercase font-bold ${textSec} w-full mb-1`}>Quick Insert Line:</span>
                                    {characters.map((char, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => insertLine(char.character)}
                                            className={`flex items-center gap-1.5 px-2 py-1 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded text-xs ${textMain} transition-colors`}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-muse-500"></span>
                                            {char.character}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <textarea
                                ref={textAreaRef}
                                value={text}
                                onChange={(e) => onUpdateState({ text: e.target.value })}
                                className={`w-full ${inputBg} border ${inputBorder} rounded-xl p-4 text-sm ${textMain} focus:ring-2 focus:ring-muse-500 focus:outline-none min-h-[300px] resize-y placeholder-gray-400 font-serif`}
                                placeholder={mode === 'multi'
                                    ? "Use the 'Quick Insert' buttons above to build your script line by line.\n\nCharacterName: Line of dialogue...\nAnotherName: Their line..."
                                    : "Paste your story or script here..."
                                }
                            />
                        </div>

                        {/* Director Mode Toggle - ONLY VISIBLE IN SINGLE MODE */}
                        {mode === 'single' && (
                            <div className={`${bgCard} rounded-xl border ${inputBorder} overflow-hidden shadow-sm`}>
                                <button
                                    onClick={() => onUpdateState({ isDirectorMode: !isDirectorMode })}
                                    className={`w-full flex justify-between items-center p-3 ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}
                                >
                                    <span className={`text-xs font-bold ${textMain} uppercase flex items-center gap-2`}>
                                        🎬 Global Director Mode
                                        {isDirectorMode && <span className="text-muse-500 text-[10px] bg-muse-500/10 px-1.5 py-0.5 rounded">ON</span>}
                                    </span>
                                    <svg className={`w-4 h-4 ${textSec} transition-transform ${isDirectorMode ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {isDirectorMode && (
                                    <div className={`p-4 space-y-3 ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                                        <div>
                                            <label className={`text-[10px] uppercase ${textSec} font-bold`}>Audio Profile (Persona)</label>
                                            <input
                                                value={directorConfig.audioProfile}
                                                onChange={(e) => onUpdateState({ directorConfig: { ...directorConfig, audioProfile: e.target.value } })}
                                                className={`w-full ${inputBg} border ${inputBorder} rounded p-2 text-xs ${textMain} mt-1`}
                                                placeholder="e.g. 'Jaz R. - High energy Radio DJ'"
                                            />
                                        </div>
                                        <div>
                                            <label className={`text-[10px] uppercase ${textSec} font-bold`}>The Scene</label>
                                            <textarea
                                                value={directorConfig.scene}
                                                onChange={(e) => onUpdateState({ directorConfig: { ...directorConfig, scene: e.target.value } })}
                                                className={`w-full ${inputBg} border ${inputBorder} rounded p-2 text-xs ${textMain} mt-1 h-16`}
                                                placeholder="e.g. A busy London studio at night, neon lights..."
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={`text-[10px] uppercase ${textSec} font-bold`}>Style / Vibe</label>
                                                <input
                                                    value={directorConfig.style}
                                                    onChange={(e) => onUpdateState({ directorConfig: { ...directorConfig, style: e.target.value } })}
                                                    className={`w-full ${inputBg} border ${inputBorder} rounded p-2 text-xs ${textMain} mt-1`}
                                                    placeholder="e.g. Vocal smile, energetic"
                                                />
                                            </div>
                                            <div>
                                                <label className={`text-[10px] uppercase ${textSec} font-bold`}>Pacing</label>
                                                <input
                                                    value={directorConfig.pacing}
                                                    onChange={(e) => onUpdateState({ directorConfig: { ...directorConfig, pacing: e.target.value } })}
                                                    className={`w-full ${inputBg} border ${inputBorder} rounded p-2 text-xs ${textMain} mt-1`}
                                                    placeholder="e.g. Fast, bouncing"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={`text-[10px] uppercase ${textSec} font-bold`}>Accent</label>
                                            <input
                                                value={directorConfig.accent}
                                                onChange={(e) => onUpdateState({ directorConfig: { ...directorConfig, accent: e.target.value } })}
                                                className={`w-full ${inputBg} border ${inputBorder} rounded p-2 text-xs ${textMain} mt-1`}
                                                placeholder="e.g. Brixton, London"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Voice Selection */}
                    <div className={`${bgCard} rounded-xl p-4 border ${border} flex flex-col h-full max-h-[600px] shadow-sm`}>
                        {mode === 'single' ? (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <label className={`text-xs font-medium ${textSec} uppercase tracking-wider`}>Select Voice</label>
                                    <div className={`text-xs ${textSec}`}>{AVAILABLE_VOICES.length} Voices Available</div>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                    {AVAILABLE_VOICES.map(v => (
                                        <div
                                            key={v.name}
                                            onClick={() => onUpdateState({ selectedSingleVoice: v.name })}
                                            className={`relative cursor-pointer flex items-center justify-between p-3 rounded-lg border transition-all group ${selectedSingleVoice === v.name ? 'border-muse-500 bg-muse-500/10' : `${inputBorder} ${inputBg} hover:${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${v.gender === 'Male' ? 'bg-blue-500/20 text-blue-500' : 'bg-pink-500/20 text-pink-500'}`}>
                                                    {v.name[0]}
                                                </div>
                                                <div className="text-left">
                                                    <div className={`text-sm font-semibold ${textMain}`}>{v.name}</div>
                                                    <div className={`text-xs ${textSec}`}>{v.gender} • {v.style}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => playPreview(v.name, e)}
                                                    className={`p-2 rounded-full ${isDark ? 'bg-gray-700 hover:bg-white hover:text-black' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} transition-all opacity-0 group-hover:opacity-100`}
                                                    title="Play Preview"
                                                >
                                                    {previewingVoice === v.name ? (
                                                        <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </button>
                                                {selectedSingleVoice === v.name && (
                                                    <div className="w-3 h-3 bg-muse-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <label className={`text-xs font-medium ${textSec} uppercase tracking-wider`}>Cast List (Max 2 Speakers)</label>
                                </div>
                                <div className="space-y-4">
                                    {characters.map((char, idx) => (
                                        <div key={idx} className={`flex flex-col gap-2 ${bgMain} p-3 rounded-lg border ${inputBorder}`}>
                                            {/* Character Header */}
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs ${textSec} font-bold w-6`}>#{idx + 1}</span>
                                                <input
                                                    value={char.character}
                                                    onChange={(e) => updateCharacter(idx, 'character', e.target.value)}
                                                    className={`bg-transparent text-sm font-bold ${textMain} w-full focus:outline-none placeholder-gray-500`}
                                                    placeholder="Character Name"
                                                />
                                            </div>

                                            {/* Voice Select */}
                                            <div className="flex gap-2 items-center">
                                                <span className={`text-xs ${textSec}`}>Voice:</span>
                                                <select
                                                    value={char.voice}
                                                    onChange={(e) => updateCharacter(idx, 'voice', e.target.value)}
                                                    className={`${inputBg} text-xs ${textMain} rounded border ${inputBorder} p-1.5 flex-1 focus:outline-none`}
                                                >
                                                    {AVAILABLE_VOICES.map(v => (
                                                        <option key={v.name} value={v.name}>{v.name} ({v.style})</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={(e) => playPreview(char.voice, e)}
                                                    className={`${textSec} hover:${textMain}`}
                                                    title="Preview this voice"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* PER-CHARACTER AUTO SET BAR */}
                                            <div className="flex gap-1 mt-1">
                                                <input
                                                    value={char.autoSetInput}
                                                    onChange={(e) => updateCharacter(idx, 'autoSetInput', e.target.value)}
                                                    placeholder="✨ Tell AI how this character sounds..."
                                                    className={`flex-1 ${inputBg} border ${inputBorder} rounded p-1.5 text-[10px] ${textMain} focus:outline-none focus:border-muse-500`}
                                                />
                                                <button
                                                    onClick={() => handleCharacterAutoSet(idx)}
                                                    disabled={char.isAutoSetting || !char.autoSetInput}
                                                    className={`${isDark ? 'bg-gray-700' : 'bg-gray-200'} hover:bg-muse-600 text-[10px] ${isDark ? 'text-white' : 'text-gray-700'} px-2 py-1 rounded transition-colors disabled:opacity-50`}
                                                >
                                                    {char.isAutoSetting ? '...' : 'Auto-Set'}
                                                </button>
                                            </div>

                                            {/* Per-Character Director Settings Button */}
                                            <div className="mt-1">
                                                <button
                                                    onClick={() => toggleCharacterExpand(idx)}
                                                    className={`w-full text-[10px] uppercase font-bold ${textSec} hover:text-muse-500 border ${inputBorder} hover:border-muse-500/50 ${bgCard} rounded py-1.5 transition-all flex items-center justify-center gap-1`}
                                                >
                                                    <span>{char.isExpanded ? '▼' : '⚙️'}</span>
                                                    {char.isExpanded ? 'Hide Director Controls' : 'Director Controls'}
                                                </button>

                                                {char.isExpanded && (
                                                    <div className={`mt-2 space-y-2 p-2 ${isDark ? 'bg-gray-900' : 'bg-gray-100'} rounded border ${inputBorder}`}>
                                                        <div>
                                                            <label className={`text-[9px] ${textSec} uppercase`}>Persona / Audio Profile</label>
                                                            <input
                                                                value={char.settings.description}
                                                                onChange={(e) => updateCharacterSettings(idx, 'description', e.target.value)}
                                                                className={`w-full ${inputBg} border ${inputBorder} rounded p-1 text-xs ${textMain} mt-0.5`}
                                                                placeholder="e.g. Grumpy old man"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className={`text-[9px] ${textSec} uppercase`}>Style / Vibe</label>
                                                                <input
                                                                    value={char.settings.style}
                                                                    onChange={(e) => updateCharacterSettings(idx, 'style', e.target.value)}
                                                                    className={`w-full ${inputBg} border ${inputBorder} rounded p-1 text-xs ${textMain} mt-0.5`}
                                                                    placeholder="e.g. Whispering"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className={`text-[9px] ${textSec} uppercase`}>Pacing</label>
                                                                <input
                                                                    value={char.settings.pacing}
                                                                    onChange={(e) => updateCharacterSettings(idx, 'pacing', e.target.value)}
                                                                    className={`w-full ${inputBg} border ${inputBorder} rounded p-1 text-xs ${textMain} mt-0.5`}
                                                                    placeholder="e.g. Slow, deliberate"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className={`text-[9px] ${textSec} uppercase`}>Accent</label>
                                                            <input
                                                                value={char.settings.accent}
                                                                onChange={(e) => updateCharacterSettings(idx, 'accent', e.target.value)}
                                                                className={`w-full ${inputBg} border ${inputBorder} rounded p-1 text-xs ${textMain} mt-0.5`}
                                                                placeholder="e.g. Southern US, Brixton"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {characters.length < 2 ? (
                                        <button
                                            onClick={() => onUpdateState({
                                                characters: [...characters, {
                                                    character: 'New Character',
                                                    voice: 'Zephyr',
                                                    settings: { description: '', style: '', pacing: '', accent: '' },
                                                    autoSetInput: '',
                                                    isAutoSetting: false,
                                                    isExpanded: true
                                                }]
                                            })}
                                            className={`w-full py-2 border border-dashed ${inputBorder} ${textSec} text-xs rounded hover:${isDark ? 'border-gray-500 text-gray-300' : 'border-gray-400 text-gray-700'}`}
                                        >
                                            + Add Character
                                        </button>
                                    ) : (
                                        <div className={`text-center p-2 text-[10px] ${isDark ? 'text-amber-500/80 bg-amber-900/10 border-amber-900/20' : 'text-amber-700 bg-amber-50 border-amber-200'} rounded border`}>
                                            Maximum 2 speakers supported by API.
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className={`p-6 border-t ${border} ${bgMain} z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.1)]`}>
                {lastAudioUrl && (
                    <div className={`mb-4 ${isDark ? 'bg-muse-500/10 border-muse-500/30' : 'bg-blue-50 border-blue-100'} rounded-xl p-4 flex items-center justify-between`}>
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 rounded-full bg-muse-500 flex items-center justify-center text-white shadow-lg shadow-muse-500/30">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 01.298 1.049l-5.318 8.963-2 3.374c-.726 1.224-2.231 1.774-3.57.882l-.46-.307a2.95 2.95 0 01-1.31-2.072l-.475-5.903a.75.75 0 011.085-.733l4.318 1.956 5.383-9.112a.75.75 0 011.049-.298zM2.5 12a9.5 9.5 0 1019 0 9.5 9.5 0 00-19 0zM12 2.75a9.25 9.25 0 100 18.5 9.25 9.25 0 000-18.5z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <audio controls src={lastAudioUrl} className="h-8 flex-1" />
                        </div>
                        <a href={lastAudioUrl} download="muse-audio.wav" className={`ml-4 px-3 py-2 ${bgCard} hover:${isDark ? 'bg-white text-black' : 'bg-gray-100'} rounded-lg text-xs font-medium transition-colors border ${inputBorder} shadow-sm`}>
                            Download WAV
                        </a>
                    </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !text}
                    className={`w-full py-4 bg-gradient-to-r from-muse-600 to-purple-600 hover:from-muse-500 hover:to-purple-500 text-white rounded-xl font-bold ${isDark ? 'shadow-purple-900/20' : 'shadow-muse-500/20'} shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.99]`}
                >
                    {isGenerating ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="tracking-wide">SYNTHESIZING AUDIO...</span>
                        </>
                    ) : (
                        <>
                            <span className="text-xl">🎙️</span>
                            <span className="tracking-wide">GENERATE MASTERPIECE</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default TTSStudio;