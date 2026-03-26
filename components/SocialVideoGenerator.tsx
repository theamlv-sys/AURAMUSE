/**
 * ShortsGen AI — Ported from AI Studio standalone app
 * Routes all API calls through the existing Supabase gemini-proxy
 */

import React, { useState, useEffect, useRef } from 'react';
import { SubscriptionTier } from '../types';
import { callGeminiProxy, generateVeoVideoBlob } from '../services/geminiService';
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
  videoBlob?: Blob;  // Store raw blob for reliable download/FFmpeg
  scriptPart: string;
}

interface VideoProject {
  id: string;
  idea: string;
  style: string;
  script: string;
  frames: StoryboardFrame[];
  audioUrl?: string;
  audioBlob?: Blob;
  audioDuration?: number;
  finalVideoUrl?: string;
  finalVideoBlob?: Blob;
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

// --- Force-download a blob ---
function forceDownloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Small delay before cleanup so browser can start the download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
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

      // 2. Generate Images via proxy
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
      let audioBlob: Blob | undefined;
      let audioDuration = 15;
      if (base64Audio) {
        audioBlob = pcmToWav(base64Audio, 24000);
        audioUrl = URL.createObjectURL(audioBlob);
        const byteLength = atob(base64Audio).length;
        audioDuration = byteLength / 48000;
      }

      setProject(prev => prev ? { ...prev, audioUrl, audioBlob, audioDuration, status: 'generating_video' } : null);
      setLoadingMessage('Animating all scenes into cinematic video...');

      // 4. Generate Videos for ALL frames via proxy (Veo 3.1 Fast)
      const framesWithVideo: StoryboardFrame[] = [...updatedFrames];
      for (let i = 0; i < framesWithVideo.length; i++) {
        const frame = framesWithVideo[i];
        setLoadingMessage(`Animating scene ${i + 1} of ${framesWithVideo.length}...`);

        if (frame.imageUrl) {
          try {
            const base64Data = frame.imageUrl.split(',')[1]?.trim();
            const { url: videoUrl, blob: videoBlob } = await generateVeoVideoBlob(
              `${frame.imagePrompt}, ${stylePrompt}. ABSOLUTELY NO mention of sound, audio, talking, voices or music. Purely visual cinematic movement.`,
              base64Data
            );
            framesWithVideo[i] = { ...frame, videoUrl, videoBlob };
            setProject(prev => prev ? { ...prev, frames: [...framesWithVideo] } : null);
          } catch (err: any) {
            console.error(`Scene ${i + 1} video generation failed:`, err);
          }
        }
      }

      // 5. Stitch with FFmpeg
      setProject(prev => prev ? { ...prev, status: 'stitching_video' } : null);
      setLoadingMessage('Loading FFmpeg...');

      try {
        const ffmpeg = new FFmpeg();
        let logs: string[] = [];
        ffmpeg.on('log', ({ message }) => { logs.push(message); console.log('FFmpeg:', message); });

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        // Write video clips from actual blobs
        setLoadingMessage('Writing video clips...');
        let concatList = '';
        let vidCount = 0;
        for (const frame of framesWithVideo) {
          if (frame.videoBlob) {
            const arr = new Uint8Array(await frame.videoBlob.arrayBuffer());
            const filename = `vid${vidCount}.mp4`;
            await ffmpeg.writeFile(filename, arr);
            concatList += `file '${filename}'\n`;
            vidCount++;
          }
        }

        if (vidCount === 0) throw new Error("No video clips available for stitching.");
        await ffmpeg.writeFile('concat.txt', concatList);

        // Try stream-copy concat first (fast)
        setLoadingMessage('Concatenating scenes...');
        let concatResult = await ffmpeg.exec([
          '-f', 'concat', '-safe', '0', '-i', 'concat.txt',
          '-c', 'copy', '-an', '-movflags', '+faststart',
          'silent.mp4'
        ]);

        // If stream-copy fails (codec mismatch), re-encode
        if (concatResult !== 0) {
          console.warn('Stream-copy concat failed, trying re-encode...');
          setLoadingMessage('Re-encoding scenes...');
          concatResult = await ffmpeg.exec([
            '-f', 'concat', '-safe', '0', '-i', 'concat.txt',
            '-vf', 'scale=720:1280,fps=30',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
            '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart',
            'silent.mp4'
          ]);
        }

        if (concatResult !== 0) throw new Error('FFmpeg concat failed. Logs: ' + logs.slice(-5).join('\n'));

        let finalFile = 'silent.mp4';

        // Mix audio
        if (audioBlob) {
          setLoadingMessage('Mixing voiceover...');
          const audioArr = new Uint8Array(await audioBlob.arrayBuffer());
          await ffmpeg.writeFile('audio.wav', audioArr);

          const mixResult = await ffmpeg.exec([
            '-i', 'silent.mp4', '-i', 'audio.wav',
            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
            '-map', '0:v:0', '-map', '1:a:0',
            '-shortest', '-movflags', '+faststart',
            'final.mp4'
          ]);

          if (mixResult === 0) {
            finalFile = 'final.mp4';
          } else {
            console.warn('Audio mix failed, serving silent video');
          }
        }

        const rawData = await ffmpeg.readFile(finalFile);
        const finalBlob = new Blob([rawData as any], { type: 'video/mp4' });
        const finalVideoUrl = URL.createObjectURL(finalBlob);

        setProject(prev => prev ? { ...prev, finalVideoUrl, finalVideoBlob: finalBlob, status: 'completed' } : null);
        setLoadingMessage('Video complete! Downloading...');

        // Auto-download
        forceDownloadBlob(finalBlob, 'AuraDomoMuse-Short.mp4');

      } catch (ffmpegError: any) {
        console.error("FFmpeg failed:", ffmpegError);
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

    // If we have the final blob, download it directly
    if (project.finalVideoBlob) {
      forceDownloadBlob(project.finalVideoBlob, `AuraDomoMuse-Short-${project.id}.mp4`);
      return;
    }

    // If we have a URL but no blob, try fetching it
    if (project.finalVideoUrl) {
      try {
        const res = await fetch(project.finalVideoUrl);
        const blob = await res.blob();
        forceDownloadBlob(blob, `AuraDomoMuse-Short-${project.id}.mp4`);
        return;
      } catch(e) {
        console.error('Failed to fetch final video blob:', e);
      }
    }

    // Fallback: re-stitch
    setIsExporting(true);
    setExportProgress(10);
    setIsPlaying(false);
    try {
      const ffmpeg = new FFmpeg();
      ffmpeg.on('progress', ({ progress }) => setExportProgress(Math.max(10, Math.round(progress * 100))));

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setExportProgress(20);

      let concatList = '';
      let vidIdx = 0;
      for (const frame of project.frames) {
        if (frame.videoBlob) {
          const arr = new Uint8Array(await frame.videoBlob.arrayBuffer());
          await ffmpeg.writeFile(`v${vidIdx}.mp4`, arr);
          concatList += `file 'v${vidIdx}.mp4'\n`;
          vidIdx++;
        }
      }
      if (vidIdx === 0) throw new Error("No video clips to export.");
      await ffmpeg.writeFile('concat.txt', concatList);
      setExportProgress(30);

      await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', '-an', '-movflags', '+faststart', 'silent.mp4']);
      setExportProgress(60);

      let finalFile = 'silent.mp4';
      if (project.audioBlob) {
        const audioArr = new Uint8Array(await project.audioBlob.arrayBuffer());
        await ffmpeg.writeFile('audio.wav', audioArr);
        const mixOk = await ffmpeg.exec([
          '-i', 'silent.mp4', '-i', 'audio.wav',
          '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
          '-map', '0:v:0', '-map', '1:a:0',
          '-shortest', '-movflags', '+faststart', 'final.mp4'
        ]);
        if (mixOk === 0) finalFile = 'final.mp4';
      }
      setExportProgress(90);

      const rawData = await ffmpeg.readFile(finalFile);
      const blob = new Blob([rawData as any], { type: 'video/mp4' });
      forceDownloadBlob(blob, `AuraDomoMuse-Short-${project.id}.mp4`);
      setProject(prev => prev ? { ...prev, finalVideoUrl: URL.createObjectURL(blob), finalVideoBlob: blob } : null);
      setExportProgress(100);
    } catch (error) {
      console.error("FFmpeg export failed:", error);
      alert("Export failed — download individual clips using the buttons on each scene.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // --- Download individual clip ---
  const downloadClip = async (frame: StoryboardFrame, idx: number, projectId: string) => {
    try {
      // Prefer the stored blob (direct from proxy)
      if (frame.videoBlob) {
        forceDownloadBlob(frame.videoBlob, `scene-${idx + 1}-${projectId}.mp4`);
        return;
      }
      // Try fetching from blob URL
      if (frame.videoUrl) {
        const res = await fetch(frame.videoUrl);
        const blob = await res.blob();
        forceDownloadBlob(blob, `scene-${idx + 1}-${projectId}.mp4`);
        return;
      }
      // Fall back to image
      if (frame.imageUrl) {
        const res = await fetch(frame.imageUrl);
        const blob = await res.blob();
        forceDownloadBlob(blob, `scene-${idx + 1}-${projectId}.png`);
      }
    } catch(e) {
      console.error('Download failed:', e);
      alert(`Download failed for scene ${idx + 1}. Check console.`);
    }
  };

  const downloadAudio = async () => {
    if (project?.audioBlob) {
      forceDownloadBlob(project.audioBlob, `voiceover-${project.id}.wav`);
    } else if (project?.audioUrl) {
      const res = await fetch(project.audioUrl);
      const blob = await res.blob();
      forceDownloadBlob(blob, `voiceover-${project.id}.wav`);
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
                      <button onClick={downloadAudio} className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full flex items-center gap-1.5 transition-all">
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
                            <img src={frame.imageUrl} alt={frame.scriptPart} className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-white/20" /></div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/5 animate-pulse"><ImageIcon className="text-white/10" size={32} /></div>
                        )}
                        <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] font-bold">SCENE {idx + 1}</div>
                        {/* Download button */}
                        {(frame.videoUrl || frame.videoBlob || frame.imageUrl) && (
                          <button
                            onClick={() => downloadClip(frame, idx, project.id)}
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
