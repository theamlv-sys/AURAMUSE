import React, { useRef, useState } from 'react';
import { Asset } from '../types';

interface AssetLibraryProps {
    assets: Asset[];
    onUpload: (files: FileList) => void;
    onAddLink: (url: string) => void;
    onDelete: (id: string) => void;
}

const AssetLibrary: React.FC<AssetLibraryProps & { theme: 'dark' | 'light' }> = ({ assets, onUpload, onAddLink, onDelete, theme }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUpload(e.target.files);
        }
    };

    const handleLinkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (linkUrl.trim()) {
            onAddLink(linkUrl);
            setLinkUrl('');
            setShowLinkInput(false);
        }
    };

    const isDark = theme === 'dark';
    const bgMain = isDark ? 'bg-gray-900' : 'bg-gray-50';
    const bgCard = isDark ? 'bg-gray-800' : 'bg-white';
    const textMain = isDark ? 'text-gray-200' : 'text-gray-900';
    const textSec = isDark ? 'text-gray-400' : 'text-gray-500';
    const border = isDark ? 'border-gray-800' : 'border-gray-200';
    const btnBg = isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100 border border-gray-200';

    return (
        <div className={`p-4 ${bgMain} h-full border-l ${border} overflow-y-auto transition-colors duration-500`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className={`${textMain} font-semibold text-sm uppercase tracking-wider`}>Library</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowLinkInput(!showLinkInput)}
                        className={`p-1.5 ${btnBg} rounded transition-colors ${textMain}`}
                        title="Add YouTube/Web Link"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                        </svg>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-1.5 ${btnBg} rounded transition-colors ${textMain}`}
                        title="Upload File (Image, Video, PDF)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </button>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,video/*,application/pdf,audio/*"
                    multiple
                    onChange={handleFileChange}
                />
            </div>

            {showLinkInput && (
                <form onSubmit={handleLinkSubmit} className={`mb-4 ${bgCard} p-3 rounded-lg border ${border}`}>
                    <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="Paste YouTube or Web URL..."
                        className={`w-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'} border ${border} rounded p-2 text-sm ${textMain} mb-2 focus:ring-1 focus:ring-muse-500 outline-none`}
                        autoFocus
                    />
                    <button type="submit" className="w-full bg-muse-600 hover:bg-muse-500 text-white text-xs py-1.5 rounded font-medium shadow-sm">
                        Add Link
                    </button>
                </form>
            )}

            <div className="grid grid-cols-2 gap-3">
                {assets.length === 0 && (
                    <div className={`col-span-2 py-8 text-center ${textSec} text-xs border border-dashed ${isDark ? 'border-gray-700' : 'border-gray-300'} rounded-lg opacity-70`}>
                        No assets yet. <br />Upload media or links.
                    </div>
                )}
                {assets.map(asset => (
                    <div key={asset.id} className={`relative group rounded-lg overflow-hidden border ${border} ${bgCard} aspect-square flex flex-col shadow-sm transition-all hover:scale-[1.02]`}>
                        {asset.type === 'image' && (
                            <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                        )}
                        {asset.type === 'video' && (
                            <video src={asset.url} className="w-full h-full object-cover" />
                        )}
                        {asset.type === 'pdf' && (
                            <div className={`w-full h-full flex flex-col items-center justify-center ${bgCard} text-red-400 p-2 text-center`}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                                <span className={`text-[10px] break-words line-clamp-2 ${textMain}`}>{asset.name}</span>
                            </div>
                        )}
                        {asset.type === 'audio' && (
                            <div className={`w-full h-full flex flex-col items-center justify-center ${bgCard} text-purple-400 p-2 text-center`}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                </svg>
                                <span className={`text-[10px] break-words line-clamp-2 ${textMain}`}>{asset.name}</span>
                                <audio src={asset.url} controls className="w-full h-6 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                        {asset.type === 'link' && (
                            <div className={`w-full h-full flex flex-col items-center justify-center ${bgCard} text-muse-400 p-2 text-center`}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                </svg>
                                <span className={`text-[10px] break-words line-clamp-2 ${textMain}`}>{asset.name}</span>
                            </div>
                        )}

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none group-hover:pointer-events-auto">
                            <p className="text-white text-[10px] truncate mb-1">{asset.name}</p>
                            <div className="flex gap-2 justify-end">
                                {/* Download Button */}
                                <a
                                    href={asset.url}
                                    download={asset.name}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-gray-300 hover:text-white"
                                    title="Download"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l-3-3m0 0l3-3m-3 3h7.5" />
                                    </svg>
                                </a>
                                {/* Delete Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }}
                                    className="text-red-400 hover:text-red-300"
                                    title="Delete"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AssetLibrary;