import React, { useState, useRef, useEffect } from 'react';
import { Asset, Message, ProjectType, TTSState, StoryBibleEntry, SubscriptionTier } from '../types';
import { generateWriting, generateStoryboardImage, generateVeoVideo, analyzeMediaContext } from '../services/geminiService';
import VeoModal from './VeoModal';
import { useLive } from '../hooks/useLive';


interface ChatInterfaceProps {
  projectType: ProjectType | null;
  assets: Asset[];
  onAddAsset: (asset: Asset) => void;
  onUpdateContent: (text: string) => void;
  onReplaceContent: (text: string) => void;
  editorContent: string;
  onConfigureTTS: (state: Partial<TTSState>) => void;
  checkLimit: (type: 'video' | 'image' | 'voice' | 'ensemble') => boolean;
  trackUsage: (type: 'video' | 'image' | 'voice' | 'audio', amount?: number) => void;
  storyBible: StoryBibleEntry[];
  theme: 'dark' | 'light';
  userTier: SubscriptionTier;
  gmailToken?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  projectType, assets, onAddAsset, onUpdateContent, onReplaceContent,
  editorContent, onConfigureTTS, checkLimit, trackUsage, storyBible, theme, userTier, gmailToken
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: `I'm Muse. I can see what you're writing. Ask me to rewrite sections, generate storyboards, or use the Voice Mode to talk with me directly.` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [useSearch, setUseSearch] = useState(false);
  const [isVeoModalOpen, setIsVeoModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const {
    isActive: isLiveActive,
    isConnecting: isLiveConnecting,
    volume,
    start: startLive,
    stop: stopLive
  } = useLive({
    onUpdateEditor: onReplaceContent,
    onAppendEditor: onUpdateContent,
    onTriggerSearch: async (query) => "Search results would appear here.",
    onConfigureTTS,
    editorContent,
    assets,
    projectType,
    chatHistory: messages,
    gmailToken
  });

  // Track voice time every minute
  useEffect(() => {
    let interval: any;
    if (isLiveActive) {
      interval = setInterval(() => {
        if (!checkLimit('voice')) {
          stopLive();
          return;
        }
        trackUsage('voice', 1);
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [isLiveActive]);

  const handleStartLive = () => {
    if (checkLimit('voice')) {
      startLive();
    }
  };



  // ... existing handlers

  const processResponse = async (userMsg: Message) => {
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const lowerInput = userMsg.content.toLowerCase();

      if (lowerInput.includes('storyboard') || (lowerInput.includes('image') && lowerInput.includes('generate'))) {
        // ... (keep image generation logic)
        if (!checkLimit('image')) {
          setMessages(prev => [...prev, { role: 'model', content: "You have reached your image generation limit. Please upgrade your plan." }]);
          return;
        }

        const responseText = "Generating storyboard asset...";
        setMessages(prev => [...prev, { role: 'model', content: responseText }]);

        try {
          const b64 = await generateStoryboardImage(userMsg.content, userTier);
          trackUsage('image');
          const newAsset: Asset = {
            id: Date.now().toString(),
            type: 'image',
            url: b64,
            name: 'Storyboard ' + new Date().toLocaleTimeString(),
            mimeType: 'image/png',
            base64: b64.split(',')[1]
          };
          onAddAsset(newAsset);
          setMessages(prev => [...prev, { role: 'model', content: "Here is your storyboard image.", type: 'image', mediaUrl: b64 }]);
        } catch (e) {
          setMessages(prev => [...prev, { role: 'model', content: "Failed to generate image." }]);
        }

      } else if (lowerInput.includes('analyze') && assets.length > 0) {
        // ... (keep analysis logic)
        const analysis = await analyzeMediaContext(assets);
        setMessages(prev => [...prev, { role: 'model', content: analysis }]);

      } else {
        // Writing/Chat/Edit Mode

        // Writing/Chat/Edit Mode
        const historyForAI = messages.map(m => ({ role: m.role, content: m.content })).filter(m => m.role !== 'system');

        const response = await generateWriting(
          userMsg.content,
          projectType,
          assets,
          historyForAI, // Pass updated history with system prompt
          editorContent,
          useSearch,
          storyBible
        );

        if (response.editorUpdate) {
          onReplaceContent(response.editorUpdate);
          setMessages(prev => [...prev, { role: 'model', content: response.text || "I've rewritten the document as requested." }]);
        } else if (response.editorAppend) {
          onUpdateContent(response.editorAppend);
          setMessages(prev => [...prev, { role: 'model', content: response.text || "I've appended the new text to the document." }]);
        } else {
          setMessages(prev => [...prev, { role: 'model', content: response.text }]);
        }
      }

    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "An error occurred." }]);
    } finally {
      setIsLoading(false);
    }
  };



  const handleSend = async () => {
    if (!input.trim() && assets.length === 0) return;
    const userMsg: Message = { role: 'user', content: input };
    setInput('');
    await processResponse(userMsg);
  };

  const handleQuickStoryboard = async () => {
    if (!checkLimit('image')) {
      setMessages(prev => [...prev, { role: 'model', content: "You have reached your image generation limit. Please upgrade your plan." }]);
      return;
    }
    if (!editorContent.trim()) {
      setMessages(prev => [...prev, { role: 'model', content: "Please write something in the editor first to generate a storyboard." }]);
      return;
    }
    const prompt = `Generate a cinematic storyboard image based on this scene: "${editorContent.slice(-800)}"`;
    const userMsg: Message = { role: 'user', content: prompt };
    processResponse(userMsg);
  };

  const handleVeoGenerate = async (prompt: string, imageBase64?: string) => {
    if (!checkLimit('video')) {
      setMessages(prev => [...prev, { role: 'model', content: "You have reached your video generation limit (or your plan does not support it). Please upgrade." }]);
      return;
    }

    const userMsg: Message = { role: 'user', content: `Generate video: ${prompt}` };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const videoUrl = await generateVeoVideo(prompt, imageBase64);
      trackUsage('video');
      setMessages(prev => [...prev, { role: 'model', content: "Video generated successfully.", type: 'video', mediaUrl: videoUrl }]);

      const newAsset: Asset = {
        id: Date.now().toString(),
        type: 'video',
        url: videoUrl,
        name: 'Veo Generated Video',
        mimeType: 'video/mp4'
      };
      onAddAsset(newAsset);
    } catch (e: any) {
      if (e.message === 'API_KEY_REQUIRED') {
        setMessages(prev => [...prev, { role: 'model', content: "Please select a paid API key to use video generation features." }]);
        const win = window as any;
        if (win.aistudio && win.aistudio.openSelectKey) {
          await win.aistudio.openSelectKey();
        }
      } else {
        setMessages(prev => [...prev, { role: 'model', content: `Video generation failed: ${e.message}` }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string) => {
    onUpdateContent(text);
  };

  const toggleLive = () => {
    if (isLiveActive) {
      stopLive();
    } else {
      handleStartLive();
    }
  };

  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const bgHeader = isDark ? 'bg-gray-900' : 'bg-white';
  const textMain = isDark ? 'text-gray-200' : 'text-gray-900';
  const textSec = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-gray-800' : 'border-gray-200';
  const inputBg = isDark ? 'bg-gray-800' : 'bg-white';

  return (
    <>
      <div className={`flex flex-col h-full ${bgMain} border-l ${border} transition-colors duration-500`}>
        {/* Header */}
        <div className={`p-4 border-b ${border} flex justify-between items-center ${bgHeader} transition-colors duration-500`}>
          <h2 className={`font-semibold flex items-center gap-2 ${textMain}`}>
            <span className="text-muse-500 text-xl">✨</span> Muse Assistant
          </h2>
          <div className="flex items-center gap-2">
            <label className={`flex items-center text-xs ${textSec} cursor-pointer hover:${textMain} transition-colors`}>
              <input
                type="checkbox"
                checked={useSearch}
                onChange={(e) => setUseSearch(e.target.checked)}
                className="mr-2 rounded bg-gray-700 border-gray-600 text-muse-500 focus:ring-muse-500"
              />
              Research
            </label>
          </div>
        </div>

        {/* Live Active Banner */}
        {isLiveActive && (
          <div className="bg-muse-600 text-white p-3 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-md z-10">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            Listening to you...
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm ${msg.role === 'user'
                ? 'bg-gradient-to-br from-muse-600 to-purple-600 text-white rounded-br-none'
                : `${isDark ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-100'} border rounded-bl-none`
                }`}>
                {msg.type === 'image' && msg.mediaUrl && (
                  <img src={msg.mediaUrl} alt="Generated" className="rounded-lg mb-3 w-full object-cover max-h-60 border border-white/10" />
                )}
                {msg.type === 'video' && msg.mediaUrl && (
                  <video src={msg.mediaUrl} controls className="rounded-lg mb-3 w-full max-h-60 border border-white/10" />
                )}
                <div className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{msg.content}</div>

                {msg.role === 'model' && !msg.type && (
                  <button
                    onClick={() => handleCopyText(msg.content)}
                    className="mt-3 text-xs text-muse-500 hover:text-muse-600 flex items-center gap-1 font-bold uppercase tracking-wide transition-colors"
                  >
                    + Add to Editor
                  </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className={`${isDark ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500 border border-gray-100 shadow-sm'} rounded-2xl rounded-bl-none p-4 text-sm`}>
                {/* Check if last user message has a YouTube link */}
                {messages.length > 0 && /youtu\.?be/i.test(messages[messages.length - 1]?.content || '') ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs">📹 Processing video — this can take a few minutes for longer videos. Please be patient...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-muse-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-muse-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-muse-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Visitor Restriction Overlay for Chat */}
        {userTier === 'FREE' && (
          <div className="mx-4 mb-4 p-6 rounded-2xl bg-gradient-to-br from-muse-600/10 to-purple-600/10 border border-muse-500/20 text-center shadow-lg backdrop-blur-sm">
            <div className="bg-muse-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-muse-500/50 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className={`font-bold ${textMain} mb-2`}>Premium AI Assistant</h3>
            <p className={`${textSec} text-sm mb-4`}>Upgrade to Auteur or Showrunner to unlock AI Writing, Storyboards, and Voice Mode.</p>
            <button
              onClick={() => (window as any).showSubModal?.()}
              className="w-full py-2.5 bg-muse-600 text-white rounded-xl font-bold text-sm hover:bg-muse-500 transition-all shadow-md active:scale-95"
            >
              Unlock AI Features
            </button>
          </div>
        )}

        {/* Input & Quick Actions */}
        <div className={`p-4 ${bgHeader} border-t ${border} transition-colors duration-500`}>
          <div className={`grid grid-cols-3 gap-2 mb-3 ${userTier === 'FREE' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            <button
              onClick={handleQuickStoryboard}
              disabled={isLoading || isLiveActive || userTier === 'FREE'}
              className={`${inputBg} hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'} ${textSec} hover:${textMain} text-[10px] md:text-xs py-2 px-2 rounded-xl border ${border} transition-all flex items-center justify-center gap-1 shadow-sm`}
            >
              <span>🖼️</span> Storyboard
            </button>
            <button
              onClick={toggleLive}
              disabled={userTier === 'FREE'}
              className={`text-[10px] md:text-xs py-2 px-2 rounded-xl border transition-all flex items-center justify-center gap-1 shadow-sm ${isLiveActive
                ? 'bg-red-500 text-white border-red-600 animate-pulse'
                : `${inputBg} hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'} ${textSec} hover:${textMain} ${border}`
                }`}
            >
              {isLiveConnecting ? 'Connecting...' : isLiveActive ? (
                <>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                    <span>Listening ({Math.round(volume * 100)}%)</span>
                  </div>
                </>
              ) : (
                <>
                  <span>🎙️</span> Voice Mode
                </>
              )}
            </button>
            <button
              onClick={() => {
                if (checkLimit('video')) {
                  setIsVeoModalOpen(true);
                }
              }}
              disabled={isLoading || isLiveActive || userTier === 'FREE'}
              className={`${inputBg} hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'} ${textSec} hover:${textMain} text-[10px] md:text-xs py-2 px-2 rounded-xl border ${border} transition-all flex items-center justify-center gap-1 shadow-sm`}
            >
              <span>🎥</span> Veo Studio
            </button>
          </div>

          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={userTier === 'FREE' ? "AI features are locked for Visitors..." : isLiveActive ? "Listening..." : "Ask for edits ('Rewrite the intro'), ideas, or specific scenes..."}
              disabled={isLiveActive || userTier === 'FREE'}
              className={`w-full ${inputBg} ${textMain} rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-muse-500 resize-none h-24 text-sm ${isLiveActive || userTier === 'FREE' ? 'opacity-50' : ''} border ${border} transition-colors placeholder-gray-400 shadow-inner`}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && assets.length === 0) || isLiveActive}
              className="absolute right-3 bottom-3 p-2 bg-muse-600 rounded-lg text-white hover:bg-muse-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <VeoModal
        isOpen={isVeoModalOpen}
        onClose={() => setIsVeoModalOpen(false)}
        assets={assets}
        onGenerate={handleVeoGenerate}
      />
    </>
  );
};

export default ChatInterface;