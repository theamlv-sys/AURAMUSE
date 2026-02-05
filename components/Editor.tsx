import React, { useRef, useState, useEffect } from 'react';
import { marked } from 'marked';
import { ProjectType, VersionSnapshot } from '../types';

// Add type definition for html2pdf attached to window
declare global {
  interface Window {
    html2pdf: any;
  }
}

interface EditorProps {
  content: string;
  onChange: (text: string) => void;
  title: string;
  onTitleChange: (text: string) => void;
  projectType: ProjectType;
  versionHistory: VersionSnapshot[];
  onRestoreVersion: (content: string) => void;
  onSnapshot: () => void;
  onDeleteSnapshot: (id: string) => void;
}

const Editor: React.FC<EditorProps> = ({ content, onChange, title, onTitleChange, projectType, versionHistory, onRestoreVersion, onSnapshot, onDeleteSnapshot }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Auto-snapshot every 5 minutes if content changes
  useEffect(() => {
      const interval = setInterval(() => {
          if (content.length > 50) onSnapshot();
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
  }, [content, onSnapshot]);

  const downloadFile = (format: 'md' | 'txt') => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'untitled'}.${format}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setShowExportMenu(false);
  };

  const handleSavePdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);

    try {
        const htmlContent = await marked.parse(content, { breaks: true, gfm: true });
        
        const overlay = document.createElement('div');
        overlay.id = 'pdf-gen-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '999999',
            backgroundColor: '#525659',
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '40px',
            paddingBottom: '40px'
        });

        const page = document.createElement('div');
        Object.assign(page.style, {
            width: '210mm',
            minHeight: '297mm',
            padding: '20mm',
            backgroundColor: '#ffffff',
            color: '#000000',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            fontFamily: projectType === ProjectType.SCREENPLAY ? "'Courier Prime', monospace" : "'Merriweather', serif",
            fontSize: '12pt',
            lineHeight: '1.6'
        });

        page.innerHTML = `
          <div style="color: #000000 !important; background: #ffffff !important;">
            <h1 style="text-align: center; margin-bottom: 30px; font-size: 24pt; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 15px; color: #000; line-height: 1.2;">
                ${title || 'Untitled Project'}
            </h1>
            <div class="pdf-content" style="text-align: left; color: #000;">
                ${htmlContent}
            </div>
            <div style="margin-top: 50px; text-align: center; font-size: 9pt; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
                Generated with Muse AI
            </div>
          </div>
        `;

        const style = document.createElement('style');
        style.innerHTML = `
            .pdf-content p { margin-bottom: 1em; }
            .pdf-content h1, .pdf-content h2, .pdf-content h3 { font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; color: #000; }
            .pdf-content h1 { font-size: 18pt; }
            .pdf-content h2 { font-size: 16pt; }
            .pdf-content ul, .pdf-content ol { margin-left: 20px; margin-bottom: 1em; }
            .pdf-content blockquote { border-left: 4px solid #ccc; padding-left: 10px; color: #444; font-style: italic; }
        `;
        page.appendChild(style);
        overlay.appendChild(page);
        document.body.appendChild(overlay);

        await new Promise(resolve => setTimeout(resolve, 800));

        const opt = {
          margin:       0,
          filename:     `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'untitled'}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, scrollY: 0, windowWidth: 1000 },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        if (window.html2pdf) {
            await window.html2pdf().set(opt).from(page).save();
        } else {
            alert("PDF generator is initializing. Please try again.");
        }
        document.body.removeChild(overlay);

    } catch (e) {
        console.error("PDF Gen Error:", e);
        alert("Failed to generate PDF.");
        const overlay = document.getElementById('pdf-gen-overlay');
        if (overlay) document.body.removeChild(overlay);
    } finally {
        setIsExportingPdf(false);
        setShowExportMenu(false);
    }
  };

  const isScreenplay = projectType === ProjectType.SCREENPLAY;

  return (
    <div id="editor-container" className="h-full flex flex-col bg-gray-900 relative">
        {/* Toolbar */}
        <div className="no-print px-8 py-3 border-b border-gray-800 flex justify-between items-center bg-gray-900 z-10">
            <div className="flex items-center gap-2">
                 <button 
                    onClick={onSnapshot}
                    className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                    title="Save Version Snapshot"
                 >
                     <span>💾</span> Save Version
                 </button>
                 <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${showHistory ? 'bg-muse-900 text-white' : 'text-gray-500 hover:text-white'}`}
                 >
                     <span>↺</span> History
                 </button>
            </div>
            
            <div className="relative">
                <button 
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-sm font-medium transition-colors border border-gray-700"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Export
                </button>

                {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-20">
                        <button onClick={() => downloadFile('md')} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-2">
                             <span className="text-muse-500">M↓</span> Save as Markdown
                        </button>
                        <button onClick={() => downloadFile('txt')} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-2">
                             <span className="text-muse-500">T↓</span> Save as Text
                        </button>
                        <div className="h-px bg-gray-700 mx-2"></div>
                        <button 
                            onClick={handleSavePdf} 
                            disabled={isExportingPdf}
                            className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                             <span className="text-red-400">
                                {isExportingPdf ? '...' : 'P↓'}
                             </span> 
                             {isExportingPdf ? 'Preparing...' : 'Save as PDF'}
                        </button>
                    </div>
                )}
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col overflow-y-auto px-8 pb-8 items-center">
                 <div className="w-full max-w-4xl pt-8 pb-4">
                    <input 
                        id="editor-title"
                        type="text" 
                        value={title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        placeholder="Untitled Project"
                        className={`w-full bg-transparent text-4xl font-bold text-gray-100 placeholder-gray-600 focus:outline-none ${isScreenplay ? 'font-mono text-center uppercase tracking-widest' : 'font-serif'}`}
                    />
                </div>
                <textarea
                    id="editor-textarea"
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={isScreenplay ? "INT. SCENE HEADING - DAY\n\nACTION DESCRIPTION goes here..." : "Start writing your masterpiece..."}
                    className={`w-full h-full min-h-[80vh] max-w-4xl bg-transparent text-gray-300 text-lg leading-relaxed focus:outline-none resize-none placeholder-gray-700 ${
                        isScreenplay ? 'font-mono whitespace-pre-wrap' : 'font-serif'
                    }`}
                    spellCheck={false}
                    style={isScreenplay ? { maxWidth: '800px', padding: '0 50px' } : {}}
                />
            </div>

            {/* Version History Sidebar */}
            <div className={`absolute top-0 right-0 h-full w-64 bg-gray-850 border-l border-gray-800 transition-transform duration-300 ${showHistory ? 'translate-x-0' : 'translate-x-full'} z-30 shadow-2xl`}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900">
                    <h3 className="font-bold text-gray-300">Versions</h3>
                    <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white">✕</button>
                </div>
                <div className="overflow-y-auto h-full p-2 space-y-2 pb-20 bg-gray-850">
                    {versionHistory.length === 0 && <div className="text-xs text-gray-500 text-center mt-4">No snapshots yet.</div>}
                    {versionHistory.slice().reverse().map(v => (
                        <div key={v.id} className="p-3 bg-gray-800 rounded border border-gray-700 hover:border-muse-500 cursor-pointer group relative">
                            <div onClick={() => onRestoreVersion(v.content)}>
                                <div className="text-xs text-muse-400 font-bold mb-1">{new Date(v.timestamp).toLocaleTimeString()}</div>
                                <div className="text-[10px] text-gray-400">{v.description || new Date(v.timestamp).toLocaleDateString()}</div>
                                <div className="text-[10px] text-gray-500 mt-1 truncate">{v.content.slice(0, 40)}...</div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteSnapshot(v.id); }}
                                className="absolute top-2 right-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                                title="Delete Snapshot"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default Editor;