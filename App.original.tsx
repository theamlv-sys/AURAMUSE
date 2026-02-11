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
import OfflineLandingPage from './components/OfflineLandingPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { ProjectType, Asset, TTSState, VoiceName, StoryBibleEntry, VersionSnapshot, SubscriptionTier, UsageStats, TIERS, SavedProject, ViewMode } from './types';
import { persistenceService } from './services/persistenceService';
import { supabase } from './services/supabaseClient';
import { stripeService } from './services/stripeService';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
    console.log("DEBUG: ENV URL", import.meta.env.VITE_SUPABASE_URL);
    // --- CORE STATE ---
    const [hasAccess, setHasAccess] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true); // New Loading State
    const [session, setSession] = useState<Session | null>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark'); // New Theme State
    const [viewMode, setViewMode] = useState<ViewMode>('HOME');
    const [projectType, setProjectType] = useState<ProjectType | null>(null);
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [assets, setAssets] = useState<Asset[]>([]);

    useEffect(() => {
        document.body.style.backgroundColor = theme === 'dark' ? '#0d1117' : '#f8fafc';
        document.body.style.color = theme === 'dark' ? '#e2e8f0' : '#1e293b';
        // Add transition for theme change
        document.body.classList.add('transition-colors', 'duration-500');
    }, [theme]);

    // Persistence for Saved Projects
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

    // Expose subscription modal trigger globally for restricted features
    useEffect(() => {
        (window as any).showSubModal = () => setShowSubModal(true);
        return () => { (window as any).showSubModal = undefined; };
    }, []);

    // --- CONTEXT STATE (Global Arrays, filtered in render) ---
    const [storyBible, setStoryBible] = useState<StoryBibleEntry[]>([]);
    const [versionHistory, setVersionHistory] = useState<VersionSnapshot[]>([]);
    const [isGmailConnected, setIsGmailConnected] = useState(false); // New explicit state

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

    // Load Data and Auth Session on Mount
    useEffect(() => {
        let mounted = true;

        // Use a ref to prevent double-loading if both listener and manual check fire
        const hasLoadedRef = React.useRef(false);

        const loadUserData = async (currentSession: Session) => {
            console.warn("Supabase Outage Detected: Forcing Guest Mode for Localhost availability.");
            if (mounted) {
                setHasAccess(false);
                setIsInitializing(false);
                setSavedProjects([]);
                setAssets([]);
                setStoryBible([]);
                setVersionHistory([]);
                setUserTier('FREE');
            }
        };

        // Manual Check (Fallback)
        // supabase.auth.getSession().then(...) -> Commented out for offline mode
        /*
        supabase.auth.getSession().then(({ data: { session }, error }) => {
             // ...
        });
        */

        // Force offline mode immediately
        loadUserData(null as any);

        // const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        //     // ...
        // });

        return () => {
            mounted = false;
            // subscription.unsubscribe();
        };
    }, []);

    // Handle Stripe Redirection Success
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('session_id')) {
            alert('Payment Successful! Your workspace is being upgraded. It may take a few seconds for your new tier to activate.');
            // Clean up URL
            const url = new URL(window.location.href);
            url.searchParams.delete('session_id');
            window.history.replaceState({}, '', url);
        }
    }, []);

    // Sync Usage to Supabase when it changes
    useEffect(() => {
        if (hasAccess) {
            persistenceService.syncUsage(userTier, usage);
        }
    }, [userTier, usage, hasAccess]);

    // Handle Entrance from Landing Page
    const handleTierSelection = async (tier: SubscriptionTier) => {
        const tierLevels: Record<SubscriptionTier, number> = { 'FREE': 0, 'SCRIBE': 1, 'AUTEUR': 2, 'SHOWRUNNER': 3 };
        const currentLevel = tierLevels[userTier];
        const targetLevel = tierLevels[tier];

        if (tier !== 'FREE' && session?.user && tier !== userTier) {
            // Initiate Stripe Checkout for BOTH Upgrades and Downgrades
            // User requested to use the "same pages" (Payment Links) for all subscription actions
            const checkoutUrl = await stripeService.createCheckoutSession(tier, session.user.id);
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
                return;
            }
        }

        // If Visitor (FREE) or session missing, proceed to app (Visitor mode)
        // OR if upgrading to FREE (which shouldn't happen logic-wise but fail-safe)
        setUserTier(tier);
        setHasAccess(true);
        const limits = TIERS[tier].limits;
        setUsage(prev => ({
            ...prev,
            voiceBalance: Math.max(prev.voiceBalance, limits.voiceCredits),
            imageBalance: Math.max(prev.imageBalance, limits.imageCredits),
            videoBalance: Math.max(prev.videoBalance, limits.videoCredits),
            audioBalance: Math.max(prev.audioBalance, limits.audioCredits)
        }));
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        sessionStorage.removeItem('muse_gmail_active'); // Force disconnect Gmail
        setIsGmailConnected(false);
        setHasAccess(false);
        setSession(null);
        setViewMode('HOME');
    };

    // --- NAVIGATION & PROJECT HANDLERS ---

    const handleNavigate = (mode: ViewMode) => {
        setViewMode(mode);
        if (mode !== 'EDITOR') {
            setProjectType(null);
        }
    };

    const handleProjectSelect = (type: ProjectType) => {
        setProjectType(type);
        setTitle(`My ${type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}`);
        setContent(''); // Clear editor for new project type
        setViewMode('EDITOR');
    };

    const handleLoadProject = (project: SavedProject) => {
        setProjectType(project.type);
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

        // 1. Create the project object
        const newProject: SavedProject = {
            id: crypto.randomUUID(),
            title: title || 'Untitled Project',
            type: projectType,
            content: content,
            lastModified: Date.now(),
            previewSnippet: content.slice(0, 80) + (content.length > 80 ? '...' : '')
        };

        try {
            // 2. Optimistic Update (Update UI immediately)
            let isUpdate = false;
            setSavedProjects(prev => {
                const existsIndex = prev.findIndex(p => p.title === newProject.title && p.type === newProject.type);
                if (existsIndex >= 0) {
                    isUpdate = true;
                    const updated = [...prev];
                    // Keep the original ID if updating
                    newProject.id = updated[existsIndex].id;
                    updated[existsIndex] = newProject;
                    return updated;
                }
                return [newProject, ...prev];
            });

            // 3. Persist to Backend
            console.log("Saving project to Supabase...", newProject);
            await persistenceService.saveProject(newProject);
            alert('Project Saved to Sidebar & Database!');

        } catch (error: any) {
            console.error("Failed to save project:", error);
            alert(`Error saving project: ${error.message || "Unknown error"}`);
            // Optional: Rollback state here if strict consistency is needed
        }
    };

    const checkLimit = (type: 'video' | 'image' | 'voice' | 'ensemble' | 'bible' | 'audio', amount: number = 0): boolean => {
        if (userTier === 'FREE') {
            setShowSubModal(true);
            return false;
        }
        const limits = TIERS[userTier].limits;

        if (type === 'video') {
            if (!limits.hasVeo || usage.videoBalance <= 0) {
                setShowSubModal(true);
                return false;
            }
        }
        if (type === 'image') {
            if (usage.imageBalance <= 0) {
                setShowSubModal(true);
                return false;
            }
        }
        if (type === 'voice') {
            if (!limits.hasVoiceAssistant || usage.voiceBalance <= 0) {
                setShowSubModal(true);
                return false;
            }
        }
        if (type === 'ensemble') {
            if (!limits.hasEnsembleCast) {
                setShowSubModal(true);
                return false;
            }
        }
        if (type === 'audio') {
            if (!limits.hasAudioStudio || usage.audioBalance <= 0) {
                setShowSubModal(true);
                return false;
            }
            if (amount > limits.maxAudioCharsPerGen) {
                alert(`Your current tier is limited to ${limits.maxAudioCharsPerGen.toLocaleString()} characters per generation.`);
                setShowSubModal(true);
                return false;
            }
        }
        if (type === 'bible') {
            if (!limits.hasBible) {
                setShowSubModal(true);
                return false;
            }
        }
        return true;
    };

    const trackUsage = (type: 'video' | 'image' | 'voice' | 'audio', amount: number = 1) => {
        setUsage(prev => {
            const next = { ...prev };
            if (type === 'video') {
                next.videosGenerated += amount;
                next.videoBalance -= amount;
                next.history.unshift({
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    type: 'usage',
                    item: 'video',
                    amount: -amount,
                    description: `Veo 3.1 Video Generation (${amount}x)`
                });
            }
            if (type === 'image') {
                next.imagesGenerated += amount;
                next.imageBalance -= amount;
                next.history.unshift({
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    type: 'usage',
                    item: 'image',
                    amount: -amount,
                    description: `Storyboard Image Generation (${amount}x)`
                });
            }
            if (type === 'voice') {
                next.voiceMinutesUsed += amount;
                next.voiceBalance -= amount;
                next.history.unshift({
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    type: 'usage',
                    item: 'voice',
                    amount: -amount,
                    description: `Voice Assistant Talk Time (${amount} min)`
                });
            }
            if (type === 'audio') {
                const minutes = amount / 900;
                const charCost = amount;
                next.audioMinutesGenerated += minutes;
                next.audioBalance -= charCost;
                next.history.unshift({
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    type: 'usage',
                    item: 'audio',
                    amount: -charCost,
                    description: `Audio Studio Synthesis (${amount} chars)`
                });
            }
            return next;
        });
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
                    persistenceService.saveAsset(newAsset);
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
        persistenceService.saveAsset(newAsset);
    }

    // --- VERSION HISTORY HANDLERS ---
    // ... (keep version history handlers)

    const handleSnapshot = () => {
        if (!projectType) return;
        const snap: VersionSnapshot = {
            id: crypto.randomUUID(),
            projectType: projectType,
            timestamp: Date.now(),
            content: content,
            description: `Snapshot ${versionHistory.filter(v => v.projectType === projectType).length + 1}`
        };
        setVersionHistory(prev => [snap, ...prev]); // Add to top
        persistenceService.saveVersion(snap).catch(err => console.error("Failed to persist snapshot:", err));
    };

    const handleDeleteSnapshot = (id: string) => {
        setVersionHistory(prev => prev.filter(v => v.id !== id));
    };


    // --- STORY BIBLE HANDLERS ---
    // ... (keep bible handlers)

    const handleAddBibleEntry = (entry: Omit<StoryBibleEntry, 'id' | 'projectType'>) => {
        if (!projectType) return;
        const newEntry: StoryBibleEntry = {
            ...entry,
            id: Date.now().toString(),
            projectType: projectType
        };
        setStoryBible(prev => [...prev, newEntry]);
        persistenceService.saveBibleEntry(newEntry);
    };

    const handleDeleteBibleEntry = (id: string) => {
        setStoryBible(prev => prev.filter(e => e.id !== id));
        persistenceService.deleteBibleEntry(id);
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

    // --- RENDER FLOW ---

    // 0. Initializing
    // 0. Initializing - BYPASSED FOR OFFLINE MODE
    /*
    if (isInitializing) {
        return <div className="fixed inset-0 bg-black z-50 flex items-center justify-center text-white">Loading Universe...</div>;
    }
    */

    // ...

    // FORCE LANDING PAGE - OFFLINE
    return <OfflineLandingPage onSelectTier={handleTierSelection} onNavigateLegal={(mode: any) => setViewMode(mode)} />;

    // 1. Landing Page (Subscription Gate)
    if (!hasAccess) {
        if (viewMode === 'LEGAL_PRIVACY') {
            return <PrivacyPolicy onBack={() => setViewMode('HOME')} theme={theme} />;
        }
        if (viewMode === 'LEGAL_TERMS') {
            return <TermsOfService onBack={() => setViewMode('HOME')} theme={theme} />;
        }
        return <LandingPage onSelectTier={handleTierSelection} onNavigateLegal={(mode) => setViewMode(mode)} />;
    }

    // 1.5 Legal Pages (Authenticated)
    if (viewMode === 'LEGAL_PRIVACY') {
        return <PrivacyPolicy onBack={() => setViewMode('HOME')} theme={theme} />;
    }
    if (viewMode === 'LEGAL_TERMS') {
        return <TermsOfService onBack={() => setViewMode('HOME')} theme={theme} />;
    }

    // 2. Project Selector (Dashboard Hub)
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
                    isGmailConnected={isGmailConnected}
                    user={session?.user}
                    assets={assets}
                    onUpload={handleFileUpload}
                    onAddLink={handleAddLink}
                    onDeleteAsset={(id) => {
                        setAssets(prev => prev.filter(a => a.id !== id));
                        persistenceService.deleteAsset(id);
                    }}
                    onDeleteProject={handleDeleteProject}
                    theme={theme}
                    setTheme={setTheme}
                    onLogout={handleLogout}
                    onManageSubscription={() => setShowSubModal(true)}
                    onImportGoogleDoc={(t, c) => {
                        setProjectType(ProjectType.GENERAL);
                        setTitle(t);
                        setContent(c);
                        setViewMode('EDITOR');
                    }}
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

    // 3. Main App Workspace (Editor)
    const currentStoryBible = storyBible.filter(e => e.projectType === projectType);
    const currentVersionHistory = versionHistory.filter(v => v.projectType === projectType);

    return (
        <div className={`flex h-screen w-screen overflow-hidden font-sans transition-colors duration-500 ${theme === 'dark' ? 'bg-gray-950 text-gray-200' : 'bg-gray-50 text-gray-900'}`}>
            <SubscriptionModal
                isOpen={showSubModal}
                onClose={() => setShowSubModal(false)}
                currentTier={userTier}
                onUpgrade={(tier) => { setUserTier(tier); setShowSubModal(false); }}
            />

            {/* Sidebar Nav (Mini in Editor Mode) */}
            <div className="w-16 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-6 gap-6 z-20">
                <div
                    onClick={() => handleNavigate('HOME')}
                    className="w-10 h-10 bg-muse-600 rounded-lg flex items-center justify-center cursor-pointer hover:bg-muse-500 text-white font-serif font-bold text-xl transition-all shadow-lg shadow-muse-500/20"
                    title="Back to Dashboard"
                >
                    M
                </div>

                <div className="flex flex-col gap-4 mt-8">
                    <NavButton active={activeTab === 'chat' && showRightPanel} onClick={() => { setShowRightPanel(true); setActiveTab('chat'); }} icon="sparkles" tooltip="AI Assistant" />
                    <NavButton active={activeTab === 'bible' && showRightPanel} onClick={() => { if (checkLimit('bible')) { setShowRightPanel(true); setActiveTab('bible'); } }} icon="book" tooltip="Story Bible" />
                    <NavButton active={activeTab === 'assets' && showRightPanel} onClick={() => { setShowRightPanel(true); setActiveTab('assets'); }} icon="library" tooltip="Multimedia Library" />
                    <NavButton active={activeTab === 'audio' && showRightPanel} onClick={() => { if (checkLimit('audio')) { setShowRightPanel(true); setActiveTab('audio'); } }} icon="mic" tooltip="Audio Studio" />

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

                    <button
                        onClick={handleLogout}
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors mt-2"
                        title="Sign Out"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Editor */}
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
                        onDeleteSnapshot={handleDeleteSnapshot}
                        onSave={handleSaveProject}
                        theme={theme}
                        onExportGoogleDoc={async (t, c) => {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (session?.provider_token) {
                                await googleDriveService.createDoc(session.provider_token, t, c);
                            } else {
                                alert("Please sign in again to grant Drive access.");
                            }
                        }}
                    />
                </div>

                {/* Right Panel - Mobile Overlay / Desktop Side Panel */}
                <div
                    className={`
                        fixed inset-0 z-40 md:static md:z-0
                        transition-all duration-300 ease-in-out 
                        border-l ${theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'} 
                        flex flex-col
                        ${showRightPanel ? 'translate-x-0 w-full md:w-[450px]' : 'translate-x-full md:translate-x-0 md:w-0'}
                    `}
                >
                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setShowRightPanel(false)}
                        className="md:hidden absolute top-4 right-4 z-50 p-2 bg-black/20 rounded-full text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {activeTab === 'chat' && (
                        <ChatInterface
                            projectType={projectType}
                            assets={assets}
                            onAddAsset={(a) => {
                                setAssets(prev => [...prev, a]);
                                persistenceService.saveAsset(a);
                            }}
                            onUpdateContent={handleAppendContent}
                            onReplaceContent={handleReplaceContent}
                            editorContent={content}
                            onConfigureTTS={handleConfigureTTS}
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
                            onAdd={(entry) => {
                                setStoryBible(prev => [...prev, entry]);
                                persistenceService.saveBibleEntry(entry);
                            }}
                            onDelete={(id) => {
                                setStoryBible(prev => prev.filter(e => e.id !== id));
                                persistenceService.deleteBibleEntry(id);
                            }}
                            theme={theme}
                        />
                    )}
                    {activeTab === 'assets' && (
                        <AssetLibrary
                            assets={assets}
                            onUpload={handleFileUpload}
                            onAddLink={handleAddLink}
                            onDelete={(id) => {
                                setAssets(prev => prev.filter(a => a.id !== id));
                                persistenceService.deleteAsset(id);
                            }}
                            theme={theme}
                        />
                    )}
                    {activeTab === 'audio' && (
                        <TTSStudio
                            editorContent={content}
                            onAddAsset={(a) => {
                                setAssets(prev => [...prev, a]);
                                persistenceService.saveAsset(a);
                            }}
                            ttsState={ttsState}
                            onUpdateState={handleConfigureTTS}
                            checkLimit={checkLimit}
                            trackUsage={trackUsage}
                            userTier={userTier}
                            theme={theme}
                        />
                    )}
                </div>
            </div>


            {/* GLOBAL MODALS */}
            <SubscriptionModal
                isOpen={showSubModal}
                onClose={() => setShowSubModal(false)}
                currentTier={userTier}
                onUpgrade={handleTierSelection}
            />
        </div >
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