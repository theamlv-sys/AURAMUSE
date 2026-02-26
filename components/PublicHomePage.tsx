import React, { useState, useEffect, useRef } from 'react';
import { SubscriptionTier, TIERS } from '../types';
import { supabase } from '../services/supabaseClient';

interface PublicHomePageProps {
    onSelectTier: (tier: SubscriptionTier) => void;
    onNavigateLegal?: (mode: 'LEGAL_PRIVACY' | 'LEGAL_TERMS') => void;
}

// ─── INTERSECTION OBSERVER HOOK ────────────────────────────
function useReveal() {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return { ref, visible };
}

// ─── FEATURE DATA ──────────────────────────────────────────
const FEATURES = [
    { icon: '✍️', title: 'AI Writing Engine', desc: 'Draft screenplays, novels, blogs, and newsletters with an AI co-writer — all in one workspace.' },
    { icon: '🎙️', title: 'Voice & Audio Studio', desc: 'Generate multi-speaker dialogue, podcasts, and voiceovers with 30+ AI voices. Full director mode with per-character emotion control.' },
    { icon: '🎨', title: 'Image Generation', desc: 'Create stunning visuals with advanced AI generation and style transfer. From concept art to social media graphics.' },
    { icon: '🎬', title: 'Video Generation', desc: 'Produce cinematic video clips with Google Veo. Storyboard scenes and generate match-cut sequences from your scripts.' },
    { icon: '📧', title: 'Email Command Center', desc: 'Manage, compose, and schedule Gmail campaigns with AI-powered drafting. Built-in templates and audience analysis.' },
    { icon: '📊', title: 'YouTube & Social', desc: 'Analyze channel performance, generate SEO-optimized titles, thumbnails, and cross-platform social media content.' },
];

const SHOWCASE = [
    {
        title: 'Write with Context',
        desc: 'Muse remembers your characters, world, and tone through a living Story Bible. Every AI response is grounded in YOUR creative vision — not generic output.',
        visual: '📖',
        align: 'left' as const,
    },
    {
        title: 'Direct the Performance',
        desc: 'The Audio Studio\'s Director Mode lets you set the scene, control pacing, accents, and emotional arcs for every character. It\'s a recording booth in your browser.',
        visual: '🎭',
        align: 'right' as const,
    },
    {
        title: 'All-in-One Command Center',
        desc: 'Email campaigns, YouTube analytics, social media scheduling, slide decks, newsletters, and ebooks — all generated and managed from a single AI-powered workspace.',
        visual: '🚀',
        align: 'left' as const,
    },
];

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════
const PublicHomePage: React.FC<PublicHomePageProps> = ({ onSelectTier, onNavigateLegal }) => {
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoggingIn(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                scopes: 'email profile',
                queryParams: { access_type: 'offline', prompt: 'consent select_account' },
            },
        });
        if (error) { alert(error.message); setIsLoggingIn(false); }
    };

    // Section reveals
    const hero = useReveal();
    const features = useReveal();
    const showcase0 = useReveal();
    const showcase1 = useReveal();
    const showcase2 = useReveal();
    const splineSection = useReveal();
    const pricing = useReveal();

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">

            {/* ━━━━━━━━━━━━━━━ NAVIGATION BAR ━━━━━━━━━━━━━━━ */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">MUSE</span>
                        <span className="text-[9px] text-amber-500/60 uppercase tracking-[0.3em] mt-1">by AuraDomo</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-xs text-gray-400 uppercase tracking-widest">
                        <a href="#features" className="hover:text-amber-400 transition-colors">Features</a>
                        <a href="#pricing" className="hover:text-amber-400 transition-colors">Pricing</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); onNavigateLegal?.('LEGAL_PRIVACY'); }} className="hover:text-amber-400 transition-colors">Privacy</a>
                    </div>
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoggingIn}
                        className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        {isLoggingIn ? 'Connecting...' : 'Sign In'}
                    </button>
                </div>
            </nav>

            {/* ━━━━━━━━━━━━━━━ HERO + SPLINE HEADER ━━━━━━━━━━━━━━━ */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
                {/* Cinematic video background for hero */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <video
                        autoPlay muted playsInline loop
                        className="w-full h-full object-cover"
                        style={{ filter: 'brightness(0.3) saturate(1.2)' }}
                        src="/veo31-e2145206-a707-4d81-b3b7-80cbb48a1045.mp4#t=1"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#050505]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_80%)] opacity-60" />
                </div>
                {/* Spline 3D Particles — on top of video, screen blend makes dark bg transparent */}
                <div className="absolute inset-0 z-[1]" style={{ mixBlendMode: 'screen' }}>
                    <iframe
                        src="https://my.spline.design/particles-U8Po1xhiaMhRXy6Umx9YXcsC/"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="3D Particles Background"
                        loading="eager"
                        allow="autoplay"
                    />
                </div>
                {/* Cover the Spline watermark */}
                <div className="absolute bottom-2 right-0 z-[2] bg-[#050505] px-6 py-3 rounded-tl-2xl flex items-center gap-2" style={{ minWidth: '220px', minHeight: '52px' }}>
                    <span className="text-[11px] text-gray-500 uppercase tracking-[0.3em]">Powered by</span>
                    <span className="text-sm font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">AuraDomo</span>
                </div>

                {/* Hero Content */}
                <div ref={hero.ref} className={`relative z-10 text-center max-w-4xl mx-auto px-6 transition-all duration-1000 ${hero.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="mb-6">
                        <span className="inline-block text-[10px] uppercase tracking-[0.5em] text-amber-400/80 border border-amber-500/30 px-4 py-1.5 rounded-full backdrop-blur-sm bg-amber-500/5">
                            The Executive Creative OS
                        </span>
                    </div>
                    <h1 className="text-6xl md:text-9xl font-serif font-bold mb-8 leading-none">
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 drop-shadow-2xl">MUSE</span>
                    </h1>
                    <p className="text-lg md:text-2xl text-gray-300 font-light max-w-2xl mx-auto mb-4 leading-relaxed">
                        Write. Direct. Generate. Publish.
                    </p>
                    <p className="text-sm md:text-base text-white max-w-xl mx-auto mb-12 leading-relaxed">
                        An all-in-one AI-powered creative suite for writers, filmmakers, marketers, and creators.
                        Screenplays, podcasts, images, videos, emails — one workspace, infinite possibilities.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoggingIn}
                            className="group flex items-center gap-3 px-10 py-4 rounded-full font-bold text-sm uppercase tracking-widest bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 transition-all shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:shadow-[0_0_60px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            {isLoggingIn ? 'Connecting...' : 'Log In'}
                        </button>
                        <a href="#features" className="text-xs text-gray-400 uppercase tracking-widest hover:text-amber-400 transition-colors flex items-center gap-2">
                            Explore Features <span className="text-lg">↓</span>
                        </a>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                    <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2">
                        <div className="w-1 h-2 bg-amber-400 rounded-full animate-pulse" />
                    </div>
                </div>
            </section>

            {/* ━━━━━━━━━━━━━━━ FEATURES GRID ━━━━━━━━━━━━━━━ */}
            <section id="features" className="relative py-32 px-6">
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#0a0a0f] to-[#050505]" />
                <div ref={features.ref} className={`relative z-10 max-w-6xl mx-auto transition-all duration-1000 delay-200 ${features.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
                    <div className="text-center mb-20">
                        <span className="text-[10px] uppercase tracking-[0.4em] text-amber-500/70 block mb-4">Everything You Need</span>
                        <h2 className="text-4xl md:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 mb-6">
                            One Suite. Infinite Creative Power.
                        </h2>
                        <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
                            AuraDomoMuse combines the world's most advanced AI models into a single creative operating system.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((f, i) => (
                            <div
                                key={i}
                                className="group relative p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] hover:border-amber-500/20 transition-all duration-500 hover:-translate-y-1"
                                style={{ transitionDelay: `${i * 80}ms` }}
                            >
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10">
                                    <div className="text-4xl mb-5">{f.icon}</div>
                                    <h3 className="text-lg font-bold mb-3 text-white group-hover:text-amber-300 transition-colors">{f.title}</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ━━━━━━━━━━━━━━━ DEEP-DIVE SHOWCASE ━━━━━━━━━━━━━━━ */}
            <section className="relative py-24 px-6">
                {[showcase0, showcase1, showcase2].map((rev, idx) => {
                    const item = SHOWCASE[idx];
                    const isRight = item.align === 'right';
                    return (
                        <div
                            key={idx}
                            ref={rev.ref}
                            className={`max-w-5xl mx-auto mb-32 last:mb-0 flex flex-col ${isRight ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 transition-all duration-1000 ${rev.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                        >
                            {/* Visual */}
                            <div className="flex-1 flex items-center justify-center">
                                <div className="w-48 h-48 md:w-64 md:h-64 rounded-3xl bg-gradient-to-br from-amber-500/10 to-purple-500/10 border border-white/5 flex items-center justify-center text-7xl md:text-8xl shadow-2xl shadow-amber-500/5">
                                    {item.visual}
                                </div>
                            </div>
                            {/* Text */}
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-3xl md:text-4xl font-serif font-bold text-white mb-6">{item.title}</h3>
                                <p className="text-gray-400 text-base leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* ━━━━━━━━━━━━━━━ SPLINE 3D INTERACTIVE SECTION ━━━━━━━━━━━━━━━ */}
            <section ref={splineSection.ref} className={`relative py-8 transition-all duration-1000 ${splineSection.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-8">
                        <span className="text-[10px] uppercase tracking-[0.4em] text-amber-500/70 block mb-3">Interactive Experience</span>
                        <h2 className="text-3xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
                            Creativity, Visualized
                        </h2>
                    </div>
                    <div className="relative w-full rounded-3xl overflow-hidden border border-white/5 shadow-2xl shadow-amber-500/5" style={{ height: '500px' }}>
                        <iframe
                            src="https://my.spline.design/interactivesparkletterwithparticleeffect-DvbYbyDICuH9HgKE0XImdXGb/"
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            title="Interactive 3D Spark Letter"
                            loading="lazy"
                        />
                        {/* Solid overlay to fully cover and block the Spline watermark button */}
                        <div className="absolute bottom-2 right-0 z-20 bg-[#050505] px-6 py-3 rounded-tl-2xl flex items-center gap-2" style={{ minWidth: '220px', minHeight: '52px' }}>
                            <span className="text-[11px] text-gray-500 uppercase tracking-[0.3em]">Powered by</span>
                            <span className="text-sm font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">AuraDomo</span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#050505] to-transparent z-10 pointer-events-none" />
                    </div>
                </div>
            </section>

            {/* ━━━━━━━━━━━━━━━ PRICING ━━━━━━━━━━━━━━━ */}
            <section id="pricing" className="relative py-32 px-6">
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#080810] to-[#050505]" />
                <div ref={pricing.ref} className={`relative z-10 max-w-6xl mx-auto transition-all duration-1000 ${pricing.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
                    <div className="text-center mb-16">
                        <span className="text-[10px] uppercase tracking-[0.4em] text-amber-500/70 block mb-4">Plans</span>
                        <h2 className="text-4xl md:text-7xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mb-6">
                            Choose Your Engine
                        </h2>
                        <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
                            Unlock the world's most advanced AI creative suite. Select a plan to initialize your workspace.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                        <PricingCard
                            tier="SCRIBE"
                            price={TIERS.SCRIBE.price}
                            name={TIERS.SCRIBE.name}
                            description="For novelists & writers."
                            features={['Unlimited AI Writing', 'Story Bible Context', '20 Images/mo', 'Basic Audio (1k chars/gen)']}
                            onSelect={() => { handleGoogleLogin(); }}
                            delay={100}
                        />
                        <PricingCard
                            tier="AUTEUR"
                            price={TIERS.AUTEUR.price}
                            name={TIERS.AUTEUR.name}
                            description="For visual storytellers."
                            features={['Everything in Scribe', '50 Images/mo', '3 Veo 3.1 Videos/mo', '20m Advanced Voice Mode', 'Advanced Audio (5k chars/gen)']}
                            featured
                            onSelect={() => { handleGoogleLogin(); }}
                            delay={200}
                        />
                        <PricingCard
                            tier="SHOWRUNNER"
                            price={TIERS.SHOWRUNNER.price}
                            name={TIERS.SHOWRUNNER.name}
                            description="For production power."
                            features={['Everything in Auteur', '200 Images/mo', '10 Veo 3.1 Videos/mo', '100m Voice Mode', 'Studio Pro (15k chars/gen)']}
                            onSelect={() => { handleGoogleLogin(); }}
                            delay={300}
                        />
                    </div>
                    <div className="text-center">
                        <button
                            onClick={() => { handleGoogleLogin(); }}
                            className="text-gray-400 hover:text-white text-xs uppercase tracking-[0.2em] transition-colors border-b border-transparent hover:border-white pb-1"
                        >
                            Log In — No Credit Card Required
                        </button>
                    </div>
                </div>
            </section>

            {/* ━━━━━━━━━━━━━━━ FOOTER ━━━━━━━━━━━━━━━ */}
            <footer className="relative border-t border-white/5 py-12 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">MUSE</span>
                        <span className="text-[8px] text-gray-600 uppercase tracking-[0.3em]">by AuraDomo</span>
                    </div>
                    <div className="flex gap-6 text-[10px] text-gray-500 uppercase tracking-widest">
                        <a href="#" onClick={(e) => { e.preventDefault(); onNavigateLegal?.('LEGAL_PRIVACY'); }} className="hover:text-amber-400 transition-colors">Privacy Policy</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); onNavigateLegal?.('LEGAL_TERMS'); }} className="hover:text-amber-400 transition-colors">Terms of Service</a>
                    </div>
                    <div className="text-[10px] text-gray-600">© 2026 AuraDomoMuse. All rights reserved.</div>
                </div>
            </footer>

            {/* ━━━━━━━━━━━━━━━ INLINE CSS ━━━━━━━━━━━━━━━ */}
            <style>{`
                html { scroll-behavior: smooth; }
                @keyframes bounce { 0%, 100% { transform: translateY(0) translateX(-50%); } 50% { transform: translateY(-12px) translateX(-50%); } }
                .animate-bounce { animation: bounce 2s infinite; }
            `}</style>
        </div>
    );
};

// ─── PRICING CARD ──────────────────────────────────────────
const PricingCard = ({ tier, price, name, description, features, featured, onSelect, delay }: any) => (
    <div
        className={`relative flex flex-col p-8 rounded-3xl cursor-pointer transition-all duration-500 transform hover:scale-105 hover:-translate-y-1 ${featured
            ? 'bg-gradient-to-b from-gray-800/80 to-gray-900/90 border-2 border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.15)] backdrop-blur-sm'
            : 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] backdrop-blur-sm'
            }`}
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
            className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-[0.15em] transition-all duration-300 ${featured
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                : 'bg-white text-black hover:bg-gray-200 shadow-lg'
                }`}
        >
            Get Started
        </button>
    </div>
);

export default PublicHomePage;
