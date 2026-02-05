import React, { useState } from 'react';
import { Asset } from '../types';

interface VeoModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  onGenerate: (prompt: string, imageBase64?: string) => Promise<void>;
}

const VeoModal: React.FC<VeoModalProps> = ({ isOpen, onClose, assets, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const imageAssets = assets.filter(a => a.type === 'image');
  const selectedAsset = imageAssets.find(a => a.id === selectedAssetId);

  const handleSubmit = async () => {
    if (!prompt && !selectedAsset) return;
    
    setIsGenerating(true);
    try {
      await onGenerate(prompt, selectedAsset?.base64);
      onClose();
      setPrompt('');
      setSelectedAssetId(null);
    } catch (e) {
      console.error(e);
      // Error handling usually in parent
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl shadow-muse-900/20">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
              <span className="text-muse-500">🎥</span> Veo Video Studio
            </h2>
            <p className="text-gray-400 text-sm mt-1">Generate high-definition videos from text or images.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Video Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A cinematic drone shot of a cyberpunk city at night, rain falling, neon lights reflecting..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-muse-500 focus:border-transparent focus:outline-none resize-none h-32"
            />
          </div>

          {/* Image Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Reference Image (Optional)</label>
            {imageAssets.length === 0 ? (
              <div className="text-xs text-gray-500 italic p-4 border border-dashed border-gray-700 rounded-lg text-center">
                Upload images to the library to use them as references.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                {imageAssets.map(asset => (
                  <div 
                    key={asset.id}
                    onClick={() => setSelectedAssetId(selectedAssetId === asset.id ? null : asset.id)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 aspect-square group ${
                      selectedAssetId === asset.id ? 'border-muse-500 ring-2 ring-muse-500/50' : 'border-transparent hover:border-gray-600'
                    }`}
                  >
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                    {selectedAssetId === asset.id && (
                      <div className="absolute inset-0 bg-muse-500/20 flex items-center justify-center">
                        <div className="bg-muse-500 rounded-full p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isGenerating || (!prompt && !selectedAsset)}
            className="px-6 py-2 bg-muse-600 hover:bg-muse-500 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                Generate Video
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VeoModal;