import React, { useRef, useState } from 'react';
import { Asset } from '../types';

interface AssetLibraryProps {
  assets: Asset[];
  onUpload: (files: FileList) => void;
  onAddLink: (url: string) => void;
  onDelete: (id: string) => void;
}

const AssetLibrary: React.FC<AssetLibraryProps> = ({ assets, onUpload, onAddLink, onDelete }) => {
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

  return (
    <div className="p-4 bg-gray-900 h-full border-l border-gray-800 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-300 font-semibold text-sm uppercase tracking-wider">Library</h3>
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowLinkInput(!showLinkInput)}
                    className="p-1.5 bg-gray-800 rounded hover:bg-gray-700 text-gray-300 transition-colors"
                    title="Add YouTube/Web Link"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                </button>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 bg-gray-800 rounded hover:bg-gray-700 text-gray-300 transition-colors"
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
                accept="image/*,video/*,application/pdf" 
                multiple 
                onChange={handleFileChange}
            />
        </div>

        {showLinkInput && (
            <form onSubmit={handleLinkSubmit} className="mb-4 bg-gray-800 p-3 rounded-lg border border-gray-700">
                <input 
                    type="url" 
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Paste YouTube or Web URL..."
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white mb-2 focus:ring-1 focus:ring-muse-500 outline-none"
                    autoFocus
                />
                <button type="submit" className="w-full bg-muse-600 hover:bg-muse-500 text-white text-xs py-1.5 rounded font-medium">
                    Add Link
                </button>
            </form>
        )}

        <div className="grid grid-cols-2 gap-3">
            {assets.length === 0 && (
                <div className="col-span-2 py-8 text-center text-gray-600 text-xs border border-dashed border-gray-700 rounded-lg">
                    No assets yet. <br/>Upload media or links.
                </div>
            )}
            {assets.map(asset => (
                <div key={asset.id} className="relative group rounded-lg overflow-hidden border border-gray-700 bg-gray-800 aspect-square flex flex-col">
                    {asset.type === 'image' && (
                        <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                    )}
                    {asset.type === 'video' && (
                        <video src={asset.url} className="w-full h-full object-cover" />
                    )}
                    {asset.type === 'pdf' && (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-red-400 p-2 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            <span className="text-[10px] break-words line-clamp-2">{asset.name}</span>
                        </div>
                    )}
                    {asset.type === 'link' && (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-muse-400 p-2 text-center">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                            </svg>
                            <span className="text-[10px] break-words line-clamp-2">{asset.name}</span>
                        </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <p className="text-white text-[10px] truncate mb-1">{asset.name}</p>
                        <div className="flex gap-2 justify-end">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }}
                                className="text-red-400 hover:text-red-300"
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