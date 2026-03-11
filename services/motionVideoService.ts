import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Canvg } from 'canvg';

let ffmpeg: FFmpeg | null = null;

async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;
  
  if (typeof SharedArrayBuffer === 'undefined') {
    console.warn('SharedArrayBuffer is not available. FFmpeg.wasm might fail or be slow.');
  }

  ffmpeg = new FFmpeg();
  
  ffmpeg.on('log', ({ message }) => {
    console.log('FFmpeg:', message);
  });

  // Load ffmpeg.wasm from CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    throw new Error('FFmpeg failed to load. This may be due to browser security restrictions (COOP/COEP).');
  }
  
  return ffmpeg;
}

export async function convertSVGToMP4(svgCode: string, duration: number, onProgress?: (progress: number) => void): Promise<Blob> {
  // 1. Create a hidden canvas and attach to DOM (some browsers require this for captureStream)
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.left = '-9999px';
  canvas.style.top = '-9999px';
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    document.body.removeChild(canvas);
    throw new Error('Could not get canvas context');
  }

  // Pre-sanitize the SVG string: Aggressively escape ampersands
  // First, escape ALL ampersands to &amp;
  // Then selectively unescape those that look like valid XML entities (e.g. &lt;, &gt;, &#123;)
  // This is safer than trying to skip them with a complex lookup.
  const sanitizedString = svgCode
    .replace(/&/g, '&amp;')
    .replace(/&amp;([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);/g, '&$1;');

  // Parse SVG to get dimensions and sanitize
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizedString, 'image/svg+xml');
  
  // Check for parser errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    console.error('SVG XML Parsing Error:', parserError.textContent);
    document.body.removeChild(canvas);
    throw new Error(`SVG Parsing Failed: ${parserError.textContent?.split('\n')[0] || 'Invalid XML'}`);
  }

  const svgEl = doc.querySelector('svg');
  if (!svgEl) {
    document.body.removeChild(canvas);
    throw new Error('Invalid SVG code');
  }

  // Sanitize SVG for Canvg: Remove potentially problematic attributes or styles
  // that might cause "matches" selector errors (e.g., classes/IDs starting with numbers or containing %)
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    // Clean classes
    if (el.hasAttribute('class')) {
      const cls = el.getAttribute('class');
      if (cls && (cls.includes('%') || /^\d/.test(cls))) {
        el.removeAttribute('class');
      }
    }
    // Clean IDs
    if (el.hasAttribute('id')) {
      const id = el.getAttribute('id');
      if (id && (id.includes('%') || /^\d/.test(id))) {
        el.removeAttribute('id');
      }
    }
    // Clean style tags
    if (el.tagName.toLowerCase() === 'style') {
      let css = el.textContent || '';
      // Remove rules that start with a number or percentage (invalid selectors that Canvg might try to use)
      // This is a simple regex to catch common AI-generated invalid CSS selectors
      css = css.replace(/(?:^|\})\s*[\d%][^\{]*\{[^\}]*\}/g, '');
      el.textContent = css;
    }
  });

  const sanitizedSvgCode = new XMLSerializer().serializeToString(doc);

  let width = 1920;
  let height = 1080;

  const widthAttr = svgEl.getAttribute('width');
  const heightAttr = svgEl.getAttribute('height');
  const viewBoxAttr = svgEl.getAttribute('viewBox');

  if (widthAttr && heightAttr) {
    width = parseInt(widthAttr);
    height = parseInt(heightAttr);
  } else if (viewBoxAttr) {
    const parts = viewBoxAttr.split(/\s+/);
    if (parts.length === 4) {
      width = parseInt(parts[2]);
      height = parseInt(parts[3]);
    }
  }
  
  // Ensure dimensions are valid numbers
  width = isNaN(width) ? 1920 : width;
  height = isNaN(height) ? 1080 : height;

  canvas.width = width;
  canvas.height = height;

  console.log(`Exporting video at ${width}x${height}`);

  // 2. Setup Canvg
  // We'll append the SVG to the DOM to ensure SMIL animations and CSS animations can be processed
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.visibility = 'hidden';
  // Use the doc we already parsed and sanitized
  // svgEl is already declared above (line 70)
  if (!svgEl) throw new Error('Invalid SVG');
  container.appendChild(svgEl);
  document.body.appendChild(container);

  let v: Canvg;
  try {
    // Pass the live element to Canvg
    v = await Canvg.from(ctx, svgEl as any);
  } catch (e) {
    console.error('Canvg initialization failed:', e);
    document.body.removeChild(canvas);
    document.body.removeChild(container);
    throw new Error(`SVG Rendering failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  // 3. Setup FFmpeg
  console.log('Loading FFmpeg...');
  let ffmpegInstance: FFmpeg;
  try {
    ffmpegInstance = await loadFFmpeg();
  } catch (e) {
    document.body.removeChild(canvas);
    document.body.removeChild(container);
    throw e;
  }
  
  // 4. Deterministic Frame-by-Frame Recording
  const fps = 30; 
  const totalFrames = Math.floor(duration * fps);
  const frameDurationS = 1 / fps;
  
  console.log(`Starting deterministic capture: ${totalFrames} frames at ${fps}fps`);
  
  try {
    for (let i = 0; i < totalFrames; i++) {
      const timestampSeconds = i * frameDurationS;
      
      // Use Canvg's internal clock for maximum synchronization with its rendering engine
      try {
        if ((v as any).screen && (v as any).screen.animations) {
          (v as any).screen.animations.setCurrentTime(timestampSeconds * 1000);
        }
      } catch (e) {
        // Fallback to the native SVG seek we already did
      }

      await v.render();
      
      // Convert canvas to blob
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error(`Failed to capture frame ${i}`);
      
      // Write to FFmpeg
      const frameName = `frame${i.toString().padStart(5, '0')}.png`;
      await ffmpegInstance.writeFile(frameName, await fetchFile(blob));
      
      // Progress reporting (0% to 80%)
      if (onProgress) onProgress((i / totalFrames) * 0.8);
      
      if (i % 10 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    console.log('Capture complete. Encoding video...');
    if (onProgress) onProgress(0.85);

    const outputName = `output_${Date.now()}.mp4`;
    
    await ffmpegInstance.exec([
      '-framerate', fps.toString(),
      '-i', 'frame%05d.png',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '25',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outputName
    ]);
    
    if (onProgress) onProgress(0.95);

    const data = await ffmpegInstance.readFile(outputName);
    const mp4Blob = new Blob([data as any], { type: 'video/mp4' });
    
    // Cleanup 
    for (let i = 0; i < totalFrames; i++) {
      const frameName = `frame${i.toString().padStart(5, '0')}.png`;
      try { await ffmpegInstance.deleteFile(frameName); } catch(e) {}
    }
    await ffmpegInstance.deleteFile(outputName);
    
    document.body.removeChild(canvas);
    document.body.removeChild(container);
    if (onProgress) onProgress(1.0);
    return mp4Blob;
    
  } catch (error) {
    console.error('Deterministic export failed:', error);
    document.body.removeChild(canvas);
    if (container.parentNode) document.body.removeChild(container);
    throw error;
  }
}
