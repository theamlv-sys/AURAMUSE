import React, { useState } from 'react';
import { generateSVG } from '../services/gemini';
import { convertSVGToMP4 } from '../services/videoService';

interface MotionSvgAIProps {
    onBack: () => void;
    theme: 'dark' | 'light';
    userTier: string;
}

const GenButton = ({ onClick, loading, disabled, label, loadingLabel }: { onClick: () => void, loading: boolean, disabled: boolean, label: string, loadingLabel: string }) => (
    <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium text-white transition-all shadow-md active:scale-[0.98] ${disabled || loading ? 'bg-muse-400 cursor-not-allowed' : 'bg-muse-600 hover:bg-muse-500 hover:shadow-lg hover:shadow-muse-500/20'}`}
    >
        {loading ? (
            <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> {loadingLabel}</>
        ) : (
            <><span className="text-lg">✨</span> {label}</>
        )}
    </button>
);

const MotionSvgAI: React.FC<MotionSvgAIProps> = ({ onBack, theme, userTier }) => {
    const isDark = theme === 'dark';
    const bgColor = isDark ? 'bg-gray-950/20 backdrop-blur-md' : 'bg-white';
    const textColor = isDark ? 'text-gray-200' : 'text-gray-900';
    const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
    const cardBg = isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50';
    const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';
    const inputBg = isDark ? 'bg-[#111116] border-gray-800 text-gray-200' : 'bg-white border-gray-300 text-gray-900';

    const [motionSvgPrompt, setMotionSvgPrompt] = useState('');
    const [motionSvgIsPromotional, setMotionSvgIsPromotional] = useState(false);
    const [motionSvgCode, setMotionSvgCode] = useState('');
    const [motionSvgLoading, setMotionSvgLoading] = useState(false);
    const [motionSvgExporting, setMotionSvgExporting] = useState(false);
    const [motionSvgExportProgress, setMotionSvgExportProgress] = useState(0);

    const handleGenerateMotionSvg = async () => {
        setMotionSvgLoading(true);
        try {
            const svg = await generateSVG(motionSvgPrompt, motionSvgIsPromotional);
            setMotionSvgCode(svg);
        } catch (e) {
            console.error(e);
            alert('Failed to generate SVG.');
        }
        setMotionSvgLoading(false);
    };

    const handleExportMotionSvg = async () => {
        if (!motionSvgCode) return;
        setMotionSvgExporting(true);
        setMotionSvgExportProgress(0);
        try {
            const duration = motionSvgIsPromotional ? 30 : 15;
            const videoBlob = await convertSVGToMP4(motionSvgCode, duration, (progress) => {
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
                <div className="flex items-center gap-4">
                    <div className={`px-3 py-1.5 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} flex items-center gap-2`}>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className={`text-xs font-medium ${subTextColor}`}>Engine Online</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className={`flex-1 overflow-auto p-6 md:p-8 flex flex-col lg:flex-row gap-8`}>
                
                {/* Left Panel: Controls */}
                <div className="w-full lg:w-[400px] shrink-0 space-y-6">
                    <div className={`${cardBg} rounded-xl border ${borderColor} p-6 shadow-sm`}>
                        <h2 className={`text-lg font-bold mb-2 ${textColor}`}>Generate Animation</h2>
                        <p className={`text-sm ${subTextColor} mb-6`}>
                            Provide a detailed prompt and MotionSVG AI will generate a highly optimized, animated vector graphic sequence.
                        </p>
                        
                        <div className="space-y-5">
                            <div>
                                <label className={`text-xs font-bold uppercase tracking-wider ${subTextColor} mb-1.5 block`}>
                                    Prompt
                                </label>
                                <textarea
                                    value={motionSvgPrompt}
                                    onChange={e => setMotionSvgPrompt(e.target.value)}
                                    rows={5}
                                    placeholder="e.g., A futuristic glowing orb bouncing in a cyberpunk city skyline..."
                                    className={`w-full rounded-xl px-4 py-3 border text-sm ${inputBg} focus:ring-2 focus:ring-muse-500 outline-none resize-none transition-all shadow-inner`}
                                />
                            </div>

                            <div>
                                <label className={`text-xs font-bold uppercase tracking-wider ${subTextColor} mb-1.5 block`}>
                                    Video Format & Duration
                                </label>
                                <select
                                    value={motionSvgIsPromotional ? 'true' : 'false'}
                                    onChange={e => setMotionSvgIsPromotional(e.target.value === 'true')}
                                    className={`w-full rounded-xl px-4 py-3 border text-sm ${inputBg} shadow-inner cursor-pointer`}
                                >
                                    <option value="false">Standard Loop (15-30s)</option>
                                    <option value="true">Promotional Sequence (30-60s)</option>
                                </select>
                            </div>

                            <GenButton
                                onClick={handleGenerateMotionSvg}
                                loading={motionSvgLoading}
                                disabled={!motionSvgPrompt.trim()}
                                label="Generate Vector Animation"
                                loadingLabel="Designing Sequence..."
                            />
                        </div>
                    </div>
                </div>

                {/* Right Panel: Preview & Export */}
                <div className={`flex-1 flex flex-col ${cardBg} rounded-xl border ${borderColor} overflow-hidden shadow-sm relative`}>
                    <div className={`p-4 border-b ${borderColor} flex justify-between items-center bg-black/5 dark:bg-white/5`}>
                        <h3 className={`font-bold ${textColor}`}>Live Output Preview</h3>
                        {motionSvgCode && (
                            <button
                                onClick={handleExportMotionSvg}
                                disabled={motionSvgExporting}
                                className={`px-4 py-1.5 text-sm rounded-lg flex items-center justify-center gap-2 font-medium text-white transition-all shadow-md active:scale-[0.98] ${motionSvgExporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}
                            >
                                {motionSvgExporting ? (
                                    <><div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" /> {Math.round(motionSvgExportProgress * 100)}%</>
                                ) : (
                                    <>🎥 Export MP4</>
                                )}
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center p-6 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACVJREFUKFNjZCASMDKgAnv37v3/nJwciuTIoJhBDSWjVJwMZjAArN0Gwd52l3IAAAAASUVORK5CYII=')] dark:opacity-20 opacity-10">
                         {motionSvgCode ? (
                             <div className="w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl relative bg-white" dangerouslySetInnerHTML={{ __html: motionSvgCode }} />
                         ) : (
                             <div className={`text-center space-y-4 ${subTextColor}`}>
                                 <div className="w-16 h-16 mx-auto opacity-20">
                                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                         <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                         <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                     </svg>
                                 </div>
                                 <p className="text-lg">Awaiting Generation...</p>
                                 <p className="text-sm">Your animated SVG will appear here.</p>
                             </div>
                         )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MotionSvgAI;
