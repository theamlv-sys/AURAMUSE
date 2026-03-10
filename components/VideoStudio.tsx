import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Mic, 
  MicOff, 
  Sparkles, 
  Download, 
  RefreshCw, 
  Layers, 
  Video, 
  ChevronRight,
  Loader2,
  History,
  Info,
  Code,
  Shapes,
  Settings2,
  Maximize2,
  Minimize2,
  Clock,
  Zap,
  Layout
} from 'lucide-react';
import { geminiService } from '../services/motionGeminiService';
import { convertSVGToMP4 } from '../services/motionVideoService';
import { cn } from '../utils/cn';
import confetti from 'canvas-confetti';
import { SVGEditor } from './SVGEditor';

interface SVGItem {
  id: string;
  code: string;
  prompt: string;
  timestamp: number;
  isPromotional?: boolean;
  sources?: string[];
}

export function VideoStudio() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [currentSVG, setCurrentSVG] = useState<string | null>(null);
  const [currentSources, setCurrentSources] = useState<string[]>([]);
  const [history, setHistory] = useState<SVGItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isPromotional, setIsPromotional] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  const sessionRef = useRef<any>(null);

  const loadingMessages = [
    "Calculating vector paths...",
    "Optimizing SVG structure...",
    "Injecting CSS animations...",
    "Refining color gradients...",
    "Polishing motion curves...",
    "Finalizing vector graphics..."
  ];

  useEffect(() => {
    let interval: any;
    if (isGenerating || isRefining) {
      let i = 0;
      setLoadingMessage(loadingMessages[0]);
      interval = setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[i]);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, isRefining]);

  const handleGenerate = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!activePrompt.trim()) return;

    setIsGenerating(true);
    setIsResearching(true);
    setCurrentSVG(null);
    setCurrentSources([]);
    setStatus('Researching topic and brand context...');

    try {
      const result = await geminiService.generateSVG(activePrompt, isPromotional);
      setIsResearching(false);
      setStatus(isPromotional ? 'Generating 60s Promotional Video...' : 'Generating SVG code...');
      
      const svgCode = result.code;
      const sources = result.sources;
      
      const newItem: SVGItem = {
        id: Math.random().toString(36).substr(2, 9),
        code: svgCode,
        prompt: activePrompt,
        timestamp: Date.now(),
        isPromotional,
        sources
      };

      setCurrentSVG(svgCode);
      setCurrentSources(sources);
      setActiveId(newItem.id);
      
      setHistory(prev => [newItem, ...prev]);
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff4e00', '#ffffff', '#4e00ff']
      });
    } catch (error: any) {
      console.error('Generation failed:', error);
      alert('Failed to generate SVG. Please try again.');
    } finally {
      setIsGenerating(false);
      setStatus('');
    }
  };

  const handleRefine = async (request: string) => {
    if (!currentSVG || !request.trim()) return;
    
    setIsRefining(true);
    setStatus('Refining with AI...');
    
    try {
      const refinedCode = await geminiService.refineSVG(currentSVG, request);
      setCurrentSVG(refinedCode);
      
      // Update history
      if (activeId) {
        setHistory(prev => prev.map(item => 
          item.id === activeId ? { ...item, code: refinedCode } : item
        ));
      }
      
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.8 },
        colors: ['#ff4e00', '#ffffff']
      });
    } catch (error) {
      console.error('Refinement failed:', error);
      alert('Failed to refine SVG. Please try again.');
    } finally {
      setIsRefining(false);
      setStatus('');
    }
  };

  const downloadSVG = () => {
    if (!currentSVG) return;
    const blob = new Blob([currentSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `motion-svg-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (!currentSVG) return;
    
    setIsExporting(true);
    setExportProgress(0);
    setStatus('Recording and encoding video...');
    
    try {
      const duration = isPromotional ? 60 : 15;
      const videoBlob = await convertSVGToMP4(currentSVG, duration, (p) => setExportProgress(p));
      
      const isMp4 = videoBlob.type === 'video/mp4';
      const extension = isMp4 ? 'mp4' : 'webm';
      
      // Success state
      setExportProgress(1);
      setStatus('Success! Downloading...');
      
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `motion-video-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      
      // Small delay to ensure browser handles the click before cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (!isMp4) {
        alert('Video exported as WebM. Your browser environment may not support MP4 conversion via FFmpeg.wasm.');
      }
      
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ff4e00', '#ffffff', '#4e00ff']
      });
      
      // Keep overlay for a moment to show success
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error: any) {
      console.error('Export failed:', error);
      alert(error.message || 'Failed to export video. Please try again.');
    } finally {
      setIsExporting(false);
      setStatus('');
    }
  };

  const toggleVoice = async () => {
    if (isListening) {
      sessionRef.current?.close();
      setIsListening(false);
      return;
    }

    try {
      setIsListening(true);
      const session = await geminiService.connectLive({
        onopen: () => {
          console.log('Live session opened');
        },
        onmessage: (message) => {
          const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
          if (text) {
            const promptMatch = text.match(/Prompt:\s*(.*)/i);
            if (promptMatch) {
              setPrompt(promptMatch[1].trim());
            }
          }
        },
        onclose: () => setIsListening(false),
        onerror: () => setIsListening(false)
      });
      sessionRef.current = session;
    } catch (error) {
      console.error('Voice connection failed:', error);
      setIsListening(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center p-4 md:p-8">
      <div className="atmosphere absolute inset-0" />
      
      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20">
            <Shapes className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-serif italic tracking-tight">MotionSVG AI</h1>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <button className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors">Showcase</button>
          <button className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors">Docs</button>
          <div className="h-4 w-px bg-white/10" />
          <button className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-xs uppercase tracking-widest hover:bg-white/10 transition-colors">
            <History className="w-3.5 h-3.5" />
            History
          </button>
        </nav>
      </header>

      <main className="relative z-10 w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left Column: Controls */}
        <div className={cn("lg:col-span-5 space-y-6", showEditor && "hidden lg:block")}>
          <section className="glass-panel rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase tracking-widest text-white/60 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                Creative Prompt
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/20 uppercase">Voice Mode</span>
                <button 
                  onClick={toggleVoice}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    isListening ? "bg-red-500 animate-pulse" : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your motion graphics... (e.g., 'A cinematic 60s promotional video for a luxury watch brand with elegant transitions')"
                className="w-full h-40 bg-black/20 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500/50 transition-colors resize-none placeholder:text-white/20"
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button 
                  onClick={() => setPrompt('')}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/40"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  isPromotional ? "bg-orange-600/20 text-orange-500 border border-orange-500/30" : "bg-white/5 text-white/40"
                )}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">Mode</div>
                  <div className="text-xs font-semibold">{isPromotional ? '60s Promotional' : '15s Loop'}</div>
                </div>
              </div>
              <button 
                onClick={() => setIsPromotional(!isPromotional)}
                className={cn(
                  "w-12 h-6 rounded-full relative transition-all duration-300",
                  isPromotional ? "bg-orange-600" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300",
                  isPromotional ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-4 bg-white text-black rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Synthesizing Motion...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current" />
                  Generate {isPromotional ? 'Promotional Video' : 'Motion Graphic'}
                </>
              )}
            </button>
          </section>

          {/* Style Presets */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-white/40 px-2">Style Presets</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: 'Liquid Flow', prompt: 'Abstract liquid paths flowing across the screen with soft gradients' },
                { name: 'Cyber Pulse', prompt: 'Neon circuit board patterns pulsing with light' },
                { name: 'Geometric', prompt: 'Rotating 3D-style cubes with dynamic shadows and morphing' },
                { name: 'Starfield', prompt: 'A cinematic starfield with parallax motion and glowing nebulas' },
                { name: 'Glass Morph', prompt: 'Frosted glass circles moving and refracting light' },
                { name: 'Organic', prompt: 'Soft, organic blobs morphing and changing colors smoothly' }
              ].map((style) => (
                <button
                  key={style.name}
                  onClick={() => setPrompt(style.prompt)}
                  className="p-3 rounded-xl glass-panel text-[10px] uppercase tracking-wider text-center hover:bg-white/10 transition-all border-white/5"
                >
                  {style.name}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Preview & Editor */}
        <div className={cn("lg:col-span-7 flex flex-col", showEditor && "lg:col-span-12")}>
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[600px]">
            {/* Preview Area */}
            <div className={cn(
              "glass-panel rounded-[2rem] relative overflow-hidden flex flex-col group transition-all duration-500",
              showEditor ? "lg:w-2/3" : "w-full"
            )}>
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Live Preview</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentSVG && (
                    <button 
                      onClick={() => setShowEditor(!showEditor)}
                      className={cn(
                        "p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold",
                        showEditor ? "bg-orange-500 text-white" : "bg-white/5 hover:bg-white/10 text-white/60"
                      )}
                    >
                      <Layout className="w-3.5 h-3.5" />
                      {showEditor ? 'Close Editor' : 'Open Editor'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 relative flex items-center justify-center p-8">
                <AnimatePresence mode="wait">
                  {isGenerating || isRefining ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-6 text-center p-8"
                    >
                      <div className="relative">
                        <div className={cn(
                          "w-24 h-24 rounded-full border-2 border-t-orange-500 animate-spin",
                          isResearching ? "border-blue-500/20 border-t-blue-500" : "border-orange-500/20"
                        )} />
                        {isResearching ? (
                          <div className="absolute inset-0 m-auto w-8 h-8 flex items-center justify-center">
                            <History className="w-8 h-8 text-blue-500 animate-pulse" />
                          </div>
                        ) : (
                          <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-orange-500 animate-pulse" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xl font-serif italic text-glow">
                          {isResearching ? "Researching Context..." : loadingMessage}
                        </p>
                        <p className="text-xs font-mono text-white/40 uppercase tracking-[0.2em]">{status}</p>
                      </div>
                    </motion.div>
                  ) : currentSVG ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full h-full relative flex items-center justify-center"
                    >
                      <div 
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: currentSVG }} 
                      />
                      <div className={cn(
                        "absolute top-4 right-4 flex gap-2 transition-opacity",
                        isExporting ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}>
                        <button 
                          onClick={handleExport}
                          disabled={isExporting}
                          className={cn(
                            "p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-white hover:text-black transition-all relative overflow-hidden",
                            isExporting && "cursor-not-allowed opacity-80"
                          )}
                          title="Download as MP4"
                        >
                          {isExporting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Download className="w-5 h-5" />
                          )}
                          {isExporting && (
                            <motion.div 
                              className="absolute bottom-0 left-0 h-1 bg-orange-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${exportProgress * 100}%` }}
                            />
                          )}
                        </button>
                        <button 
                          onClick={downloadSVG}
                          className="p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-white hover:text-black transition-all"
                          title="Download SVG"
                        >
                          <Layers className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(currentSVG);
                            alert('SVG Code copied to clipboard!');
                          }}
                          className="p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-white hover:text-black transition-all"
                          title="Copy SVG Code"
                        >
                          <Code className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Export Overlay */}
                      <AnimatePresence>
                        {isExporting && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
                          >
                            <div className="w-full max-w-xs space-y-4">
                              <div className="relative w-20 h-20 mx-auto">
                                <RefreshCw className="w-full h-full text-orange-500 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-[10px] font-mono font-bold">{Math.round(exportProgress * 100)}%</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-serif italic text-white">{status || "Generating MP4 Video..."}</p>
                                <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                                  {exportProgress < 0.5 ? "Recording Animation" : exportProgress < 1 ? "Encoding Video" : "Complete"}
                                </p>
                              </div>
                              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                  className="h-full bg-orange-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${exportProgress * 100}%` }}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-white/20">
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                        <Shapes className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-mono uppercase tracking-widest">Awaiting Vector Creation</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Timeline Visual */}
              {currentSVG && (
                <div className="p-4 border-t border-white/5 bg-white/5">
                  {currentSources.length > 0 && (
                    <div className="mb-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <History className="w-3 h-3 text-blue-400" />
                        <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">Research Sources</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentSources.slice(0, 3).map((source, i) => (
                          <a 
                            key={i} 
                            href={source} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[9px] text-white/30 hover:text-white/60 transition-colors truncate max-w-[150px] underline"
                          >
                            {new URL(source).hostname}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-orange-500" />
                      <span className="text-[10px] font-mono text-white/40 uppercase">Timeline</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/40 uppercase">{isPromotional ? '00:60' : '00:15'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                    <motion.div 
                      className="absolute inset-y-0 left-0 bg-orange-500"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ 
                        duration: isPromotional ? 60 : 15, 
                        repeat: Infinity, 
                        ease: "linear" 
                      }}
                    />
                    {/* Markers */}
                    <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                      {[...Array(isPromotional ? 6 : 3)].map((_, i) => (
                        <div key={i} className="w-px h-full bg-white/10" />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Editor Panel */}
            {showEditor && currentSVG && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:w-1/3 h-full"
              >
                <SVGEditor 
                  svgCode={currentSVG} 
                  onUpdate={setCurrentSVG}
                  onRefine={handleRefine}
                  isRefining={isRefining}
                />
              </motion.div>
            )}
          </div>

          {/* History / Recent */}
          {!showEditor && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-white/40">Recent Vectors</h3>
                <button className="text-[10px] uppercase tracking-widest text-white/20 hover:text-white transition-colors">View All</button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 mask-fade-x scrollbar-hide">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentSVG(item.code);
                      setActiveId(item.id);
                      setCurrentSources(item.sources || []);
                      setShowEditor(false);
                    }}
                    className={cn(
                      "shrink-0 w-48 aspect-video rounded-2xl glass-panel overflow-hidden relative group p-2 transition-all",
                      activeId === item.id ? "ring-2 ring-orange-500 bg-orange-500/10" : "hover:bg-white/5"
                    )}
                  >
                    <div 
                      className="w-full h-full opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none"
                      dangerouslySetInnerHTML={{ __html: item.code }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-center gap-1">
                          {item.isPromotional && <Clock className="w-2.5 h-2.5 text-orange-500" />}
                          <p className="text-[10px] text-white/60 truncate w-full text-left">{item.prompt}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {history.length === 0 && (
                  <div className="w-full py-12 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-3xl text-white/10">
                    <Info className="w-6 h-6 mb-2" />
                    <p className="text-[10px] uppercase tracking-widest">No history yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 w-full max-w-7xl mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-white/20">
        <div className="flex items-center gap-4">
          <span>Powered by Gemini 3.1 Pro</span>
          <div className="w-1 h-1 rounded-full bg-white/10" />
          <span>Vector Synthesis Engine v2.0</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">API Status</a>
        </div>
      </footer>
    </div>
  );
}
