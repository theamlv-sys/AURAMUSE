import React from 'react';
import { SubscriptionTier, TIERS } from '../types';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTier: SubscriptionTier;
    onUpgrade: (tier: SubscriptionTier) => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, currentTier, onUpgrade }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="w-full max-w-6xl bg-gray-950 rounded-3xl border border-gray-800 overflow-hidden flex flex-col max-h-[95vh] shadow-[0_0_50px_rgba(14,165,233,0.15)]">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gray-950/50">
                    <div>
                        <h2 className="text-4xl font-serif font-bold text-white mb-1">Scale Your Production</h2>
                        <p className="text-gray-400 text-lg">Premium features with high-performance limits. Keep 100% of your IP.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 flex flex-col gap-12 bg-gray-950">
                    {/* SUBSCRIPTION TIERS */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* VISITOR TIER */}
                        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 flex flex-col hover:border-gray-700 transition-all group">
                            <h3 className="text-xl font-bold text-white mb-1">Visitor</h3>
                            <div className="text-3xl font-bold text-white mb-3">$0<span className="text-sm text-gray-500 font-normal ml-1">/free</span></div>
                            <p className="text-xs text-gray-500 mb-6 min-h-[32px]">Browse the core engine and workspace features.</p>
                            <div className="space-y-3 mb-8 flex-1">
                                <Feature text="0 Voice Assistant Minutes" check />
                                <Feature text="0 Storyboard Images" check />
                                <Feature text="0 Veo 3.1 Videos" check />
                                <Feature text="Story Bible Mode" x />
                                <Feature text="Ensemble Cast" x />
                            </div>
                            <button
                                onClick={() => onUpgrade('FREE')}
                                disabled={currentTier === 'FREE'}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${currentTier === 'FREE' ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700 active:scale-95'}`}
                            >
                                {currentTier === 'FREE' ? 'Current' : 'Select Free'}
                            </button>
                        </div>

                        {/* SCRIBE TIER */}
                        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 flex flex-col hover:border-gray-600 transition-all group">
                            <h3 className="text-xl font-bold text-white mb-1">Scribe</h3>
                            <div className="text-3xl font-bold text-white mb-3">$29<span className="text-sm text-gray-500 font-normal ml-1">/mo</span></div>
                            <p className="text-xs text-gray-400 mb-6 min-h-[32px]">For novelists focused on depth and story bibles.</p>
                            <div className="space-y-3 mb-8 flex-1">
                                <Feature text="Unlimited AI Writing" check />
                                <Feature text="Full Story Bible Access" check />
                                <Feature text="10 Storyboard Images" check highlight />
                                <Feature text="Basic Audio (1k chars/gen)" check />
                                <Feature text="Project Sidebar" check />
                            </div>
                            <button
                                onClick={() => onUpgrade('SCRIBE')}
                                disabled={currentTier === 'SCRIBE'}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${currentTier === 'SCRIBE' ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200 active:scale-95'}`}
                            >
                                {currentTier === 'SCRIBE' ? 'Current' : 'Select Scribe'}
                            </button>
                        </div>

                        {/* AUTEUR TIER (Recommended) */}
                        <div className="bg-gray-900 border-2 border-muse-500 rounded-2xl p-6 flex flex-col relative shadow-2xl shadow-muse-500/10 transition-all group">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-muse-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-xl shadow-muse-500/30">
                                Popular
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Auteur</h3>
                            <div className="text-3xl font-bold text-white mb-3">$79<span className="text-sm text-gray-500 font-normal ml-1">/mo</span></div>
                            <p className="text-xs text-gray-400 mb-6 min-h-[32px]">Production-ready visual storytelling suite.</p>
                            <div className="space-y-3 mb-8 flex-1">
                                <Feature text="Everything in Scribe" check />
                                <Feature text="50 Bonus Images" check highlight />
                                <Feature text="3 Veo 3.1 Videos" check highlight />
                                <Feature text="20m Advanced Voice Mode" check highlight />
                                <Feature text="Advanced Audio (5k chars/gen)" check />
                            </div>
                            <button
                                onClick={() => onUpgrade('AUTEUR')}
                                disabled={currentTier === 'AUTEUR'}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${currentTier === 'AUTEUR' ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-muse-600 to-muse-400 text-white hover:shadow-lg hover:shadow-muse-500/30 active:scale-95'}`}
                            >
                                {currentTier === 'AUTEUR' ? 'Current' : 'Select Auteur'}
                            </button>
                        </div>

                        {/* SHOWRUNNER TIER */}
                        <div className="bg-gradient-to-b from-gray-900 to-black border border-purple-500/30 rounded-2xl p-6 flex flex-col hover:border-purple-500 transition-all group">
                            <h3 className="text-xl font-bold text-white mb-1">Showrunner</h3>
                            <div className="text-3xl font-bold text-white mb-3">$199<span className="text-sm text-gray-500 font-normal ml-1">/mo</span></div>
                            <p className="text-xs text-gray-400 mb-6 min-h-[32px]">Agency-grade power for large projects.</p>
                            <div className="space-y-3 mb-8 flex-1">
                                <Feature text="Everything in Auteur" check />
                                <Feature text="200 Bonus Images" check highlight />
                                <Feature text="10 Veo 3.1 Videos" check highlight />
                                <Feature text="100m Voice Talk Time" check highlight />
                                <Feature text="Studio Pro (15k chars/gen)" check highlight />
                                <Feature text="Priority Rendering Queue" check />
                            </div>
                            <button
                                onClick={() => onUpgrade('SHOWRUNNER')}
                                disabled={currentTier === 'SHOWRUNNER'}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${currentTier === 'SHOWRUNNER' ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-500/30 active:scale-95'}`}
                            >
                                {currentTier === 'SHOWRUNNER' ? 'Current' : 'Select Showrunner'}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};


const Feature = ({ text, check, x, highlight }: { text: string, check?: boolean, x?: boolean, highlight?: boolean }) => (
    <div className={`flex items-center gap-3 text-sm ${x ? 'text-gray-600' : 'text-gray-300'}`}>
        {check && <span className="text-muse-500 font-bold shrink-0">✓</span>}
        {x && <span className="text-gray-600 font-bold shrink-0">✕</span>}
        <span className={highlight ? 'text-white font-semibold' : ''}>{text}</span>
    </div>
);

export default SubscriptionModal;