import React, { useState, useRef, useEffect } from 'react';
import { ProjectType } from '../types';
import { generatePodcastScript, generateNewsletterContent, generateSlideContent, generateStoryboardImage } from '../services/geminiService';
import { googleDriveService } from '../services/googleDriveService';
import { supabase } from '../services/supabaseClient';
// @ts-ignore
import html2pdf from 'html2pdf.js';
// @ts-ignore
import PptxGenJS from 'pptxgenjs';

// --- THEMES & CONFIG ---
const SLIDE_THEMES: Record<string, { bg: string; text: string; title: string; accent: string; gradientFrom?: string; gradientTo?: string }> = {
    professional: { bg: '#ffffff', text: '#333333', title: '#1a1a2e', accent: '#2563eb', gradientFrom: '#1e3a8a', gradientTo: '#3b82f6' },
    creative: { bg: '#fdf4ff', text: '#4a044e', title: '#86198f', accent: '#d946ef', gradientFrom: '#db2777', gradientTo: '#f472b6' },
    dark: { bg: '#111827', text: '#e5e7eb', title: '#f9fafb', accent: '#60a5fa', gradientFrom: '#1f2937', gradientTo: '#374151' },
    minimal: { bg: '#fafafa', text: '#525252', title: '#171717', accent: '#737373', gradientFrom: '#404040', gradientTo: '#737373' },
    bold_gradient: { bg: '#0f172a', text: '#e2e8f0', title: '#f8fafc', accent: '#f59e0b', gradientFrom: '#7c3aed', gradientTo: '#db2777' },
};

const escapeHtml = (str: string): string =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

export interface CreativeSuiteProps {
    userTier: string;
    theme: 'light' | 'dark';
    projectType: ProjectType;
    editorContent: string;
    onSendToEditor: (text: string) => void;

    // Podcast State
    podTopic: string; setPodTopic: (v: string) => void;
    podStyle: string; setPodStyle: (v: string) => void;
    podHost1: string; setPodHost1: (v: string) => void;
    podHost2: string; setPodHost2: (v: string) => void;
    podDuration: string; setPodDuration: (v: string) => void;
    podFormat: string; setPodFormat: (v: string) => void;

    // Newsletter State
    nlTopic: string; setNlTopic: (v: string) => void;
    nlType: 'newsletter' | 'short_ebook' | 'longform_guide'; setNlType: (v: any) => void;
    nlStyle: string; setNlStyle: (v: string) => void;
    nlNotes: string; setNlNotes: (v: string) => void;
    nlContent: any; setNlContent: (v: any) => void;
    showNlPreview: boolean; setShowNlPreview: (v: boolean) => void;

    // Slides State
    slTopic: string; setSlTopic: (v: string) => void;
    slCount: number; setSlCount: (v: number) => void;
    slStyle: string; setSlStyle: (v: string) => void;
    slNotes: string; setSlNotes: (v: string) => void;
    slDeck: any; setSlDeck: (v: any) => void;
    slImages: Record<number, string>; setSlImages: (v: Record<number, string>) => void;
    showSlPreview: boolean; setShowSlPreview: (v: boolean) => void;
    activeSlideIndex: number; setActiveSlideIndex: (v: number) => void;
}

export const CreativeSuite: React.FC<CreativeSuiteProps> = ({
    userTier, theme, projectType, editorContent, onSendToEditor,
    podTopic, setPodTopic, podStyle, setPodStyle, podHost1, setPodHost1, podHost2, setPodHost2, podDuration, setPodDuration, podFormat, setPodFormat,
    nlTopic, setNlTopic, nlType, setNlType, nlStyle, setNlStyle, nlNotes, setNlNotes, nlContent, setNlContent, showNlPreview, setShowNlPreview,
    slTopic, setSlTopic, slCount, setSlCount, slStyle, setSlStyle, slNotes, setSlNotes, slDeck, setSlDeck, slImages, setSlImages, showSlPreview, setShowSlPreview, activeSlideIndex, setActiveSlideIndex
}) => {
    // Local loading/UI state
    const [podLoading, setPodLoading] = useState(false);
    const [nlLoading, setNlLoading] = useState(false);
    const [slLoading, setSlLoading] = useState(false);
    const [generatingBgIndex, setGeneratingBgIndex] = useState<number | null>(null);

    const nlPreviewRef = useRef<HTMLDivElement>(null);
    const isDark = theme === 'dark';

    // Derived UI styles
    const cardBg = isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200';
    const inputBg = isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';
    const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';
    const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';

    // Determining Active Tab from Project Type
    const activeTool = projectType === ProjectType.PODCAST ? 'podcast' :
        projectType === ProjectType.NEWSLETTER ? 'newsletter' :
            projectType === ProjectType.SLIDES ? 'slides' :
                projectType === ProjectType.YOUTUBE ? 'youtube' :
                    projectType === ProjectType.SOCIAL_MEDIA ? 'social' : null;

    if (!activeTool) return null;

    // --- HANDLERS ---

    const handleGeneratePodcast = async () => {
        setPodLoading(true);
        try {
            const script = await generatePodcastScript(podTopic, podFormat as any, [podHost1, podHost2], podDuration, podStyle);
            onSendToEditor(script);
        } catch (e) { console.error(e); alert('Failed to generate podcast script.'); }
        setPodLoading(false);
    };

    const handleGenerateNewsletter = async () => {
        setNlLoading(true);
        try {
            const content = await generateNewsletterContent(nlTopic, nlType, nlStyle, nlNotes);
            setNlContent(content);
            setShowNlPreview(true);
            const editorText = `# ${content.title}\n\n*${content.subtitle}*\n\n` +
                content.sections.map((s: any) => {
                    if (s.type === 'stat') return `**📊 ${s.heading || ''}**\n${s.content}\n`;
                    if (s.type === 'quote') return `> ${s.content}\n`;
                    if (s.type === 'callout') return `💡 **${s.heading || 'Key Insight'}**\n${s.content}\n`;
                    if (s.type === 'cta') return `---\n## ${s.heading || 'Take Action'}\n${s.content}\n`;
                    return `## ${s.heading || ''}\n\n${s.content}\n`;
                }).join('\n');
            onSendToEditor(editorText);
        } catch (e) { console.error(e); alert('Failed to generate newsletter.'); }
        setNlLoading(false);
    };

    const handleGenerateSlides = async () => {
        setSlLoading(true);
        try {
            const deck = await generateSlideContent(slTopic, slCount, slStyle, slNotes);
            setSlDeck(deck);
            setActiveSlideIndex(0);
            setShowSlPreview(true);
            const editorText = `# ${deck.title}\n\n` +
                deck.slides.map((s: any, i: number) =>
                    `## Slide ${i + 1}: ${s.title}\n${(s.bullets || []).map((b: string) => `- ${b}`).join('\n')}\n${s.notes ? `\n*Speaker Notes: ${s.notes}*\n` : ''}`
                ).join('\n---\n\n');
            onSendToEditor(editorText);
        } catch (e) { console.error(e); alert('Failed to generate slides.'); }
        setSlLoading(false);
    };

    const handleGenerateSlideImage = async (index: number) => {
        if (!slDeck) return;
        setGeneratingBgIndex(index);
        const slide = slDeck.slides[index];
        try {
            const prompt = `Create a professional, clean, abstract background image for a presentation slide about: "${slide.title}". Style: ${slStyle}. The image should be suitable as a slide background — no text. Aspect ratio 16:9.`;
            const imageUrl = await generateStoryboardImage(prompt, userTier, '16:9');
            setSlImages({ ...slImages, [index]: imageUrl });
        } catch (e) { console.error('Slide image error', e); }
        setGeneratingBgIndex(null);
    };

    // --- EXPORT HANDLERS ---
    const handleExportPodcastPDF = () => {
        const el = document.createElement('div');
        el.innerHTML = `
            <h1 style="font-size:24px;margin-bottom:4px;color:#1a1a2e;">🎙️ ${escapeHtml(podTopic || 'Podcast Script')}</h1>
            <p style="color:#888;font-size:12px;margin-bottom:20px;">${escapeHtml(podFormat.replace('_', ' ').toUpperCase())} • ${escapeHtml(podDuration)} • ${escapeHtml(podStyle)}</p>
            <hr style="border:1px solid #eee;margin-bottom:20px;">
            <div style="white-space:pre-wrap;line-height:1.8;font-size:14px;">${escapeHtml(editorContent).replace(/\n/g, '<br>')}</div>
        `;
        html2pdf().set({ margin: 1, filename: `${podTopic || 'podcast'}_script.pdf` }).from(el).save();
    };

    const handleExportNewsletterPDF = () => {
        if (!nlPreviewRef.current) return;
        const element = nlPreviewRef.current;
        const opt = { margin: 0.5, filename: `${nlTopic || 'newsletter'}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
        html2pdf().set(opt).from(element).save();
    };

    const handleExportSlidesPDF = () => {
        if (!slDeck) return;
        const container = document.createElement('div');
        slDeck.slides.forEach((slide: any, i: number) => {
            const content = document.createElement('div');
            content.style.pageBreakAfter = 'always';
            content.style.padding = '40px';
            content.style.height = '600px';
            content.style.background = '#fff';
            content.style.border = '1px solid #ddd';
            content.innerHTML = `<h1 style="font-size:36px;color:#333;text-align:center;margin:0;">${escapeHtml(slide.title)}</h1>${slide.bullets?.length ? `<ul style="font-size:18px;color:#555;margin-top:20px;">${slide.bullets.map((b: string) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}`;
            container.appendChild(content);
        });
        html2pdf().set({ margin: 0.5, filename: `${slTopic || 'presentation'}.pdf` }).from(container).save();
    };

    const handleExportPPTX = () => {
        if (!slDeck) return;
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';
        pptx.defineSlideMaster({ title: 'MASTER_SLIDE', background: { color: 'FFFFFF' } });
        slDeck.slides.forEach((slide: any) => {
            const s = pptx.addSlide();
            s.addText(slide.title, { x: 0.5, y: 0.5, w: '90%', h: 1, fontSize: 32, bold: true, color: '363636' });
            if (slide.bullets && slide.bullets.length > 0) {
                s.addText(slide.bullets.map((b: string) => `• ${b}`).join('\n'), { x: 0.5, y: 1.8, w: '90%', h: 3.5, fontSize: 18, color: '666666', lineSpacing: 32 });
            }
            if (slide.notes) s.addNotes(slide.notes);
        });
        pptx.writeFile({ fileName: `${slTopic || 'presentation'}.pptx` });
    };

    const renderNewsletterPreview = () => {
        if (!nlContent) return null;
        const themes: any = {
            modern: { bg: '#fff', head: '#2563eb', text: '#333' },
            corporate: { bg: '#f8f9fa', head: '#1e3a8a', text: '#1f2937' },
            creative: { bg: '#fff1f2', head: '#be123c', text: '#4c0519' },
            minimalist: { bg: '#fff', head: '#000', text: '#000' },
            bold: { bg: '#000', head: '#fbbf24', text: '#fff' }
        };
        const t = themes[nlStyle] || themes.modern;

        return (
            <div ref={nlPreviewRef} className="w-full min-h-[800px] p-12 shadow-sm mx-auto" style={{ backgroundColor: t.bg, color: t.text, fontFamily: 'Arial, sans-serif' }}>
                <header style={{ borderBottom: `2px solid ${t.head}`, paddingBottom: '20px', marginBottom: '30px' }}>
                    <h1 style={{ color: t.head, fontSize: '32px', margin: 0, fontWeight: 800 }}>{nlContent.title}</h1>
                    <p style={{ color: t.text, opacity: 0.8, fontSize: '16px', marginTop: '8px', fontStyle: 'italic' }}>{nlContent.subtitle}</p>
                </header>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {nlContent.sections.map((section: any, i: number) => (
                        <div key={i} style={{ padding: '16px', borderRadius: '8px', background: section.type === 'callout' ? `${t.head}10` : 'transparent', borderLeft: section.type === 'quote' ? `4px solid ${t.head}` : 'none' }}>
                            {section.heading && <h2 style={{ color: t.head, fontSize: '20px', marginTop: 0, marginBottom: '8px' }}>{section.heading}</h2>}
                            <p style={{ whiteSpace: 'pre-line', lineHeight: '1.6', margin: 0 }}>{section.content}</p>
                            {section.type === 'cta' && <button style={{ marginTop: '16px', background: t.head, color: t.bg === '#000' ? '#000' : '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>{section.heading || 'Learn More'}</button>}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const GenButton = ({ onClick, loading, disabled, label, loadingLabel }: any) => (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium text-white transition-all shadow-md active:scale-[0.98] ${disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'}`}
        >
            {loading ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> {loadingLabel}</> : <>{label}</>}
        </button>
    );

    const toggleFullscreen = (elementId: string) => {
        const el = document.getElementById(elementId);
        if (el) {
            if (!document.fullscreenElement) {
                el.requestFullscreen().catch(err => console.log('Error attempting to enable full-screen mode:', err));
            } else {
                document.exitFullscreen();
            }
        }
    };

    return (
        <div className={`h-full flex flex-col p-4 overflow-y-auto ${cardBg} border-r`}>
            <h2 className={`text-lg font-bold mb-1 flex items-center gap-2 ${labelColor}`}>
                {activeTool === 'podcast' && '🎙️ Podcast Studio'}
                {activeTool === 'newsletter' && '📧 Newsletter Gen'}
                {activeTool === 'slides' && '📊 Slide Deck AI'}
                {activeTool === 'youtube' && '🎥 YouTube Script'}
                {activeTool === 'social' && '📱 Social Media'}
            </h2>
            <p className={`text-xs ${textMuted} mb-6`}>
                {activeTool === 'podcast' && 'Turn your ideas into a fully scripted audio show.'}
                {activeTool === 'newsletter' && 'Draft engaging newsletters in seconds.'}
                {activeTool === 'slides' && 'Create professional slide decks and visuals.'}
                {activeTool === 'youtube' && 'Plan and script your next viral video.'}
                {activeTool === 'social' && 'Create content for all your social platforms.'}
            </p>

            {/* === PODCAST PANEL === */}
            {activeTool === 'podcast' && (
                <>
                    <div className="space-y-4">
                        <div>
                            <label className={`text-xs font-medium ${labelColor}`}>Topic</label>
                            <input value={podTopic} onChange={e => setPodTopic(e.target.value)} placeholder="e.g., The Future of AI Coding" className={`mt-0.5 w-full rounded-lg px-3 py-2 border text-sm ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`} />
                        </div>
                        <div>
                            <label className={`text-xs font-medium ${labelColor}`}>Format</label>
                            <select value={podFormat} onChange={e => setPodFormat(e.target.value)} className={`mt-0.5 w-full rounded-md px-2 py-1.5 border text-xs ${inputBg}`}>
                                <option value="talking_head">Talking Head</option>
                                <option value="solo_podcast">Solo Podcast</option>
                                <option value="two_hosts">2 Host Pod (Co-Hosted)</option>
                                <option value="interview">Interview</option>
                                <option value="panel">Panel Discussion</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className={`text-xs font-medium ${labelColor}`}>Host 1 (Main)</label>
                                <input value={podHost1} onChange={e => setPodHost1(e.target.value)} className={`mt-0.5 w-full rounded-md px-2 py-1.5 border text-xs ${inputBg}`} />
                            </div>
                            <div>
                                <label className={`text-xs font-medium ${labelColor}`}>Host 2 (Guest)</label>
                                <input value={podHost2} onChange={e => setPodHost2(e.target.value)} className={`mt-0.5 w-full rounded-md px-2 py-1.5 border text-xs ${inputBg}`} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className={`text-xs font-medium ${labelColor}`}>Style</label>
                                <select value={podStyle} onChange={e => setPodStyle(e.target.value)} className={`mt-0.5 w-full rounded-md px-2 py-1.5 border text-xs ${inputBg}`}>
                                    <option value="Casual & Fun">Casual & Fun</option>
                                    <option value="Professional & Deep">Professional</option>
                                    <option value="Debate Style">Debate</option>
                                    <option value="Storytelling">Storytelling</option>
                                </select>
                            </div>
                            <div>
                                <label className={`text-xs font-medium ${labelColor}`}>Duration</label>
                                <select value={podDuration} onChange={e => setPodDuration(e.target.value)} className={`mt-0.5 w-full rounded-md px-2 py-1.5 border text-xs ${inputBg}`}>
                                    <option value="Short (2-3 min)">Short (2-3m)</option>
                                    <option value="Medium (5-8 min)">Medium (5-8m)</option>
                                    <option value="Long (10-15 min)">Long (10-15m)</option>
                                </select>
                            </div>
                        </div>
                        <GenButton onClick={handleGeneratePodcast} loading={podLoading} disabled={!podTopic.trim()} label="Generate Script → Editor" loadingLabel="Writing Script..." />
                    </div>
                    {editorContent.includes('**Title:**') && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button onClick={handleExportPodcastPDF} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-amber-600 text-white hover:bg-amber-500 font-medium">📄 Export Script as PDF</button>
                        </div>
                    )}
                </>
            )}

            {/* === NEWSLETTER PANEL === */}
            {activeTool === 'newsletter' && (
                <>
                    <div className="space-y-4">
                        <div>
                            <label className={`text-xs font-medium ${labelColor}`}>Topic</label>
                            <input value={nlTopic} onChange={e => setNlTopic(e.target.value)} placeholder="e.g., Weekly Tech Roundup" className={`mt-0.5 w-full rounded-lg px-3 py-2 border text-sm ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className={`text-xs font-medium ${labelColor}`}>Type</label>
                                <select value={nlType} onChange={e => setNlType(e.target.value as any)} className={`mt-0.5 w-full rounded-md px-2 py-1.5 border text-xs ${inputBg}`}>
                                    <option value="newsletter">📧 Newsletter</option>
                                    <option value="short_ebook">📖 Short Ebook</option>
                                    <option value="longform_guide">📚 Long Guide</option>
                                </select>
                            </div>
                            <div>
                                <label className={`text-xs font-medium ${labelColor}`}>Style</label>
                                <select value={nlStyle} onChange={e => setNlStyle(e.target.value)} className={`mt-0.5 w-full rounded-md px-2 py-1.5 border text-xs ${inputBg}`}>
                                    <option value="modern">✨ Modern</option>
                                    <option value="corporate">🏢 Corporate</option>
                                    <option value="creative">🎨 Creative</option>
                                    <option value="minimalist">◻️ Minimalist</option>
                                    <option value="bold">🔥 Bold</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={`text-xs font-medium ${labelColor}`}>Notes <span className={textMuted}>(optional)</span></label>
                            <textarea value={nlNotes} onChange={e => setNlNotes(e.target.value)} rows={2} placeholder="Audience, key points..." className={`mt-0.5 w-full rounded-lg px-3 py-2 border text-sm ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none resize-none`} />
                        </div>
                        <GenButton onClick={handleGenerateNewsletter} loading={nlLoading} disabled={!nlTopic.trim()} label="Generate → Editor" loadingLabel="Creating Content..." />
                    </div>
                    {nlContent && (
                        <div className="space-y-2 mt-4">
                            <div className="flex gap-2">
                                <button onClick={() => setShowNlPreview(true)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs border font-medium ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}>👁️ Styled Preview</button>
                                <button onClick={handleExportNewsletterPDF} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-amber-600 text-white hover:bg-amber-500 font-medium">📄 Export PDF</button>
                            </div>
                            <button onClick={() => { if (nlPreviewRef.current) navigator.clipboard.writeText(nlPreviewRef.current.outerHTML); }} className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs border font-medium ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}>📋 Copy HTML</button>
                        </div>
                    )}
                </>
            )}

            {/* === SLIDES PANEL === */}
            {activeTool === 'slides' && (
                <>
                    <div className="space-y-4">
                        <div>
                            <label className={`text-xs font-medium ${labelColor}`}>Topic</label>
                            <input value={slTopic} onChange={e => setSlTopic(e.target.value)} placeholder="e.g., Q4 Growth Strategy" className={`mt-0.5 w-full rounded-lg px-3 py-2 border text-sm ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className={`text-xs font-medium ${labelColor}`}>Slides</label>
                                <select value={slCount} onChange={e => setSlCount(Number(e.target.value))} className={`mt-0.5 w-full rounded-md px-2 py-1.5 border text-xs ${inputBg}`}>
                                    <option value={5}>5 Slides</option>
                                    <option value={10}>10 Slides</option>
                                    <option value={15}>15 Slides</option>
                                    <option value={20}>20 Slides</option>
                                </select>
                            </div>
                            <div>
                                <label className={`text-xs font-medium ${labelColor}`}>Theme</label>
                                <select value={slStyle} onChange={e => setSlStyle(e.target.value)} className={`mt-0.5 w-full rounded-md px-2 py-1.5 border text-xs ${inputBg}`}>
                                    <option value="professional">💼 Professional</option>
                                    <option value="creative">🎨 Creative</option>
                                    <option value="dark">🌙 Dark</option>
                                    <option value="minimal">◻️ Minimal</option>
                                    <option value="bold_gradient">🔥 Bold</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={`text-xs font-medium ${labelColor}`}>Key Points <span className={textMuted}>(optional)</span></label>
                            <input value={slNotes} onChange={e => setSlNotes(e.target.value)} placeholder="Points to cover..." className={`mt-0.5 w-full rounded-lg px-3 py-2 border text-sm ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`} />
                        </div>
                        <GenButton onClick={handleGenerateSlides} loading={slLoading} disabled={!slTopic.trim()} label="Generate Slides → Editor" loadingLabel="Building Deck..." />
                    </div>
                    {slDeck && (
                        <div className="space-y-2 mt-4">
                            <div className={`text-xs font-medium ${textMuted}`}>{slDeck.slides.length} slides generated</div>
                            <button onClick={() => { setActiveSlideIndex(0); setShowSlPreview(true); }} className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs border font-medium ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}>👁️ Open Slide Viewer</button>
                            <div className="flex gap-2">
                                <button onClick={handleExportPPTX} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-500 font-medium">📊 .pptx</button>
                                <button onClick={handleExportSlidesPDF} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-amber-600 text-white hover:bg-amber-500 font-medium">📄 PDF</button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* === YOUTUBE PANEL === */}
            {activeTool === 'youtube' && (
                <div className="space-y-4">
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} text-center`}>
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg mb-1">YouTube Script Mode</h3>
                        <p className={`text-sm ${textMuted} mb-4`}>
                            Write your script in the main editor. When you're ready, open the <strong>YouTube Studio</strong> in the right sidebar to generate titles, tags, and thumbnails.
                        </p>
                        <button onClick={() => onSendToEditor("# My YouTube Script\\n\\n**Hook:** [Start with a bang]\\n\\n**Intro:**\\n\\n**Main Content:**\\n\\n**Call to Action:**")} className="text-xs text-amber-500 hover:text-amber-400 font-medium">✨ Insert Script Template</button>
                    </div>
                </div>
            )}

            {/* === SOCIAL PANEL === */}
            {activeTool === 'social' && (
                <div className="space-y-4">
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} text-center`}>
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
                        </div>
                        <h3 className="font-bold text-lg mb-1">Social Media Mode</h3>
                        <p className={`text-sm ${textMuted} mb-4`}>
                            Draft your posts here. Use the <strong>Social Studio</strong> in the right sidebar to generate optimized content for Instagram, TikTok, X, and LinkedIn.
                        </p>
                        <button onClick={() => onSendToEditor("# Social Media Content Plan\\n\\n## Instagram\\n\\n## TikTok\\n\\n## Twitter/X\\n\\n## LinkedIn")} className="text-xs text-amber-500 hover:text-amber-400 font-medium">✨ Insert Social Template</button>
                    </div>
                </div>
            )}

            {/* NEWSLETTER PREVIEW MODAL */}
            {showNlPreview && nlContent && (
                <div id="nl-preview-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNlPreview(false)}>
                    <div className="max-w-[720px] w-full max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ background: isDark ? '#1a1a2e' : '#fff' }}>
                        {/* Header bar */}
                        <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                            <h3 className="text-sm font-bold flex items-center gap-2"><span>📧</span> Newsletter Preview</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggleFullscreen('nl-preview-modal')} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm" title="Full Screen">⛶</button>
                                <button onClick={handleExportNewsletterPDF} className="px-3 py-1.5 rounded-lg text-xs bg-amber-600 text-white hover:bg-amber-500 font-medium">📄 Export PDF</button>
                                <button onClick={() => { if (nlPreviewRef.current) navigator.clipboard.writeText(nlPreviewRef.current.outerHTML); }} className={`px-3 py-1.5 rounded-lg text-xs border font-medium ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}>📋 HTML</button>
                                <button onClick={() => setShowNlPreview(false)} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm">✕</button>
                            </div>
                        </div>
                        {/* Scrollable preview */}
                        <div className="flex-1 overflow-y-auto p-6" id="nl-preview-content">
                            {renderNewsletterPreview()}
                        </div>
                    </div>
                </div>
            )}

            {/* SLIDES VIEWER MODAL */}
            {showSlPreview && slDeck && (() => {
                const slide = slDeck.slides[activeSlideIndex];
                const themeColors = SLIDE_THEMES[slStyle] || SLIDE_THEMES.professional;
                const hasImg = !!slImages[activeSlideIndex];
                const isTitle = slide.layout === 'title' || slide.layout === 'section_break';
                const isQuote = slide.layout === 'quote';
                const slideBg = hasImg ? `url(${slImages[activeSlideIndex]}) center/cover` :
                    (isTitle ? themeColors.gradientFrom : themeColors.bg);

                return (
                    <div id="sl-preview-modal" className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm" onClick={() => setShowSlPreview(false)}>
                        {/* Top bar */}
                        <div className="flex items-center justify-between px-6 py-3 bg-black/50 text-white shrink-0" onClick={e => e.stopPropagation()}>
                            <h3 className="text-sm font-bold flex items-center gap-2"><span>📊</span> {slDeck.title}</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400">Slide {activeSlideIndex + 1} of {slDeck.slides.length}</span>
                                <button onClick={() => toggleFullscreen('sl-preview-modal')} className="p-1.5 rounded-lg hover:bg-white/20 text-sm" title="Full Screen">⛶</button>
                                <button onClick={handleExportPPTX} className="px-3 py-1.5 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-500 font-medium">📊 .pptx</button>
                                <button onClick={handleExportSlidesPDF} className="px-3 py-1.5 rounded-lg text-xs bg-amber-600 text-white hover:bg-amber-500 font-medium">📄 PDF</button>
                                <button
                                    onClick={async () => {
                                        try {
                                            const { data: { session } } = await supabase.auth.getSession();
                                            const driveToken = session?.provider_token || sessionStorage.getItem('muse_drive_token');
                                            if (!driveToken) { alert('Please connect Google Drive first.'); return; }
                                            const slideText = slDeck.slides.map((s: any, i: number) =>
                                                `Slide ${i + 1}: ${s.title}\n${(s.bullets || []).join('\n')}`
                                            ).join('\n\n---\n\n');
                                            await googleDriveService.uploadFile(driveToken, `${slDeck.title}.txt`, `${slDeck.title}\n\n${slideText}`, 'text/plain');
                                            alert('✅ Slides uploaded to Google Drive!');
                                        } catch (e: any) { alert('Upload failed: ' + e.message); }
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs bg-green-600 text-white hover:bg-green-500 font-medium"
                                >☁️ Drive</button>
                                <button onClick={() => setShowSlPreview(false)} className="p-1.5 rounded-lg hover:bg-white/20 text-sm">✕</button>
                            </div>
                        </div>

                        {/* Main slide area */}
                        <div className="flex-1 flex items-center justify-center px-16 py-6 relative" onClick={e => e.stopPropagation()}>
                            {/* Prev arrow */}
                            <button
                                onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))}
                                disabled={activeSlideIndex === 0}
                                className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>

                            {/* Slide canvas 16:9 */}
                            <div
                                className="relative rounded-xl shadow-2xl overflow-hidden"
                                style={{
                                    width: '100%', maxWidth: '900px', aspectRatio: '16/9',
                                    background: slideBg, border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            >
                                {/* Dark overlay for background images */}
                                {hasImg && <div className="absolute inset-0 bg-black/45" />}

                                {/* Slide content */}
                                <div className="relative z-10 flex flex-col justify-center h-full p-12">
                                    {isTitle ? (
                                        <div className="text-center">
                                            <h1 className="text-4xl font-bold text-white mb-4">{slide.title}</h1>
                                            {slide.bullets?.[0] && <p className="text-lg text-gray-300">{slide.bullets[0]}</p>}
                                        </div>
                                    ) : isQuote ? (
                                        <div className="text-center">
                                            <p className="text-3xl italic" style={{ color: hasImg ? '#fff' : themeColors.title }}>"{slide.bullets?.[0] || ''}"</p>
                                        </div>
                                    ) : (
                                        <>
                                            <h2 className="text-3xl font-bold mb-2" style={{ color: hasImg ? '#fff' : themeColors.title }}>{slide.title}</h2>
                                            <div className="mb-6" style={{ width: '60px', height: '3px', background: themeColors.accent }} />
                                            <ul className="space-y-3 list-disc pl-6">
                                                {(slide.bullets || []).map((b: string, j: number) => (
                                                    <li key={j} className="text-lg" style={{ color: hasImg ? '#e0e0e0' : themeColors.text }}>{b}</li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </div>

                                {/* Add Background button overlay */}
                                <div className="absolute bottom-3 right-3 z-20">
                                    <button
                                        onClick={() => handleGenerateSlideImage(activeSlideIndex)}
                                        disabled={generatingBgIndex === activeSlideIndex}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all disabled:opacity-50"
                                    >
                                        {generatingBgIndex === activeSlideIndex ? (
                                            <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                                        ) : hasImg ? (
                                            <>🔄 Change Background</>
                                        ) : (
                                            <>🖼️ Add Background</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Next arrow */}
                            <button
                                onClick={() => setActiveSlideIndex(Math.min(slDeck!.slides.length - 1, activeSlideIndex + 1))}
                                disabled={activeSlideIndex === slDeck.slides.length - 1}
                                className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>

                        {/* Speaker notes */}
                        {slide.notes && (
                            <div className="mx-auto max-w-[900px] w-full px-6 pb-2" onClick={e => e.stopPropagation()}>
                                <div className="bg-white/5 rounded-lg p-3 text-xs text-gray-400 italic">📝 {slide.notes}</div>
                            </div>
                        )}

                        {/* Thumbnail strip */}
                        <div className="shrink-0 px-6 py-3 bg-black/50 overflow-x-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-2 justify-center">
                                {slDeck.slides.map((s: any, idx: number) => {
                                    const thumbTheme = SLIDE_THEMES[slStyle] || SLIDE_THEMES.professional;
                                    const thumbIsTitle = s.layout === 'title' || s.layout === 'section_break';
                                    const thumbBg = slImages[idx] ? `url(${slImages[idx]}) center/cover` :
                                        (thumbIsTitle ? thumbTheme.gradientFrom : thumbTheme.bg);
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveSlideIndex(idx)}
                                            className={`relative shrink-0 rounded-md overflow-hidden transition-all ${activeSlideIndex === idx ? 'ring-2 ring-amber-500 scale-105' : 'ring-1 ring-white/10 opacity-60 hover:opacity-100'}`}
                                            style={{ width: '80px', height: '45px', background: thumbBg }}
                                        >
                                            {slImages[idx] && <div className="absolute inset-0 bg-black/40" />}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-[9px] font-bold text-white truncate px-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{idx + 1}</span>
                                            </div>
                                            {slImages[idx] && <span className="absolute top-0.5 right-0.5 text-[8px] text-green-400">✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
