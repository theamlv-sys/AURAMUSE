import React, { useState, useEffect } from 'react';
import ProjectSelector from './components/ProjectSelector';
import Editor from './components/Editor';
import ChatInterface from './components/ChatInterface';
import AssetLibrary from './components/AssetLibrary';
import TTSStudio from './components/TTSStudio';
import StoryBible from './components/StoryBible';
import SubscriptionModal from './components/SubscriptionModal';
import LandingPage from './components/LandingPage';
import { ProjectType, Asset, TTSState, VoiceName, StoryBibleEntry, VersionSnapshot, SubscriptionTier, UsageStats, TIERS } from './types';

const App: React.FC = () => {
  // --- CORE STATE ---
  const [hasAccess, setHasAccess] = useState(false); // New State for Gating
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  
  // --- UI STATE ---
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'assets' | 'audio' | 'bible'>('chat');
  const [showSubModal, setShowSubModal] = useState(false);

  // --- BUSINESS STATE ---
  const [userTier, setUserTier] = useState<SubscriptionTier>('FREE');
  const [usage, setUsage] = useState<UsageStats>({ videosGenerated: 0, imagesGenerated: 0, audioMinutesGenerated: 0 });

  // --- CONTEXT STATE (Global Arrays, filtered in render) ---
  const [storyBible, setStoryBible] = useState<StoryBibleEntry[]>([]);
  const [versionHistory, setVersionHistory] = useState<VersionSnapshot[]>([]);

  // --- TTS STATE ---
  const [ttsState, setTtsState] = useState<TTSState>({
      text: '',
      mode: 'single',
      selectedSingleVoice: 'Zephyr',
      isDirectorMode: false,
      directorConfig: { audioProfile: '', scene: '', style: '', pacing: '', accent: '' },
      characters: [],
      direction: '',
      autoGenerateTrigger: false
  });

  // Handle Entrance from Landing Page
  const handleTierSelection = (tier: SubscriptionTier) => {
      setUserTier(tier);
      setHasAccess(true);
  };

  const handleProjectSelect = (type: ProjectType) => {
    setProjectType(type);
    setTitle(`My ${type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}`);
    setContent(''); // Clear editor for new project type or load from persistence
  };

  const checkLimit = (type: 'video' | 'image' | 'audio'): boolean => {
      const limits = TIERS[userTier].limits;
      if (type === 'video') {
          if (!limits.veo || usage.videosGenerated >= limits.videos) {
              setShowSubModal(true);
              return false;
          }
      }
      if (type === 'image') {
          if (usage.imagesGenerated >= limits.images) {
              setShowSubModal(true);
              return false;
          }
      }
      return true;
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
            if (file.type.startsWith('audio')) type = 'audio';

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

  // --- VERSION HISTORY HANDLERS ---

  const handleSnapshot = () => {
      if (!projectType) return;
      const snap: VersionSnapshot = {
          id: Date.now().toString(),
          projectType: projectType,
          timestamp: Date.now(),
          content: content,
          description: `Snapshot ${versionHistory.filter(v => v.projectType === projectType).length + 1}`
      };
      setVersionHistory(prev => [...prev, snap]);
  };

  const handleDeleteSnapshot = (id: string) => {
      setVersionHistory(prev => prev.filter(v => v.id !== id));
  };

  // --- STORY BIBLE HANDLERS ---

  const handleAddBibleEntry = (entry: Omit<StoryBibleEntry, 'id' | 'projectType'>) => {
      if (!projectType) return;
      const newEntry: StoryBibleEntry = {
          ...entry,
          id: Date.now().toString(),
          projectType: projectType
      };
      setStoryBible(prev => [...prev, newEntry]);
  };

  const handleDeleteBibleEntry = (id: string) => {
      setStoryBible(prev => prev.filter(e => e.id !== id));
  };

  const handleAppendContent = (text: string) => {
    handleSnapshot(); // Save before auto-change
    setContent(prev => prev + (prev ? '\n\n' : '') + text);
  };

  const handleReplaceContent = (text: string) => {
    handleSnapshot(); // Save before auto-change
    setContent(text);
  };

  const handleConfigureTTS = (newState: Partial<TTSState>) => {
      setTtsState(prev => ({ ...prev, ...newState }));
      setActiveTab('audio');
      setShowRightPanel(true);
  };

  // Usage incrementers wrapped for child components
  const trackUsage = (type: 'video' | 'image') => {
      setUsage(prev => ({
          ...prev,
          videosGenerated: type === 'video' ? prev.videosGenerated + 1 : prev.videosGenerated,
          imagesGenerated: type === 'image' ? prev.imagesGenerated + 1 : prev.imagesGenerated
      }));
  };

  // --- RENDER FLOW ---

  // 1. Landing Page (Subscription Gate)
  if (!hasAccess) {
      return <LandingPage onSelectTier={handleTierSelection} />;
  }

  // 2. Project Selector
  if (!projectType) {
    return <ProjectSelector onSelect={handleProjectSelect} />;
  }

  // 3. Main App Workspace
  const currentStoryBible = storyBible.filter(e => e.projectType === projectType);
  const currentVersionHistory = versionHistory.filter(v => v.projectType === projectType);

  return (
    <div className="flex h-screen w-screen bg-gray-950 overflow-hidden text-gray-200 font-sans">
      <SubscriptionModal 
        isOpen={showSubModal} 
        onClose={() => setShowSubModal(false)}
        currentTier={userTier}
        onUpgrade={(tier) => { setUserTier(tier); setShowSubModal(false); }}
      />

      {/* Sidebar Nav */}
      <div className="w-16 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-6 gap-6 z-20">
        <div 
            onClick={() => setProjectType(null)}
            className="w-10 h-10 bg-muse-600 rounded-lg flex items-center justify-center cursor-pointer hover:bg-muse-500 text-white font-serif font-bold text-xl"
        >
            M
        </div>
        
        <div className="flex flex-col gap-4 mt-8">
            <NavButton active={activeTab === 'chat' && showRightPanel} onClick={() => { setShowRightPanel(true); setActiveTab('chat'); }} icon="sparkles" tooltip="AI Assistant" />
            <NavButton active={activeTab === 'bible' && showRightPanel} onClick={() => { setShowRightPanel(true); setActiveTab('bible'); }} icon="book" tooltip="Story Bible" />
            <NavButton active={activeTab === 'assets' && showRightPanel} onClick={() => { setShowRightPanel(true); setActiveTab('assets'); }} icon="library" tooltip="Multimedia Library" />
            <NavButton active={activeTab === 'audio' && showRightPanel} onClick={() => { setShowRightPanel(true); setActiveTab('audio'); }} icon="mic" tooltip="Audio Studio" />
            
            <button 
                onClick={() => setShowRightPanel(!showRightPanel)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-300 transition-colors mt-auto mb-4"
                title="Toggle Panel"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                </svg>
            </button>
            <button
                onClick={() => setShowSubModal(true)}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border-2 ${userTier === 'FREE' ? 'bg-gray-800 text-gray-400 border-gray-600' : 'bg-gradient-to-br from-muse-600 to-purple-600 text-white border-white'}`}
                title="Subscription"
            >
                {userTier === 'FREE' ? 'UP' : userTier[0]}
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
            projectType={projectType}
            versionHistory={currentVersionHistory}
            onSnapshot={handleSnapshot}
            onRestoreVersion={setContent}
            onDeleteSnapshot={handleDeleteSnapshot}
          />
        </div>

        {/* Right Panel */}
        <div className={`${showRightPanel ? 'w-[450px]' : 'w-0'} transition-all duration-300 ease-in-out border-l border-gray-800 bg-gray-900 flex flex-col`}>
            {activeTab === 'chat' && (
                <ChatInterface 
                    projectType={projectType} 
                    assets={assets}
                    onAddAsset={(a) => setAssets(prev => [...prev, a])}
                    onUpdateContent={handleAppendContent}
                    onReplaceContent={handleReplaceContent}
                    editorContent={content}
                    onConfigureTTS={handleConfigureTTS}
                    checkLimit={checkLimit}
                    trackUsage={trackUsage}
                    storyBible={currentStoryBible}
                />
            )}
            {activeTab === 'bible' && (
                <StoryBible 
                    entries={currentStoryBible} 
                    onAdd={handleAddBibleEntry}
                    onDelete={handleDeleteBibleEntry}
                />
            )}
            {activeTab === 'assets' && (
                <AssetLibrary 
                    assets={assets}
                    onUpload={handleFileUpload}
                    onAddLink={handleAddLink}
                    onDelete={(id) => setAssets(prev => prev.filter(a => a.id !== id))}
                />
            )}
            {activeTab === 'audio' && (
                <TTSStudio 
                    editorContent={content}
                    onAddAsset={(a) => setAssets(prev => [...prev, a])}
                    ttsState={ttsState}
                    onUpdateState={handleConfigureTTS}
                />
            )}
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, tooltip }: any) => (
    <button 
        onClick={onClick}
        className={`p-2 rounded-lg transition-colors ${active ? 'bg-gray-800 text-muse-400' : 'text-gray-500 hover:text-gray-300'}`}
        title={tooltip}
    >
        {icon === 'sparkles' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>}
        {icon === 'book' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>}
        {icon === 'library' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>}
        {icon === 'mic' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>}
    </button>
);

export default App;