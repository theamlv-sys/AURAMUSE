import React, { useState, useEffect } from 'react';
import { googleCalendarService } from '../services/googleCalendarService';
import { supabase } from '../services/supabaseClient';
import { useLive } from '../hooks/useLive';
import { ProjectType, SubscriptionTier } from '../types';

interface CalendarModeProps {
    onBack: () => void;
    userTier?: SubscriptionTier;
    providerToken?: string;
    gmailToken?: string;
}

const CalendarMode: React.FC<CalendarModeProps> = ({ onBack, userTier = 'FREE', providerToken, gmailToken }) => {
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    // Add/Edit Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventDesc, setNewEventDesc] = useState('');

    useEffect(() => {
        if (providerToken) {
            loadEvents();
        } else {
            setIsLoading(false);
            setError("Google Calendar access required. Please sign in again.");
        }
    }, [providerToken]);

    const loadEvents = async () => {
        if (!providerToken) return;
        setIsLoading(true);
        try {
            const items = await googleCalendarService.listEvents(providerToken);
            setEvents(items);
            setError('');
        } catch (err: any) {
            console.error(err);
            setError('Failed to load events. ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateEvent = async () => {
        if (userTier !== 'SHOWRUNNER') {
            alert("Creating events is a Showrunner feature.");
            return;
        }
        if (!newEventTitle || !newEventDate || !providerToken) return;

        try {
            const start = new Date(newEventDate);
            const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour default

            await googleCalendarService.createEvent(providerToken, {
                summary: newEventTitle,
                description: newEventDesc,
                start: start.toISOString(),
                end: end.toISOString()
            });

            setShowAddModal(false);
            setNewEventTitle('');
            setNewEventDate('');
            setNewEventDesc('');
            loadEvents();
        } catch (err: any) {
            alert("Failed to create event: " + err.message);
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm("Are you sure you want to delete this event?") || !providerToken) return;
        try {
            await googleCalendarService.deleteEvent(providerToken, eventId);
            loadEvents();
        } catch (err: any) {
            alert("Failed to delete event: " + err.message);
        }
    };

    const handleAuthorize = async () => {
        if (userTier !== 'SHOWRUNNER') {
            alert("Google Calendar integration is a Showrunner feature.");
            return;
        }



        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                scopes: 'https://www.googleapis.com/auth/calendar',
                queryParams: { access_type: 'offline', prompt: 'consent select_account' },
            }
        });
    };

    // Calendar Grid Logic
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];

        // Pad empty days at start
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }

        // Days of month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const days = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Filter events for selected date
    const selectedDateEvents = events.filter(evt => {
        if (!selectedDate) return false;
        const evtDate = new Date(evt.start.dateTime || evt.start.date);
        return evtDate.getDate() === selectedDate.getDate() &&
            evtDate.getMonth() === selectedDate.getMonth() &&
            evtDate.getFullYear() === selectedDate.getFullYear();
    });

    // --- AURA ASSISTANT (VOICE) ---
    const { isActive: isVoiceActive, isConnecting, start: startVoice, stop: stopVoice } = useLive({
        onUpdateEditor: () => { }, // No editor in Calendar
        onAppendEditor: () => { },
        onTriggerSearch: async () => "Search disabled in Calendar",
        onConfigureTTS: () => { },
        editorContent: JSON.stringify(events.slice(0, 5)), // Context: next 5 events
        assets: [],
        projectType: ProjectType.NOTES, // Reuse generic mode or add CALENDAR type if strict
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

    return (
        <div className="flex flex-col h-screen bg-[#0d1117] text-gray-200 font-sans">
            {/* Header */}
            <header className="flex items-center justify-between px-8 py-6 border-b border-gray-800 bg-[#0d1117]/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <h1 className="text-2xl font-serif font-bold text-white tracking-tight">Production Schedule</h1>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleVoice}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${isVoiceActive ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-muse-500 hover:bg-muse-500/10'}`}
                        title={userTier === 'SHOWRUNNER' ? "Toggle Aura Assistant" : "Upgrade to use Voice"}
                    >
                        {isConnecting ? 'Connecting...' : isVoiceActive ? 'Listening' : 'Aura Voice'}
                        <span className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-red-500' : 'bg-gray-600'}`}></span>
                    </button>

                    <button
                        onClick={() => {
                            if (userTier !== 'SHOWRUNNER') {
                                alert("Calendar features are for Showrunners only.");
                                return;
                            }
                            setShowAddModal(true);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg ${userTier === 'SHOWRUNNER' ? 'bg-muse-600 hover:bg-muse-500 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Event
                    </button>
                    <button onClick={handleAuthorize} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-all shadow-lg ml-2">
                        {providerToken ? 'Reconnect Google' : 'Connect Google'}
                    </button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* CALENDAR GRID */}
                <div className="flex-1 flex flex-col p-8 border-r border-gray-800">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">{monthName}</h2>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-gray-800 rounded-lg">&lt;</button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs hover:bg-gray-800 rounded-lg">Today</button>
                            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-gray-800 rounded-lg">&gt;</button>
                        </div>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 mb-2 text-center">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="text-xs font-bold text-gray-500 uppercase">{d}</div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-px bg-gray-800 border border-gray-800 rounded-lg overflow-hidden">
                        {days.map((day, i) => {
                            if (!day) return <div key={i} className="bg-[#0d1117]"></div>;

                            const isSelected = selectedDate && day.getDate() === selectedDate.getDate() && day.getMonth() === selectedDate.getMonth();
                            const isToday = new Date().toDateString() === day.toDateString();

                            const dayEvents = events.filter(e => {
                                const d = new Date(e.start.dateTime || e.start.date);
                                return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
                            });

                            return (
                                <div
                                    key={i}
                                    onClick={() => setSelectedDate(day)}
                                    className={`bg-[#0d1117] p-2 cursor-pointer hover:bg-white/5 transition-colors relative flex flex-col items-start justify-start ${isSelected ? 'ring-1 ring-inset ring-muse-500' : ''}`}
                                >
                                    <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-muse-600 text-white' : 'text-gray-400'}`}>
                                        {day.getDate()}
                                    </span>
                                    {dayEvents.map(e => (
                                        <div key={e.id} className="w-full text-[10px] bg-muse-900/50 text-muse-200 px-1 py-0.5 rounded truncate mb-0.5 border-l-2 border-muse-500">
                                            {e.summary}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* SIDEBAR DETAILS */}
                <div className="w-80 bg-[#161b22] p-6 overflow-y-auto">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                        {selectedDate ? selectedDate.toDateString() : 'Select a date'}
                    </h3>

                    <div className="space-y-4">
                        {selectedDateEvents.length === 0 ? (
                            <div className="text-gray-600 text-sm">No events scheduled.</div>
                        ) : (
                            selectedDateEvents.map((evt: any) => (
                                <div key={evt.id} className="p-3 bg-[#0d1117] border border-gray-800 rounded-lg group hover:border-muse-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-muse-200 text-sm">{evt.summary}</h4>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteEvent(evt.id); }}
                                            className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete Event"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                    <div className="text-xs text-muse-400 mb-2">
                                        {new Date(evt.start.dateTime || evt.start.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2">{evt.description}</p>
                                </div>
                            ))
                        )}
                    </div>

                    {!providerToken && (
                        <div className="mt-8 p-4 bg-red-900/20 border border-red-500/20 rounded-lg text-center">
                            <p className="text-red-400 text-xs mb-3">Calendar not connected</p>
                            <button onClick={handleAuthorize} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded uppercase">Connect Google</button>
                        </div>
                    )}
                </div>
            </main>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
                    <div className="relative w-full max-w-md bg-[#161b22] border border-gray-700 rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-6">Add Event</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                                <input
                                    className="w-full bg-[#0d1117] border border-gray-700 rounded-lg p-3 text-white focus:border-muse-500 outline-none"
                                    type="text"
                                    value={newEventTitle}
                                    onChange={e => setNewEventTitle(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date & Time</label>
                                <input
                                    className="w-full bg-[#0d1117] border border-gray-700 rounded-lg p-3 text-white focus:border-muse-500 outline-none"
                                    type="datetime-local"
                                    value={newEventDate}
                                    onChange={e => setNewEventDate(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-bold">Cancel</button>
                                <button onClick={handleCreateEvent} className="px-6 py-2 bg-muse-600 hover:bg-muse-500 text-white rounded-lg text-sm font-bold">Create</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarMode;
