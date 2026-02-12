import React, { useState, useRef, useEffect } from 'react';
import { SubscriptionTier, TIERS, ProjectType } from '../types';
import { generatePodcastScript, generateNewsletterContent, generateSlideContent, generateStoryboardImage } from '../services/geminiService';

// Declare pptxgenjs global
declare const PptxGenJS: any;
declare const html2pdf: any;

interface CreativeSuiteProps {
    userTier: SubscriptionTier;
    theme: string;
    projectType?: ProjectType;
    onSendToEditor: (content: string) => void;
    editorContent?: string;
}

// XSS protection: sanitize AI-generated text before innerHTML insertion
const escapeHtml = (str: string): string =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

type SuiteTab = 'podcast' | 'newsletter' | 'slides';

// --- SLIDE THEMES ---
const SLIDE_THEMES: Record<string, { bg: string; title: string; text: string; accent: string; gradientFrom: string; gradientTo: string }> = {
    professional: { bg: '#FFFFFF', title: '#1a1a2e', text: '#333333', accent: '#0066CC', gradientFrom: '#0066CC', gradientTo: '#004499' },
    creative: { bg: '#FFF8F0', title: '#2D1B0E', text: '#4A3728', accent: '#FF6B35', gradientFrom: '#FF6B35', gradientTo: '#E8451A' },
    dark: { bg: '#0F0F1A', title: '#FFFFFF', text: '#B8B8CC', accent: '#7C3AED', gradientFrom: '#7C3AED', gradientTo: '#4C1D95' },
    minimal: { bg: '#FAFAFA', title: '#111111', text: '#555555', accent: '#10B981', gradientFrom: '#10B981', gradientTo: '#059669' },
    bold_gradient: { bg: '#0F172A', title: '#FFFFFF', text: '#CBD5E1', accent: '#F59E0B', gradientFrom: '#F59E0B', gradientTo: '#EF4444' }
};

// --- NEWSLETTER THEMES ---
const NL_THEMES: Record<string, { headerBg: string; headerText: string; bodyBg: string; bodyText: string; accent: string; fontFamily: string; statBg: string; quoteBorder: string; calloutBg: string; ctaBg: string; ctaText: string }> = {
    modern: { headerBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', headerText: '#fff', bodyBg: '#f8f9fa', bodyText: '#333', accent: '#667eea', fontFamily: "'Inter', sans-serif", statBg: '#667eea', quoteBorder: '#764ba2', calloutBg: '#eef2ff', ctaBg: '#667eea', ctaText: '#fff' },
    corporate: { headerBg: 'linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%)', headerText: '#fff', bodyBg: '#ffffff', bodyText: '#2c3e50', accent: '#1e3a5f', fontFamily: "'Georgia', serif", statBg: '#1e3a5f', quoteBorder: '#1e3a5f', calloutBg: '#f0f4f8', ctaBg: '#1e3a5f', ctaText: '#fff' },
    creative: { headerBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', headerText: '#fff', bodyBg: '#fff5f8', bodyText: '#333', accent: '#f5576c', fontFamily: "'Outfit', sans-serif", statBg: '#f5576c', quoteBorder: '#f093fb', calloutBg: '#fef2f4', ctaBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', ctaText: '#fff' },
    minimalist: { headerBg: '#111', headerText: '#fff', bodyBg: '#fff', bodyText: '#222', accent: '#111', fontFamily: "'Inter', sans-serif", statBg: '#111', quoteBorder: '#ddd', calloutBg: '#f9f9f9', ctaBg: '#111', ctaText: '#fff' },
    bold: { headerBg: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', headerText: '#fff', bodyBg: '#fffbeb', bodyText: '#1f2937', accent: '#f59e0b', fontFamily: "'Outfit', sans-serif", statBg: '#ef4444', quoteBorder: '#f59e0b', calloutBg: '#fef3c7', ctaBg: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', ctaText: '#fff' },
};

const CreativeSuite: React.FC<CreativeSuiteProps> = ({ userTier, theme, projectType, onSendToEditor, editorContent }) => {
    const getDefaultTab = (): SuiteTab => {
        if (projectType === ProjectType.NEWSLETTER) return 'newsletter';
        if (projectType === ProjectType.SLIDES) return 'slides';
        return 'podcast';
    };
    const [activeTab, setActiveTab] = useState<SuiteTab>(getDefaultTab());
    const limits = TIERS[userTier].limits;
    const isDark = theme === 'dark';

    useEffect(() => { setActiveTab(getDefaultTab()); }, [projectType]);

    // --- PODCAST STATE ---
    const [podTopic, setPodTopic] = useState('');
    const [podFormat, setPodFormat] = useState<'talking_head' | 'solo_podcast' | 'interview' | 'panel'>('talking_head');
    const [podDuration, setPodDuration] = useState('10 minutes');
    const [podStyle, setPodStyle] = useState('Educational');
    const [podNotes, setPodNotes] = useState('');
    const [podLoading, setPodLoading] = useState(false);

    // --- NEWSLETTER STATE ---
    const [nlTopic, setNlTopic] = useState('');
    const [nlType, setNlType] = useState<'newsletter' | 'short_ebook' | 'longform_guide'>('newsletter');
    const [nlStyle, setNlStyle] = useState('modern');
    const [nlNotes, setNlNotes] = useState('');
    const [nlContent, setNlContent] = useState<{ title: string; subtitle: string; sections: any[] } | null>(null);
    const [nlLoading, setNlLoading] = useState(false);
    const nlPreviewRef = useRef<HTMLDivElement>(null);

    // --- SLIDES STATE ---
    const [slTopic, setSlTopic] = useState('');
    const [slCount, setSlCount] = useState(10);
    const [slStyle, setSlStyle] = useState('professional');
    const [slNotes, setSlNotes] = useState('');
    const [slDeck, setSlDeck] = useState<{ title: string; slides: any[] } | null>(null);
    const [slLoading, setSlLoading] = useState(false);
    const [slImages, setSlImages] = useState<Record<number, string>>({});

    // --- PREVIEW MODAL ---
    const [showPreview, setShowPreview] = useState(false);

    // --- STYLES ---
    const cardBg = isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200';
    const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-300 text-gray-800';
    const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';
    const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

    // --- PODCAST HANDLERS ---
    const handleGeneratePodcast = async () => {
        if (!podTopic.trim()) return;
        setPodLoading(true);
        try {
            const script = await generatePodcastScript(podTopic, podFormat, podDuration, podStyle, podNotes);
            onSendToEditor(script);
        } catch (e) { onSendToEditor('Error generating script. Please try again.'); }
        setPodLoading(false);
    };

    // --- NEWSLETTER HANDLERS ---
    const handleGenerateNewsletter = async () => {
        if (!nlTopic.trim()) return;
        setNlLoading(true);
        setNlContent(null);
        try {
            const content = await generateNewsletterContent(nlTopic, nlType, nlStyle, nlNotes);
            setNlContent(content);
            // Send formatted text to editor
            const editorText = `# ${content.title}\n\n*${content.subtitle}*\n\n` +
                content.sections.map((s: any) => {
                    if (s.type === 'stat') return `**📊 ${s.heading || ''}**\n${s.content}\n`;
                    if (s.type === 'quote') return `> ${s.content}\n`;
                    if (s.type === 'callout') return `💡 **${s.heading || 'Key Insight'}**\n${s.content}\n`;
                    if (s.type === 'cta') return `---\n## ${s.heading || 'Take Action'}\n${s.content}\n`;
                    return `## ${s.heading || ''}\n\n${s.content}\n`;
                }).join('\n');
            onSendToEditor(editorText);
        } catch (e) { onSendToEditor('Error generating content. Please try again.'); }
        setNlLoading(false);
    };

    const handleExportNewsletterPDF = () => {
        if (!nlPreviewRef.current) return;
        html2pdf().set({
            margin: 0,
            filename: `${nlContent?.title?.slice(0, 40) || 'newsletter'}.pdf`,
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        }).from(nlPreviewRef.current).save();
    };

    // --- SLIDES HANDLERS ---
    const handleGenerateSlides = async () => {
        if (!slTopic.trim()) return;
        setSlLoading(true);
        setSlDeck(null);
        setSlImages({});
        try {
            const deck = await generateSlideContent(slTopic, slCount, slStyle, slNotes);
            setSlDeck(deck);
            // Send slide content as formatted text to editor
            const editorText = `# ${deck.title}\n\n` +
                deck.slides.map((s: any, i: number) =>
                    `## Slide ${i + 1}: ${s.title}\n${(s.bullets || []).map((b: string) => `- ${b}`).join('\n')}\n${s.notes ? `\n*Speaker Notes: ${s.notes}*\n` : ''}`
                ).join('\n---\n\n');
            onSendToEditor(editorText);
        } catch (e) { onSendToEditor('Error generating slides. Please try again.'); }
        setSlLoading(false);
    };

    const handleGenerateSlideImage = async (index: number) => {
        if (!slDeck) return;
        const slide = slDeck.slides[index];
        try {
            const prompt = `Create a professional, clean, abstract background image for a presentation slide about: "${slide.title}". Style: ${slStyle}. The image should be suitable as a slide background — no text. Aspect ratio 16:9.`;
            const imageUrl = await generateStoryboardImage(prompt, userTier, '16:9');
            setSlImages(prev => ({ ...prev, [index]: imageUrl }));
        } catch (e) { console.error('Slide image error', e); }
    };

    const handleExportPPTX = () => {
        if (!slDeck || typeof PptxGenJS === 'undefined') return;
        const pptx = new PptxGenJS();
        pptx.author = 'AuraDomoMuse';
        pptx.title = slDeck.title;
        const themeColors = SLIDE_THEMES[slStyle] || SLIDE_THEMES.professional;

        slDeck.slides.forEach((slide: any, idx: number) => {
            const sl = pptx.addSlide();
            const hasImage = slImages[idx];

            if (hasImage) {
                sl.addImage({ data: slImages[idx], x: 0, y: 0, w: '100%', h: '100%' });
                sl.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: '000000', transparency: 50 } });
            }

            const textColor = hasImage ? 'FFFFFF' : themeColors.title.replace('#', '');
            const bodyColor = hasImage ? 'E0E0E0' : themeColors.text.replace('#', '');

            if (slide.layout === 'title' || slide.layout === 'section_break') {
                if (!hasImage) sl.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: themeColors.gradientFrom.replace('#', '') } });
                sl.addText(slide.title, { x: 0.8, y: 1.5, w: 8.4, h: 2, fontSize: slide.layout === 'title' ? 36 : 30, color: 'FFFFFF', bold: true, align: 'center', fontFace: 'Arial' });
                if (slide.bullets?.length > 0) sl.addText(slide.bullets[0], { x: 1, y: 3.8, w: 8, h: 1, fontSize: 18, color: 'CCCCCC', align: 'center', fontFace: 'Arial' });
            } else if (slide.layout === 'quote') {
                sl.addText(`"${slide.bullets?.[0] || ''}"`, { x: 1, y: 1.5, w: 8, h: 3, fontSize: 24, color: textColor, italic: true, align: 'center', fontFace: 'Georgia' });
            } else {
                if (!hasImage) sl.background = { fill: themeColors.bg.replace('#', '') };
                sl.addText(slide.title, { x: 0.6, y: 0.3, w: 8.8, h: 0.8, fontSize: 28, color: textColor, bold: true, fontFace: 'Arial' });
                sl.addShape(pptx.shapes.RECTANGLE, { x: 0.6, y: 1.15, w: 1.5, h: 0.05, fill: { color: themeColors.accent.replace('#', '') } });
                if (slide.bullets?.length > 0) {
                    const bulletText = slide.bullets.map((b: string) => ({ text: b, options: { bullet: { code: '2022' }, fontSize: 16, color: bodyColor, breakLine: true, paraSpaceAfter: 8 } }));
                    sl.addText(bulletText, { x: 0.6, y: 1.5, w: 8.8, h: 3.5, fontFace: 'Arial', valign: 'top' });
                }
            }
            if (slide.notes) sl.addNotes(slide.notes);
        });
        pptx.writeFile({ fileName: `${slDeck.title.slice(0, 40)}.pptx` });
    };

    const handleExportSlidesPDF = () => {
        if (!slDeck) return;
        const el = document.createElement('div');
        el.style.fontFamily = "'Inter', sans-serif";
        const themeColors = SLIDE_THEMES[slStyle] || SLIDE_THEMES.professional;

        slDeck.slides.forEach((slide: any, idx: number) => {
            const slideEl = document.createElement('div');
            slideEl.style.cssText = `width:960px;height:540px;padding:40px 60px;position:relative;display:flex;flex-direction:column;justify-content:center;page-break-after:always;box-sizing:border-box;`;

            if (slImages[idx]) {
                slideEl.style.backgroundImage = `url(${slImages[idx]})`;
                slideEl.style.backgroundSize = 'cover';
                slideEl.innerHTML = `<div style="position:absolute;inset:0;background:rgba(0,0,0,0.5);"></div>`;
            }

            const content = document.createElement('div');
            content.style.position = 'relative';
            content.style.zIndex = '1';
            const hasImg = !!slImages[idx];

            if (slide.layout === 'title' || slide.layout === 'section_break') {
                if (!hasImg) slideEl.style.background = themeColors.gradientFrom;
                content.innerHTML = `<h1 style="font-size:36px;color:#fff;text-align:center;margin:0;">${escapeHtml(slide.title)}</h1>${slide.bullets?.length ? `<p style="font-size:18px;color:#ccc;text-align:center;margin-top:16px;">${escapeHtml(slide.bullets[0])}</p>` : ''}`;
            } else if (slide.layout === 'quote') {
                slideEl.style.background = hasImg ? '' : themeColors.bg;
                content.innerHTML = `<p style="font-size:24px;color:${hasImg ? '#fff' : themeColors.title};font-style:italic;text-align:center;">"${escapeHtml(slide.bullets?.[0] || '')}"</p>`;
            } else {
                if (!hasImg) slideEl.style.background = themeColors.bg;
                const bulletItems = (slide.bullets || []).map((b: string) => `<li style="margin-bottom:8px;font-size:16px;color:${hasImg ? '#e0e0e0' : themeColors.text};">${escapeHtml(b)}</li>`).join('');
                content.innerHTML = `<h2 style="font-size:28px;color:${hasImg ? '#fff' : themeColors.title};margin:0 0 12px 0;">${escapeHtml(slide.title)}</h2><div style="width:60px;height:3px;background:${themeColors.accent};margin-bottom:20px;"></div><ul style="list-style:disc;padding-left:20px;">${bulletItems}</ul>`;
            }
            slideEl.appendChild(content);
            el.appendChild(slideEl);
        });

        document.body.appendChild(el);
        html2pdf().set({ margin: 0, filename: `${slDeck.title.slice(0, 40)}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'px', format: [960, 540], orientation: 'landscape' } }).from(el).save().then(() => document.body.removeChild(el));
    };

    const handleExportPodcastPDF = () => {
        if (!editorContent) return;
        const el = document.createElement('div');
        el.style.padding = '40px';
        el.style.fontFamily = "'Inter', sans-serif";
        el.style.color = '#222';
        el.style.maxWidth = '700px';
        el.innerHTML = `
            <h1 style="font-size:24px;margin-bottom:4px;color:#1a1a2e;">🎙️ ${escapeHtml(podTopic || 'Podcast Script')}</h1>
            <p style="color:#888;font-size:12px;margin-bottom:20px;">${escapeHtml(podFormat.replace('_', ' ').toUpperCase())} • ${escapeHtml(podDuration)} • ${escapeHtml(podStyle)}</p>
            <hr style="border:1px solid #eee;margin-bottom:20px;">
            <div style="white-space:pre-wrap;line-height:1.8;font-size:14px;">${escapeHtml(editorContent).replace(/\n/g, '<br>')}</div>
        `;
        document.body.appendChild(el);
        html2pdf().set({ margin: 0.5, filename: `${(podTopic || 'script').slice(0, 40)}-script.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter' } }).from(el).save().then(() => document.body.removeChild(el));
    };

    // --- NEWSLETTER PREVIEW RENDER ---
    const renderNewsletterPreview = () => {
        if (!nlContent) return null;
        const t = NL_THEMES[nlStyle] || NL_THEMES.modern;
        return (
            <div ref={nlPreviewRef} style={{ fontFamily: t.fontFamily, maxWidth: '680px', margin: '0 auto', background: t.bodyBg, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
                <div style={{ background: t.headerBg, padding: '48px 40px', textAlign: 'center' }}>
                    <h1 style={{ color: t.headerText, fontSize: '28px', fontWeight: 800, margin: 0 }}>{nlContent.title}</h1>
                    {nlContent.subtitle && <p style={{ color: t.headerText, opacity: 0.85, fontSize: '14px', marginTop: '12px' }}>{nlContent.subtitle}</p>}
                </div>
                <div style={{ padding: '32px' }}>
                    {nlContent.sections.map((section: any, i: number) => {
                        if (section.type === 'stat') return <div key={i} style={{ background: t.statBg, color: '#fff', borderRadius: '8px', padding: '20px', margin: '16px 0', textAlign: 'center' }}><div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8 }}>{section.heading}</div><div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{section.content}</div></div>;
                        if (section.type === 'quote') return <blockquote key={i} style={{ borderLeft: `3px solid ${t.quoteBorder}`, paddingLeft: '16px', margin: '16px 0', fontStyle: 'italic', fontSize: '15px', color: t.bodyText }}>{section.content}</blockquote>;
                        if (section.type === 'callout') return <div key={i} style={{ background: t.calloutBg, border: `1px solid ${t.accent}33`, borderRadius: '8px', padding: '16px', margin: '16px 0' }}><div style={{ fontWeight: 700, color: t.accent, fontSize: '12px', textTransform: 'uppercase' }}>💡 {section.heading}</div><div style={{ color: t.bodyText, lineHeight: 1.6, fontSize: '14px', marginTop: '6px' }}>{section.content}</div></div>;
                        if (section.type === 'list') {
                            const items = section.content.split('\n').filter((l: string) => l.trim());
                            return <div key={i} style={{ margin: '16px 0' }}>{section.heading && <h3 style={{ color: t.accent, fontSize: '16px', marginBottom: '8px' }}>{section.heading}</h3>}<ul style={{ paddingLeft: '20px' }}>{items.map((item: string, j: number) => <li key={j} style={{ color: t.bodyText, lineHeight: 1.7, fontSize: '14px' }}>{item.replace(/^[•\-]\s*/, '')}</li>)}</ul></div>;
                        }
                        if (section.type === 'cta') return <div key={i} style={{ textAlign: 'center', margin: '20px 0', padding: '24px', background: t.calloutBg, borderRadius: '8px' }}><h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{section.heading}</h3><p style={{ fontSize: '14px', color: t.bodyText, marginBottom: '12px' }}>{section.content}</p><div style={{ display: 'inline-block', background: t.ctaBg, color: t.ctaText, padding: '10px 24px', borderRadius: '6px', fontWeight: 600, fontSize: '14px' }}>Get Started →</div></div>;
                        return <div key={i} style={{ margin: '16px 0' }}>{section.heading && <h2 style={{ color: t.accent, fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{section.heading}</h2>}<div style={{ color: t.bodyText, lineHeight: 1.7, fontSize: '14px', whiteSpace: 'pre-wrap' }}>{section.content}</div></div>;
                    })}
                    <div style={{ borderTop: '1px solid #eee', marginTop: '24px', paddingTop: '12px', textAlign: 'center', color: '#999', fontSize: '11px' }}><p>Generated by AuraDomoMuse • Domo Suite</p></div>
                </div>
            </div>
        );
    };

    // --- GENERATE BUTTON ---
    const GenButton = ({ onClick, loading, disabled, label, loadingLabel }: { onClick: () => void; loading: boolean; disabled: boolean; label: string; loadingLabel: string }) => (
        <button onClick={onClick} disabled={disabled || loading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>}
            {loading ? loadingLabel : label}
        </button>
    );

    return (
        <div className={`flex flex-col h-full ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
            {/* TAB HEADER */}
            <div className={`p-3 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'} shrink-0`}>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-bold font-serif" style={{ color: isDark ? '#f59e0b' : '#b45309' }}>Domo Suite</h2>
                </div>
                <div className={`flex gap-0.5 ${isDark ? 'bg-gray-800/60' : 'bg-gray-100'} p-0.5 rounded-lg`}>
                    {[
                        { id: 'podcast' as SuiteTab, label: '🎙️ Podcast', locked: false },
                        { id: 'newsletter' as SuiteTab, label: '📧 Newsletter', locked: !limits.hasNewsletterEbook },
                        { id: 'slides' as SuiteTab, label: '📊 Slides', locked: !limits.hasSlides },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { if (!tab.locked) setActiveTab(tab.id); }}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab.id
                                    ? 'bg-amber-600 text-white shadow'
                                    : tab.locked
                                        ? `${isDark ? 'text-gray-600' : 'text-gray-400'} cursor-not-allowed`
                                        : `${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800'}`
                                }`}
                        >
                            {tab.label} {tab.locked && '🔒'}
                        </button>
                    ))}
                </div>
            </div>

            {/* PANEL CONTENT */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">

                {/* === PODCAST PANEL === */}
                {activeTab === 'podcast' && (
                    <>
                        <div className="space-y-2">
                            <div>
                                <label className={`text-xs font-medium ${labelColor}`}>Topic</label>
                                <input value={podTopic} onChange={e => setPodTopic(e.target.value)} placeholder="e.g., Why Most People Fail at Habits" className={`mt-0.5 w-full rounded-lg px-3 py-2 border text-sm ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`} />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className={`text-xs font-medium ${labelColor}`}>Format</label>
                                    <select value={podFormat} onChange={e => setPodFormat(e.target.value as any)} className={`mt-0.5 w-full rounded-md px-2 py-1.5 border text-xs ${inputBg}`}>
                                        <option value="talking_head">🎥 Talking Head</option>
                                        <option value="solo_podcast">🎙️ Solo</option>
                                        <option value="interview">🗣️ Interview</option>
                                        <option value="panel">👥 Panel</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`text-xs font-medium ${labelColor}`}>Duration</label>
                                    <select value={podDuration} onChange={e => setPodDuration(e.target.value)} className={`mt-0.5 w-full rounded-md px-2 py-1.5 border text-xs ${inputBg}`}>
                                        <option>5 minutes</option>
                                        <option>10 minutes</option>
                                        <option>15 minutes</option>
                                        <option>30 minutes</option>
                                        <option>60 minutes</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`text-xs font-medium ${labelColor}`}>Style</label>
                                    <select value={podStyle} onChange={e => setPodStyle(e.target.value)} className={`mt-0.5 w-full rounded-md px-2 py-1.5 border text-xs ${inputBg}`}>
                                        <option>Educational</option>
                                        <option>Storytelling</option>
                                        <option>News / Commentary</option>
                                        <option>Comedy</option>
                                        <option>Motivational</option>
                                        <option>True Crime</option>
                                        <option>Tech Review</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={`text-xs font-medium ${labelColor}`}>Notes <span className={textMuted}>(optional)</span></label>
                                <textarea value={podNotes} onChange={e => setPodNotes(e.target.value)} rows={2} placeholder="Target audience, key points..." className={`mt-0.5 w-full rounded-lg px-3 py-2 border text-sm ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none resize-none`} />
                            </div>
                            <GenButton onClick={handleGeneratePodcast} loading={podLoading} disabled={!podTopic.trim()} label="Generate Script → Editor" loadingLabel="Writing Script..." />
                        </div>
                        {editorContent && (
                            <div className="flex gap-2">
                                <button onClick={handleExportPodcastPDF} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-amber-600 text-white hover:bg-amber-500 font-medium">📄 Export PDF</button>
                                <button onClick={() => navigator.clipboard.writeText(editorContent)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs border font-medium ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}>📋 Copy</button>
                            </div>
                        )}
                    </>
                )}

                {/* === NEWSLETTER PANEL === */}
                {activeTab === 'newsletter' && (
                    <>
                        <div className="space-y-2">
                            <div>
                                <label className={`text-xs font-medium ${labelColor}`}>Topic</label>
                                <input value={nlTopic} onChange={e => setNlTopic(e.target.value)} placeholder="e.g., 10 AI Tools for Marketing" className={`mt-0.5 w-full rounded-lg px-3 py-2 border text-sm ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`} />
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
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <button onClick={() => setShowPreview(true)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs border font-medium ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}>👁️ Styled Preview</button>
                                    <button onClick={handleExportNewsletterPDF} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-amber-600 text-white hover:bg-amber-500 font-medium">📄 Export PDF</button>
                                </div>
                                <button onClick={() => { if (nlPreviewRef.current) navigator.clipboard.writeText(nlPreviewRef.current.outerHTML); }} className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs border font-medium ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}>📋 Copy HTML</button>
                            </div>
                        )}
                    </>
                )}

                {/* === SLIDES PANEL === */}
                {activeTab === 'slides' && (
                    <>
                        <div className="space-y-2">
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
                            <div className="space-y-2">
                                <div className={`text-xs font-medium ${textMuted}`}>{slDeck.slides.length} slides generated</div>
                                {/* Slide thumbnails */}
                                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                    {slDeck.slides.map((slide: any, idx: number) => (
                                        <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${isDark ? 'bg-gray-800/50 hover:bg-gray-800' : 'bg-gray-50 hover:bg-gray-100'} transition-colors cursor-pointer`} onClick={() => handleGenerateSlideImage(idx)}>
                                            <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>{idx + 1}</span>
                                            <span className="flex-1 truncate">{slide.title}</span>
                                            {slImages[idx] ? <span className="text-green-500">✓</span> : <span className={textMuted}>🖼️</span>}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleExportPPTX} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-500 font-medium">📊 .pptx</button>
                                    <button onClick={handleExportSlidesPDF} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-amber-600 text-white hover:bg-amber-500 font-medium">📄 PDF</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* NEWSLETTER PREVIEW MODAL */}
            {showPreview && nlContent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPreview(false)}>
                    <div className="max-w-[720px] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="sticky top-0 z-10 flex justify-end p-2">
                            <button onClick={() => setShowPreview(false)} className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 text-sm">✕ Close</button>
                        </div>
                        {renderNewsletterPreview()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreativeSuite;
