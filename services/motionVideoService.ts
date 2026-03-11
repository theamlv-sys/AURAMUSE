import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Canvg } from 'canvg';

let ffmpeg: FFmpeg | null = null;

async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  ffmpeg.on('log', ({ message }) => {
    console.log('FFmpeg:', message);
  });

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    throw new Error('FFmpeg failed to load. Check your internet connection and browser security settings.');
  }
  
  return ffmpeg;
}

export async function convertSVGToMP4(svgCode: string, duration: number, onProgress?: (progress: number) => void): Promise<Blob> {
  // 1. Setup Canvas and DOM Container
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

  // 2. Sanitize and Parse SVG
  const sanitizedString = svgCode
    .replace(/&/g, '&amp;')
    .replace(/&amp;([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);/g, '&$1;');

  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizedString, 'image/svg+xml');
  
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    document.body.removeChild(canvas);
    throw new Error(`SVG Parsing Failed: ${parserError.textContent?.split('\n')[0] || 'Invalid XML'}`);
  }

  const svgEl = doc.querySelector('svg');
  if (!svgEl) {
    document.body.removeChild(canvas);
    throw new Error('Invalid SVG code');
  }

  // Setup dimensions
  let width = 1920;
  let height = 1080;
  const viewBoxAttr = svgEl.getAttribute('viewBox');
  if (viewBoxAttr) {
    const parts = viewBoxAttr.split(/\s+/);
    if (parts.length === 4) {
      width = parseInt(parts[2]);
      height = parseInt(parts[3]);
    }
  }
  canvas.width = isNaN(width) ? 1920 : width;
  canvas.height = isNaN(height) ? 1080 : height;

  // Append to hidden container for animation clock
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.visibility = 'hidden';
  container.appendChild(svgEl);
  document.body.appendChild(container);

  // 3. Setup Canvg
  let v: Canvg;
  try {
    // Canvg.from expects a string (content or URL) in version 4
    v = await Canvg.from(ctx, svgEl.outerHTML);
  } catch (e) {
    document.body.removeChild(canvas);
    document.body.removeChild(container);
    throw new Error(`SVG Rendering failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 4. Setup FFmpeg
  console.log('Loading FFmpeg...');
  const ffmpegInstance = await loadFFmpeg();
  
  // 5. Deterministic Capture Loop
  const fps = 60; // 60fps quality
  const totalFrames = Math.floor(duration * fps);
  const frameDurationS = 1 / fps;

  // Shim Replit-style triggers
  (window as any).startRecording = () => console.log('Replit compatibility: recording started');
  (window as any).stopRecording = () => console.log('Replit compatibility: recording stopped');
  
  (window as any).startRecording();
  
  console.log(`Starting high-fidelity export: ${totalFrames} frames`);

  try {
    for (let i = 0; i < totalFrames; i++) {
      const timestamp = i * frameDurationS;
      
      // Step the SVG clock
      if ((svgEl as any).setCurrentTime) {
        (svgEl as any).setCurrentTime(timestamp);
      }
      
      // Sync Canvg's clock
      if ((v as any).screen?.animations) {
        (v as any).screen.animations.setCurrentTime(timestamp * 1000);
      }

      await v.render();
      
      // Capture frame
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error(`Failed to capture frame ${i}`);
      
      // Write to FFmpeg
      const frameName = `frame${i.toString().padStart(5, '0')}.png`;
      await ffmpegInstance.writeFile(frameName, await fetchFile(blob));
      
      if (onProgress) onProgress((i / totalFrames) * 0.7);
      
      // Yield to main thread
      if (i % 20 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }

    (window as any).stopRecording();
    console.log('Capture complete. Encoding...');
    if (onProgress) onProgress(0.8);

    const outputName = `export_${Date.now()}.mp4`;
    
    // Encode sequence
    await ffmpegInstance.exec([
      '-framerate', fps.toString(),
      '-i', 'frame%05d.png',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
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
    console.error('Export failed:', error);
    if (canvas.parentNode) document.body.removeChild(canvas);
    if (container.parentNode) document.body.removeChild(container);
    throw error;
  }
}
