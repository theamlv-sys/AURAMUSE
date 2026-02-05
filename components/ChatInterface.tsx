import React, { useState, useRef, useEffect } from 'react';
import { Asset, Message, ProjectType, TTSState, StoryBibleEntry } from '../types';
import { generateWriting, generateStoryboardImage, generateVeoVideo, analyzeMediaContext } from '../services/geminiService';
import VeoModal from './VeoModal';
import { useLive } from '../hooks/useLive';

interface ChatInterfaceProps {
  projectType: ProjectType;
  assets: Asset[];
  onAddAsset: (asset: Asset) => void;
  onUpdateContent: (text: string) => void;
  onReplaceContent: (text: string) => void;
  editorContent: string;
  onConfigureTTS: (newState: Partial<TTSState>) => void;
  checkLimit: (type: 'video' | 'image' | 'audio') => boolean;
  trackUsage: (type: 'video' | 'image') => void;
  storyBible: StoryBibleEntry[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    projectType, assets, onAddAsset, onUpdateContent, onReplaceContent, 
    editorContent, onConfigureTTS, checkLimit, trackUsage, storyBible 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: `I'm Muse. I can see what you're writing. Ask me to rewrite sections, generate storyboards, or use the Voice Mode to talk with me directly.` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [isVeoModalOpen, setIsVeoModalOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleTriggerSearch = async (query: string): Promise<string> => {
      // Add a visual indicator that search is happening triggered by Voice
      const searchMsg: Message = { role: 'user', content: `🔍 Voice Agent requested search: "${query}"` };
      setMessages(prev => [...prev, searchMsg]);
      setIsLoading(true);

      try {
          // Force useSearch to true for this request
          const historyForAI = messages.map(m => ({ role: m.role, content: m.content })).filter(m => m.role !== 'system');
          const response = await generateWriting(
                `Please research the following and provide a summary: ${query}`, 
                projectType, 
                assets, 
                historyForAI, 
                editorContent, 
                true, // Explicitly enable search
                storyBible
          );
          const resultText = response.text || "No results found.";
          setMessages(prev => [...prev, { role: 'model', content: resultText }]);
          return resultText;
      } catch (error) {
          const errText = "Search failed. Please try again.";
          setMessages(prev => [...prev, { role: 'model', content: errText }]);
          return errText;
      } finally {
          setIsLoading(false);
      }
  };

  // Initialize Live Hook
  const { isActive: isLiveActive, isConnecting: isLiveConnecting, volume, start: startLive, stop: stopLive } = useLive({
      onUpdateEditor: onReplaceContent,
      onAppendEditor: onUpdateContent, // This maps to the append function in App.tsx
      onTriggerSearch: handleTriggerSearch,
      onConfigureTTS: onConfigureTTS,
      editorContent,
      assets,
      projectType,
      chatHistory: messages
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const processResponse = async (userMsg: Message) => {
      setMessages(prev => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const lowerInput = userMsg.content.toLowerCase();
        
        if (lowerInput.includes('storyboard') || (lowerInput.includes('image') && lowerInput.includes('generate'))) {
           // Image Generation Mode
           if (!checkLimit('image')) {
               setMessages(prev => [...prev, { role: 'model', content: "You have reached your image generation limit. Please upgrade your plan." }]);
               return;
           }

           const responseText = "Generating storyboard asset...";
           setMessages(prev => [...prev, { role: 'model', content: responseText }]);
           
           try {
               const b64 = await generateStoryboardImage(userMsg.content);
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
            // Analysis Mode
            const analysis = await analyzeMediaContext(assets);
            setMessages(prev => [...prev, { role: 'model', content: analysis }]);

        } else {
            // Writing/Chat/Edit Mode
            const historyForAI = messages.map(m => ({ role: m.role, content: m.content })).filter(m => m.role !== 'system');
            
            const response = await generateWriting(
                userMsg.content, 
                projectType, 
                assets, 
                historyForAI, 
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

  const handleQuickStoryboard = () => {
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
            if (window.aistudio && window.aistudio.openSelectKey) {
                await window.aistudio.openSelectKey();
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
          startLive();
      }
  };

  return (
    <>
      <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
          <h2 className="text-gray-200 font-semibold flex items-center gap-2">
            <span className="text-muse-500">✨</span> Muse Assistant
          </h2>
          <div className="flex items-center gap-2">
              <label className="flex items-center text-xs text-gray-400 cursor-pointer hover:text-white">
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
            <div className="bg-muse-900/50 p-2 text-center text-xs text-muse-200 border-b border-muse-800 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                Listening to you...
            </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 ${
                msg.role === 'user' 
                  ? 'bg-muse-600 text-white rounded-br-none' 
                  : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'
              }`}>
                {msg.type === 'image' && msg.mediaUrl && (
                  <img src={msg.mediaUrl} alt="Generated" className="rounded-lg mb-2 w-full object-cover max-h-60" />
                )}
                {msg.type === 'video' && msg.mediaUrl && (
                  <video src={msg.mediaUrl} controls className="rounded-lg mb-2 w-full max-h-60" />
                )}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                
                {msg.role === 'model' && !msg.type && (
                    <button 
                      onClick={() => handleCopyText(msg.content)}
                      className="mt-3 text-xs text-muse-400 hover:text-muse-300 flex items-center gap-1 font-medium"
                    >
                        + Add to Editor
                    </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 text-gray-400 rounded-2xl rounded-bl-none p-4 text-sm flex items-center gap-2">
                 <div className="w-2 h-2 bg-muse-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-2 h-2 bg-muse-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                 <div className="w-2 h-2 bg-muse-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input & Quick Actions */}
        <div className="p-4 bg-gray-900 border-t border-gray-800">
          <div className="grid grid-cols-3 gap-2 mb-3">
             <button 
                onClick={handleQuickStoryboard}
                disabled={isLoading || isLiveActive}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] md:text-xs py-2 px-2 rounded-lg border border-gray-700 transition-colors flex items-center justify-center gap-1"
             >
                <span>🖼️</span> Storyboard
             </button>
             <button 
                onClick={toggleLive}
                className={`text-[10px] md:text-xs py-2 px-2 rounded-lg border transition-all flex items-center justify-center gap-1 ${
                    isLiveActive 
                    ? 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
                }`}
             >
                {isLiveConnecting ? 'Connecting...' : isLiveActive ? (
                   <>
                      <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                          <span>Voice Active ({Math.round(volume * 100)}%)</span>
                      </div>
                   </>
                ) : (
                    <>
                       <span>🎙️</span> Voice Mode
                    </>
                )}
             </button>
             <button 
                onClick={() => setIsVeoModalOpen(true)}
                disabled={isLoading || isLiveActive}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] md:text-xs py-2 px-2 rounded-lg border border-gray-700 transition-colors flex items-center justify-center gap-1"
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
              placeholder={isLiveActive ? "Listening..." : "Ask for edits ('Rewrite the intro'), ideas, or specific scenes..."}
              disabled={isLiveActive}
              className={`w-full bg-gray-800 text-white rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-muse-500 resize-none h-20 text-sm ${isLiveActive ? 'opacity-50' : ''}`}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && assets.length === 0) || isLiveActive}
              className="absolute right-3 bottom-3 p-2 bg-muse-600 rounded-lg text-white hover:bg-muse-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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