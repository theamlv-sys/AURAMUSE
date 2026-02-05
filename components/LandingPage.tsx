import React, { useState, useEffect } from 'react';
import { SubscriptionTier, TIERS } from '../types';

interface LandingPageProps {
  onSelectTier: (tier: SubscriptionTier) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectTier }) => {
  const [stage, setStage] = useState<'writing' | 'login' | 'pricing'>('writing');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Animation sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setStage('login');
    }, 3500); // 3.5s writing duration
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (accessCode === '1111') {
          setIsFadingOut(true);
          setTimeout(() => {
              setStage('pricing');
              setIsFadingOut(false);
          }, 800);
      } else {
          setError('Access Denied');
          setAccessCode('');
          setTimeout(() => setError(''), 2000);
      }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center overflow-hidden font-sans text-white">
      
      {/* ------------------- BACKGROUND VIDEO LAYER ------------------- */}
      <div className="absolute inset-0 z-0">
          <video 
              autoPlay 
              muted 
              loop 
              playsInline 
              className="w-full h-full object-cover opacity-100"
              src="https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-vintage-typewriter-2747-large.mp4"
          />
          {/* Lighter Dark Overlay for Visibility */}
          <div className="absolute inset-0 bg-black/50" />
          {/* Subtle Radial Vignette for Focus */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)] opacity-70" />
      </div>
      
      {/* ------------------- SCENE 1 & BACKGROUND: WRITING/LOGO ------------------- */}
      {/* Moves up slightly during login to make room for the form below */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 z-10 ${
            stage === 'pricing' ? 'opacity-0 scale-150 pointer-events-none' : 
            stage === 'login' ? 'opacity-90 blur-0 scale-90 -translate-y-16' : 
            'opacity-100 blur-0 scale-100'
        }`}
      >
        <div className="relative w-[300px] h-[200px] flex items-center justify-center">
          
          {/* SVG LOGO PATH */}
          <svg width="400" height="200" viewBox="0 0 400 200" className="z-10 overflow-visible">
            <defs>
              <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <text 
              x="50%" 
              y="50%" 
              dominantBaseline="middle" 
              textAnchor="middle" 
              fontSize="100" 
              fontFamily="Serif" 
              fontWeight="bold"
              fill="transparent"
              stroke="url(#gold-gradient)"
              strokeWidth="2"
              className="draw-text tracking-widest"
              filter="url(#glow)"
            >
              MUSE
            </text>
          </svg>

          {/* 3D PENCIL COMPONENT (Fades out when writing is done so it doesn't block the view) */}
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

      {/* ------------------- SCENE 2: LOGIN GATE ------------------- */}
      {/* Positioned slightly below center (mt-32) to sit under the lifted logo */}
      {stage === 'login' && (
          <div className={`z-20 mt-32 w-64 transition-all duration-1000 transform ${isFadingOut ? 'opacity-0 scale-95 translate-y-[20px]' : 'opacity-100 scale-100 translate-y-0'}`}>
              <div className="bg-black/30 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-2xl shadow-black text-center">
                  <p className="text-gray-400 text-[10px] uppercase tracking-[0.3em] mb-4">Identify</p>

                  <form onSubmit={handleLogin} className="space-y-4">
                      <div className="relative group">
                          <input 
                              type="password" 
                              value={accessCode}
                              onChange={(e) => setAccessCode(e.target.value)}
                              placeholder="CODE"
                              className="w-full bg-transparent border-b border-gray-600 focus:border-amber-500 px-2 py-2 text-center text-sm text-white tracking-[0.5em] focus:outline-none transition-all placeholder:text-gray-700 placeholder:tracking-normal placeholder:text-xs"
                              autoFocus
                          />
                      </div>
                      
                      {error && <div className="text-red-400 text-[9px] font-bold tracking-widest animate-pulse mt-2">{error}</div>}

                      <button 
                          type="submit"
                          className="w-full mt-2 bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-medium py-2 rounded transition-all uppercase tracking-widest border border-white/5 hover:border-white/20"
                      >
                          Enter
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* ------------------- SCENE 3: PRICING TIERS ------------------- */}
      <div 
        className={`relative z-20 w-full max-w-7xl px-4 transition-all duration-1000 transform ${stage === 'pricing' && !isFadingOut ? 'opacity-100 translate-y-0 scale-100 blur-0' : 'opacity-0 translate-y-20 scale-95 pointer-events-none'}`}
      >
        <div className="text-center mb-16">
            <h1 className="text-6xl md:text-7xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mb-6 tracking-tight drop-shadow-2xl">
              Choose Your Engine
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
              Unlock the world's most advanced AI creative suite.
              <br/><span className="text-amber-500/80">Select a plan to initialize your workspace.</span>
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
            {/* Scribe */}
            <TierCard 
                tier="SCRIBE" 
                price={TIERS.SCRIBE.price} 
                name={TIERS.SCRIBE.name}
                description="For novelists & writers."
                features={['Unlimited AI Writing', 'Story Bible Context', '20 Images/mo', 'Basic Audio']}
                onSelect={() => onSelectTier('SCRIBE')}
                delay={100}
            />

            {/* Auteur (Featured) */}
            <TierCard 
                tier="AUTEUR" 
                price={TIERS.AUTEUR.price} 
                name={TIERS.AUTEUR.name}
                description="For visual storytellers."
                features={['Everything in Scribe', '100 Images/mo', '5 Veo Videos/mo', 'Ensemble Cast Audio', 'Advanced Voice Mode']}
                featured
                onSelect={() => onSelectTier('AUTEUR')}
                delay={200}
            />

            {/* Showrunner */}
            <TierCard 
                tier="SHOWRUNNER" 
                price={TIERS.SHOWRUNNER.price} 
                name={TIERS.SHOWRUNNER.name}
                description="For production power."
                features={['Unlimited Everything', '500 Images/mo', '25 Veo Videos/mo', 'Priority Generation', 'Commercial License']}
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

      <style>{`
        /* --- WRITING ANIMATION --- */
        .draw-text {
            stroke-dasharray: 500;
            stroke-dashoffset: 500;
            animation: draw 3s ease-in-out forwards;
        }

        @keyframes draw {
            0% { stroke-dashoffset: 500; }
            100% { stroke-dashoffset: 0; }
        }

        /* --- 3D PENCIL CSS (Standard Size) --- */
        .pencil-container {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            /* Move pencil along path roughly */
            animation: write-path 3s ease-in-out forwards;
        }

        .pencil {
            position: absolute;
            top: -120px;
            left: -12px;
            width: 24px;
            height: 160px;
            transform-style: preserve-3d;
            transform: rotateZ(30deg) rotateX(20deg);
        }

        .pencil-body {
            position: absolute;
            width: 100%;
            height: 70%;
            background: linear-gradient(90deg, #d97706, #fbbf24, #d97706);
            top: 0;
            border-radius: 2px;
            box-shadow: 2px 5px 5px rgba(0,0,0,0.3);
        }

        .pencil-cone {
            position: absolute;
            top: 70%;
            width: 0;
            height: 0;
            border-left: 12px solid transparent;
            border-right: 12px solid transparent;
            border-top: 35px solid #fde68a;
        }

        .pencil-point {
            position: absolute;
            top: 91%;
            left: 8px;
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-top: 12px solid #1f2937;
        }

        .pencil-eraser {
            position: absolute;
            top: -25px;
            width: 100%;
            height: 25px;
            background: #f87171;
            border-bottom: 5px solid #d1d5db;
            border-radius: 4px 4px 0 0;
        }

        /* Adjusted path for smaller text */
        @keyframes write-path {
            0% { transform: translate(-180px, 0px); opacity: 0; }
            10% { transform: translate(-180px, 0px); opacity: 1; }
            25% { transform: translate(-90px, -25px); }
            50% { transform: translate(0px, 15px); }
            75% { transform: translate(90px, -25px); }
            90% { transform: translate(180px, 0px); opacity: 1; }
            100% { transform: translate(250px, -60px); opacity: 0; }
        }

        @keyframes fade-in {
            0% { opacity: 0; }
            100% { opacity: 1; }
        }
        .animate-fade-in {
            animation: fade-in 1s ease-out forwards;
            opacity: 0;
        }
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