import React, { useState, useEffect } from 'react';
import ProjectSelector from './components/ProjectSelector';
import Editor from './components/Editor';
import ChatInterface from './components/ChatInterface';
import AssetLibrary from './components/AssetLibrary';
import { ProjectType, Asset } from './types';

const App: React.FC = () => {
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'assets'>('chat');

  const handleProjectSelect = (type: ProjectType) => {
    setProjectType(type);
    setTitle(`My ${type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}`);
  };

  const handleFileUpload = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
            const base64String = (e.target.result as string).split(',')[1];
            let type: Asset['type'] = 'image';
            if (file.type.startsWith('video')) type = 'video';
            if (file.type === 'application/pdf') type = 'pdf';

            const newAsset: Asset = {
                id: Date.now() + Math.random().toString(),
                type: type,
                url: e.target.result as string,
                name: file.name,
                mimeType: file.type,
                base64: base64String
            };
            setAssets(prev => [...prev, newAsset]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddLink = (url: string) => {
      const newAsset: Asset = {
          id: Date.now() + Math.random().toString(),
          type: 'link',
          url: url,
          name: url,
          mimeType: 'text/plain'
      };
      setAssets(prev => [...prev, newAsset]);
  }

  const handleAppendContent = (text: string) => {
    setContent(prev => prev + (prev ? '\n\n' : '') + text);
  };

  const handleReplaceContent = (text: string) => {
    setContent(text);
  };

  if (!projectType) {
    return <ProjectSelector onSelect={handleProjectSelect} />;
  }

  return (
    <div className="flex h-screen w-screen bg-gray-950 overflow-hidden text-gray-200 font-sans">
      {/* Sidebar Nav (Minimal) */}
      <div className="w-16 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-6 gap-6 z-20">
        <div 
            onClick={() => setProjectType(null)}
            className="w-10 h-10 bg-muse-600 rounded-lg flex items-center justify-center cursor-pointer hover:bg-muse-500 text-white font-serif font-bold text-xl"
        >
            M
        </div>
        
        <div className="flex flex-col gap-4 mt-8">
            <button 
                onClick={() => { setShowRightPanel(true); setActiveTab('chat'); }}
                className={`p-2 rounded-lg transition-colors ${activeTab === 'chat' && showRightPanel ? 'bg-gray-800 text-muse-400' : 'text-gray-500 hover:text-gray-300'}`}
                title="AI Assistant"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
            </button>
            <button 
                onClick={() => { setShowRightPanel(true); setActiveTab('assets'); }}
                className={`p-2 rounded-lg transition-colors ${activeTab === 'assets' && showRightPanel ? 'bg-gray-800 text-muse-400' : 'text-gray-500 hover:text-gray-300'}`}
                title="Multimedia Library"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
            </button>
            <button 
                onClick={() => setShowRightPanel(!showRightPanel)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-300 transition-colors mt-auto"
                title="Toggle Panel"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                </svg>
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className={`flex-1 transition-all duration-300 ${showRightPanel ? 'mr-0' : 'mr-0'}`}>
          <Editor 
            content={content} 
            onChange={setContent} 
            title={title} 
            onTitleChange={setTitle} 
          />
        </div>

        {/* Right Panel */}
        <div className={`${showRightPanel ? 'w-[450px]' : 'w-0'} transition-all duration-300 ease-in-out border-l border-gray-800 bg-gray-900 flex flex-col`}>
            {activeTab === 'chat' ? (
                <ChatInterface 
                    projectType={projectType} 
                    assets={assets}
                    onAddAsset={(a) => setAssets(prev => [...prev, a])}
                    onUpdateContent={handleAppendContent}
                    onReplaceContent={handleReplaceContent}
                    editorContent={content}
                />
            ) : (
                <AssetLibrary 
                    assets={assets}
                    onUpload={handleFileUpload}
                    onAddLink={handleAddLink}
                    onDelete={(id) => setAssets(prev => prev.filter(a => a.id !== id))}
                />
            )}
        </div>
      </div>
    </div>
  );
};

export default App;