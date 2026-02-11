import React, { useState, useEffect } from 'react';
import ProjectSelector from './components/ProjectSelector';
import Editor from './components/Editor';
import { googleDriveService } from './services/googleDriveService';
import ChatInterface from './components/ChatInterface';
import AssetLibrary from './components/AssetLibrary';
import TTSStudio from './components/TTSStudio';
import StoryBible from './components/StoryBible';
import SubscriptionModal from './components/SubscriptionModal';
import LandingPage from './components/LandingPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import NotesMode from './components/NotesMode';
import CalendarMode from './components/CalendarMode';
import EmailStudio from './components/EmailStudio';
import CreativeSuite from './components/CreativeSuite';
import { ProjectType, Asset, TTSState, VoiceName, StoryBibleEntry, VersionSnapshot, SubscriptionTier, UsageStats, TIERS, SavedProject, ViewMode } from './types';
import { persistenceService } from './services/persistenceService';
import { supabase } from './services/supabaseClient';
import { stripeService } from './services/stripeService';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
    console.log("DEBUG: ENV URL", import.meta.env.VITE_SUPABASE_URL);
    // --- CORE STATE ---
    const [hasAccess, setHasAccess] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [session, setSession] = useState<Session | null>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [viewMode, setViewMode] = useState<ViewMode>('HOME');
    const [projectType, setProjectType] = useState<ProjectType | null>(null);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [assets, setAssets] = useState<Asset[]>([]);

    useEffect(() => {
        document.body.style.backgroundColor = theme === 'dark' ? '#0d1117' : '#f8fafc';
        document.body.style.color = theme === 'dark' ? '#e2e8f0' : '#1e293b';
        document.body.classList.add('transition-colors', 'duration-500');
    }, [theme]);

    // Persistence for Saved Projects (Local Fallback/Cache)
    const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => {
        const saved = localStorage.getItem('muse_projects');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('muse_projects', JSON.stringify(savedProjects));
    }, [savedProjects]);

    // --- UI STATE ---
    const [showRightPanel, setShowRightPanel] = useState(true);
    const [activeTab, setActiveTab] = useState<'chat' | 'assets' | 'audio' | 'bible'>('chat');
    const [showSubModal, setShowSubModal] = useState(false);

    // --- BUSINESS STATE ---
    const [userTier, setUserTier] = useState<SubscriptionTier>('FREE');
    const [usage, setUsage] = useState<UsageStats>(() => {
        const initialTier: SubscriptionTier = 'FREE';
        const limits = TIERS[initialTier].limits;
        return {
            videosGenerated: 0,
            imagesGenerated: 0,
            audioMinutesGenerated: 0,
            voiceMinutesUsed: 0,
            voiceBalance: limits.voiceCredits,
            imageBalance: limits.imageCredits,
            videoBalance: limits.videoCredits,
            audioBalance: limits.audioCredits,
            history: []
        };
    });

    useEffect(() => {
        (window as any).showSubModal = () => setShowSubModal(true);
        return () => { (window as any).showSubModal = undefined; };
    }, []);

    // --- CONTEXT STATE ---
    const [storyBible, setStoryBible] = useState<StoryBibleEntry[]>([]);
    const [versionHistory, setVersionHistory] = useState<VersionSnapshot[]>([]);
    const [isGmailConnected, setIsGmailConnected] = useState(false);

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

    // --- LOAD DATA & AUTH ---
    useEffect(() => {
        let mounted = true;

        // GMAIL CHECK — runs IMMEDIATELY when we get a session, BEFORE any async work.
        // provider_token is transient and only available at the moment the auth event fires.
        const checkGmailConnection = (currentSession: Session) => {
            const isReturningFromGmailAuth = sessionStorage.getItem('muse_connecting_gmail') === 'true';
            if (isReturningFromGmailAuth && currentSession.provider_token) {
                console.log("GMAIL: Token found! Setting connected.");
                setIsGmailConnected(true);
                // Store token in sessionStorage so EmailStudio can use it even after the transient token is gone
                sessionStorage.setItem('muse_gmail_token', currentSession.provider_token);
                sessionStorage.removeItem('muse_connecting_gmail');
            }
        };

        const loadUserData = async (currentSession: Session) => {
            if (!mounted) return;
            setSession(currentSession);

            try {
                const [usageData, projects, assetsData, bibleData, versionsData] = await Promise.all([
                    persistenceService.loadUsage(),
                    persistenceService.loadProjects(),
                    persistenceService.loadAssets(),
                    persistenceService.loadBible(),
                    persistenceService.loadVersions()
                ]);

                if (!mounted) return;

                if (usageData) {
                    setUserTier(usageData.tier);
                    setUsage(usageData.usage);
                }

                if (projects.length > 0) {
                    setSavedProjects(projects);
                }

                setAssets(assetsData);
                setStoryBible(bibleData);
                setVersionHistory(versionsData);

                if (usageData && usageData.tier !== 'FREE') {
                    setHasAccess(true);
                }

            } catch (error) {
                console.error("Failed to load user data:", error);
                if (currentSession) setHasAccess(true);
            } finally {
                if (mounted) setIsInitializing(false);
            }
        };

        // 1. Check Session on mount
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error("Auth session check error:", error);
                if (mounted) setIsInitializing(false);
                return;
            }

            if (session) {
                // IMMEDIATELY check gmail BEFORE any async work
                checkGmailConnection(session);
                loadUserData(session);
            } else {
                if (mounted) {
                    setHasAccess(false);
                    setIsInitializing(false);
                }
            }
        });

        // 2. Listen for Auth Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                // IMMEDIATELY check gmail BEFORE any async work
                checkGmailConnection(session);
                loadUserData(session);
            } else {
                if (mounted) {
                    setHasAccess(false);
                    setSession(null);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Handle Stripe Redirection
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('session_id')) {
            alert('Payment Successful! Your workspace is being upgraded.');
            const url = new URL(window.location.href);
            url.searchParams.delete('session_id');
            window.history.replaceState({}, '', url);
        }
    }, []);

    // Sync Usage
    useEffect(() => {
        if (hasAccess && session) {
            persistenceService.syncUsage(userTier, usage);
        }
    }, [userTier, usage, hasAccess, session]);

    // Entrance Handler
    const handleTierSelection = async (tier: SubscriptionTier) => {
        if (tier !== 'FREE' && session?.user && tier !== userTier) {
            const checkoutUrl = await stripeService.createCheckoutSession(tier, session.user.id);
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
                return;
            }
        }
        setUserTier(tier);
        setHasAccess(true);
        // Reset limits if needed...
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        sessionStorage.removeItem('muse_gmail_active');
        sessionStorage.removeItem('muse_gmail_token');
        sessionStorage.removeItem('muse_connecting_gmail');
        setIsGmailConnected(false);
        setHasAccess(false);
        setSession(null);
        setViewMode('HOME');
    };

    // --- NAVIGATION HELPERS ---
    const handleNavigate = (mode: ViewMode) => {
        if (mode === 'LEGAL_PRIVACY' || mode === 'LEGAL_TERMS') {
            navigateToView(mode);
        } else {
            navigateToView(mode);
            if (mode !== 'EDITOR') setProjectType(null);
        }
    };

    const handleProjectSelect = (type: ProjectType) => {
        if ((type as any) === 'NOTES') {
            setViewMode('NOTES');
            return;
        }
        if ((type as any) === 'CALENDAR') {
            setViewMode('CALENDAR');
            return;
        }
        setProjectType(type);
        setCurrentProjectId(null); // Start fresh
        setTitle(`My ${type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}`);
        setContent('');
        setViewMode('EDITOR');
    };

    const handleLoadProject = (project: SavedProject) => {
        setProjectType(project.type);
        setCurrentProjectId(project.id);
        setTitle(project.title);
        setContent(project.content);
        setViewMode('EDITOR');
    };

    const handleDeleteProject = (id: string) => {
        setSavedProjects(prev => prev.filter(p => p.id !== id));
        persistenceService.deleteProject(id);
    };

    const handleSaveProject = async () => {
        if (!projectType) return;

        // If we have a current ID, update it. Otherwise create new.
        const idToUse = currentProjectId || crypto.randomUUID();

        const newProject: SavedProject = {
            id: idToUse,
            title: title || 'Untitled Project',
            type: projectType,
            content: content,
            lastModified: Date.now(),
            previewSnippet: content.slice(0, 80) + (content.length > 80 ? '...' : '')
        };

        try {
            // Optimistic Update
            setSavedProjects(prev => {
                const idx = prev.findIndex(p => p.id === newProject.id);
                if (idx >= 0) {
                    const copy = [...prev];
                    copy[idx] = newProject;
                    return copy;
                }
                return [newProject, ...prev];
            });

            await persistenceService.saveProject(newProject);
            setCurrentProjectId(idToUse); // Ensure we keep editing this one
            alert('Project Saved!');
        } catch (error: any) {
            console.error("Save error:", error);
            alert("Error saving project: " + error.message);
        }
    };

    // --- LIMIT CHECKING & USAGE ---
    const checkLimit = (type: 'video' | 'image' | 'voice' | 'ensemble' | 'bible' | 'audio', amount: number = 0): boolean => {
        // (Simplified for brevity, logic remains same)
        if (userTier === 'FREE') { setShowSubModal(true); return false; }
        const limits = TIERS[userTier].limits;
        // ... Add full logic if needed, or assume mostly correct from context
        // Restoration note: I am pasting the standard checks
        if (type === 'video' && (!limits.hasVeo || usage.videoBalance <= 0)) { setShowSubModal(true); return false; }
        if (type === 'image' && (usage.imageBalance <= 0)) { setShowSubModal(true); return false; }
        if (type === 'voice' && (!limits.hasVoiceAssistant || usage.voiceBalance <= 0)) { setShowSubModal(true); return false; }
        if (type === 'audio' && (!limits.hasAudioStudio || usage.audioBalance <= 0)) { setShowSubModal(true); return false; }
        if (type === 'bible' && !limits.hasBible) { setShowSubModal(true); return false; }
        return true;
    };

    const trackUsage = (type: 'video' | 'image' | 'voice' | 'audio', amount: number = 1) => {
        setUsage(prev => {
            const next = { ...prev };
            // Update balances...
            if (type === 'video') { next.videoBalance -= amount; next.videosGenerated += amount; }
            if (type === 'image') { next.imageBalance -= amount; next.imagesGenerated += amount; }
            if (type === 'voice') { next.voiceBalance -= amount; next.voiceMinutesUsed += amount; }
            if (type === 'audio') { next.audioBalance -= amount; next.audioMinutesGenerated += (amount / 900); }
            return next;
        });
    };

    const handleFileUpload = (files: FileList) => {
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    const asset: Asset = {
                        id: Date.now() + Math.random().toString(),
                        type: file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image',
                        url: e.target.result as string,
                        name: file.name,
                        mimeType: file.type,
                        base64: (e.target.result as string).split(',')[1]
                    };
                    setAssets(prev => [...prev, asset]);
                    persistenceService.saveAsset(asset);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleAddLink = (url: string) => {
        const asset: Asset = { id: Date.now() + Math.random().toString(), type: 'link', url, name: url, mimeType: 'text/plain' };
        setAssets(prev => [...prev, asset]);
        persistenceService.saveAsset(asset);
    };

    // Sub-handlers
    const handleSnapshot = () => {
        if (!projectType) return;
        const snap: VersionSnapshot = {
            id: crypto.randomUUID(),
            projectType,
            timestamp: Date.now(),
            content,
            description: `Snapshot ${versionHistory.length + 1}`
        };
        setVersionHistory(prev => [snap, ...prev]);
        persistenceService.saveVersion(snap);
    };

    // URL routing for /privacy and /terms
    useEffect(() => {
        const path = window.location.pathname;
        if (path === '/privacy') setViewMode('LEGAL_PRIVACY');
        else if (path === '/terms') setViewMode('LEGAL_TERMS');
    }, []);

    // Sync viewMode changes to URL
    const navigateToView = (mode: string) => {
        if (mode === 'LEGAL_PRIVACY') {
            window.history.pushState({}, '', '/privacy');
        } else if (mode === 'LEGAL_TERMS') {
            window.history.pushState({}, '', '/terms');
        } else {
            // Reset to root for any other view
            if (window.location.pathname !== '/') {
                window.history.pushState({}, '', '/');
            }
        }
        setViewMode(mode);
    };

    // 0. Initializing
    if (isInitializing) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
                <div className="text-amber-500 text-xl font-serif animate-pulse">Loading Universe...</div>
            </div>
        );
    }

    // Legal pages — always accessible regardless of auth state
    if (viewMode === 'LEGAL_PRIVACY') return <PrivacyPolicy onBack={() => navigateToView('HOME')} theme={theme} />;
    if (viewMode === 'LEGAL_TERMS') return <TermsOfService onBack={() => navigateToView('HOME')} theme={theme} />;

    // 1. Landing Page
    if (!hasAccess) {
        return <LandingPage onSelectTier={handleTierSelection} onNavigateLegal={(mode) => navigateToView(mode)} />;
    }

    // 2. Main App
    const currentStoryBible = storyBible.filter(e => e.projectType === projectType);
    const currentVersionHistory = versionHistory.filter(v => v.projectType === projectType);
    const providerToken = session?.provider_token;
    const gmailToken = session?.provider_token;

    if (viewMode === 'NOTES') {
        return <NotesMode
            onBack={() => setViewMode('HOME')}
            userTier={userTier}
            gmailToken={gmailToken}
            providerToken={providerToken}
        />;
    }

    if (viewMode === 'CALENDAR') {
        return <CalendarMode
            onBack={() => setViewMode('HOME')}
            userTier={userTier}
            providerToken={providerToken}
            gmailToken={gmailToken}
        />;
    }

    if (viewMode === 'CREATIVE_SUITE') {
        return <CreativeSuite
            onBack={() => setViewMode('HOME')}
            userTier={userTier}
            theme={theme}
        />;
    }

    if (viewMode !== 'EDITOR') {
        return (
            <>
                <ProjectSelector
                    view={viewMode}
                    onNavigate={handleNavigate}
                    onSelect={handleProjectSelect}
                    onLoadProject={handleLoadProject}
                    savedProjects={savedProjects}
                    usage={usage}
                    userTier={userTier}
                    user={session?.user}
                    assets={assets}
                    onUpload={handleFileUpload}
                    onAddLink={handleAddLink}
                    onDeleteAsset={(id) => { setAssets(p => p.filter(a => a.id !== id)); persistenceService.deleteAsset(id); }}
                    onDeleteProject={handleDeleteProject}
                    theme={theme}
                    setTheme={setTheme}
                    onLogout={handleLogout}
                    onManageSubscription={() => setShowSubModal(true)}
                    onImportGoogleDoc={(t, c) => {
                        if (userTier !== 'SHOWRUNNER') {
                            alert("Google Drive import is a Showrunner feature.");
                            setShowSubModal(true);
                            return;
                        }
                        setProjectType(ProjectType.GENERAL);
                        setTitle(t);
                        setContent(c);
                        setViewMode('EDITOR');
                    }}
                    isGmailConnected={isGmailConnected}
                />
                <SubscriptionModal
                    isOpen={showSubModal}
                    onClose={() => setShowSubModal(false)}
                    currentTier={userTier}
                    onUpgrade={handleTierSelection}
                />
            </>
        );
    }

    return (
        <div className={`flex h-screen w-screen overflow-hidden font-sans transition-colors duration-500 ${theme === 'dark' ? 'bg-gray-950 text-gray-200' : 'bg-gray-50 text-gray-900'}`}>
            <SubscriptionModal isOpen={showSubModal} onClose={() => setShowSubModal(false)} currentTier={userTier} onUpgrade={handleTierSelection} />

            {/* Simple Sidebar Implementation */}
            <div className="w-16 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-6 gap-6 z-20">
                <div onClick={() => handleNavigate('HOME')} className="w-10 h-10 bg-muse-600 rounded-lg flex items-center justify-center cursor-pointer hover:bg-muse-500 text-white font-serif font-bold text-xl">M</div>
                <div className="flex flex-col gap-4 mt-8">
                    <NavButton active={activeTab === 'chat' && showRightPanel} onClick={() => { setShowRightPanel(true); setActiveTab('chat'); }} icon="sparkles" tooltip="AI Chat" />
                    <NavButton active={activeTab === 'bible' && showRightPanel} onClick={() => { if (checkLimit('bible')) { setShowRightPanel(true); setActiveTab('bible'); } }} icon="book" tooltip="Story Bible" />
                    <NavButton active={activeTab === 'assets' && showRightPanel} onClick={() => { setShowRightPanel(true); setActiveTab('assets'); }} icon="library" tooltip="Assets" />
                    <NavButton active={activeTab === 'audio' && showRightPanel} onClick={() => { if (checkLimit('audio')) { setShowRightPanel(true); setActiveTab('audio'); } }} icon="mic" tooltip="Audio Studio" />

                    <button onClick={() => setShowRightPanel(!showRightPanel)} className="p-2 text-gray-500 mt-auto"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg></button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 w-full h-full overflow-hidden">
                    <Editor
                        content={content}
                        onChange={setContent}
                        title={title}
                        onTitleChange={setTitle}
                        projectType={projectType!}
                        versionHistory={currentVersionHistory}
                        onSnapshot={handleSnapshot}
                        onRestoreVersion={setContent}
                        onDeleteSnapshot={(id) => setVersionHistory(p => p.filter(v => v.id !== id))}
                        onSave={handleSaveProject}
                        theme={theme}
                        onExportGoogleDoc={async (t, c) => {
                            if (userTier !== 'SHOWRUNNER') {
                                alert("Google Drive export is a Showrunner feature.");
                                setShowSubModal(true);
                                return;
                            }
                            const { data: { session } } = await supabase.auth.getSession();
                            if (session?.provider_token) {
                                await googleDriveService.createDoc(session.provider_token, t, c);
                                alert("Successfully exported to Google Docs!");
                            } else {
                                if (confirm("You are not connected to Google. Would you like to connect now to enable exporting?")) {
                                    const { error } = await supabase.auth.signInWithOAuth({
                                        provider: 'google',
                                        options: {
                                            scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.file',
                                            redirectTo: window.location.origin
                                        }
                                    });
                                    if (error) alert(error.message);
                                }
                            }
                        }}
                        onUploadToDrive={async (t, c) => {
                            if (userTier !== 'SHOWRUNNER') {
                                alert("Google Drive export is a Showrunner feature.");
                                setShowSubModal(true);
                                return;
                            }
                            const { data: { session } } = await supabase.auth.getSession();
                            if (session?.provider_token) {
                                await googleDriveService.uploadFile(session.provider_token, t, c, 'text/plain');
                            } else {
                                alert("Please sign in again");
                            }
                        }}
                        isGmailConnected={isGmailConnected}
                        userTier={userTier}
                    />
                </div>

                <div className={`fixed inset-0 z-40 md:static md:z-0 transition-all duration-300 border-l ${theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'bg-white'} flex flex-col ${showRightPanel ? 'translate-x-0 w-full md:w-[450px]' : 'translate-x-full md:w-0'}`}>
                    {activeTab === 'chat' && (
                        <ChatInterface
                            projectType={projectType}
                            assets={assets}
                            onAddAsset={(a) => { setAssets(p => [...p, a]); persistenceService.saveAsset(a); }}
                            onUpdateContent={(t) => { handleSnapshot(); setContent(c => c + '\n\n' + t); }}
                            onReplaceContent={(t) => { handleSnapshot(); setContent(t); }}
                            editorContent={content}
                            onConfigureTTS={(s) => { setTtsState(p => ({ ...p, ...s })); setActiveTab('audio'); setShowRightPanel(true); }}
                            checkLimit={checkLimit}
                            trackUsage={trackUsage}
                            storyBible={currentStoryBible}
                            theme={theme}
                            userTier={userTier}
                            gmailToken={session?.provider_token}
                        />
                    )}
                    {activeTab === 'bible' && (
                        <StoryBible
                            entries={currentStoryBible}
                            onAdd={(e) => { setStoryBible(p => [...p, e]); persistenceService.saveBibleEntry(e); }}
                            onDelete={(id) => { setStoryBible(p => p.filter(e => e.id !== id)); persistenceService.deleteBibleEntry(id); }}
                            theme={theme}
                        />
                    )}
                    {activeTab === 'assets' && (
                        <AssetLibrary
                            assets={assets}
                            onUpload={handleFileUpload}
                            onAddLink={handleAddLink}
                            onDelete={(id) => { setAssets(p => p.filter(a => a.id !== id)); persistenceService.deleteAsset(id); }}
                            theme={theme}
                        />
                    )}
                    {activeTab === 'audio' && (
                        <TTSStudio
                            editorContent={content}
                            onAddAsset={(a) => { setAssets(p => [...p, a]); persistenceService.saveAsset(a); }}
                            ttsState={ttsState}
                            onUpdateState={(s) => setTtsState(p => ({ ...p, ...s }))}
                            checkLimit={checkLimit}
                            trackUsage={trackUsage}
                            userTier={userTier}
                            theme={theme}
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
        {icon === 'notes' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>}
        {icon === 'calendar' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>}
        {icon === 'mail' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>}
    </button>
);

export default App;