import React, { useRef, useState } from 'react';
import { Asset } from '../types';
import { googleDriveService } from '../services/googleDriveService';
import { supabase } from '../services/supabaseClient';

interface AssetLibraryProps {
    assets: Asset[];
    onUpload: (files: FileList) => void;
    onAddLink: (url: string) => void;
    onDelete: (id: string) => void;
    theme: 'dark' | 'light';
    onSelect?: (asset: Asset) => void;
    selectedIds?: string[];
}

const AssetLibrary: React.FC<AssetLibraryProps> = ({ assets, onUpload, onAddLink, onDelete, theme, onSelect, selectedIds = [] }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showDrivePicker, setShowDrivePicker] = useState(false);
    const [driveFiles, setDriveFiles] = useState<any[]>([]);
    const [isLoadingDrive, setIsLoadingDrive] = useState(false);
    const [driveAuthError, setDriveAuthError] = useState(false);

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

    const handleOpenDrivePicker = async () => {
        setShowDrivePicker(true);
        setIsLoadingDrive(true);
        setDriveAuthError(false);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.provider_token) {
                const files = await googleDriveService.listMedia(session.provider_token);
                setDriveFiles(files);
            } else {
                throw new Error("No provider token found.");
            }
        } catch (e: any) {
            console.error("Drive Error:", e);
            setDriveAuthError(true);
        } finally {
            setIsLoadingDrive(false);
        }
    };

    const handleAuthorizeDrive = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                scopes: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
                queryParams: { access_type: 'offline', prompt: 'consent select_account' },
            }
        });
    };

    const handleImportMedia = async (fileId: string, fileName: string, mimeType: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.provider_token) {
                const blob = await googleDriveService.getFileBlob(session.provider_token, fileId);
                const file = new File([blob], fileName, { type: mimeType });

                // Create a DataTransfer to simulate file input
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                onUpload(dataTransfer.files);

                setShowDrivePicker(false);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to import media.");
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
                        onClick={handleOpenDrivePicker}
                        className={`p-1.5 ${btnBg} rounded transition-colors ${textMain}`}
                        title="Import from Google Drive"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M13.333 14.667v2.666h5.334v-2.666H13.333zM13.333 9.333v2.667h5.334V9.333H13.333zM8 17.333h2.667v-2.666H8v2.666zM8 12h2.667V9.333H8V12zM21.053 5.333H2.947C1.867 5.333 1.013 6.227 1.013 7.307L1 20.64c0 1.08.867 1.973 1.947 1.973h18.106c1.08 0 1.947-.893 1.947-1.973V7.307c0-1.08-.867-1.974-1.947-1.974zM16 2.667H8v2.666h8V2.667z" />
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
                {assets.map(asset => {
                    const isSelected = selectedIds.includes(asset.id);
                    return (
                        <div
                            key={asset.id}
                            onClick={() => onSelect && onSelect(asset)}
                            className={`relative group rounded-lg overflow-hidden border ${isSelected ? 'border-muse-500 border-2' : border} ${bgCard} aspect-square flex flex-col shadow-sm transition-all hover:scale-[1.02] ${onSelect ? 'cursor-pointer' : ''}`}
                        >
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
                    );
                })}
            </div>

            {/* --- GOOGLE DRIVE PICKER MODAL --- */}
            {showDrivePicker && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowDrivePicker(false)}></div>
                    <div className={`relative w-full max-w-lg ${bgCard} border ${border} rounded-2xl p-6 shadow-2xl animate-zoom-in overflow-hidden flex flex-col max-h-[70vh]`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-lg font-bold ${textMain} flex items-center gap-2`}>
                                <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M13.333 14.667v2.666h5.334v-2.666H13.333zM13.333 9.333v2.667h5.334V9.333H13.333zM8 17.333h2.667v-2.666H8v2.666zM8 12h2.667V9.333H8V12zM21.053 5.333H2.947C1.867 5.333 1.013 6.227 1.013 7.307L1 20.64c0 1.08.867 1.973 1.947 1.973h18.106c1.08 0 1.947-.893 1.947-1.973V7.307c0-1.08-.867-1.974-1.947-1.974zM16 2.667H8v2.666h8V2.667z" /></svg>
                                Import Media from Drive
                            </h3>
                            <button onClick={() => setShowDrivePicker(false)} className="text-gray-500 hover:text-white">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 p-2">
                            {isLoadingDrive ? (
                                <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-muse-500 border-t-transparent rounded-full animate-spin"></div></div>
                            ) : driveAuthError ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
                                    <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    </div>
                                    <div>
                                        <h4 className={`text-lg font-bold ${textMain}`}>Access Required</h4>
                                        <p className={`text-sm ${textSec} max-w-xs mx-auto mt-1`}>
                                            We need permission to view your Google Drive files.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleAuthorizeDrive}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-blue-500/20"
                                    >
                                        Authorize Google Drive
                                    </button>
                                </div>
                            ) : driveFiles.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">No media found (Images/Videos).</div>
                            ) : (
                                driveFiles.map(file => (
                                    <button
                                        key={file.id}
                                        onClick={() => handleImportMedia(file.id, file.name, file.mimeType)}
                                        className={`w-full text-left p-3 rounded-xl border ${isDark ? 'bg-[#111] border-gray-800 hover:border-muse-500' : 'bg-gray-50 border-gray-200 hover:border-muse-500'} transition-all flex items-center justify-between group`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {file.thumbnailLink ? (
                                                <img src={file.thumbnailLink} alt="" className="w-10 h-10 object-cover rounded-md bg-gray-800" referrerPolicy="no-referrer" />
                                            ) : (
                                                <div className="w-10 h-10 bg-gray-800 rounded-md flex items-center justify-center text-gray-500">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className={`font-bold text-sm ${textMain} truncate`}>{file.name}</div>
                                                <div className={`text-[10px] ${textSec}`}>{new Date(file.modifiedTime).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-muse-500 bg-muse-500/10 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            Import
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetLibrary;