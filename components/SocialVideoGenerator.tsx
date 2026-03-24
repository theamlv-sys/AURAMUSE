import React, { useState, useRef, useEffect } from 'react';
import { Asset, SubscriptionTier } from '../types';
import { generateWriting, generateStoryboardImage, generateVeoVideo, callGeminiProxy, generateSpeech } from '../services/geminiService';
import { compileClipsWithAudio } from '../services/videoService';

interface SocialVideoGeneratorProps {
    onBack: () => void;
    userTier: SubscriptionTier;
}

const SocialVideoGenerator: React.FC<SocialVideoGeneratorProps> = ({ onBack, userTier }) => {
    const [prompt, setPrompt] = useState('');
    const [duration, setDuration] = useState<15 | 30 | 60>(15);
    const [status, setStatus] = useState<'idle' | 'script' | 'images' | 'video' | 'audio' | 'compiling' | 'complete' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any>(null);
    
    // UI states during generation
    const [currentStepText, setCurrentStepText] = useState('');
    const [generatedScript, setGeneratedScript] = useState('');
    const [generatedScenes, setGeneratedScenes] = useState<any[]>([]);
    const [liveImages, setLiveImages] = useState<string[]>([]);

    useEffect(() => {
        // Setup Speech Recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            
            recognitionRef.current.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setPrompt(prev => prev + ' ' + finalTranscript);
                }
            };
            
            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsRecording(false);
            };
        }
    }, []);

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            setPrompt(''); // Clear before starting a new recording
            recognitionRef.current?.start();
            setIsRecording(true);
        }
    };

    const handleGenerate = async () => {
        if (!prompt) return;
        setStatus('script');
        setProgress(5);
        setCurrentStepText('Expanding your idea into a full script & scene list...');
        
        try {
            // STEP 1: Generate Script & Scenes
            const scriptPrompt = `You are a viral social media video producer. Take this idea: "${prompt}".
            Produce a JSON object with:
            {
              "script": "The full voiceover script reading natively",
              "scenes": [
                 { 
                   "sceneDescription": "Detailed visual description of action for the video model",
                   "imagePrompt": "Cinematic purely visual prompt for the image model to create the first frame. No dialogue, no text."
                 }
              ]
            }
            The total video duration should be approx ${duration} seconds. Provide enough scenes (approx 1 scene every 5 seconds). Only return valid JSON.`;

            const aiResponse = await callGeminiProxy('gemini-3.1-flash-lite-preview', { parts: [{ text: scriptPrompt }] }, { responseMimeType: 'application/json' });
            
            let plan;
            try {
                 const text = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
                 plan = JSON.parse(text || "{}");
            } catch(e) {
                 throw new Error("Failed to parse script JSON from AI.");
            }
            
            if (!plan.script || !plan.scenes || plan.scenes.length === 0) {
                throw new Error("Invalid script structure returned from AI.");
            }
            
            setGeneratedScript(plan.script);
            setGeneratedScenes(plan.scenes);
            setProgress(20);

            // STEP 2: Generate Still Images
            setStatus('images');
            setCurrentStepText('Generating base cinematic frames for each scene...');
            
            const blankImages = new Array(plan.scenes.length).fill('');
            setLiveImages(blankImages);
            
            const imagePromises = plan.scenes.map(async (scene: any, index: number) => {
                const b64 = await generateStoryboardImage(scene.imagePrompt, userTier, '9:16', 'gemini-3.1-flash-image-preview');
                setLiveImages(prev => {
                    const newArr = [...prev];
                    newArr[index] = b64;
                    return newArr;
                });
                return b64; // Data URL
            });
            
            const baseImages = await Promise.all(imagePromises);
            setProgress(40);

            // STEP 3: Generate Video Clips
            setStatus('video');
            setCurrentStepText('Animating frames into video clips using Veo 3.1...');
            
            const videoUrls: string[] = [];
            // Sequential generation to avoid potential parallel throttling on video endpoint
            for (let i = 0; i < baseImages.length; i++) {
                setCurrentStepText(`Animating scene ${i+1} of ${baseImages.length}...`);
                const base64Data = baseImages[i].split(',')[1].trim(); // Fixed base64 parsing 
                const videoUrl = await generateVeoVideo(plan.scenes[i].sceneDescription, base64Data);
                videoUrls.push(videoUrl);
                setProgress(40 + Math.floor((30 / baseImages.length) * (i + 1)));
            }

            // STEP 4: Generate Voice-over
            setStatus('audio');
            setCurrentStepText('Synthesizing voice-over using Gemini TTS...');
            const audioB64 = await generateSpeech(plan.script, { singleVoice: 'Zephyr' });
            setProgress(80);

            // Convert everything to Blobs for FFmpeg
            setStatus('compiling');
            setCurrentStepText('Compiling final video with FFmpeg...');
            
            const videoBlobs = await Promise.all(videoUrls.map(async url => {
                const res = await fetch(url);
                return await res.blob();
            }));
            
            // Audio B64 to Blob
            const audioRaw = atob(audioB64);
            const audioArray = new Uint8Array(new ArrayBuffer(audioRaw.length));
            for (let i = 0; i < audioRaw.length; i++) {
                audioArray[i] = audioRaw.charCodeAt(i);
            }
            const audioBlob = new Blob([audioArray], { type: 'audio/mp3' });
            
            const finalBlob = await compileClipsWithAudio(videoBlobs, audioBlob, (p) => {
                setProgress(80 + Math.floor(p * 20));
            });
            
            const finalUrl = URL.createObjectURL(finalBlob);
            setFinalVideoUrl(finalUrl);
            setStatus('complete');
            setProgress(100);
            
        } catch (error: any) {
            console.error("Generator Error:", error);
            setStatus('error');
            setCurrentStepText(error.message || "An unknown error occurred.");
        }
    };

    return (
        <div className="flex-1 h-full bg-[#050508] text-white p-6 md:p-12 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="max-w-4xl mx-auto w-full">
                <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center gap-2 mb-6">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Studio
                </button>
                
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-muse-400 to-purple-500 mb-2">Social Video Generator</h1>
                    <p className="text-gray-400">Powered by Gemini 3.1 Flash, Nano Banana 2, Veo 3.1, and Gemini TTS</p>
                </div>
                
                {status === 'idle' || status === 'error' ? (
                    <div className="bg-[#0a0a0f] border border-[#1a1a20] rounded-2xl p-6 md:p-8 shadow-2xl">
                        <label className="block text-sm font-bold text-gray-300 mb-3">What's your video idea?</label>
                        <div className="relative">
                            <textarea 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="E.g., A dramatic cinematic hook about why procrastination is secretly a superpower..."
                                className="w-full h-32 bg-[#111118] border border-[#2a2a30] rounded-xl p-4 text-white focus:outline-none focus:border-muse-500 resize-none"
                            />
                            <button 
                                onClick={toggleRecording}
                                className={`absolute bottom-4 right-4 p-3 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-muse-500/20 text-muse-500 hover:bg-muse-500 hover:text-white'}`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            </button>
                        </div>
                        
                        <div className="mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">Duration</label>
                                <div className="flex gap-2">
                                    {[15, 30, 60].map(d => (
                                        <button 
                                            key={d}
                                            onClick={() => setDuration(d as any)}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${duration === d ? 'bg-muse-600 text-white' : 'bg-[#111118] text-gray-400 hover:text-white border border-[#2a2a30]'}`}
                                        >
                                            {d}s
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleGenerate}
                                disabled={!prompt || prompt.length < 5}
                                className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-muse-600 to-purple-600 hover:from-muse-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-muse-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Generate Video
                            </button>
                        </div>
                        
                        {status === 'error' && (
                            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                                {currentStepText}
                            </div>
                        )}
                    </div>
                ) : status !== 'complete' ? (
                    <div className="bg-[#0a0a0f] border border-[#1a1a20] rounded-2xl p-8 shadow-2xl flex flex-col items-center justify-center text-center min-h-[400px]">
                        <div className="relative w-32 h-32 mb-8">
                            <svg className="w-full h-full text-muse-500/20 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-2xl font-black text-muse-400">
                                {progress === 100 ? 99 : progress}%
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 animate-pulse">{currentStepText}</h3>
                        <p className="text-gray-500 text-sm max-w-md">
                            Google's core AI models are writing the script, establishing cinematic frames, rendering video, synthesizing voice, and stitching it all together. This can take several minutes.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        <div className="w-full lg:w-1/3 flex-shrink-0">
                            <div className="aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl relative">
                                {finalVideoUrl && (
                                    <video 
                                        src={finalVideoUrl} 
                                        controls 
                                        autoPlay 
                                        loop 
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            
                            <a 
                                href={finalVideoUrl!} 
                                download="AuraDomoMuse-Short.mp4"
                                className="mt-4 w-full px-6 py-3 bg-white text-black hover:bg-gray-200 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download Video
                            </a>
                            <button 
                                onClick={() => { setStatus('idle'); setFinalVideoUrl(null); setGeneratedScript(''); setGeneratedScenes([]); setLiveImages([]); setPrompt(''); setProgress(0); }}
                                className="mt-4 w-full px-6 py-3 bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 font-bold rounded-xl transition-all"
                            >
                                Create Another
                            </button>
                        </div>
                        
                        <div className="flex-1 bg-[#0a0a0f] border border-[#1a1a20] rounded-2xl p-6 shadow-xl h-full flex flex-col">
                            <h3 className="text-lg font-bold text-white mb-4 border-b border-[#1a1a20] pb-2">Generated Script</h3>
                            <div className="text-gray-300 whitespace-pre-wrap font-serif text-sm leading-relaxed max-w-none prose prose-invert overflow-y-auto max-h-48 mb-8 custom-scrollbar">
                                {generatedScript || "Script rendering failed."}
                            </div>
                            
                            <h3 className="text-lg font-bold text-white mb-4 border-b border-[#1a1a20] pb-2">Scene Timeline</h3>
                            <div className="space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                                {generatedScenes.map((scene, i) => (
                                    <div key={i} className="bg-[#111118] p-4 rounded-xl border border-white/5 flex gap-4 items-center">
                                        <div className="w-20 h-auto aspect-[9/16] bg-black rounded-lg overflow-hidden flex-shrink-0 relative border border-gray-800">
                                            {liveImages[i] ? (
                                                <img src={liveImages[i]} alt={`Scene ${i+1}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-gray-700 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v4"/></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-xs text-muse-500 font-bold uppercase mb-1">Scene {i+1}</div>
                                            <p className="text-sm text-gray-300">{scene.sceneDescription}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SocialVideoGenerator;
