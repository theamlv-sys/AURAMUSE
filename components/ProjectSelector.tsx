import React, { useState } from 'react';
import { ProjectType, SavedProject, ViewMode, Asset, UsageStats, SubscriptionTier } from '../types';
import AssetLibrary from './AssetLibrary';

interface ProjectSelectorProps {
  view: ViewMode;
  onNavigate: (mode: ViewMode) => void;
  onSelect: (type: ProjectType) => void;
  onLoadProject: (project: SavedProject) => void;
  savedProjects: SavedProject[];
  assets: Asset[];
  onUpload: (files: FileList) => void;
  onAddLink: (url: string) => void;
  onDeleteAsset: (id: string) => void;
  onDeleteProject: (id: string) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  usage: UsageStats;
  userTier: SubscriptionTier;
}

// --- ICONS (Inline) ---
const BookOpenIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>;
const ClapperboardIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20.2 6 3 11l-.9-2.4c-.5-1.1.2-2.3 1.3-2.8l3.2-1.4c1.1-.5 2.3.2 2.8 1.3l.9 2.4" /><path d="m8.8 14 1.4 3.6" /><path d="M4 22h14a2 2 0 0 0 2-2V7.5L5.5 13.5A2 2 0 0 0 4 15.5V22z" /><path d="M2 13.5V11" /></svg>;
const SparklesIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M9 3v4" /><path d="M7 1v8" /></svg>;
const MailIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
const GraduationCapIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>;
const CpuIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" /></svg>;
const MegaphoneIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>;
const TvIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="15" x="2" y="7" rx="2" ry="2" /><polyline points="17 2 12 7 7 2" /></svg>;
const SmartphoneIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>;
const VideoIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>;
const MusicIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
const LightbulbIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.4 1.5-3.8 0-3.2-2.7-5.7-6-5.7s-6 2.5-6 5.7c0 1.4.5 2.8 1.5 3.8.8.8 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>;
const HomeIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
const ClockIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const FolderIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /></svg>;
const SettingsIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.35a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>;
const ChevronLeftIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m15 18-6-6 6-6" /></svg>;
const ChevronRightIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6" /></svg>;
const ArrowRightIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>;
const TrendingUpIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
const TrendingDownIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>;
const TrashIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>;
const WalletIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>;
const CreditCardIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>;
const ActivityIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;

// --- CATEGORY DEFINITIONS ---
const CATEGORIES = {
  NARRATIVE: {
    label: 'Narrative',
    models: [
      { type: ProjectType.NOVEL, title: 'Novel', desc: 'Deep POV, complex plots, immersive storytelling.', icon: <BookOpenIcon /> },
      { type: ProjectType.SCREENPLAY, title: 'Screenplay', desc: 'Industry standard format for Film & TV.', icon: <ClapperboardIcon /> },
      { type: ProjectType.CHILDRENS_BOOK, title: "Children's Book", desc: 'Whimsical tales for young minds.', icon: <SparklesIcon /> },
    ]
  },
  PROFESSIONAL: {
    label: 'Professional',
    models: [
      { type: ProjectType.EMAIL, title: 'Pro Email', desc: 'Persuasive, clear, and high-impact communication.', icon: <MailIcon /> },
      { type: ProjectType.ESSAY, title: 'Essay / Report', desc: 'Academic rigor with structured arguments.', icon: <GraduationCapIcon /> },
      { type: ProjectType.TECHNICAL, title: 'Technical Docs', desc: 'Manuals, API docs, and whitepapers.', icon: <CpuIcon /> },
    ]
  },
  MARKETING: {
    label: 'Marketing / Media',
    models: [
      { type: ProjectType.AD, title: 'Ad Copy', desc: 'High-conversion copy for FB, Google & Print.', icon: <MegaphoneIcon /> },
      { type: ProjectType.COMMERCIAL, title: 'Commercial Script', desc: 'Visual/Audio spots for TV & Digital.', icon: <TvIcon /> },
      { type: ProjectType.SOCIAL_MEDIA, title: 'Social Media', desc: 'Viral hooks, threads, and captions.', icon: <SmartphoneIcon /> },
    ]
  },
  CREATIVE: {
    label: 'Creative Suite',
    models: [
      { type: ProjectType.YOUTUBE, title: 'YouTube Script', desc: 'Engagement-focused video essays & vlogs.', icon: <VideoIcon /> },
      { type: ProjectType.LYRICS, title: 'Lyrics & Poetry', desc: 'Songwriting, rhyme schemes, and flow.', icon: <MusicIcon /> },
      { type: ProjectType.GENERAL, title: 'General Creative', desc: 'Freestyle brainstorming canvas.', icon: <LightbulbIcon /> },
    ]
  }
};

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  view,
  onNavigate,
  onSelect,
  onLoadProject,
  savedProjects,
  assets,
  onUpload,
  onAddLink,
  onDeleteAsset,
  onDeleteProject,
  theme,
  setTheme,
  usage,
  userTier
}) => {
  const [activeCategory, setActiveCategory] = useState<keyof typeof CATEGORIES>('NARRATIVE');
  const [settingsTab, setSettingsTab] = useState<'APPEARANCE' | 'BILLING'>('APPEARANCE');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  // Helper for dynamic classes
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-[#050508]' : 'bg-gray-50';
  const sidebarColor = isDark ? 'bg-[#0a0a0f]' : 'bg-white';
  const borderColor = isDark ? 'border-[#1a1a20]' : 'border-gray-200';
  const textColor = isDark ? 'text-gray-200' : 'text-gray-900';
  const subTextColor = isDark ? 'text-gray-500' : 'text-gray-500';
  const cardBg = isDark ? 'bg-[#0e0e12]' : 'bg-white';

  return (
    <div className={`flex h-screen ${bgColor} ${textColor} font-sans selection:bg-muse-500/30 transition-colors duration-500`}>

      {/* --- SIDEBAR --- */}
      <div className={`flex-shrink-0 ${sidebarColor} border-r ${borderColor} transition-all duration-500 ease-spring ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className={`h-20 flex items-center justify-center border-b ${borderColor}`}>
            {isSidebarOpen ? (
              <h1 className="text-2xl font-serif font-bold tracking-tight bg-gradient-to-r from-muse-200 to-muse-600 bg-clip-text text-transparent">MUSE</h1>
            ) : (
              <span className="text-2xl font-serif font-bold text-muse-500">M</span>
            )}
          </div>

          {/* User Profile Snippet */}
          <div className={`p-4 border-b ${borderColor}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-muse-500 to-purple-600 p-[1px]">
                <div className={`w-full h-full rounded-full ${sidebarColor} flex items-center justify-center text-xs font-bold ${textColor}`}>JJ</div>
              </div>
              {isSidebarOpen && (
                <div className="overflow-hidden">
                  <div className={`text-sm font-bold ${textColor} truncate`}>John Jones</div>
                  <div className="text-[10px] text-muse-400 uppercase tracking-wider font-bold">Showrunner</div>
                </div>
              )}
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex-1 py-6 space-y-2 px-3">
            <SidebarItem
              icon={<HomeIcon />}
              label="Home"
              active={view === 'HOME'}
              onClick={() => onNavigate('HOME')}
              isSidebarOpen={isSidebarOpen}
              theme={theme}
            />
            <SidebarItem
              icon={<ClockIcon />}
              label="Recent Projects"
              active={view === 'PROJECTS'}
              onClick={() => onNavigate('PROJECTS')}
              isSidebarOpen={isSidebarOpen}
              theme={theme}
            />
            <SidebarItem
              icon={<FolderIcon />}
              label="Asset Library"
              active={view === 'ASSETS'}
              onClick={() => onNavigate('ASSETS')}
              isSidebarOpen={isSidebarOpen}
              theme={theme}
            />
          </div>

          {/* Bottom Actions */}
          <div className={`p-4 border-t ${borderColor} space-y-2`}>
            <SidebarItem
              icon={<SettingsIcon />}
              label="Settings"
              active={view === 'SETTINGS'}
              onClick={() => onNavigate('SETTINGS')}
              isSidebarOpen={isSidebarOpen}
              theme={theme}
            />
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className={`w-full p-2 flex items-center justify-center ${subTextColor} hover:${textColor} transition-colors`}>
              {isSidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* --- MAIN STAGE --- */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Background Ambience */}
        {isDark && (
          <>
            <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-muse-900/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[500px] bg-purple-900/5 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/4"></div>
          </>
        )}

        {/* Header */}
        <header className={`h-20 flex justify-between items-center px-8 border-b ${borderColor} ${isDark ? 'backdrop-blur-sm' : 'bg-white/50 backdrop-blur-sm'} z-10`}>
          <div>
            <h2 className={`text-xl ${textColor} font-medium`}>
              {view === 'HOME' && "Good Evening, John."}
              {view === 'PROJECTS' && "Recent Projects"}
              {view === 'ASSETS' && "Asset Library"}
              {view === 'SETTINGS' && "Settings"}
            </h2>
            <p className={`text-xs ${subTextColor}`}>
              {view === 'HOME' && "Ready to create your next masterpiece?"}
              {view === 'PROJECTS' && "Pick up where you left off."}
              {view === 'ASSETS' && "Manage your multimedia."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-1.5 rounded-full ${isDark ? 'bg-[#1a1a20] border-[#2a2a30]' : 'bg-white border-gray-200'} border text-xs text-gray-400 flex items-center gap-2 shadow-sm`}>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Systems Nominal
            </div>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-8 z-10 custom-scrollbar">

          {/* VIEW: HOME */}
          {view === 'HOME' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <StatCard label="Words Written" value="24,592" trend="+12%" theme={theme} />
                <StatCard label="Projects Created" value={savedProjects.length.toString()} trend="+3" theme={theme} />
                <StatCard label="Generation Time" value="4.2s" trend="-0.5s" positive theme={theme} />
              </div>

              <div className="mb-6 flex items-end justify-between">
                <h3 className={`text-2xl font-bold ${textColor} tracking-tight`}>The Studio</h3>
                <div className={`flex ${isDark ? 'bg-[#1a1a20]' : 'bg-gray-100'} p-1 rounded-lg`}>
                  {Object.keys(CATEGORIES).map((key) => {
                    const cat = CATEGORIES[key as keyof typeof CATEGORIES];
                    const isActive = activeCategory === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveCategory(key as any)}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-300 ${isActive ? 'bg-muse-600 text-white shadow-lg shadow-muse-900/20' : `${subTextColor} hover:${textColor}`}`}
                      >
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 animate-[fade-in-up_0.5s_ease-out]">
                {CATEGORIES[activeCategory].models.map((model) => (
                  <button
                    key={model.type}
                    onClick={() => onSelect(model.type)}
                    className={`group relative h-64 ${cardBg} border ${borderColor} rounded-2xl p-6 text-left transition-all duration-300 hover:border-muse-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-muse-500/10 overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-muse-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="relative z-10 flex flex-col h-full">
                      <div className={`w-12 h-12 mb-4 rounded-xl ${isDark ? 'bg-[#1a1a20]' : 'bg-gray-100'} flex items-center justify-center text-muse-500 group-hover:bg-muse-500 group-hover:text-white transition-colors duration-300 shadow-inner`}>
                        <div className="w-6 h-6">{model.icon}</div>
                      </div>

                      <h4 className={`text-xl font-bold ${textColor} mb-2 group-hover:translate-x-1 transition-transform`}>{model.title}</h4>
                      <p className={`text-sm ${subTextColor} group-hover:text-gray-400 transition-colors`}>{model.desc}</p>

                      <div className="mt-auto flex items-center text-muse-500 text-sm font-bold opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                        Initialize Agent <ArrowRightIcon className="w-4 h-4 ml-2" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* VIEW: PROJECTS */}
          {view === 'PROJECTS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedProjects.length === 0 && (
                <div className="col-span-3 text-center py-20 text-gray-500">
                  <div className="mb-4 text-4xl">📭</div>
                  Start a project in The Studio to see it here.
                </div>
              )}
              {savedProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onLoadProject(project)}
                  className={`${cardBg} border ${borderColor} rounded-xl p-5 text-left hover:border-muse-500 transition-all hover:shadow-lg group`}
                >
                  <div className="flex justify-between mb-3 items-center">
                    <span className="text-xs font-bold text-muse-500 px-2 py-1 bg-muse-500/10 rounded uppercase tracking-wider">{project.type}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${subTextColor}`}>{new Date(project.lastModified).toLocaleDateString()}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project.id);
                        }}
                        className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-red-500/20 text-gray-500' : 'hover:bg-red-50 text-gray-400'} hover:text-red-500 transition-all`}
                        title="Delete Project"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className={`text-lg font-bold ${textColor} mb-2`}>{project.title}</h3>
                  <p className={`text-xs ${subTextColor} line-clamp-3 mb-4`}>{project.previewSnippet}</p>
                  <div className={`text-xs ${subTextColor} group-hover:text-muse-500 transition-colors flex items-center gap-1`}>
                    Open Project <ArrowRightIcon className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* VIEW: ASSETS */}
          {view === 'ASSETS' && (
            <div className={`${cardBg} border ${borderColor} rounded-xl overflow-hidden h-[calc(100vh-160px)] shadow-sm`}>
              <AssetLibrary
                assets={assets}
                onUpload={onUpload}
                onAddLink={onAddLink}
                onDelete={onDeleteAsset}
              />
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {view === 'SETTINGS' && (
            <div className="max-w-4xl animate-[fade-in-up_0.5s_ease-out] flex flex-col gap-6">
              {/* Tab Switcher */}
              <div className="flex gap-4 border-b border-[#1a1a20] pb-2">
                <button
                  onClick={() => setSettingsTab('APPEARANCE')}
                  className={`px-4 py-2 text-sm font-bold transition-all ${settingsTab === 'APPEARANCE' ? 'text-muse-500 border-b-2 border-muse-500' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Appearance
                </button>
                <button
                  onClick={() => setSettingsTab('BILLING')}
                  className={`px-4 py-2 text-sm font-bold transition-all ${settingsTab === 'BILLING' ? 'text-muse-500 border-b-2 border-muse-500' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Billing & Usage
                </button>
              </div>

              {settingsTab === 'APPEARANCE' && (
                <div className={`${cardBg} border ${borderColor} rounded-xl p-6 shadow-sm`}>
                  <h3 className={`text-lg font-bold ${textColor} mb-4`}>Appearance</h3>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setTheme('dark')}
                      className={`w-24 h-24 rounded-xl bg-[#050508] border-2 ${isDark ? 'border-muse-500 shadow-lg shadow-muse-500/20' : 'border-gray-800'} relative cursor-pointer transition-all hover:scale-105`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">Dark</div>
                      {isDark && <div className="absolute top-2 right-2 w-2 h-2 bg-muse-500 rounded-full"></div>}
                    </button>

                    <button
                      onClick={() => setTheme('light')}
                      className={`w-24 h-24 rounded-xl bg-white border-2 ${!isDark ? 'border-muse-500 shadow-lg shadow-muse-500/20' : 'border-gray-200'} relative cursor-pointer transition-all hover:scale-105`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-900 font-bold">Light</div>
                      {!isDark && <div className="absolute top-2 right-2 w-2 h-2 bg-muse-500 rounded-full"></div>}
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'BILLING' && (
                <div className="space-y-6">
                  {/* Credit Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`${cardBg} border ${borderColor} rounded-xl p-4 flex items-center gap-4`}>
                      <div className="w-10 h-10 rounded-full bg-muse-500/10 flex items-center justify-center text-muse-500">
                        <ActivityIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Voice Time</div>
                        <div className={`text-xl font-bold ${textColor}`}>{usage.voiceBalance.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">min</span></div>
                      </div>
                    </div>
                    <div className={`${cardBg} border ${borderColor} rounded-xl p-4 flex items-center gap-4`}>
                      <div className="w-10 h-10 rounded-full bg-muse-500/10 flex items-center justify-center text-muse-500">
                        <SparklesIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Storyboard</div>
                        <div className={`text-xl font-bold ${textColor}`}>{usage.imageBalance.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">images</span></div>
                      </div>
                    </div>
                    <div className={`${cardBg} border ${borderColor} rounded-xl p-4 flex items-center gap-4`}>
                      <div className="w-10 h-10 rounded-full bg-muse-500/10 flex items-center justify-center text-muse-500">
                        <VideoIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Veo 3.1</div>
                        <div className={`text-xl font-bold ${textColor}`}>{usage.videoBalance.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">videos</span></div>
                      </div>
                    </div>
                    <div className={`${cardBg} border ${borderColor} rounded-xl p-4 flex items-center gap-4`}>
                      <div className="w-10 h-10 rounded-full bg-muse-500/10 flex items-center justify-center text-muse-500">
                        <ActivityIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Audio Synth</div>
                        <div className={`text-xl font-bold ${textColor}`}>{usage.audioBalance.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">chars</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction History */}
                  <div className={`${cardBg} border ${borderColor} rounded-xl p-6`}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className={`text-lg font-bold ${textColor} flex items-center gap-2`}>
                        <ActivityIcon className="w-5 h-5 text-muse-500" /> Usage History
                      </h3>
                      <button className="text-xs text-muse-500 hover:text-muse-400 font-bold uppercase">Export CSV</button>
                    </div>

                    <div className="space-y-2">
                      {usage.history.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 italic">No transactions found yet. Use tools to see usage history.</div>
                      ) : (
                        usage.history.map((tx: any) => (
                          <div key={tx.id} className={`flex items-center justify-between p-4 rounded-lg bg-[#111118] border border-white/5 hover:border-white/10 transition-all`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tx.type === 'purchase' ? 'bg-green-500/10 text-green-500' : 'bg-muse-500/10 text-muse-500'}`}>
                                {tx.item === 'video' && <VideoIcon className="w-5 h-5" />}
                                {tx.item === 'image' && <SparklesIcon className="w-5 h-5" />}
                                {tx.item === 'audio' && <MusicIcon className="w-5 h-5" />}
                                {tx.item === 'voice' && <ActivityIcon className="w-5 h-5" />}
                                {tx.item === 'pack' && <WalletIcon className="w-5 h-5" />}
                              </div>
                              <div>
                                <div className={`text-sm font-bold ${textColor}`}>{tx.description}</div>
                                <div className="text-[10px] text-gray-500 font-medium uppercase">{new Date(tx.timestamp).toLocaleString()}</div>
                              </div>
                            </div>
                            <div className={`text-sm font-black ${tx.amount > 0 ? 'text-green-500' : textColor}`}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setProjectToDelete(null)}
          ></div>
          <div className={`relative w-full max-w-md ${cardBg} border ${borderColor} rounded-2xl p-8 shadow-2xl animate-zoom-in`}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
                <TrashIcon className="w-8 h-8" />
              </div>
              <h3 className={`text-2xl font-bold ${textColor} mb-2`}>Delete Project?</h3>
              <p className={`text-sm ${subTextColor} mb-8`}>
                This action cannot be undone. All content within this project will be permanently removed from your library.
              </p>
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setProjectToDelete(null)}
                  className={`flex-1 py-3 rounded-xl font-bold ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-all`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteProject(projectToDelete);
                    setProjectToDelete(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 transition-all"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// --- SUB COMPONENTS ---

const SidebarItem = ({ icon, label, active, onClick, isSidebarOpen, theme }: any) => {
  const isDark = theme === 'dark';
  const activeClass = isDark ? 'bg-muse-500/10 text-muse-400 border-muse-500/20' : 'bg-muse-50 text-muse-600 border-muse-200';
  const inactiveClass = isDark ? 'text-gray-400 hover:bg-[#1a1a20] hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border border-transparent ${active ? activeClass + ' border' : inactiveClass}`}
    >
      <div className="w-5 h-5 flex-shrink-0">{icon}</div>
      {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all">{label}</span>}
    </button>
  );
};

const StatCard = ({ label, value, trend, positive, theme }: any) => {
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-[#0e0e12]' : 'bg-white';
  const borderColor = isDark ? 'border-[#1f1f26]' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';

  return (
    <div className={`${cardBg} border ${borderColor} rounded-xl p-5 relative overflow-hidden group hover:border-muse-500 transition-all shadow-sm`}>
      <div className="relative z-10">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-bold">{label}</div>
        <div className={`text-3xl font-bold ${textColor} mb-2`}>{value}</div>
        <div className={`text-xs font-medium inline-flex items-center gap-1 ${positive === false ? 'text-red-400' : 'text-green-500'}`}>
          {positive === false ? <TrendingDownIcon className="w-3 h-3" /> : <TrendingUpIcon className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-muse-500/5 rounded-full blur-2xl group-hover:bg-muse-500/10 transition-colors"></div>
    </div>
  );
};

export default ProjectSelector;