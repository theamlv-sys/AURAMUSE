import React, { useState, useEffect } from 'react';
import { generateYouTubeMetadata, generateThumbnailPrompt, generateStoryboardImage, generateThumbnailPromptFromAssets, generateYouTubeAnalysis } from '../services/geminiService';
// YouTube Data API no longer needed — research uses Gemini with Google Search grounding
import { SubscriptionTier, Asset } from '../types';
import AssetLibrary from './AssetLibrary';

interface YouTubeToolsProps {
    content: string;
    userTier: SubscriptionTier;
    initialTab?: 'seo' | 'thumbnail' | 'research';
    assets: Asset[];
    onUpload: (files: FileList) => void;
    onAddLink: (url: string) => void;
    onDelete: (id: string) => void;
    providerToken?: string;
}

const YouTubeTools: React.FC<YouTubeToolsProps> = ({ content, userTier, initialTab = 'seo', assets, onUpload, onAddLink, onDelete, providerToken }) => {
    const apiKey = import.meta.env.VITE_GOOGLE_GENAI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
    const [activeTab, setActiveTab] = useState<'seo' | 'thumbnail'>('seo');

    // Update activeTab when initialTab changes (e.g. clicking different sidebar button)
    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);
    const [loading, setLoading] = useState(false);
    const [seoData, setSeoData] = useState<{ titles: string[], description: string, tags: string[], hashtags: string[] } | null>(null);
    const [thumbPrompt, setThumbPrompt] = useState('');
    const [thumbImage, setThumbImage] = useState<string | null>(null);
    const [thumbMode, setThumbMode] = useState<'ai' | 'assets'>('ai');
    const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
    const [showAssetPicker, setShowAssetPicker] = useState(false);
    const [userIdea, setUserIdea] = useState('');

    const handleGenerateSEO = async () => {
        if (!content) return alert("Please add some content to the editor first.");
        setLoading(true);
        try {
            const data = await generateYouTubeMetadata(content);
            setSeoData(data);
        } catch (e) {
            console.error(e);
            alert("Failed to generate SEO data. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateThumbPrompt = async () => {
        if (!content) return alert("Please add some content to the editor first.");
        setLoading(true);
        try {
            const prompt = await generateThumbnailPrompt(content);
            setThumbPrompt(prompt);
        } catch (e) {
            console.error(e);
            alert("Failed to generate prompt.");
        } finally {
            setLoading(false);
        }
    };



    const handleAssetSelect = (asset: Asset) => {
        if (selectedAssets.some(a => a.id === asset.id)) {
            setSelectedAssets(prev => prev.filter(a => a.id !== asset.id));
        } else {
            // Limit: 3 images OR 1 video
            const hasVideo = selectedAssets.some(a => a.type === 'video' || (a.type === 'link' && a.url.includes('youtube')));
            const isVideo = asset.type === 'video' || (asset.type === 'link' && asset.url.includes('youtube'));

            if (isVideo) {
                // If selecting video, clear others (only 1 video allowed, no mixing with images for simplicity first)
                setSelectedAssets([asset]);
            } else if (hasVideo) {
                // If video already selected, clear it to add image
                setSelectedAssets([asset]);
            } else {
                if (selectedAssets.length >= 3) return alert("Max 3 images allowed.");
                setSelectedAssets(prev => [...prev, asset]);
            }
        }
    };

    const handleGenerateThumbFromAssets = async () => {
        if (selectedAssets.length === 0) return alert("Please select at least one asset.");
        setLoading(true);
        try {
            const prompt = await generateThumbnailPromptFromAssets(userIdea || "Create a high performing thumbnail based on these assets.", selectedAssets);
            setThumbPrompt(prompt);
            setThumbMode('ai'); // Switch to review prompt
        } catch (e) {
            console.error(e);
            alert("Failed to generate prompt from assets.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateThumbnail = async () => {
        setLoading(true);
        try {
            let promptToUse = thumbPrompt;

            // If in Asset mode and no prompt exists yet, generate one first
            if (thumbMode === 'assets') {
                if (selectedAssets.length === 0) throw new Error("Please select assets first.");
                promptToUse = await generateThumbnailPromptFromAssets(
                    userIdea || "Create a high performing thumbnail based on these assets.",
                    selectedAssets
                );
                setThumbPrompt(promptToUse); // Show user the generated prompt
            }

            if (!promptToUse) throw new Error("Please provide a prompt or select assets.");

            // Generate Image
            const img = await generateStoryboardImage(promptToUse, userTier, '16:9');
            setThumbImage(img);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to generate thumbnail.");
        } finally {
            setLoading(false);
        }
    };

    // --- RESEARCH TAB STATE ---
    const [searchQuery, setSearchQuery] = useState('');
    const [analysisResult, setAnalysisResult] = useState('');
    const [analyzing, setAnalyzing] = useState(false);

    const handleSmartResearch = async () => {
        if (!searchQuery) return alert("Please enter a URL, Channel Name, or Topic.");
        setAnalyzing(true);
        setAnalysisResult('');
        try {
            const result = await generateYouTubeAnalysis(searchQuery);
            setAnalysisResult(result);
        } catch (e: any) {
            console.error(e);
            alert("Research failed: " + e.message);
        } finally {
            setAnalyzing(false);
        }
    };



    return (
        <div className="h-full flex flex-col bg-gray-900 text-white p-4 overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
                YouTube Studio
            </h2>

            {(userTier === 'AUTEUR' || userTier === 'SHOWRUNNER') ? (
                <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2">
                    <button
                        onClick={() => setActiveTab('seo')}
                        className={`flex-1 py-3 rounded-lg text-lg font-bold transition-colors ${activeTab === 'seo' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                    >
                        FULL SEO
                    </button>
                    <button
                        onClick={() => setActiveTab('thumbnail')}
                        className={`flex-1 py-3 rounded-lg text-lg font-bold transition-colors ${activeTab === 'thumbnail' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                    >
                        MAKE THUMBNAIL
                    </button>
                    <button
                        onClick={() => setActiveTab('research')}
                        className={`flex-1 py-3 rounded-lg text-lg font-bold transition-colors ${activeTab === 'research' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                    >
                        RESEARCH
                    </button>
                </div>
            ) : (
                <div className="bg-gray-800/60 border border-yellow-600/30 rounded-xl p-6 mb-6 text-center">
                    <p className="text-yellow-400 font-bold text-lg mb-2">🔒 Premium Feature</p>
                    <p className="text-gray-400 text-sm">YouTube Studio tools (SEO, Thumbnails, Research) are available on <span className="text-white font-semibold">Auteur</span> and <span className="text-white font-semibold">Showrunner</span> plans.</p>
                </div>
            )}

            {loading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
                </div>
            )}

            {activeTab === 'seo' && (
                <div className="space-y-6">
                    {!seoData ? (
                        <div className="text-center py-10">
                            <p className="text-gray-400 mb-4">Analyze your script to generate optimized titles, description, and tags.</p>
                            <button onClick={handleGenerateSEO} disabled={loading} className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                                Generate SEO Metadata
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fadeIn">
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Title Options</h3>
                                <div className="space-y-2">
                                    {seoData.titles.map((title, i) => (
                                        <div key={i} className="p-3 bg-gray-800 rounded border border-gray-700 flex justify-between items-center group">
                                            <span className="text-sm">{title}</span>
                                            <button onClick={() => navigator.clipboard.writeText(title)} className="text-xs text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">Copy</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Description</h3>
                                <div className="relative">
                                    <textarea
                                        readOnly
                                        value={seoData.description}
                                        className="w-full h-32 bg-gray-800 rounded border border-gray-700 p-3 text-sm text-gray-300 focus:outline-none focus:border-red-500"
                                    />
                                    <button onClick={() => navigator.clipboard.writeText(seoData.description)} className="absolute top-2 right-2 text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600">Copy</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Tags</h3>
                                    <div className="p-3 bg-gray-800 rounded border border-gray-700 text-xs text-gray-300 leading-relaxed">
                                        {seoData.tags.join(', ')}
                                    </div>
                                    <button onClick={() => navigator.clipboard.writeText(seoData.tags.join(','))} className="text-xs text-red-400 mt-1 hover:text-red-300">Copy All</button>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Hashtags</h3>
                                    <div className="p-3 bg-gray-800 rounded border border-gray-700 text-xs text-blue-400 leading-relaxed">
                                        {seoData.hashtags.join(' ')}
                                    </div>
                                    <button onClick={() => navigator.clipboard.writeText(seoData.hashtags.join(' '))} className="text-xs text-red-400 mt-1 hover:text-red-300">Copy All</button>
                                </div>
                            </div>

                            <button onClick={handleGenerateSEO} className="w-full py-2 border border-gray-700 rounded text-gray-400 hover:text-white hover:bg-gray-800 text-sm">
                                Regenerate
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'thumbnail' && (
                <div className="space-y-6">
                    {/* Mode Toggle */}
                    <div className="flex bg-gray-800 p-1 rounded-lg">
                        <button
                            onClick={() => setThumbMode('ai')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${thumbMode === 'ai' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Script Analysis
                        </button>
                        <button
                            onClick={() => setThumbMode('assets')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${thumbMode === 'assets' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            From Assets (Images/Video)
                        </button>
                    </div>

                    {thumbMode === 'ai' ? (
                        <div className="space-y-4 animate-fadeIn">
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Image Prompt</h3>
                                <div className="flex gap-2">
                                    <textarea
                                        value={thumbPrompt}
                                        onChange={(e) => setThumbPrompt(e.target.value)}
                                        placeholder="Describe your thumbnail or generate a prompt from script..."
                                        className="flex-1 h-24 bg-gray-800 rounded border border-gray-700 p-3 text-sm focus:outline-none focus:border-red-500"
                                    />
                                </div>
                                <div className="flex justify-between mt-2">
                                    <button onClick={handleGenerateThumbPrompt} className="text-xs text-red-400 hover:text-red-300">✨ Generate Prompt from Script</button>
                                    <span className="text-xs text-gray-500">{thumbPrompt.length} chars</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase">Selected Assets ({selectedAssets.length}/3)</h3>
                                    <button onClick={() => setShowAssetPicker(true)} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded">
                                        + Add Assets
                                    </button>
                                </div>

                                {selectedAssets.length === 0 ? (
                                    <div className="text-center py-6 text-gray-500 text-xs border border-dashed border-gray-700 rounded">
                                        Select up to 3 images or 1 video<br />for AI analysis.
                                    </div>
                                ) : (
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {selectedAssets.map(asset => (
                                            <div key={asset.id} className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden border border-gray-600 group">
                                                {asset.type === 'video' || (asset.type === 'link' && asset.url.includes('youtube')) ? (
                                                    <div className="w-full h-full bg-black flex items-center justify-center text-red-500">
                                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                    </div>
                                                ) : (
                                                    <img src={asset.url} alt="" className="w-full h-full object-cover" />
                                                )}
                                                <button
                                                    onClick={() => handleAssetSelect(asset)}
                                                    className="absolute top-0 right-0 bg-red-600 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Thubmnail Idea</h3>
                                <textarea
                                    value={userIdea}
                                    onChange={(e) => setUserIdea(e.target.value)}
                                    placeholder="Briefly describe your idea (e.g., 'Me looking shocked pointing at a chart'). The AI will combine this with your assets."
                                    className="w-full h-20 bg-gray-800 rounded border border-gray-700 p-3 text-sm focus:outline-none focus:border-red-500"
                                />
                            </div>

                            {/* Simplified: Hidden "Generate Prompt" button to reduce clicks. Main button handles it all. */}

                            {thumbPrompt && (
                                <div className="space-y-2 pt-4 border-t border-gray-800">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase">Generated Prompt</h3>
                                    <textarea
                                        value={thumbPrompt}
                                        onChange={(e) => setThumbPrompt(e.target.value)}
                                        className="w-full h-24 bg-gray-800 rounded border border-gray-700 p-3 text-sm focus:outline-none focus:border-red-500"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleGenerateThumbnail}
                        disabled={loading || (thumbMode === 'assets' && selectedAssets.length === 0)}
                        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg shadow-lg ${loading || (thumbMode === 'assets' && selectedAssets.length === 0) ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 transform hover:scale-[1.01] transition-all'}`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/50 border-t-white"></div>
                                {thumbMode === 'assets' ? 'Analyzing Assets & Generating...' : 'Generating...'}
                            </span>
                        ) : (
                            <span>{thumbMode === 'assets' ? '✨ Generate Thumbnail from Assets' : '🎨 Generate Thumbnail'}</span>
                        )}
                    </button>

                    {thumbImage && (
                        <div className="space-y-2 animate-fadeIn">
                            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-gray-700 relative group">
                                <img src={thumbImage} alt="Generated Thumbnail" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <a href={thumbImage} download="thumbnail.png" className="px-4 py-2 bg-white text-black rounded font-medium hover:bg-gray-200">Download</a>
                                </div>
                            </div>
                            <p className="text-xs text-center text-gray-500">Free Tier: Flash Model • Upgrade for Pro Quality</p>
                        </div>
                    )}

                    {/* Asset Picker Modal */}
                    {showAssetPicker && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                            <div className="bg-gray-900 w-full max-w-4xl h-[80vh] rounded-2xl border border-gray-700 overflow-hidden shadow-2xl relative">
                                <button onClick={() => setShowAssetPicker(false)} className="absolute top-4 right-4 z-10 bg-black/50 p-2 rounded-full hover:bg-white/20 text-white">✕</button>
                                <AssetLibrary
                                    assets={assets}
                                    onUpload={onUpload}
                                    onAddLink={onAddLink}
                                    onDelete={onDelete}
                                    theme="dark"
                                    onSelect={(asset) => handleAssetSelect(asset)}
                                    selectedIds={selectedAssets.map(a => a.id)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'research' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-lg font-bold mb-2">🔍 YouTube Research</h3>
                        <p className="text-sm text-gray-400 mb-4">Paste a YouTube link, channel name, or topic — Gemini will research and analyze it for you.</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="e.g. @MrBeast, https://youtube.com/watch?v=..., 'cooking niche analysis'"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleSmartResearch()}
                            />
                            <button
                                onClick={handleSmartResearch}
                                disabled={analyzing || !searchQuery}
                                className={`px-8 rounded-lg font-bold text-white transition-all ${analyzing ? 'bg-gray-700 animate-pulse' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {analyzing ? '⏳ Researching...' : '🚀 Analyze'}
                            </button>
                        </div>
                    </div>

                    {analyzing && !analysisResult && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500 mb-4"></div>
                            <p className="text-sm">Gemini is searching YouTube and building your report...</p>
                            <p className="text-xs text-gray-500 mt-1">This may take 10-20 seconds.</p>
                        </div>
                    )}

                    {analysisResult && (
                        <div className="animate-fadeIn">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">📊 Analysis Report</h3>
                                <button onClick={() => setAnalysisResult('')} className="text-xs text-gray-500 hover:text-white px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors">✕ Clear</button>
                            </div>
                            <div className="prose prose-invert prose-sm max-w-none bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                                <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed">
                                    {analysisResult}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default YouTubeTools;
