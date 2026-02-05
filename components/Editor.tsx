import React from 'react';

interface EditorProps {
  content: string;
  onChange: (text: string) => void;
  title: string;
  onTitleChange: (text: string) => void;
}

const Editor: React.FC<EditorProps> = ({ content, onChange, title, onTitleChange }) => {
  return (
    <div className="h-full flex flex-col bg-gray-900">
        <div className="p-8 pb-4 max-w-4xl mx-auto w-full">
            <input 
                type="text" 
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Untitled Project"
                className="w-full bg-transparent text-4xl font-serif font-bold text-gray-100 placeholder-gray-600 focus:outline-none"
            />
        </div>
        <div className="flex-1 overflow-y-auto px-8 pb-8">
            <textarea
                value={content}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Start writing your masterpiece..."
                className="w-full h-full min-h-[80vh] max-w-4xl mx-auto bg-transparent text-gray-300 text-lg leading-relaxed font-serif focus:outline-none resize-none placeholder-gray-700"
                spellCheck={false}
            />
        </div>
    </div>
  );
};

export default Editor;
