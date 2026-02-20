import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { gmailService, EmailMessage } from '../services/gmailService';
import { generateEmailDraft } from '../services/geminiService';

import { SubscriptionTier } from '../types';

interface EmailStudioProps {
    isDark: boolean;
    onClose?: () => void;
    userTier?: SubscriptionTier;
    isConnectedProp?: boolean;
}

const EmailStudio: React.FC<EmailStudioProps> = ({ isDark, onClose, userTier = 'FREE', isConnectedProp = false }) => {
    const [isConnected, setIsConnected] = useState(isConnectedProp); // Initialize with prop
    const [isLoading, setIsLoading] = useState(false);
    const [emails, setEmails] = useState<EmailMessage[]>([]);
    const [view, setView] = useState<'INBOX' | 'SENT'>('INBOX');
    const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
    const [replyDraft, setReplyDraft] = useState('');
    const [providerToken, setProviderToken] = useState<string | null>(null);

    // Load emails when connected — use stored token from sessionStorage (set by App.tsx)
    useEffect(() => {
        if (isConnectedProp) {
            setIsConnected(true);
            const load = async () => {
                // First try the stored token (most reliable — set by App.tsx when OAuth returned)
                let token = sessionStorage.getItem('muse_gmail_token');

                // Fallback: try session
                if (!token) {
                    const { data: { session } } = await supabase.auth.getSession();
                    token = session?.provider_token || null;
                }

                if (token) {
                    setProviderToken(token);
                    loadEmails(token);
                } else {
                    console.warn("EmailStudio: No gmail token found anywhere");
                }
            };
            load();
        }
    }, [isConnectedProp]);

    const handleConnect = async () => {
        if (userTier !== 'SHOWRUNNER') {
            alert("Gmail integration is a Showrunner feature.");
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (user?.email !== 'auraassistantai@auradomo.com') {
            alert('Gmail integration is currently in restricted beta (Admin only). We are working on verification.');
            return;
        }

        console.log("Initiating Gmail OAuth...");
        sessionStorage.setItem('muse_connecting_gmail', 'true'); // Flag to auto-connect on return
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                scopes: 'https://www.googleapis.com/auth/gmail.modify',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
        if (error) console.error("OAuth Error:", error);
    };

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ... (inside loadEmails)
    const loadEmails = async (token: string, currentView: 'INBOX' | 'SENT' = view) => {
        setIsLoading(true);
        setErrorMsg(null);
        setEmails([]);
        try {
            console.log(`EmailStudio: Loading emails for view: ${currentView}`);
            const query = currentView === 'INBOX' ? 'in:inbox' : 'label:SENT';
            // Switched back to label:SENT as it is the API standard
            const msgs = await gmailService.listMessages(token, 50, query);
            console.log(`EmailStudio: Loaded ${msgs.length} messages for ${currentView}`);
            setEmails(msgs);
        } catch (error) {
            console.error("Failed to load emails:", error);
            setErrorMsg((error as any).message || 'Failed to load emails');

            // If error is 401/403, might need to reconnect
            if ((error as any).message?.includes('401') || (error as any).message?.includes('403')) {
                setIsConnected(false);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendReply = async () => {
        if (!providerToken || !selectedEmail || !replyDraft) return;
        setIsLoading(true);
        try {
            await gmailService.sendEmail(
                providerToken,
                selectedEmail.from, // Reply to sender
                `Re: ${selectedEmail.subject}`,
                replyDraft
            );
            alert('Reply sent successfully!');
            setReplyDraft('');
            // reload to show sent? or just close
        } catch (error) {
            alert('Failed to send email. Check console.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateDraft = async () => {
        if (!selectedEmail) return;
        setIsLoading(true);
        try {
            const prompt = `
            Reply to ${selectedEmail.from}.
            
            THEIR EMAIL:
            """${selectedEmail.body}"""
            
            MY INTENT:
            Write a professional, human-sounding reply.
            - Match their tone (if casual, be casual; if formal, be formal).
            - Answer their key points directly.
            - Sign off as "[Your Name]".
            `;

            const text = await generateEmailDraft(prompt);
            setReplyDraft(text);
        } catch (error) {
            console.error("AI Draft Error:", error);
            alert("Failed to generate draft. Check console.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- RENDER ---

    const bgColor = isDark ? 'bg-[#0e0e12]' : 'bg-white';
    const textColor = isDark ? 'text-gray-200' : 'text-gray-900';
    const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';
    const itemHover = isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100';

    if (!isConnected) {
        // This should rarely show — connection is handled by ProjectSelector's "Connect Gmail" button.
        // If we get here, just show a brief loading state.
        return (
            <div className={`h-full flex flex-col items-center justify-center p-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="animate-spin w-8 h-8 border-2 border-muse-500 border-t-transparent rounded-full mb-4"></div>
                <p className="text-sm">Loading inbox...</p>
            </div>
        );
    }

    return (
        <div className={`flex h-full w-full max-h-screen overflow-hidden ${bgColor} ${textColor}`}>

            {/* MESSAGE LIST - Left Panel */}
            <div className={`w-1/3 min-w-[300px] border-r ${borderColor} flex flex-col`}>
                <div className="p-4 border-b border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-serif font-bold text-xl">
                            {view === 'INBOX' ? 'Inbox' : 'Sent Items'}
                        </h2>
                        <div className="flex bg-gray-800 rounded-lg p-1 text-xs font-bold">
                            <button
                                onClick={() => { setView('INBOX'); if (providerToken) loadEmails(providerToken, 'INBOX'); }}
                                className={`px-3 py-1 rounded-md transition-all ${view === 'INBOX' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                Inbox
                            </button>
                            <button
                                onClick={() => { setView('SENT'); if (providerToken) loadEmails(providerToken, 'SENT'); }}
                                className={`px-3 py-1 rounded-md transition-all ${view === 'SENT' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                Sent
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{emails.length} Messages</span>
                        <button onClick={() => providerToken && loadEmails(providerToken, view)} className="hover:text-blue-400">Refresh</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Scanning Neural Network...</div>
                    ) : errorMsg ? (
                        <div className="p-8 text-center text-red-400 text-sm">
                            <p className="font-bold mb-2">Error Loading Messages</p>
                            <p>{errorMsg}</p>
                            <button onClick={() => providerToken && loadEmails(providerToken, view)} className="mt-4 text-blue-400 underline">Try Again</button>
                        </div>
                    ) : emails.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            <p>No messages found in {view === 'INBOX' ? 'Inbox' : 'Sent'}.</p>
                        </div>
                    ) : (
                        emails.map(email => (
                            <div
                                key={email.id}
                                onClick={() => setSelectedEmail(email)}
                                className={`p-4 border-b ${borderColor} cursor-pointer transition-colors ${selectedEmail?.id === email.id ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : itemHover} ${email.isUnread ? 'font-semibold' : 'opacity-80'}`}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="truncate max-w-[70%] text-sm">{email.from.split('<')[0]}</span>
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap">{new Date(parseInt(email.internalDate)).toLocaleDateString()}</span>
                                </div>
                                <div className="text-sm mb-1 truncate">{email.subject || '(No Subject)'}</div>
                                <div className="text-xs text-gray-500 line-clamp-2">{email.snippet}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* READING PANE - Right Panel */}
            <div className="flex-1 flex flex-col h-full bg-opacity-50 bg-black/5">
                {selectedEmail ? (
                    <>
                        {/* Header */}
                        <div className={`p-6 border-b ${borderColor}`}>
                            <h2 className="text-2xl font-serif font-bold mb-4">{selectedEmail.subject}</h2>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                                    {selectedEmail.from[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-bold text-sm">{selectedEmail.from}</div>
                                    <div className="text-xs text-gray-500">To: {selectedEmail.to} • {new Date(parseInt(selectedEmail.internalDate)).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-8 whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-300">
                            {selectedEmail.body}
                        </div>

                        {/* Reply Area */}
                        <div className={`p-4 border-t ${borderColor} bg-gray-900/50`}>
                            {replyDraft ? (
                                <div className="animate-fade-in-up">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                                            AI Draft Generated
                                        </div>
                                        <button onClick={() => setReplyDraft('')} className="text-xs text-gray-500 hover:text-white">Discard</button>
                                    </div>
                                    <textarea
                                        value={replyDraft}
                                        onChange={(e) => setReplyDraft(e.target.value)}
                                        className="w-full h-32 bg-black/20 border border-gray-700 rounded-lg p-3 text-sm focus:border-purple-500 focus:outline-none resize-none mb-3 font-sans"
                                    />
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={handleSendReply}
                                            disabled={isLoading}
                                            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-md font-bold text-xs flex items-center gap-2"
                                        >
                                            {isLoading ? 'Sending...' : 'Approve & Send'}
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleGenerateDraft}
                                        className="flex-1 py-3 border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 group"
                                    >
                                        <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        Auto-Draft Reply with AI
                                    </button>
                                    <button
                                        onClick={() => setReplyDraft('\n\n\n- Sent via Muse')}
                                        className="px-6 py-3 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
                                    >
                                        Write Manually
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                        <svg className="w-24 h-24 mb-6 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                        </svg>
                        <p>Select a message to open the secure channel.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmailStudio;
