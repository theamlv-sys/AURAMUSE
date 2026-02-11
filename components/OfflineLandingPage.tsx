import React from 'react';

const OfflineLandingPage = ({ onSelectTier, onNavigateLegal }: any) => {
    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center overflow-hidden font-sans text-white">
            <div className="absolute inset-0 z-0 opacity-50 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center">
                <div className="flex gap-4 mb-8">
                    {['M', 'U', 'S', 'E'].map((letter, i) => (
                        <span key={i} className="font-serif font-bold text-6xl md:text-9xl text-transparent bg-clip-text bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600 drop-shadow-2xl">
                            {letter}
                        </span>
                    ))}
                </div>

                <div className="mt-8 text-center px-4">
                    <p className="text-sm font-sans tracking-[0.4em] text-amber-100/60 uppercase mb-4">
                        System Offline
                    </p>
                    <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg max-w-md mx-auto backdrop-blur-sm">
                        <p className="text-red-200 text-xs mb-2 font-bold uppercase tracking-wider">Connection Error (522)</p>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            The creative universe is currently unreachable due to a backend outage (Disk IO Budget Depleted).
                            <br /><br />
                            Please try again later.
                        </p>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 w-full p-4 flex justify-between items-center text-[10px] text-gray-500 z-50">
                <div>Offline Mode • AuraDomoMuse</div>
            </div>
        </div>
    );
};

export default OfflineLandingPage;
