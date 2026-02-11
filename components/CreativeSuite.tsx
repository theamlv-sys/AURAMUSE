import React, { useState, useRef } from 'react';
import { SubscriptionTier, TIERS } from '../types';
import { generatePodcastScript, generateNewsletterContent, generateSlideContent, generateStoryboardImage } from '../services/geminiService';

// Declare pptxgenjs global
declare const PptxGenJS: any;
declare const html2pdf: any;

interface CreativeSuiteProps {
    onBack: () => void;
    userTier: SubscriptionTier;
    theme: string;
}

type SuiteTab = 'podcast' | 'newsletter' | 'slides';

// --- ICONS ---
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>;
const BookIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>;
const SlidesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;
const SparkleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 21h10.5a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6v12a2.25 2.25 0 002.25 2.25z" /></svg>;

// --- STYLE THEMES FOR SLIDES ---
const SLIDE_THEMES: Record<string, { bg: string; title: string; text: string; accent: string; gradientFrom: string; gradientTo: string }> = {
    professional: { bg: '#FFFFFF', title: '#1a1a2e', text: '#333333', accent: '#0066CC', gradientFrom: '#0066CC', gradientTo: '#004499' },
    creative: { bg: '#FFF8F0', title: '#2D1B0E', text: '#4A3728', accent: '#FF6B35', gradientFrom: '#FF6B35', gradientTo: '#E8451A' },
    dark: { bg: '#0F0F1A', title: '#FFFFFF', text: '#B8B8CC', accent: '#7C3AED', gradientFrom: '#7C3AED', gradientTo: '#4C1D95' },
    minimal: { bg: '#FAFAFA', title: '#111111', text: '#555555', accent: '#10B981', gradientFrom: '#10B981', gradientTo: '#059669' },
    bold_gradient: { bg: '#0F172A', title: '#FFFFFF', text: '#CBD5E1', accent: '#F59E0B', gradientFrom: '#F59E0B', gradientTo: '#EF4444' }
};

// --- NEWSLETTER STYLE THEMES ---
const NL_THEMES: Record<string, { headerBg: string; headerText: string; bodyBg: string; bodyText: string; accent: string; fontFamily: string; statBg: string; quoteBorder: string; calloutBg: string; ctaBg: string; ctaText: string }> = {
    modern: { headerBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', headerText: '#fff', bodyBg: '#f8f9fa', bodyText: '#333', accent: '#667eea', fontFamily: "'Inter', sans-serif", statBg: '#667eea', quoteBorder: '#764ba2', calloutBg: '#eef2ff', ctaBg: '#667eea', ctaText: '#fff' },
    corporate: { headerBg: 'linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%)', headerText: '#fff', bodyBg: '#ffffff', bodyText: '#2c3e50', accent: '#1e3a5f', fontFamily: "'Georgia', serif", statBg: '#1e3a5f', quoteBorder: '#1e3a5f', calloutBg: '#f0f4f8', ctaBg: '#1e3a5f', ctaText: '#fff' },
    creative: { headerBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', headerText: '#fff', bodyBg: '#fff5f8', bodyText: '#333', accent: '#f5576c', fontFamily: "'Outfit', sans-serif", statBg: '#f5576c', quoteBorder: '#f093fb', calloutBg: '#fef2f4', ctaBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', ctaText: '#fff' },
    minimalist: { headerBg: '#111', headerText: '#fff', bodyBg: '#fff', bodyText: '#222', accent: '#111', fontFamily: "'Inter', sans-serif", statBg: '#111', quoteBorder: '#ddd', calloutBg: '#f9f9f9', ctaBg: '#111', ctaText: '#fff' },
    bold: { headerBg: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', headerText: '#fff', bodyBg: '#fffbeb', bodyText: '#1f2937', accent: '#f59e0b', fontFamily: "'Outfit', sans-serif", statBg: '#ef4444', quoteBorder: '#f59e0b', calloutBg: '#fef3c7', ctaBg: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', ctaText: '#fff' },
};

const CreativeSuite: React.FC<CreativeSuiteProps> = ({ onBack, userTier, theme }) => {
    const [activeTab, setActiveTab] = useState<SuiteTab>('podcast');
    const limits = TIERS[userTier].limits;
    const isDark = theme === 'dark';

    // --- PODCAST STATE ---
    const [podTopic, setPodTopic] = useState('');
    const [podFormat, setPodFormat] = useState<'talking_head' | 'solo_podcast' | 'interview' | 'panel'>('talking_head');
    const [podDuration, setPodDuration] = useState('10 minutes');
    const [podStyle, setPodStyle] = useState('Educational');
    const [podNotes, setPodNotes] = useState('');
    const [podScript, setPodScript] = useState('');
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
    const [slSelectedSlide, setSlSelectedSlide] = useState(0);
    const [slImageLoading, setSlImageLoading] = useState<number | null>(null);
    const [slImages, setSlImages] = useState<Record<number, string>>({});

    // --- PODCAST HANDLERS ---
    const handleGeneratePodcast = async () => {
        if (!podTopic.trim()) return;
        setPodLoading(true);
        setPodScript('');
        try {
            const script = await generatePodcastScript(podTopic, podFormat, podDuration, podStyle, podNotes);
            setPodScript(script);
        } catch (e) { setPodScript('Error generating script.'); }
        setPodLoading(false);
    };

    const handleCopyScript = () => {
        navigator.clipboard.writeText(podScript);
    };

    const handleExportPodcastPDF = () => {
        if (!podScript) return;
        const el = document.createElement('div');
        el.style.padding = '40px';
        el.style.fontFamily = "'Inter', sans-serif";
        el.style.color = '#222';
        el.style.maxWidth = '700px';
        el.innerHTML = `
            <h1 style="font-size:24px;margin-bottom:4px;color:#1a1a2e;">🎙️ ${podTopic}</h1>
            <p style="color:#888;font-size:12px;margin-bottom:20px;">${podFormat.replace('_', ' ').toUpperCase()} • ${podDuration} • ${podStyle}</p>
            <hr style="border:1px solid #eee;margin-bottom:20px;">
            <div style="white-space:pre-wrap;line-height:1.8;font-size:14px;">${podScript.replace(/\n/g, '<br>')}</div>
        `;
        document.body.appendChild(el);
        html2pdf().set({ margin: 0.5, filename: `${podTopic.slice(0, 40)}-script.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter' } }).from(el).save().then(() => document.body.removeChild(el));
    };

    // --- NEWSLETTER HANDLERS ---
    const handleGenerateNewsletter = async () => {
        if (!nlTopic.trim()) return;
        setNlLoading(true);
        setNlContent(null);
        try {
            const content = await generateNewsletterContent(nlTopic, nlType, nlStyle, nlNotes);
            setNlContent(content);
        } catch (e) { setNlContent({ title: 'Error', subtitle: '', sections: [{ heading: 'Error', content: 'Failed to generate.', type: 'text' }] }); }
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

    const handleCopyNewsletterHTML = () => {
        if (!nlPreviewRef.current) return;
        navigator.clipboard.writeText(nlPreviewRef.current.outerHTML);
    };

    // --- SLIDES HANDLERS ---
    const handleGenerateSlides = async () => {
        if (!slTopic.trim()) return;
        setSlLoading(true);
        setSlDeck(null);
        setSlImages({});
        setSlSelectedSlide(0);
        try {
            const deck = await generateSlideContent(slTopic, slCount, slStyle, slNotes);
            setSlDeck(deck);
        } catch (e) { setSlDeck({ title: 'Error', slides: [{ title: 'Error', bullets: ['Failed to generate.'], notes: '', layout: 'content' }] }); }
        setSlLoading(false);
    };

    const handleGenerateSlideImage = async (index: number) => {
        if (!slDeck) return;
        const slide = slDeck.slides[index];
        setSlImageLoading(index);
        try {
            const prompt = `Create a professional, clean, abstract background image for a presentation slide about: "${slide.title}". Style: ${slStyle}. The image should be suitable as a slide background — no text, no charts, just a beautiful visual that complements the topic. Aspect ratio 16:9.`;
            const imageUrl = await generateStoryboardImage(prompt, userTier, '16:9');
            setSlImages(prev => ({ ...prev, [index]: imageUrl }));
        } catch (e) { console.error('Slide image error', e); }
        setSlImageLoading(null);
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
                // Dark overlay for text readability
                sl.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: '000000', transparency: 50 } });
            }

            const textColor = hasImage ? 'FFFFFF' : themeColors.title.replace('#', '');
            const bodyColor = hasImage ? 'E0E0E0' : themeColors.text.replace('#', '');

            if (slide.layout === 'title' || slide.layout === 'section_break') {
                if (!hasImage) {
                    sl.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: themeColors.gradientFrom.replace('#', '') } });
                }
                sl.addText(slide.title, { x: 0.8, y: 1.5, w: 8.4, h: 2, fontSize: slide.layout === 'title' ? 36 : 30, color: 'FFFFFF', bold: true, align: 'center', fontFace: 'Arial' });
                if (slide.bullets?.length > 0) {
                    sl.addText(slide.bullets[0], { x: 1, y: 3.8, w: 8, h: 1, fontSize: 18, color: 'CCCCCC', align: 'center', fontFace: 'Arial' });
                }
            } else if (slide.layout === 'quote') {
                sl.addText(`"${slide.bullets?.[0] || ''}"`, { x: 1, y: 1.5, w: 8, h: 3, fontSize: 24, color: textColor, italic: true, align: 'center', fontFace: 'Georgia' });
            } else {
                // Content / Two-column / Image-focus
                if (!hasImage) {
                    sl.background = { fill: themeColors.bg.replace('#', '') };
                }
                sl.addText(slide.title, { x: 0.6, y: 0.3, w: 8.8, h: 0.8, fontSize: 28, color: textColor, bold: true, fontFace: 'Arial' });
                // Accent line
                sl.addShape(pptx.shapes.RECTANGLE, { x: 0.6, y: 1.15, w: 1.5, h: 0.05, fill: { color: themeColors.accent.replace('#', '') } });

                if (slide.bullets?.length > 0) {
                    const bulletText = slide.bullets.map((b: string) => ({ text: b, options: { bullet: { code: '2022' }, fontSize: 16, color: bodyColor, breakLine: true, paraSpaceAfter: 8 } }));
                    sl.addText(bulletText, { x: 0.6, y: 1.5, w: 8.8, h: 3.5, fontFace: 'Arial', valign: 'top' });
                }
            }

            if (slide.notes) {
                sl.addNotes(slide.notes);
            }
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
                content.innerHTML = `<h1 style="font-size:36px;color:#fff;text-align:center;margin:0;">${slide.title}</h1>${slide.bullets?.length ? `<p style="font-size:18px;color:#ccc;text-align:center;margin-top:16px;">${slide.bullets[0]}</p>` : ''}`;
            } else if (slide.layout === 'quote') {
                slideEl.style.background = hasImg ? '' : themeColors.bg;
                content.innerHTML = `<p style="font-size:24px;color:${hasImg ? '#fff' : themeColors.title};font-style:italic;text-align:center;">"${slide.bullets?.[0] || ''}"</p>`;
            } else {
                if (!hasImg) slideEl.style.background = themeColors.bg;
                const bulletItems = (slide.bullets || []).map((b: string) => `<li style="margin-bottom:8px;font-size:16px;color:${hasImg ? '#e0e0e0' : themeColors.text};">${b}</li>`).join('');
                content.innerHTML = `<h2 style="font-size:28px;color:${hasImg ? '#fff' : themeColors.title};margin:0 0 12px 0;">${slide.title}</h2><div style="width:60px;height:3px;background:${themeColors.accent};margin-bottom:20px;"></div><ul style="list-style:disc;padding-left:20px;">${bulletItems}</ul>`;
            }
            slideEl.appendChild(content);
            el.appendChild(slideEl);
        });

        document.body.appendChild(el);
        html2pdf().set({ margin: 0, filename: `${slDeck.title.slice(0, 40)}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'px', format: [960, 540], orientation: 'landscape' } }).from(el).save().then(() => document.body.removeChild(el));
    };

    // --- RENDER NEWSLETTER PREVIEW ---
    const renderNewsletterPreview = () => {
        if (!nlContent) return null;
        const t = NL_THEMES[nlStyle] || NL_THEMES.modern;

        return (
            <div ref={nlPreviewRef} style={{ fontFamily: t.fontFamily, maxWidth: '680px', margin: '0 auto', background: t.bodyBg, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
                {/* Header */}
                <div style={{ background: t.headerBg, padding: '48px 40px', textAlign: 'center' }}>
                    <h1 style={{ color: t.headerText, fontSize: '32px', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{nlContent.title}</h1>
                    {nlContent.subtitle && <p style={{ color: t.headerText, opacity: 0.85, fontSize: '16px', marginTop: '12px' }}>{nlContent.subtitle}</p>}
                </div>
                {/* Body */}
                <div style={{ padding: '40px' }}>
                    {nlContent.sections.map((section: any, i: number) => {
                        if (section.type === 'stat') {
                            return (
                                <div key={i} style={{ background: t.statBg, color: '#fff', borderRadius: '12px', padding: '32px', margin: '24px 0', textAlign: 'center' }}>
                                    {section.heading && <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8, marginBottom: '8px' }}>{section.heading}</div>}
                                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{section.content}</div>
                                </div>
                            );
                        }
                        if (section.type === 'quote') {
                            return (
                                <blockquote key={i} style={{ borderLeft: `4px solid ${t.quoteBorder}`, paddingLeft: '20px', margin: '28px 0', fontStyle: 'italic', fontSize: '18px', color: t.bodyText, lineHeight: 1.6 }}>
                                    {section.content}
                                </blockquote>
                            );
                        }
                        if (section.type === 'callout') {
                            return (
                                <div key={i} style={{ background: t.calloutBg, border: `1px solid ${t.accent}33`, borderRadius: '8px', padding: '20px 24px', margin: '24px 0' }}>
                                    {section.heading && <div style={{ fontWeight: 700, color: t.accent, marginBottom: '8px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>💡 {section.heading}</div>}
                                    <div style={{ color: t.bodyText, lineHeight: 1.7, fontSize: '15px' }}>{section.content}</div>
                                </div>
                            );
                        }
                        if (section.type === 'list') {
                            const items = section.content.split('\n').filter((l: string) => l.trim());
                            return (
                                <div key={i} style={{ margin: '24px 0' }}>
                                    {section.heading && <h3 style={{ color: t.accent, margin: '0 0 12px 0', fontSize: '18px' }}>{section.heading}</h3>}
                                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                        {items.map((item: string, j: number) => <li key={j} style={{ color: t.bodyText, lineHeight: 1.8, fontSize: '15px', marginBottom: '6px' }}>{item.replace(/^[•\-]\s*/, '')}</li>)}
                                    </ul>
                                </div>
                            );
                        }
                        if (section.type === 'cta') {
                            return (
                                <div key={i} style={{ textAlign: 'center', margin: '32px 0', padding: '32px', background: t.calloutBg, borderRadius: '12px' }}>
                                    {section.heading && <h3 style={{ color: t.bodyText, margin: '0 0 12px 0', fontSize: '20px' }}>{section.heading}</h3>}
                                    <p style={{ color: t.bodyText, lineHeight: 1.6, marginBottom: '16px', fontSize: '15px' }}>{section.content}</p>
                                    <div style={{ display: 'inline-block', background: t.ctaBg, color: t.ctaText, padding: '12px 32px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>Get Started →</div>
                                </div>
                            );
                        }
                        // Default text section
                        return (
                            <div key={i} style={{ margin: '24px 0' }}>
                                {section.heading && <h2 style={{ color: t.accent, margin: '0 0 12px 0', fontSize: '22px', fontWeight: 700 }}>{section.heading}</h2>}
                                <div style={{ color: t.bodyText, lineHeight: 1.8, fontSize: '15px', whiteSpace: 'pre-wrap' }}>{section.content}</div>
                            </div>
                        );
                    })}
                    {/* Footer */}
                    <div style={{ borderTop: '1px solid #eee', marginTop: '40px', paddingTop: '20px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                        <p>Generated by AuraDomoMuse • Domo Suite</p>
                    </div>
                </div>
            </div>
        );
    };

    // --- RENDER SLIDE PREVIEW ---
    const renderSlidePreview = (slide: any, idx: number, large: boolean = false) => {
        const themeColors = SLIDE_THEMES[slStyle] || SLIDE_THEMES.professional;
        const hasImage = slImages[idx];
        const w = large ? '100%' : '100%';
        const h = large ? '360px' : '120px';
        const titleSize = large ? '24px' : '10px';
        const bulletSize = large ? '14px' : '7px';

        return (
            <div style={{
                width: w, height: h, borderRadius: large ? '12px' : '6px', overflow: 'hidden', position: 'relative',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: large ? '32px 40px' : '8px 12px',
                background: (slide.layout === 'title' || slide.layout === 'section_break') ? themeColors.gradientFrom
                    : hasImage ? `url(${hasImage}) center/cover` : themeColors.bg,
                boxShadow: large ? '0 8px 32px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.15)',
                cursor: large ? 'default' : 'pointer', boxSizing: 'border-box'
            }}>
                {hasImage && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />}
                <div style={{ position: 'relative', zIndex: 1 }}>
                    {(slide.layout === 'title' || slide.layout === 'section_break') ? (
                        <div style={{ textAlign: 'center', color: '#fff', fontSize: titleSize, fontWeight: 700 }}>{slide.title}</div>
                    ) : slide.layout === 'quote' ? (
                        <div style={{ textAlign: 'center', fontStyle: 'italic', color: hasImage ? '#fff' : themeColors.title, fontSize: large ? '18px' : '8px' }}>"{slide.bullets?.[0]?.slice(0, large ? 200 : 60)}"</div>
                    ) : (
                        <>
                            <div style={{ color: hasImage ? '#fff' : themeColors.title, fontSize: titleSize, fontWeight: 700, marginBottom: large ? '12px' : '4px' }}>{slide.title}</div>
                            {large && <div style={{ width: '40px', height: '3px', background: themeColors.accent, marginBottom: '16px' }} />}
                            {(slide.bullets || []).slice(0, large ? 6 : 3).map((b: string, j: number) => (
                                <div key={j} style={{ color: hasImage ? '#ddd' : themeColors.text, fontSize: bulletSize, lineHeight: large ? 1.8 : 1.4 }}>• {large ? b : b.slice(0, 40)}</div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        );
    };

    // --- STYLES ---
    const panelBg = isDark ? 'bg-gray-900' : 'bg-white';
    const cardBg = isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200';
    const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-300 text-gray-800';
    const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';
    const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

    return (
        <div className={`fixed inset-0 z-50 flex flex-col ${isDark ? 'bg-gray-950 text-gray-200' : 'bg-gray-100 text-gray-900'}`}>
            {/* HEADER */}
            <div className={`flex items-center justify-between px-6 py-3 border-b ${isDark ? 'border-gray-800 bg-gray-900/80' : 'border-gray-200 bg-white/80'} backdrop-blur-md`}>
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className={`p-2 rounded-lg hover:bg-gray-700/50 ${textMuted}`}><ChevronLeftIcon /></button>
                    <div>
                        <h1 className="text-lg font-bold font-serif tracking-wide" style={{ color: isDark ? '#f59e0b' : '#b45309' }}>Domo Suite</h1>
                        <p className={`text-xs ${textMuted}`}>Podcast Scripts • Newsletters & Ebooks • Slide Decks</p>
                    </div>
                </div>
                <div className="flex gap-1 bg-gray-800/40 p-1 rounded-xl">
                    {[
                        { id: 'podcast' as SuiteTab, label: 'Talking Head / Podcast', icon: <MicIcon />, locked: false },
                        { id: 'newsletter' as SuiteTab, label: 'Newsletter / Ebook', icon: <BookIcon />, locked: !limits.hasNewsletterEbook },
                        { id: 'slides' as SuiteTab, label: 'Slides', icon: <SlidesIcon />, locked: !limits.hasSlides },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { if (!tab.locked) setActiveTab(tab.id); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-amber-600/90 text-white shadow-lg'
                                : tab.locked
                                    ? 'text-gray-600 cursor-not-allowed'
                                    : `${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'}`
                                }`}
                        >
                            {tab.icon}
                            <span className="hidden md:inline">{tab.label}</span>
                            {tab.locked && <LockIcon />}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto">
                {/* ============ PODCAST TAB ============ */}
                {activeTab === 'podcast' && (
                    <div className="max-w-5xl mx-auto p-6 space-y-6">
                        <div className={`border rounded-xl p-6 ${cardBg}`}>
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><MicIcon /> Script Generator</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className={`text-sm font-medium ${labelColor}`}>Topic / Title</label>
                                    <input value={podTopic} onChange={e => setPodTopic(e.target.value)} placeholder="e.g., 'Why Most People Fail at Building Habits'" className={`mt-1 w-full rounded-lg px-4 py-3 border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`} />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className={`text-sm font-medium ${labelColor}`}>Format</label>
                                        <select value={podFormat} onChange={e => setPodFormat(e.target.value as any)} className={`mt-1 w-full rounded-lg px-3 py-2.5 border ${inputBg}`}>
                                            <option value="talking_head">🎥 Talking Head</option>
                                            <option value="solo_podcast">🎙️ Solo Podcast</option>
                                            <option value="interview">🗣️ Interview</option>
                                            <option value="panel">👥 Panel Discussion</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`text-sm font-medium ${labelColor}`}>Duration</label>
                                        <select value={podDuration} onChange={e => setPodDuration(e.target.value)} className={`mt-1 w-full rounded-lg px-3 py-2.5 border ${inputBg}`}>
                                            <option>5 minutes</option>
                                            <option>10 minutes</option>
                                            <option>15 minutes</option>
                                            <option>30 minutes</option>
                                            <option>60 minutes</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`text-sm font-medium ${labelColor}`}>Style</label>
                                        <select value={podStyle} onChange={e => setPodStyle(e.target.value)} className={`mt-1 w-full rounded-lg px-3 py-2.5 border ${inputBg}`}>
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
                                    <label className={`text-sm font-medium ${labelColor}`}>Additional Notes <span className={textMuted}>(optional)</span></label>
                                    <textarea value={podNotes} onChange={e => setPodNotes(e.target.value)} rows={2} placeholder="Target audience, key points to cover, brand voice..." className={`mt-1 w-full rounded-lg px-4 py-3 border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none resize-none`} />
                                </div>
                                <button onClick={handleGeneratePodcast} disabled={podLoading || !podTopic.trim()} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                    {podLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SparkleIcon />}
                                    {podLoading ? 'Generating Script...' : 'Generate Script'}
                                </button>
                            </div>
                        </div>

                        {podScript && (
                            <div className={`border rounded-xl p-6 ${cardBg}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold">📜 Generated Script</h3>
                                    <div className="flex gap-2">
                                        <button onClick={handleCopyScript} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'} transition-colors`}><CopyIcon /> Copy</button>
                                        <button onClick={handleExportPodcastPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-amber-600 text-white hover:bg-amber-500 transition-colors"><DownloadIcon /> PDF</button>
                                    </div>
                                </div>
                                <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-gray-50'} whitespace-pre-wrap leading-relaxed text-sm font-mono max-h-[600px] overflow-y-auto`}>
                                    {podScript}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ============ NEWSLETTER TAB ============ */}
                {activeTab === 'newsletter' && (
                    <div className="p-6 space-y-6">
                        <div className="max-w-5xl mx-auto">
                            <div className={`border rounded-xl p-6 ${cardBg}`}>
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><BookIcon /> Newsletter & Ebook Creator</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className={`text-sm font-medium ${labelColor}`}>Topic / Subject</label>
                                        <input value={nlTopic} onChange={e => setNlTopic(e.target.value)} placeholder="e.g., '10 AI Tools That Will Replace Your Marketing Team'" className={`mt-1 w-full rounded-lg px-4 py-3 border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={`text-sm font-medium ${labelColor}`}>Type</label>
                                            <select value={nlType} onChange={e => setNlType(e.target.value as any)} className={`mt-1 w-full rounded-lg px-3 py-2.5 border ${inputBg}`}>
                                                <option value="newsletter">📧 Newsletter</option>
                                                <option value="short_ebook">📖 Short Ebook</option>
                                                <option value="longform_guide">📚 Long-form Guide</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={`text-sm font-medium ${labelColor}`}>Style</label>
                                            <select value={nlStyle} onChange={e => setNlStyle(e.target.value)} className={`mt-1 w-full rounded-lg px-3 py-2.5 border ${inputBg}`}>
                                                <option value="modern">✨ Modern</option>
                                                <option value="corporate">🏢 Corporate</option>
                                                <option value="creative">🎨 Creative</option>
                                                <option value="minimalist">◻️ Minimalist</option>
                                                <option value="bold">🔥 Bold</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`text-sm font-medium ${labelColor}`}>Additional Context <span className={textMuted}>(optional)</span></label>
                                        <textarea value={nlNotes} onChange={e => setNlNotes(e.target.value)} rows={2} placeholder="Target audience, key points, brand voice..." className={`mt-1 w-full rounded-lg px-4 py-3 border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none resize-none`} />
                                    </div>
                                    <button onClick={handleGenerateNewsletter} disabled={nlLoading || !nlTopic.trim()} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50">
                                        {nlLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SparkleIcon />}
                                        {nlLoading ? 'Creating Content...' : 'Generate Content'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {nlContent && (
                            <div>
                                <div className="max-w-5xl mx-auto flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold">📄 Preview</h3>
                                    <div className="flex gap-2">
                                        <button onClick={handleCopyNewsletterHTML} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}><CopyIcon /> Copy HTML</button>
                                        <button onClick={handleExportNewsletterPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-amber-600 text-white hover:bg-amber-500"><DownloadIcon /> Download PDF</button>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-8 ${isDark ? 'bg-gray-800/50' : 'bg-gray-200/50'}`}>
                                    {renderNewsletterPreview()}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ============ SLIDES TAB ============ */}
                {activeTab === 'slides' && (
                    <div className="p-6 space-y-6">
                        <div className="max-w-5xl mx-auto">
                            <div className={`border rounded-xl p-6 ${cardBg}`}>
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><SlidesIcon /> Slide Deck Builder</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className={`text-sm font-medium ${labelColor}`}>Topic / Presentation Title</label>
                                        <input value={slTopic} onChange={e => setSlTopic(e.target.value)} placeholder="e.g., 'Q4 2026 Growth Strategy'" className={`mt-1 w-full rounded-lg px-4 py-3 border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`} />
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className={`text-sm font-medium ${labelColor}`}>Slides</label>
                                            <select value={slCount} onChange={e => setSlCount(Number(e.target.value))} className={`mt-1 w-full rounded-lg px-3 py-2.5 border ${inputBg}`}>
                                                <option value={5}>5 Slides</option>
                                                <option value={10}>10 Slides</option>
                                                <option value={15}>15 Slides</option>
                                                <option value={20}>20 Slides</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={`text-sm font-medium ${labelColor}`}>Theme</label>
                                            <select value={slStyle} onChange={e => setSlStyle(e.target.value)} className={`mt-1 w-full rounded-lg px-3 py-2.5 border ${inputBg}`}>
                                                <option value="professional">💼 Professional</option>
                                                <option value="creative">🎨 Creative</option>
                                                <option value="dark">🌙 Dark</option>
                                                <option value="minimal">◻️ Minimal</option>
                                                <option value="bold_gradient">🔥 Bold Gradient</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 md:col-span-1">
                                            <label className={`text-sm font-medium ${labelColor}`}>Key Points <span className={textMuted}>(optional)</span></label>
                                            <input value={slNotes} onChange={e => setSlNotes(e.target.value)} placeholder="Key points to cover..." className={`mt-1 w-full rounded-lg px-3 py-2.5 border ${inputBg}`} />
                                        </div>
                                    </div>
                                    <button onClick={handleGenerateSlides} disabled={slLoading || !slTopic.trim()} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50">
                                        {slLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SparkleIcon />}
                                        {slLoading ? 'Building Deck...' : 'Generate Slide Deck'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {slDeck && (
                            <div className="max-w-6xl mx-auto">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold">📊 {slDeck.title}</h3>
                                    <div className="flex gap-2">
                                        <button onClick={handleExportPPTX} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-500 font-medium shadow-lg"><DownloadIcon /> Download .pptx</button>
                                        <button onClick={handleExportSlidesPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-amber-600 text-white hover:bg-amber-500"><DownloadIcon /> PDF</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-4">
                                    {/* Slide Thumbnails */}
                                    <div className="col-span-3 space-y-2 max-h-[600px] overflow-y-auto pr-2">
                                        {slDeck.slides.map((slide: any, idx: number) => (
                                            <div key={idx} onClick={() => setSlSelectedSlide(idx)} className={`rounded-lg border-2 transition-all ${slSelectedSlide === idx ? 'border-amber-500 shadow-lg shadow-amber-500/20' : isDark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-400'}`}>
                                                <div className="relative">
                                                    {renderSlidePreview(slide, idx)}
                                                    <div className={`absolute bottom-1 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-900/80 text-gray-300' : 'bg-white/80 text-gray-600'}`}>{idx + 1}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Large Preview + Controls */}
                                    <div className="col-span-9 space-y-4">
                                        <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-gray-700' : 'border-gray-200'}`} style={{ aspectRatio: '16/9' }}>
                                            {renderSlidePreview(slDeck.slides[slSelectedSlide], slSelectedSlide, true)}
                                        </div>

                                        {/* Slide Controls */}
                                        <div className={`border rounded-xl p-4 ${cardBg}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded bg-amber-600/20 text-amber-500`}>Slide {slSelectedSlide + 1}/{slDeck.slides.length}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{slDeck.slides[slSelectedSlide].layout}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleGenerateSlideImage(slSelectedSlide)}
                                                    disabled={slImageLoading === slSelectedSlide}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50"
                                                >
                                                    {slImageLoading === slSelectedSlide ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ImageIcon />}
                                                    AI Background
                                                </button>
                                            </div>
                                            {slDeck.slides[slSelectedSlide].notes && (
                                                <div>
                                                    <div className={`text-xs font-semibold ${textMuted} mb-1`}>SPEAKER NOTES</div>
                                                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}>{slDeck.slides[slSelectedSlide].notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreativeSuite;
