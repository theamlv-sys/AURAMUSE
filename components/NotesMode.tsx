import React, { useState, useEffect } from 'react';
import { useLive } from '../hooks/useLive';
import { googleDriveService } from '../services/googleDriveService';
import { ProjectType, SubscriptionTier } from '../types';

interface Snapshot {
    id: string;
    content: string;
    timestamp: number;
}

interface NotesModeProps {
    onBack: () => void;
    initialContent?: string;
    onSave?: (content: string) => void;
    userTier?: SubscriptionTier;
    gmailToken?: string;
    providerToken?: string;
}

const NotesMode: React.FC<NotesModeProps> = ({ onBack, initialContent = '', onSave, userTier = 'FREE', gmailToken, providerToken }) => {
    const [noteContent, setNoteContent] = useState(initialContent);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [snapshots, setSnapshots] = useState<Snapshot[]>(() => {
        const saved = localStorage.getItem('muse_notes_snapshots');
        return saved ? JSON.parse(saved) : [];
    });
    const [showSnapshots, setShowSnapshots] = useState(false);

    // Auto-load
    useEffect(() => {
        if (!initialContent) {
            const saved = localStorage.getItem('muse_quick_notes');
            if (saved) setNoteContent(saved);
        }
    }, [initialContent]);

    // Auto-save logic
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem('muse_quick_notes', noteContent);
            setLastSaved(new Date());
            if (onSave) onSave(noteContent);
        }, 1000);
        return () => clearTimeout(timer);
    }, [noteContent, onSave]);

    // Snapshot Logic
    const handleTakeSnapshot = () => {
        const newSnapshot: Snapshot = {
            id: crypto.randomUUID(),
            content: noteContent,
            timestamp: Date.now()
        };
        const updated = [newSnapshot, ...snapshots].slice(0, 10); // Keep last 10
        setSnapshots(updated);
        localStorage.setItem('muse_notes_snapshots', JSON.stringify(updated));
        alert('Snapshot saved!');
    };

    const handleRestoreSnapshot = (snap: Snapshot) => {
        if (confirm('Restore this snapshot? Current unsaved changes will be lost.')) {
            setNoteContent(snap.content);
            setShowSnapshots(false);
        }
    };

    const handleExport = () => {
        const blob = new Blob([noteContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QuickNote_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSaveToDrive = async () => {
        if (userTier !== 'SHOWRUNNER') {
            alert("Google Drive export is a Showrunner feature.");
            return;
        }
        if (!providerToken) {
            alert("Please connect Google Drive first.");
            return;
        }
        try {
            await googleDriveService.createDoc(providerToken, `QuickNote ${new Date().toLocaleDateString()}`, noteContent);
            alert("Saved to Google Drive!");
        } catch (e: any) {
            alert("Failed to save to Drive: " + e.message);
        }
    };

    const handleSavePDF = () => {
        const printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Quick Note - ${new Date().toLocaleDateString()}</title>
                    <style>
                        body { font-family: monospace; white-space: pre-wrap; padding: 2em; }
                    </style>
                </head>
                <body>
                    ${noteContent}
                    <script>
                        window.print();
                        window.onafterprint = () => window.close();
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    // --- AURA ASSISTANT (VOICE) ---
    const { isActive: isVoiceActive, isConnecting, start: startVoice, stop: stopVoice, volume } = useLive({
        onUpdateEditor: setNoteContent,
        onAppendEditor: (text) => setNoteContent(prev => prev + ' ' + text),
        onTriggerSearch: async (q) => "Search disabled in Notes",
        onConfigureTTS: () => { },
        editorContent: noteContent,
        assets: [],
        projectType: ProjectType.NOTES,
        chatHistory: [],
        gmailToken,
        providerToken
    });

    const toggleVoice = () => {
        if (userTier !== 'SHOWRUNNER') {
            alert("Aura Assistant is a SHOWRUNNER feature. Please upgrade.");
            return;
        }
        if (isVoiceActive) stopVoice();
        else startVoice();
    };

    const handleAuthorize = async () => {
        if (userTier !== 'SHOWRUNNER') {
            alert("Google integration is a Showrunner feature.");
            return;
        }
        const { supabase } = await import('../services/supabaseClient');
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                scopes: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
                queryParams: { access_type: 'offline', prompt: 'consent select_account' },
            }
        });
    };

    return (
        <div className="flex flex-col h-screen bg-[#0d1117] text-gray-200 font-sans">
            {/* Header */}
            <header className="flex items-center justify-between px-8 py-6 border-b border-gray-800 bg-[#0d1117]/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <h1 className="text-2xl font-serif font-bold text-white tracking-tight">Quick Notes</h1>
                    {lastSaved && <span className="text-xs text-gray-600 ml-4 animate-fade-in">Saved {lastSaved.toLocaleTimeString()}</span>}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleVoice}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${isVoiceActive ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-muse-500 hover:bg-muse-500/10'}`}
                        title={userTier === 'SHOWRUNNER' ? "Toggle Aura Assistant" : "Upgrade to use Voice"}
                    >
                        {isConnecting ? 'Connecting...' : isVoiceActive ? 'Listening' : 'Aura Voice'}
                        <span className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-red-500' : 'bg-gray-600'}`}></span>
                    </button>

                    <div className="h-6 w-px bg-gray-800 mx-2"></div>

                    {/* SNAPSHOT BUTTON */}
                    <button onClick={handleTakeSnapshot} className="p-2 text-gray-400 hover:text-white transition-colors" title="Save Snapshot to History">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>

                    <button onClick={handleSavePDF} className="p-2 text-gray-400 hover:text-white transition-colors" title="Save as PDF">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    </button>

                    <button onClick={handleSaveToDrive} className="p-2 text-gray-400 hover:text-white transition-colors" title="Export to Google Drive">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.01 1.984c-0.61 0-1.17 0.32-1.48 0.85L2.39 16.73c-0.31 0.54-0.3 1.19 0.02 1.72 0.32 0.53 0.88 0.85 1.5 0.85h16.18c0.62 0 1.18-0.32 1.5-0.85 0.32-0.53 0.33-1.18 0.02-1.72L13.49 2.83c-0.31-0.53-0.87-0.85-1.48-0.85zM12 4.41l6.73 11.66H5.27L12 4.41z" /></svg>
                    </button>

                    <button onClick={handleExport} className="p-2 text-gray-400 hover:text-white transition-colors" title="Download .txt">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>

                    <button onClick={() => setShowSnapshots(true)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold transition-colors ml-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        History
                    </button>

                    <button onClick={() => setNoteContent('')} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-lg transition-all ml-2">
                        Clear
                    </button>

                    {!providerToken && (
                        <button
                            onClick={handleAuthorize}
                            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold uppercase transition-all ml-2 ${userTier === 'SHOWRUNNER' ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30' : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'}`}
                        >
                            Authorize Google Drive/Docs
                            {userTier !== 'SHOWRUNNER' && <span className="ml-1 text-[8px] border px-1 rounded">LOCKED</span>}
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Editor */}
                <main className="flex-1 overflow-hidden relative">
                    <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Capture your thoughts, ideas, or snippets here..."
                        className="w-full h-full bg-transparent resize-none p-8 md:p-12 text-lg md:text-xl leading-relaxed focus:outline-none placeholder-gray-700 custom-scrollbar"
                        style={{ fontFamily: '"Georgia", serif', maxWidth: '900px', margin: '0 auto', display: 'block' }}
                        autoFocus
                    />
                </main>

                {/* Snapshot Sidebar */}
                {showSnapshots && (
                    <div className="w-80 border-l border-gray-800 bg-[#0d1117] flex flex-col animate-slide-in-right">
                        <div className="p-4 border-b border-gray-800 font-bold text-sm text-gray-400 flex justify-between items-center">
                            <span>Version History</span>
                            <button onClick={() => setShowSnapshots(false)} className="text-gray-600 hover:text-white">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {snapshots.length === 0 && <div className="text-center text-gray-600 py-8 text-sm">No snapshots yet.</div>}
                            {snapshots.map(snap => (
                                <div key={snap.id} className="p-3 rounded bg-gray-900 border border-gray-800 hover:border-gray-600 transition-all cursor-pointer group" onClick={() => handleRestoreSnapshot(snap)}>
                                    <div className="text-xs text-gray-500 mb-1">{new Date(snap.timestamp).toLocaleString()}</div>
                                    <div className="text-xs text-gray-300 line-clamp-3 font-serif">{snap.content}</div>
                                    <div className="mt-2 text-xs text-muse-500 opacity-0 group-hover:opacity-100 transition-opacity">Click to Restore</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotesMode;
