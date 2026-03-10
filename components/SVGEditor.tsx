import React, { useState, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { 
  X, 
  Type, 
  Square, 
  Circle as CircleIcon, 
  MousePointer2, 
  Settings2, 
  Palette, 
  Layers,
  Sparkles,
  Trash2,
  Move,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import { cn } from '../utils/cn';

interface SVGEditorProps {
  svgCode: string;
  onUpdate: (newCode: string) => void;
  onRefine: (request: string) => void;
  isRefining: boolean;
}

export function SVGEditor({ svgCode, onUpdate, onRefine, isRefining }: SVGEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [properties, setProperties] = useState<any>({});
  const [refineInput, setRefineInput] = useState('');
  const [originalCode] = useState(svgCode);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleReset = () => {
    onUpdate(originalCode);
    setSelectedId(null);
  };

  useEffect(() => {
    if (containerRef.current) {
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        // Add click listeners to all elements with IDs
        const elements = svg.querySelectorAll('[id]');
        elements.forEach(el => {
          (el as HTMLElement).style.cursor = 'pointer';
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            handleElementClick(el);
          });
        });
      }
    }
  }, [svgCode]);

  const handleElementClick = (el: Element) => {
    setSelectedId(el.id);
    setSelectedElement(el);
    
    // Extract properties
    const props: any = {
      fill: el.getAttribute('fill') || '',
      stroke: el.getAttribute('stroke') || '',
      strokeWidth: el.getAttribute('stroke-width') || '',
      opacity: el.getAttribute('opacity') || '1',
      transform: el.getAttribute('transform') || '',
    };
    
    if (el.tagName === 'text') {
      props.content = el.textContent || '';
      props.fontSize = el.getAttribute('font-size') || '';
    } else if (el.tagName === 'rect') {
      props.width = el.getAttribute('width') || '';
      props.height = el.getAttribute('height') || '';
      props.rx = el.getAttribute('rx') || '';
    } else if (el.tagName === 'circle') {
      props.r = el.getAttribute('r') || '';
    }
    
    setProperties(props);
  };

  const updateProperty = (key: string, value: string) => {
    if (!selectedId || !containerRef.current) return;
    
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;
    
    const el = svg.getElementById(selectedId);
    if (!el) return;

    if (key === 'content') {
      el.textContent = value;
    } else {
      el.setAttribute(key, value);
    }

    setProperties(prev => ({ ...prev, [key]: value }));
    onUpdate(svg.outerHTML);
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-3xl overflow-hidden border border-white/10">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-orange-500" />
          <h3 className="text-xs font-mono uppercase tracking-widest text-white/60">SVG Inspector</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleReset}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
            title="Reset to Original"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {selectedId && (
            <button 
              onClick={() => setSelectedId(null)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {!selectedId ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <MousePointer2 className="w-6 h-6 text-white/20" />
              </div>
              <p className="text-xs text-white/40 uppercase tracking-widest leading-relaxed">
                Click an element in the preview<br />to start editing
              </p>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
                <Sparkles className="w-3 h-3" />
                AI Refinement
              </div>
              <div className="relative">
                <textarea
                  value={refineInput}
                  onChange={(e) => setRefineInput(e.target.value)}
                  placeholder="Ask AI to modify the whole SVG... (e.g., 'Make it more cinematic', 'Change theme to ocean blue')"
                  className="w-full h-24 bg-black/20 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-orange-500/50 transition-colors resize-none placeholder:text-white/20"
                />
                <button
                  onClick={() => {
                    onRefine(refineInput);
                    setRefineInput('');
                  }}
                  disabled={isRefining || !refineInput.trim()}
                  className="absolute bottom-2 right-2 p-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-white transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Selected Element</div>
              <div className="text-xs font-mono text-orange-500">#{selectedId}</div>
            </div>

            {/* Content for Text */}
            {selectedElement?.tagName === 'text' && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <Type className="w-3 h-3" /> Text Content
                </label>
                <input
                  type="text"
                  value={properties.content}
                  onChange={(e) => updateProperty('content', e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-orange-500/50"
                />
              </div>
            )}

            {/* Properties for Rect */}
            {selectedElement?.tagName === 'rect' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40">Width</label>
                  <input
                    type="text"
                    value={properties.width}
                    onChange={(e) => updateProperty('width', e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40">Height</label>
                  <input
                    type="text"
                    value={properties.height}
                    onChange={(e) => updateProperty('height', e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>
            )}

            {/* Properties for Circle */}
            {selectedElement?.tagName === 'circle' && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40">Radius (r)</label>
                <input
                  type="text"
                  value={properties.r}
                  onChange={(e) => updateProperty('r', e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-orange-500/50"
                />
              </div>
            )}

            {/* Color Picker */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Palette className="w-3 h-3" /> Fill Color
              </label>
              <div className="flex gap-3">
                <div className="w-full">
                  <HexColorPicker 
                    color={properties.fill.startsWith('#') ? properties.fill : '#ffffff'} 
                    onChange={(color) => updateProperty('fill', color)}
                    className="!w-full !h-32"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Layers className="w-3 h-3" /> Stroke
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={properties.stroke}
                  onChange={(e) => updateProperty('stroke', e.target.value)}
                  placeholder="none or #color"
                  className="flex-1 bg-black/20 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-orange-500/50"
                />
                <input
                  type="text"
                  value={properties.strokeWidth}
                  onChange={(e) => updateProperty('stroke-width', e.target.value)}
                  placeholder="width"
                  className="w-16 bg-black/20 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-orange-500/50"
                />
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[10px] uppercase tracking-widest text-white/40">Opacity</label>
                  <span className="text-[10px] font-mono text-white/60">{Math.round(properties.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={properties.opacity}
                  onChange={(e) => updateProperty('opacity', e.target.value)}
                  className="w-full accent-orange-500"
                />
              </div>

              {selectedElement?.tagName === 'text' && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-[10px] uppercase tracking-widest text-white/40">Font Size</label>
                    <span className="text-[10px] font-mono text-white/60">{properties.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="120"
                    step="1"
                    value={parseInt(properties.fontSize) || 16}
                    onChange={(e) => updateProperty('font-size', e.target.value)}
                    className="w-full accent-orange-500"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-white/10">
              <button 
                onClick={() => {
                  if (!selectedId || !containerRef.current) return;
                  const svg = containerRef.current.querySelector('svg');
                  if (!svg) return;
                  const el = svg.getElementById(selectedId);
                  if (el) {
                    el.remove();
                    onUpdate(svg.outerHTML);
                    setSelectedId(null);
                  }
                }}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] uppercase tracking-widest font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Element
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden container for SVG manipulation */}
      <div ref={containerRef} className="hidden" dangerouslySetInnerHTML={{ __html: svgCode }} />
    </div>
  );
}
