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
            <div className="w-full max-w-5xl bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                     <div>
                        <h2 className="text-3xl font-serif font-bold text-white">Upgrade Your Studio</h2>
                        <p className="text-gray-400">Unlock professional power. Keep 100% of your IP.</p>
                     </div>
                     <button onClick={onClose} className="text-gray-500 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                     </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-900">
                    {/* SCRIBE TIER */}
                    <div className="bg-gray-850 border border-gray-700 rounded-2xl p-6 flex flex-col hover:border-gray-500 transition-colors">
                        <h3 className="text-xl font-bold text-white mb-2">Scribe</h3>
                        <div className="text-3xl font-bold text-white mb-4">$29<span className="text-sm text-gray-500 font-normal">/mo</span></div>
                        <p className="text-sm text-gray-400 mb-6 min-h-[40px]">For novelists and essayists who need infinite words.</p>
                        
                        <div className="space-y-3 mb-8 flex-1">
                            <Feature text="Unlimited AI Writing" check />
                            <Feature text="Story Bible (Context)" check />
                            <Feature text="Screenplay Formatting" check />
                            <Feature text="20 Images / mo" check />
                            <Feature text="Standard Voice (No Cast)" check />
                            <Feature text="Veo Video Gen" x />
                        </div>

                        <button 
                            onClick={() => onUpgrade('SCRIBE')}
                            disabled={currentTier === 'SCRIBE'}
                            className={`w-full py-3 rounded-xl font-bold ${currentTier === 'SCRIBE' ? 'bg-gray-700 text-gray-400' : 'bg-white text-black hover:bg-gray-200'}`}
                        >
                            {currentTier === 'SCRIBE' ? 'Current Plan' : 'Select Scribe'}
                        </button>
                    </div>

                    {/* AUTEUR TIER (Recommended) */}
                    <div className="bg-gray-800 border-2 border-muse-500 rounded-2xl p-6 flex flex-col relative shadow-2xl shadow-muse-900/20 transform md:-translate-y-4">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-muse-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                            Best Value
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Auteur</h3>
                        <div className="text-3xl font-bold text-white mb-4">$79<span className="text-sm text-gray-500 font-normal">/mo</span></div>
                        <p className="text-sm text-gray-400 mb-6 min-h-[40px]">For visual storytellers and YouTubers.</p>
                        
                        <div className="space-y-3 mb-8 flex-1">
                            <Feature text="Everything in Scribe" check />
                            <Feature text="100 Images / mo" check />
                            <Feature text="5 Veo Videos / mo" check highlight />
                            <Feature text="Ensemble Cast Audio" check />
                            <Feature text="Advanced Live Voice Mode" check />
                            <Feature text="Priority Support" check />
                        </div>

                        <button 
                            onClick={() => onUpgrade('AUTEUR')}
                            disabled={currentTier === 'AUTEUR'}
                            className={`w-full py-3 rounded-xl font-bold ${currentTier === 'AUTEUR' ? 'bg-gray-700 text-gray-400' : 'bg-muse-600 text-white hover:bg-muse-500'}`}
                        >
                            {currentTier === 'AUTEUR' ? 'Current Plan' : 'Select Auteur'}
                        </button>
                    </div>

                    {/* SHOWRUNNER TIER */}
                    <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-purple-500/30 rounded-2xl p-6 flex flex-col hover:border-purple-500 transition-colors">
                        <h3 className="text-xl font-bold text-white mb-2">Showrunner</h3>
                        <div className="text-3xl font-bold text-white mb-4">$199<span className="text-sm text-gray-500 font-normal">/mo</span></div>
                        <p className="text-sm text-gray-400 mb-6 min-h-[40px]">For production houses and power users.</p>
                        
                        <div className="space-y-3 mb-8 flex-1">
                            <Feature text="Everything in Auteur" check />
                            <Feature text="500 Images / mo" check />
                            <Feature text="25 Veo Videos / mo" check highlight />
                            <Feature text="Unlimited Voice Generation" check />
                            <Feature text="Early Access Models" check />
                            <Feature text="API Access" check />
                        </div>

                        <button 
                            onClick={() => onUpgrade('SHOWRUNNER')}
                            disabled={currentTier === 'SHOWRUNNER'}
                            className={`w-full py-3 rounded-xl font-bold ${currentTier === 'SHOWRUNNER' ? 'bg-gray-700 text-gray-400' : 'bg-gradient-to-r from-purple-600 to-muse-600 text-white hover:opacity-90'}`}
                        >
                            {currentTier === 'SHOWRUNNER' ? 'Current Plan' : 'Select Showrunner'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Feature = ({ text, check, x, highlight }: { text: string, check?: boolean, x?: boolean, highlight?: boolean }) => (
    <div className={`flex items-center gap-3 text-sm ${x ? 'text-gray-600' : 'text-gray-300'}`}>
        {check && <span className="text-muse-500 font-bold">✓</span>}
        {x && <span className="text-gray-600 font-bold">✕</span>}
        <span className={highlight ? 'text-white font-semibold' : ''}>{text}</span>
    </div>
);

export default SubscriptionModal;