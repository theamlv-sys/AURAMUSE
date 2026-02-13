
import React, { useState } from 'react';
import { generateSocialPost } from '../services/geminiService';

interface SocialToolsProps {
    content: string;
}

export default function SocialTools({ content }: SocialToolsProps) {
    const [platform, setPlatform] = useState<'instagram' | 'tiktok' | 'twitter' | 'linkedin'>('instagram');
    const [tone, setTone] = useState('engaging');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');

    const handleGenerate = async () => {
        if (!content) return alert("Please add content to the editor first.");
        setLoading(true);
        try {
            const post = await generateSocialPost(content, platform, tone);
            setResult(post);
        } catch (e) {
            console.error(e);
            alert("Failed to generate post.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white p-4 overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                Social Studio
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Platform</label>
                    <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value as any)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                    >
                        <option value="instagram">Instagram (Caption + Hashtags)</option>
                        <option value="tiktok">TikTok (Script + Visuals)</option>
                        <option value="twitter">X / Twitter (Thread)</option>
                        <option value="linkedin">LinkedIn (Professional)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tone</label>
                    <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                    >
                        <option value="engaging">Engaging & Viral</option>
                        <option value="professional">Professional & Clean</option>
                        <option value="controversial">Provocative / Debate</option>
                        <option value="humorous">Funny & Relatable</option>
                        <option value="educational">Educational / Value-First</option>
                    </select>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                >
                    {loading ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span> : '✨ Generate Post'}
                </button>

                {result && (
                    <div className="mt-6 animate-fadeIn">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-gray-400 uppercase">Generated Content</h3>
                            <button onClick={() => navigator.clipboard.writeText(result)} className="text-xs text-blue-400 hover:text-white">Copy Output</button>
                        </div>
                        <textarea
                            value={result}
                            readOnly
                            className="w-full h-64 bg-gray-800 border border-gray-700 rounded p-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500 font-mono"
                        />
                        <div className="text-center mt-4">
                            <button onClick={handleGenerate} className="text-sm text-gray-500 hover:text-white underline">Regenerate</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
