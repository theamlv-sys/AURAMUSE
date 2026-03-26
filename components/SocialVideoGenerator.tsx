/**
 * ShortsGen AI — Ported from AI Studio standalone app
 * Routes all API calls through the existing Supabase gemini-proxy
 */

import React, { useState, useEffect, useRef } from 'react';
import { SubscriptionTier } from '../types';
import { callGeminiProxy, generateVeoVideo } from '../services/geminiService';
import { 
  Sparkles, Video, Mic, Loader2, Play, AlertCircle,
  Image as ImageIcon, Type, Volume2, RefreshCw, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// --- Types ---
type VideoStatus = 'idle' | 'generating_script' | 'generating_images' | 'generating_video' | 'generating_audio' | 'stitching_video' | 'completed' | 'failed';

interface StoryboardFrame {
  id: string;
  imagePrompt: string;
  imageUrl?: string;
  videoUrl?: string;
  scriptPart: string;
}

interface VideoProject {
  id: string;
  idea: string;
  style: string;
  script: string;
  frames: StoryboardFrame[];
  audioUrl?: string;
  audioDuration?: number;
  finalVideoUrl?: string;
  status: VideoStatus;
  error?: string;
}

// --- PCM to WAV helper ---
function pcmToWav(pcmBase64: string, sampleRate: number = 24000): Blob {
  const binaryString = atob(pcmBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

  const buffer = new ArrayBuffer(44 + bytes.length);
  const view = new DataView(buffer);
  const writeString = (v: DataView, offset: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i)); };
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + bytes.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, bytes.length, true);
  new Uint8Array(buffer, 44).set(bytes);

  return new Blob([buffer], { type: 'audio/wav' });
}

// --- Styles ---
const styles = [
  { name: 'Normal (Cinematic)', prompt: 'cinematic lighting, professional photography, 8k, highly detailed' },
  { name: 'Stick Figure', prompt: 'minimalist stick figure drawing, simple lines, white background, hand-drawn style' },
  { name: 'Cartoon', prompt: 'vibrant cartoon style, bold outlines, 2D animation look, colorful' },
  { name: 'Anime', prompt: 'modern anime style, high contrast, expressive eyes, detailed backgrounds' },
  { name: 'Cyberpunk', prompt: 'neon lights, futuristic city, dark atmosphere, high tech, glowing elements' },
  { name: 'Watercolor', prompt: 'soft watercolor painting, artistic brush strokes, pastel colors, dreamy atmosphere' },
  { name: 'Pixel Art', prompt: 'retro 16-bit pixel art, video game aesthetic, sharp pixels, limited color palette' },
  { name: '3D Render', prompt: 'modern 3D animation style, Pixar inspired, soft lighting, smooth textures' },
];

// --- Component ---

interface SocialVideoGeneratorProps {
  onBack: () => void;
  userTier: SubscriptionTier;
}

const SocialVideoGenerator: React.FC<SocialVideoGeneratorProps> = ({ onBack }) => {
  const [idea, setIdea] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('Normal (Cinematic)');
  const [isRecording, setIsRecording] = useState(false);
  const [project, setProject] = useState<VideoProject | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // -- Playback sync --
  useEffect(() => {
    let interval: any;
    if (isPlaying && project?.audioUrl && audioRef.current) {
      const updateFrame = () => {
        if (audioRef.current) {
          const duration = project.audioDuration || audioRef.current.duration || 15;
          const currentTime = audioRef.current.currentTime;
          const frameDuration = duration / project.frames.length;
          const newIdx = Math.min(Math.floor(currentTime / frameDuration), project.frames.length - 1);
          setCurrentFrameIdx(newIdx);
        }
      };
      interval = setInterval(updateFrame, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, project]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.currentTime = 0;
        setCurrentFrameIdx(0);
        audioRef.current.play().catch(err => console.error("Audio play failed", err));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIdea(prev => prev ? prev + " " + transcript : transcript);
    };
    recognition.start();
  };

  // --- CORE GENERATION PIPELINE ---
  const generateVideo = async () => {
    if (!idea.trim()) return;

    const stylePrompt = styles.find(s => s.name === selectedStyle)?.prompt || styles[0].prompt;

    const newProject: VideoProject = {
      id: Math.random().toString(36).substr(2, 9),
      idea,
      style: selectedStyle,
      script: '',
      frames: [],
      status: 'generating_script',
    };
    setProject(newProject);
    setLoadingMessage('Crafting the perfect script...');

    try {
      // 1. Generate Script and Image Prompts via proxy
      const scriptResponse = await callGeminiProxy('gemini-3.1-flash-lite-preview', {
        parts: [{
          text: `Create a viral short-form video script (TikTok/Reels) for this idea: "${idea}". 
          The visual style is: ${selectedStyle}.
          Return a JSON object with:
          - "script": the full voiceover text
          - "frames": an array of 3-5 objects, each with "scriptPart" (text for that segment) and "imagePrompt" (detailed visual description for image generation matching the ${selectedStyle} style, 9:16 aspect ratio, NO mention of sound, audio, talking, voices, or music).`
        }]
      }, { responseMimeType: 'application/json' });

      const scriptData = JSON.parse(scriptResponse.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
      if (!scriptData.script || !scriptData.frames || scriptData.frames.length === 0) {
        throw new Error("Invalid script structure returned from AI.");
      }

      setProject(prev => prev ? { 
        ...prev, 
        script: scriptData.script, 
        frames: scriptData.frames.map((f: any) => ({ ...f, id: Math.random().toString(36).substr(2, 5) })),
        status: 'generating_images' 
      } : null);
      setLoadingMessage(`Visualizing your story in ${selectedStyle} style...`);

      // 2. Generate Images via proxy (Nano Banana 2)
      const updatedFrames: StoryboardFrame[] = [];
      for (const frame of scriptData.frames) {
        const imgResponse = await callGeminiProxy('gemini-3.1-flash-image-preview', {
          parts: [{ text: `${frame.imagePrompt}, ${stylePrompt}, 9:16 aspect ratio` }]
        }, {
          responseModalities: ['Text', 'Image'],
          imageConfig: { aspectRatio: '9:16', imageSize: '1K' }
        });

        let imageUrl = '';
        for (const part of imgResponse.candidates?.[0]?.content?.parts || []) {
          if (part.thought) continue;
          if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
        updatedFrames.push({ ...frame, id: Math.random().toString(36).substr(2, 5), imageUrl });
        setProject(prev => prev ? { ...prev, frames: [...updatedFrames] } : null);
      }

      // 3. Generate Audio (TTS) via proxy
      setProject(prev => prev ? { ...prev, status: 'generating_audio' } : null);
      setLoadingMessage('Recording professional voiceover...');

      const audioResponse = await callGeminiProxy('gemini-2.5-flash-preview-tts', 
        [{ parts: [{ text: `Say energetically and professionally: ${scriptData.script}` }] }],
        {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
        }
      );

      const base64Audio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      let audioUrl = '';
      let audioDuration = 15;
      if (base64Audio) {
        const audioBlob = pcmToWav(base64Audio, 24000);
        audioUrl = URL.createObjectURL(audioBlob);
        const byteLength = atob(base64Audio).length;
        audioDuration = byteLength / 48000;
      }

      setProject(prev => prev ? { ...prev, audioUrl, audioDuration, status: 'generating_video' } : null);
      setLoadingMessage('Animating all scenes into cinematic video...');

      // 4. Generate Videos for ALL frames via proxy (Veo 3.1 Fast)
      const framesWithVideo: StoryboardFrame[] = [...updatedFrames];
      for (let i = 0; i < framesWithVideo.length; i++) {
        const frame = framesWithVideo[i];
        setLoadingMessage(`Animating scene ${i + 1} of ${framesWithVideo.length}...`);

        if (frame.imageUrl) {
          try {
            const base64Data = frame.imageUrl.split(',')[1]?.trim();
            const videoUrl = await generateVeoVideo(
              `${frame.imagePrompt}, ${stylePrompt}. ABSOLUTELY NO mention of sound, audio, talking, voices or music. Purely visual cinematic movement.`,
              base64Data
            );
            framesWithVideo[i] = { ...frame, videoUrl };
            setProject(prev => prev ? { ...prev, frames: [...framesWithVideo] } : null);
          } catch (err: any) {
            console.error(`Scene ${i + 1} video generation failed:`, err);
            // Continue with remaining scenes
          }
        }
      }

      // 5. Stitch with FFmpeg — Simple concat + audio mix (WASM-safe, no re-encoding)
      setProject(prev => prev ? { ...prev, status: 'stitching_video' } : null);
      setLoadingMessage('Loading FFmpeg engine...');

      try {
        const ffmpeg = new FFmpeg();
        let lastLog = '';
        ffmpeg.on('log', ({ message }) => { lastLog = message; console.log('FFmpeg:', message); });

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        // Write all video clips
        setLoadingMessage('Preparing video clips...');
        let concatList = '';
        let vidCount = 0;
        for (let i = 0; i < framesWithVideo.length; i++) {
          const frame = framesWithVideo[i];
          if (frame.videoUrl) {
            const videoData = await fetchFile(frame.videoUrl);
            const filename = `vid${vidCount}.mp4`;
            await ffmpeg.writeFile(filename, videoData);
            concatList += `file '${filename}'\n`;
            vidCount++;
          }
        }

        if (vidCount === 0) throw new Error("No video clips were generated to stitch.");
        await ffmpeg.writeFile('concat.txt', concatList);

        // STEP A: Concatenate clips (stream copy — fast, no re-encoding)
        setLoadingMessage('Concatenating scenes...');
        await ffmpeg.exec([
          '-f', 'concat', '-safe', '0', '-i', 'concat.txt',
          '-c', 'copy', '-an',
          'silent.mp4'
        ]);

        let finalFile = 'silent.mp4';

        // STEP B: Mix voiceover audio
        if (audioUrl) {
          setLoadingMessage('Mixing voiceover audio...');
          const audioData = await fetchFile(audioUrl);
          await ffmpeg.writeFile('audio.wav', audioData);

          const mixResult = await ffmpeg.exec([
            '-i', 'silent.mp4',
            '-i', 'audio.wav',
            '-c:v', 'copy',
            '-c:a', 'aac', '-b:a', '128k',
            '-map', '0:v:0', '-map', '1:a:0',
            '-shortest',
            'final.mp4'
          ]);

          if (mixResult === 0) {
            finalFile = 'final.mp4';
          } else {
            console.warn('Audio mix failed, using silent video. Last log:', lastLog);
          }
        }

        setLoadingMessage('Preparing download...');
        const data = await ffmpeg.readFile(finalFile);
        const blob = new Blob([new Uint8Array(data as any)], { type: 'video/mp4' });
        const finalVideoUrl = URL.createObjectURL(blob);

        setProject(prev => prev ? { ...prev, finalVideoUrl, status: 'completed' } : null);
        setLoadingMessage('Video complete!');

        // Auto-trigger download
        const a = document.createElement('a');
        a.href = finalVideoUrl;
        a.download = 'AuraDomoMuse-Short.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

      } catch (ffmpegError: any) {
        console.error("FFmpeg stitching failed:", ffmpegError?.message || ffmpegError, 'Last log:', ffmpegError);
        // Still mark as completed so user can access individual clips
        setProject(prev => prev ? { ...prev, status: 'completed' } : null);
        setLoadingMessage('Stitching skipped — download individual clips below.');
      }
    } catch (error: any) {
      console.error(error);
      setProject(prev => prev ? { ...prev, status: 'failed', error: error.message } : null);
    }
  };

  // --- EXPORT / DOWNLOAD ---
  const exportVideo = async () => {
    if (!project) return;

    // If we already have a final stitched video, download it immediately
    if (project.finalVideoUrl) {
      const a = document.createElement('a');
      a.href = project.finalVideoUrl;
      a.download = `AuraDomoMuse-Short-${project.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Fallback: re-stitch using simple -c copy (WASM-safe)
    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);
    try {
      const ffmpeg = new FFmpeg();
      ffmpeg.on('progress', ({ progress }) => setExportProgress(Math.round(progress * 100)));
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      let concatList = '';
      for (let i = 0; i < project.frames.length; i++) {
        if (project.frames[i].videoUrl) {
          const videoData = await fetchFile(project.frames[i].videoUrl!);
          await ffmpeg.writeFile(`vid${i}.mp4`, videoData);
          concatList += `file 'vid${i}.mp4'\n`;
        }
      }
      await ffmpeg.writeFile('concat.txt', concatList);

      // Concat with stream copy
      await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', '-an', 'silent.mp4']);

      let finalFile = 'silent.mp4';
      if (project.audioUrl) {
        const audioData = await fetchFile(project.audioUrl);
        await ffmpeg.writeFile('audio.wav', audioData);
        const mixResult = await ffmpeg.exec([
          '-i', 'silent.mp4', '-i', 'audio.wav',
          '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
          '-map', '0:v:0', '-map', '1:a:0', '-shortest', 'final.mp4'
        ]);
        if (mixResult === 0) finalFile = 'final.mp4';
      }

      const data = await ffmpeg.readFile(finalFile);
      const blob = new Blob([new Uint8Array(data as any)], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `AuraDomoMuse-Short-${project.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setProject(prev => prev ? { ...prev, finalVideoUrl: url } : null);
    } catch (error) {
      console.error("FFmpeg export failed:", error);
      alert("FFmpeg failed. Use the individual clip download buttons instead.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // --- Download individual clip (handles cross-origin URLs) ---
  const downloadClip = async (url: string, name: string) => {
    try {
      // Fetch as blob to handle cross-origin URLs
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  // --- RENDER ---
  return (
    <div className="flex-1 h-full bg-[#050508] text-white overflow-y-auto custom-scrollbar">
      <div className="min-h-screen flex flex-col items-center justify-start p-6 md:p-12 max-w-6xl mx-auto">
        {/* Header */}
        <header className="w-full flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-white mr-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center" style={{ boxShadow: '0 0 40px rgba(242,125,38,0.15)' }}>
              <Video className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">ShortsGen <span className="text-orange-500">AI</span></h1>
          </div>
        </header>

        <main className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col gap-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">What's the idea?</h2>
                <p className="text-white/50 text-sm">Describe your vision, and we'll handle the script, visuals, and voice.</p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40">Visual Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {styles.map((style) => (
                    <button
                      key={style.name}
                      onClick={() => setSelectedStyle(style.name)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all border ${
                        selectedStyle === style.name 
                          ? 'bg-orange-500 border-orange-500 text-white' 
                          : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                      }`}
                      style={selectedStyle === style.name ? { boxShadow: '0 0 40px rgba(242,125,38,0.15)' } : {}}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <textarea 
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="A futuristic city where cars fly and robots serve coffee..."
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition-all resize-none"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button 
                    onClick={startVoiceInput}
                    className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}
                    title="Talk your idea"
                  >
                    <Mic size={20} />
                  </button>
                </div>
              </div>

              <button 
                onClick={generateVideo}
                disabled={!idea.trim() || (project?.status !== 'idle' && project?.status !== 'completed' && project?.status !== 'failed' && !!project)}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
                style={{ boxShadow: '0 0 40px rgba(242,125,38,0.15)' }}
              >
                {project?.status && project.status !== 'idle' && project.status !== 'completed' && project.status !== 'failed' ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Sparkles size={20} />
                )}
                {project?.status === 'completed' ? 'Generate Another' : 'Create Magic'}
              </button>
            </section>

            {/* Status */}
            <AnimatePresence>
              {project && project.status !== 'idle' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/60">Current Status</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 uppercase tracking-widest">{project.status.replace(/_/g, ' ')}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-orange-500"
                        initial={{ width: "0%" }}
                        animate={{ 
                          width: project.status === 'completed' ? "100%" : 
                                 project.status === 'stitching_video' ? "90%" :
                                 project.status === 'generating_video' ? "75%" :
                                 project.status === 'generating_audio' ? "50%" :
                                 project.status === 'generating_images' ? "25%" :
                                 project.status === 'generating_script' ? "10%" : "0%"
                        }}
                      />
                    </div>
                    <p className="text-sm italic text-white/40 text-center">{loadingMessage}</p>
                  </div>

                  {project.status === 'failed' && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                      <AlertCircle className="text-red-500 shrink-0" size={20} />
                      <p className="text-xs text-red-400">{project.error}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-7 space-y-8">
            {project ? (
              <div className="space-y-8">
                {/* Final Video Player */}
                {project.status === 'completed' && (
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-orange-500">
                      <Play size={20} />
                      <h3 className="font-bold uppercase tracking-widest text-sm">Final Video Preview</h3>
                    </div>
                    <div className="relative aspect-[9/16] max-w-[340px] mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                      {project.finalVideoUrl ? (
                        <video src={project.finalVideoUrl} controls autoPlay className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <AnimatePresence mode="wait">
                            <motion.div key={currentFrameIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0">
                              {project.frames[currentFrameIdx]?.videoUrl ? (
                                <video ref={previewVideoRef} src={project.frames[currentFrameIdx].videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                              ) : (
                                <img src={project.frames[currentFrameIdx]?.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              )}
                            </motion.div>
                          </AnimatePresence>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-6 pointer-events-none">
                            <p className="text-sm font-medium leading-relaxed drop-shadow-lg">{project.frames[currentFrameIdx]?.scriptPart}</p>
                          </div>
                          <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                              {isPlaying ? <RefreshCw className="animate-spin" /> : <Play fill="white" />}
                            </div>
                            {project.audioUrl && (
                              <div className="absolute bottom-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white/60"><Volume2 size={16} /></div>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                    {!project.finalVideoUrl && (
                      <audio ref={audioRef} src={project.audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" controls={false} muted={false} />
                    )}
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex flex-wrap justify-center gap-4">
                        {!project.finalVideoUrl && (
                          <button onClick={togglePlay} className="px-8 py-3 bg-white text-black font-bold rounded-full flex items-center gap-2 hover:bg-orange-500 hover:text-white transition-all shadow-lg">
                            {isPlaying ? 'Pause Preview' : 'Play Preview'}
                          </button>
                        )}
                        <button 
                          onClick={exportVideo}
                          disabled={isExporting}
                          className="px-8 py-3 bg-orange-600 text-white font-bold rounded-full flex items-center gap-2 hover:bg-orange-700 transition-all disabled:opacity-50 shadow-lg"
                          style={{ boxShadow: '0 0 40px rgba(242,125,38,0.15)' }}
                        >
                          {isExporting ? (<><Loader2 className="animate-spin" size={20} /> Exporting {exportProgress}%</>) : (<><Download size={20} /> Download Full MP4</>)}
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* Script */}
                <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-4">
                  <div className="flex items-center gap-2 text-orange-500">
                    <Type size={20} />
                    <h3 className="font-bold uppercase tracking-widest text-sm">The Script</h3>
                  </div>
                  <p className="text-lg leading-relaxed text-white/80 italic">
                    "{project.script || 'Generating script...'}"
                  </p>
                </section>

                {/* Storyboard */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-500">
                      <ImageIcon size={20} />
                      <h3 className="font-bold uppercase tracking-widest text-sm">Storyboard Clips</h3>
                    </div>
                    {project.audioUrl && (
                      <button onClick={() => downloadClip(project.audioUrl!, `voiceover-${project.id}.wav`)} className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full flex items-center gap-1.5 transition-all">
                        <Volume2 size={12} /> Download Audio
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {project.frames.map((frame, idx) => (
                      <motion.div key={frame.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="group relative aspect-[9/16] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                        {frame.videoUrl ? (
                          <video src={frame.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        ) : frame.imageUrl ? (
                          <div className="relative w-full h-full">
                            <img src={frame.imageUrl} alt={frame.scriptPart} className={`w-full h-full object-cover ${project.status === 'generating_images' ? 'opacity-50' : 'opacity-100'}`} referrerPolicy="no-referrer" />
                            {(project.status === 'generating_images' || project.status === 'generating_video') && (
                              <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-white/40" /></div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/5 animate-pulse"><ImageIcon className="text-white/10" size={32} /></div>
                        )}
                        <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] font-bold">SCENE {idx + 1}</div>
                        {/* Download button for individual clip */}
                        {(frame.videoUrl || frame.imageUrl) && (
                          <button
                            onClick={() => downloadClip(
                              frame.videoUrl || frame.imageUrl!,
                              `scene-${idx + 1}-${project.id}.${frame.videoUrl ? 'mp4' : 'png'}`
                            )}
                            className="absolute bottom-2 right-2 p-2 bg-black/60 hover:bg-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                            title={`Download Scene ${idx + 1}`}
                          >
                            <Download size={14} />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="h-full min-h-[600px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl border-dashed flex flex-col items-center justify-center p-12 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                  <Video className="text-white/20" size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Your masterpiece awaits</h3>
                  <p className="text-white/40 max-w-md">Enter an idea on the left to start generating your viral short-form video.</p>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="mt-20 w-full pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-white/30 text-xs">
          <p>Powered by Nano Banana 2, Veo 3.1 & Gemini 3.1.</p>
        </footer>
      </div>
    </div>
  );
};

export default SocialVideoGenerator;
