import React, { useEffect, useState } from 'react';
import { Key, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ApiKeyGuardProps {
  children: React.ReactNode;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export function ApiKeyGuard({ children }: ApiKeyGuardProps) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const checkKey = async () => {
    try {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } catch (error) {
      console.error('Error checking API key:', error);
      setHasKey(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Assume success and proceed as per guidelines to avoid race conditions
      setHasKey(true);
    } catch (error) {
      console.error('Error opening key selector:', error);
    }
  };

  if (isChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0502]">
        <div className="animate-pulse text-white/50 font-mono text-sm tracking-widest uppercase">
          Verifying Credentials...
        </div>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0502] p-6">
        <div className="atmosphere absolute inset-0" />
        <div className="glass-panel max-w-md w-full p-8 rounded-3xl space-y-8 relative z-10">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
              <Key className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-serif italic text-glow">MotionSVG AI</h1>
            <p className="text-white/60 text-sm leading-relaxed">
              To generate high-quality SVG motion graphics with Gemini 3.1, you may need to select an API key if you are using a paid project.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleSelectKey}
              className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-medium transition-all flex items-center justify-center gap-2 group shadow-lg shadow-orange-600/20"
            >
              <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Select API Key
            </button>
            
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-center text-xs text-white/40 hover:text-white/60 underline underline-offset-4"
            >
              Learn about billing and paid projects
            </a>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <AlertCircle className="w-5 h-5 text-white/40 shrink-0" />
            <p className="text-[10px] text-white/40 uppercase tracking-wider leading-normal">
              Note: The preview environment requires a valid Google Cloud project with billing enabled for video generation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
