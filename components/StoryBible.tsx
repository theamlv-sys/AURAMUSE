import React, { useState } from 'react';
import { StoryBibleEntry } from '../types';

interface StoryBibleProps {
    entries: StoryBibleEntry[];
    onAdd: (entry: Omit<StoryBibleEntry, 'id' | 'projectType'>) => void;
    onDelete: (id: string) => void;
}

const StoryBible: React.FC<StoryBibleProps> = ({ entries, onAdd, onDelete }) => {
    const [activeCategory, setActiveCategory] = useState<'character' | 'world' | 'style'>('character');
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const handleAdd = () => {
        if (!newName.trim() || !newDesc.trim()) return;
        
        onAdd({
            category: activeCategory,
            name: newName,
            description: newDesc
        });
        
        setNewName('');
        setNewDesc('');
    };

    const filtered = entries.filter(e => e.category === activeCategory);

    return (
        <div className="flex flex-col h-full bg-gray-900 text-gray-200">
            <div className="p-4 border-b border-gray-800">
                <h3 className="font-serif font-bold text-lg mb-2 text-white flex items-center gap-2">
                    <span className="text-muse-500">📜</span> Story Bible
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                    The AI "remembers" everything here. Data is saved specific to this project type.
                </p>
                <div className="flex bg-gray-800 rounded-lg p-1">
                    {['character', 'world', 'style'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat as any)}
                            className={`flex-1 text-xs py-1.5 rounded capitalize transition-all ${activeCategory === cat ? 'bg-muse-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filtered.map(entry => (
                    <div key={entry.id} className="bg-gray-800 border border-gray-700 p-3 rounded-lg group relative">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-sm text-white">{entry.name}</h4>
                            <button 
                                onClick={() => onDelete(entry.id)}
                                className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                title="Delete Entry"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">{entry.description}</p>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="text-center py-8 text-gray-600 text-xs italic">
                        No {activeCategory}s defined yet for this project type.
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-850">
                <input 
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white mb-2 focus:ring-1 focus:ring-muse-500 outline-none"
                    placeholder={`Name (e.g. "Ethan" or "Noir Style")`}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                />
                <textarea 
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white mb-2 focus:ring-1 focus:ring-muse-500 outline-none h-20 resize-none"
                    placeholder="Description... (The AI will treat this as truth)"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                />
                <button 
                    onClick={handleAdd}
                    disabled={!newName || !newDesc}
                    className="w-full bg-gray-700 hover:bg-muse-600 disabled:opacity-50 text-white py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                >
                    + Add to Bible
                </button>
            </div>
        </div>
    );
};

export default StoryBible;