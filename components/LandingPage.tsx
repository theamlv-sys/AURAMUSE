import React, { useState, useEffect } from 'react';
import { SubscriptionTier, TIERS } from '../types';
import { supabase } from '../services/supabaseClient';

interface LandingPageProps {
    onSelectTier: (tier: SubscriptionTier) => void;
    onNavigateLegal?: (mode: 'LEGAL_PRIVACY' | 'LEGAL_TERMS') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectTier, onNavigateLegal }) => {
    const [stage, setStage] = useState<'writing' | 'login' | 'pricing'>('writing');
    const [error, setError] = useState('');
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    // Animation sequence & Session Check
    // Animation sequence & Session Check
    useEffect(() => {
        const checkSession = async () => {
            // Check for redirect hash FIRST
            if (window.location.hash && window.location.hash.includes('access_token')) {
                // Let App.tsx handle it. Just stay in 'checking' mode or show spinner.
                // Do nothing here, isChecking=true will keep the screen black/loading if handled correctly,
                // or we can render a specific verifying state.
                return;
            }

            // Supabase Session Check
            const { data: { session } } = await supabase.auth.getSession();
            // const session = null; // Removed offline override
            setIsChecking(false);

            if (session) {
                setStage('pricing');
                return;
            }

            // Only do animation if NOT logged in
            const timer = setTimeout(() => {
                setStage('login');
            }, 3500);
            return () => clearTimeout(timer);
        };

        checkSession();
    }, []);

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                scopes: 'email profile', // Minimal scopes for initial login
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent select_account',
                },
            }
        });
        if (error) setError(error.message);
    };

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center overflow-hidden font-sans text-white">

            {/* ------------------- BACKGROUND VIDEO LAYER ------------------- */}
            <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${stage === 'pricing' ? 'opacity-0' : 'opacity-100'} overflow-hidden`}>
                <video
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover animate-slow-zoom"
                    src="/veo31-e2145206-a707-4d81-b3b7-80cbb48a1045.mp4#t=1"
                    onEnded={(e) => {
                        e.currentTarget.currentTime = 1;
                        e.currentTarget.play();
                    }}
                />
                <div className="absolute inset-0 bg-black/80" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)] opacity-70" />
            </div>

            {/* ------------------- SCENE 1 & BACKGROUND: WRITING/LOGO ------------------- */}
            <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 z-10 ${stage === 'pricing' ? 'opacity-0 scale-150 pointer-events-none' :
                    stage === 'login' ? 'opacity-90 blur-0 scale-90 -translate-y-32' :
                        'opacity-100 blur-0 scale-100'
                    }`}
            >
                <div className="relative w-[400px] h-[300px] flex flex-col items-center justify-center perspective-1000">

                    <div className="relative z-10 flex gap-4 animate-[fade-in-up_1s_ease-out_forwards]">
                        {['M', 'U', 'S', 'E'].map((letter, i) => (
                            <span
                                key={i}
                                className="font-serif font-bold text-6xl md:text-9xl text-transparent bg-clip-text bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600 drop-shadow-2xl letter-anim"
                                style={{ animationDelay: `${0.5 + i * 0.8}s` }}
                            >
                                {letter}
                            </span>
                        ))}
                    </div>

                    <div className="mt-8 opacity-0 animate-[fade-in-up_1s_ease-out_forwards]" style={{ animationDelay: '3.8s' }}>
                        <p className="text-[10px] md:text-xs font-sans tracking-[0.4em] text-amber-100/60 uppercase">
                            Powered by <span className="text-amber-400 font-semibold glow-text">Auradomo</span>
                        </p>
                    </div>

                    {/* NEW LOGIN BUTTON PLACEMENT */}
                    {stage === 'login' && !isChecking && (
                        <div className="mt-12 animate-fade-in flex flex-col items-center gap-4">
                            <button
                                onClick={handleGoogleLogin}
                                className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Sign in with Google
                            </button>
                            {error && <div className="text-red-500 text-[9px] font-bold tracking-widest animate-pulse bg-black/50 px-3 py-1 rounded">{error}</div>}
                        </div>
                    )}

                    <div className={`pencil-container ${stage !== 'writing' ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}>
                        <div className="pencil">
                            <div className="pencil-point"></div>
                            <div className="pencil-cone"></div>
                            <div className="pencil-body"></div>
                            <div className="pencil-eraser"></div>
                        </div>
                    </div>

                </div>
            </div>

            {/* ------------------- SCENE 3: PRICING TIERS ------------------- */}
            <div
                className={`relative z-20 w-full max-w-7xl px-4 transition-all duration-1000 transform ${stage === 'pricing' && !isFadingOut ? 'opacity-100 translate-y-0 scale-100 blur-0' : 'opacity-0 translate-y-20 scale-95 pointer-events-none'}`}
            >
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-7xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mb-6 tracking-tight drop-shadow-2xl">
                        Choose Your Engine
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
                        Unlock the world's most advanced AI creative suite.
                        <br /><span className="text-amber-500/80">Select a plan to initialize your workspace.</span>
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
                    <TierCard
                        tier="SCRIBE"
                        price={TIERS.SCRIBE.price}
                        name={TIERS.SCRIBE.name}
                        description="For novelists & writers."
                        features={['Unlimited AI Writing', 'Story Bible Context', '20 Images/mo', 'Basic Audio (1k chars/gen)']}
                        onSelect={() => onSelectTier('SCRIBE')}
                        delay={100}
                    />

                    <TierCard
                        tier="AUTEUR"
                        price={TIERS.AUTEUR.price}
                        name={TIERS.AUTEUR.name}
                        description="For visual storytellers."
                        features={['Everything in Scribe', '50 Images/mo', '3 Veo 3.1 Videos/mo', '20m Advanced Voice Mode', 'Advanced Audio (5k chars/gen)']}
                        featured
                        onSelect={() => onSelectTier('AUTEUR')}
                        delay={200}
                    />

                    <TierCard
                        tier="SHOWRUNNER"
                        price={TIERS.SHOWRUNNER.price}
                        name={TIERS.SHOWRUNNER.name}
                        description="For production power."
                        features={['Everything in Auteur', '200 Images/mo', '10 Veo 3.1 Videos/mo', '100m Voice Mode', 'Studio Pro (15k chars/gen)']}
                        onSelect={() => onSelectTier('SHOWRUNNER')}
                        delay={300}
                    />
                </div>

                <div className="text-center animate-fade-in" style={{ animationDelay: '1s' }}>
                    <button
                        onClick={() => onSelectTier('FREE')}
                        className="text-gray-400 hover:text-white text-xs uppercase tracking-[0.2em] transition-colors border-b border-transparent hover:border-white pb-1"
                    >
                        Continue as Visitor (Restricted Access)
                    </button>
                </div>
            </div>

            {/* ------------------- FOOTER ------------------- */}
            <div className={`fixed bottom-0 w-full p-4 flex justify-between items-center text-[10px] text-gray-500 z-50 transition-opacity duration-1000 ${stage === 'pricing' ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex gap-4">
                    <button onClick={() => onNavigateLegal?.('LEGAL_PRIVACY')} className="hover:text-amber-500 transition-colors uppercase tracking-widest">Privacy Policy</button>
                    <button onClick={() => onNavigateLegal?.('LEGAL_TERMS')} className="hover:text-amber-500 transition-colors uppercase tracking-widest">Terms of Service</button>
                </div>
                <div>
                    © 2026 AuraDomoMuse
                </div>
            </div>

            <style>{`
        .perspective-1000 { perspective: 1000px; }
        .letter-anim { opacity: 0; animation: letter-reveal 0.1s forwards; }
        @keyframes letter-reveal { to { opacity: 1; } }
        .pencil-container { position: absolute; top: 50%; left: 50%; width: 0; height: 0; z-index: 50; animation: write-sim 3.5s linear forwards; }
        @keyframes write-sim {
            0% { transform: translate(-150px, 0px); opacity: 0; }
            10% { transform: translate(-150px, 0px); opacity: 1; }
            20% { transform: translate(-125px, -20px); }
            30% { transform: translate(-100px, 10px); }
            33% { transform: translate(-60px, 10px); } 
            40% { transform: translate(-60px, -20px); }
            50% { transform: translate(-20px, 10px); }
            53% { transform: translate(20px, 10px); }
            60% { transform: translate(40px, -20px); }
            70% { transform: translate(60px, 10px); }
            73% { transform: translate(100px, 10px); }
            80% { transform: translate(100px, -20px); }
            90% { transform: translate(140px, 10px); opacity: 1; }
            100% { transform: translate(200px, 50px); opacity: 0; }
        }
        .pencil { position: absolute; top: -120px; left: -12px; width: 24px; height: 160px; transform-style: preserve-3d; transform: rotateZ(20deg) rotateX(20deg); }
        .pencil-body { position: absolute; width: 100%; height: 70%; background: linear-gradient(90deg, #d97706, #fbbf24, #d97706); top: 0; border-radius: 2px; box-shadow: 5px 5px 10px rgba(0,0,0,0.5); }
        .pencil-cone { position: absolute; top: 70%; width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent; border-top: 35px solid #fde68a; }
        .pencil-point { position: absolute; top: 91%; left: 8px; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 12px solid #1f2937; }
        .pencil-eraser { position: absolute; top: -25px; width: 100%; height: 25px; background: #f87171; border-bottom: 5px solid #d1d5db; border-radius: 4px 4px 0 0; }
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-in { animation: fade-in 1s ease-out forwards; opacity: 0; }
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        .glow-text { text-shadow: 0 0 10px rgba(251, 191, 36, 0.5); }
        .animate-slow-zoom { animation: slow-zoom 15s ease-in-out alternate infinite; }
        @keyframes slow-zoom { 0% { transform: scale(1); } 100% { transform: scale(1.15); } }
      `}</style>
        </div>
    );
};

const TierCard = ({ tier, price, name, description, features, featured, onSelect, delay }: any) => (
    <div
        className={`relative flex flex-col p-8 rounded-3xl cursor-pointer transition-all duration-500 transform hover:scale-105 animate-fade-in ${featured ? 'bg-gradient-to-b from-gray-800/80 to-gray-900/90 border-2 border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.15)] backdrop-blur-sm' : 'bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-sm'}`}
        style={{ animationDelay: `${delay}ms` }}
    >
        {featured && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-black text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-amber-500/50">
                Recommended
            </div>
        )}
        <h3 className={`text-2xl font-serif font-bold mb-2 ${featured ? 'text-white' : 'text-gray-200'}`}>{name}</h3>
        <div className="flex items-baseline mb-4">
            <span className="text-5xl font-bold text-white">${price}</span>
            <span className="text-sm text-gray-500 ml-1 font-medium">/mo</span>
        </div>
        <p className="text-sm text-gray-400 mb-8 font-light">{description}</p>
        <div className="space-y-4 mb-8 flex-1">
            {features.map((feat: string, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="text-amber-500 font-bold">✓</span>
                    {feat}
                </div>
            ))}
        </div>
        <button
            onClick={onSelect}
            className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-[0.15em] transition-all duration-300 ${featured ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20' : 'bg-white text-black hover:bg-gray-200 shadow-lg'}`}
        >
            Select {name}
        </button>
    </div>
);

export default LandingPage;