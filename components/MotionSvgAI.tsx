import React, { useState, useRef, useEffect } from 'react';
import { generateSVGChat } from '../services/geminiService';
import { convertSVGToMP4 } from '../services/videoService';

interface MotionSvgAIProps {
    onBack: () => void;
    theme: 'dark' | 'light';
    userTier: string;
}

interface Message {
    role: 'user' | 'model';
    content: string;
}

const MotionSvgAI: React.FC<MotionSvgAIProps> = ({ onBack, theme, userTier }) => {
    const isDark = theme === 'dark';
    const bgColor = isDark ? 'bg-gray-950/20 backdrop-blur-md' : 'bg-white';
    const textColor = isDark ? 'text-gray-200' : 'text-gray-900';
    const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
    const cardBg = isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50';
    const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';
    const inputBg = isDark ? 'bg-[#111116] border-gray-800 text-gray-200' : 'bg-white border-gray-300 text-gray-900';
    
    const isShowrunner = userTier === 'SHOWRUNNER';

    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: "Hello! I'm Muse, your Motion Graphics Assistant. Let's brainstorm your animation. Once we agree on an idea, pick a mode below and click 'Generate Video' to see it come to life!" }
    ]);
    const [inputText, setInputText] = useState('');
    const [useProModel, setUseProModel] = useState(false);
    const [isPromotional, setIsPromotional] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // For Chat
    const [isGenerating, setIsGenerating] = useState(false); // For Video
    const [latestSvgCode, setLatestSvgCode] = useState<string | null>(null);
    const [motionSvgExporting, setMotionSvgExporting] = useState(false);
    const [motionSvgExportProgress, setMotionSvgExportProgress] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSendMessage = async () => {
        if (!inputText.trim() || isLoading || isGenerating) return;

        let newMessages = [...messages];
        newMessages.push({ role: 'user', content: inputText.trim() });
        setInputText('');
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const historyForApi = newMessages.map(m => ({ role: m.role, content: m.content }));
            
            // forceGenerate=false for pure chat
            const response = await generateSVGChat(historyForApi, useProModel, false, isPromotional);
            
            setMessages(prev => [...prev, {
                role: 'model',
                content: response.text
            }]);
            
            // If Muse unexpectedly gives us SVG in pure chat, keep it just in case
            if (response.svgCode) {
                setLatestSvgCode(response.svgCode);
            }
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'model', content: "I encountered an error while trying to process that request." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateVideo = async () => {
        if (isGenerating || messages.length === 1) return;
        setIsGenerating(true);

        try {
            const historyForApi = messages.map(m => ({ role: m.role, content: m.content }));
            
            // forceGenerate=true triggers the silent SVG build
            const response = await generateSVGChat(historyForApi, useProModel, true, isPromotional);
            
            if (response.svgCode) {
                setLatestSvgCode(response.svgCode);
            } else {
                alert("Muse couldn't process the graphic. Try typing more details in the chat!");
            }
        } catch (e) {
            console.error(e);
            alert("Error generating video graphic. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleExportMotionSvg = async () => {
        if (!latestSvgCode) return;
        setMotionSvgExporting(true);
        setMotionSvgExportProgress(0);
        try {
            // Defaulting duration to 15 seconds unless it's a huge code block which might imply a longer promo
            const duration = latestSvgCode.length > 5000 ? 30 : 15;
            const videoBlob = await convertSVGToMP4(latestSvgCode, duration, (progress) => {
                setMotionSvgExportProgress(progress);
            });

            const extension = videoBlob.type === 'video/mp4' ? 'mp4' : 'webm';
            const url = URL.createObjectURL(videoBlob);

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `motion-video-${Date.now()}.${extension}`;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1000);

        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export video.');
        }
        setMotionSvgExporting(false);
        setMotionSvgExportProgress(0);
    };

    return (
        <div className={`fixed inset-0 z-50 flex flex-col ${isDark ? 'bg-gray-900' : 'bg-gray-50'} animate-fade-in`}>
            {/* Header */}
            <header className={`h-16 flex items-center justify-between px-6 border-b ${borderColor} ${bgColor} shadow-sm shrink-0`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className={`text-lg font-bold ${textColor} flex items-center gap-2`}>
                            🪄 MotionSVG AI
                        </h1>
                    </div>
                </div>
                
                {/* Center Toggle if Showrunner */}
                <div className="flex items-center justify-center flex-1">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${borderColor} ${cardBg} shadow-inner cursor-default`} title={!isShowrunner ? "Requires Showrunner Tier" : "Toggle Creative Engine"}>
                        <span className={`text-xs font-medium ${!useProModel ? textColor : subTextColor}`}>Gemini 2.5 Pro</span>
                        <button 
                            onClick={() => isShowrunner && setUseProModel(!useProModel)}
                            disabled={!isShowrunner}
                            className={`relative w-10 h-5 rounded-full transition-colors ${useProModel ? 'bg-muse-500' : isDark ? 'bg-gray-700' : 'bg-gray-300'} ${!isShowrunner && 'opacity-50 cursor-not-allowed'}`}
                        >
                            <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${useProModel ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                        <span className={`text-xs font-bold ${useProModel ? 'text-transparent bg-clip-text bg-gradient-to-r from-muse-400 to-purple-500' : subTextColor}`}>Gemini 3.1 Pro ✦</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`px-3 py-1.5 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} flex items-center gap-2`}>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className={`text-xs font-medium ${subTextColor}`}>Engine Online</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className={`flex-1 overflow-hidden flex flex-col lg:flex-row`}>
                
                {/* Left Panel: Chat Interface */}
                <div className={`w-full lg:w-[450px] shrink-0 flex flex-col border-r ${borderColor} ${cardBg}`}>
                    
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                                    msg.role === 'user' 
                                        ? 'bg-muse-600 text-white rounded-tr-sm' 
                                        : `${isDark ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'} border ${borderColor} rounded-tl-sm`
                                }`}>
                                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                        {msg.role === 'model' && msg.content === '' && msg.svgCode ? (
                                            <span className="italic opacity-80">Generated a new SVG iteration.</span>
                                        ) : (
                                            (() => {
                                                const text = msg.content;
                                                const start = text.indexOf('<svg');
                                                const end = text.lastIndexOf('</svg>');
                                                if (start !== -1 && end !== -1 && end > start) {
                                                    let before = text.substring(0, start);
                                                    let after = text.substring(end + 6);
                                                    
                                                    const openBlock = before.lastIndexOf('```');
                                                    if (openBlock !== -1) before = before.substring(0, openBlock);
                                                    
                                                    const closeBlock = after.indexOf('```');
                                                    if (closeBlock !== -1) after = after.substring(closeBlock + 3);
                                                    
                                                    return before.trim() + '\n\n[✨ SVG Animation Generated in Viewer]\n\n' + after.trim();
                                                }
                                                return text;
                                            })()
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className={`rounded-2xl px-5 py-4 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'} border ${borderColor} rounded-tl-sm`}>
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-muse-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-muse-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-muse-400 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className={`p-4 border-t ${borderColor} ${bgColor}`}>
                        
                        {/* Generation Controls */}
                        <div className="flex items-center gap-2 mb-3">
                            <select 
                                value={isPromotional ? 'promotional' : 'standard'}
                                onChange={(e) => setIsPromotional(e.target.value === 'promotional')}
                                className={`flex-1 rounded-xl px-3 py-2.5 border text-sm font-medium ${inputBg} shadow-inner cursor-pointer outline-none transition-all focus:ring-2 focus:ring-muse-500/50`}
                            >
                                <option value="standard">Standard Animation</option>
                                <option value="promotional">60s Promotional</option>
                            </select>
                            <button
                                onClick={handleGenerateVideo}
                                disabled={isGenerating || messages.length === 1}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md active:scale-[0.98] flex items-center gap-2 ${isGenerating || messages.length === 1 ? 'bg-muse-400 cursor-not-allowed' : 'bg-gradient-to-r from-muse-600 to-indigo-600 hover:from-muse-500 hover:to-indigo-500 hover:shadow-indigo-500/20'}`}
                            >
                                {isGenerating ? (
                                    <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Generating...</>
                                ) : latestSvgCode ? (
                                    <>🪄 Edit Video</>
                                ) : (
                                    <>✨ Generate Video</>
                                )}
                            </button>
                        </div>

                        <div className={`flex items-end gap-2 rounded-2xl border ${borderColor} ${inputBg} p-2 shadow-inner focus-within:ring-2 focus-within:ring-muse-500/50 transition-all`}>
                            <textarea
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Chat with Muse to plan or iterate..."
                                className="w-full max-h-32 min-h-[44px] bg-transparent resize-none outline-none text-sm px-2 py-3"
                                rows={1}
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={!inputText.trim() || isLoading}
                                className={`p-2.5 rounded-xl shrink-0 transition-all ${
                                    !inputText.trim() || isLoading 
                                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' 
                                    : 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 shadow-md active:scale-95'
                                }`}
                            >
                                <svg className="w-5 h-5 translate-x-0.5 -translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                        <p className={`text-center text-[10px] mt-2 ${subTextColor}`}>
                            Press Enter to chat, Shift+Enter for new line. Click Generate Video to apply changes.
                        </p>
                    </div>
                </div>

                {/* Right Panel: Preview & Export */}
                <div className={`flex-1 flex flex-col relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACVJREFUKFNjZCASMDKgAnv37v3/nJwciuTIoJhBDSWjVJwMZjAArN0Gwd52l3IAAAAASUVORK5CYII=')] dark:opacity-20 opacity-10 bg-repeat`}>
                    
                    {/* Floating Export Button */}
                    <div className="absolute top-6 right-6 z-10">
                        {latestSvgCode && (
                            <button
                                onClick={handleExportMotionSvg}
                                disabled={motionSvgExporting}
                                className={`px-5 py-2.5 text-sm rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all shadow-xl active:scale-[0.98] ${motionSvgExporting ? 'bg-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-indigo-500/25 border border-white/10'}`}
                            >
                                {motionSvgExporting ? (
                                    <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> {Math.round(motionSvgExportProgress * 100)}%</>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Export MP4
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                    
                    {/* Viewport */}
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                         {latestSvgCode ? (
                             <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl relative bg-white ring-1 ring-black/5" dangerouslySetInnerHTML={{ __html: latestSvgCode }} />
                         ) : (
                             <div className={`text-center space-y-4 ${subTextColor}`}>
                                 <div className="w-20 h-20 mx-auto opacity-20">
                                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                         <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                         <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                     </svg>
                                 </div>
                                 <h2 className="text-xl font-medium">Awaiting Prompt</h2>
                                 <p className="text-sm max-w-sm mx-auto">Tell Muse what kind of animation you want to generate in the chat box to your left.</p>
                             </div>
                         )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MotionSvgAI;
