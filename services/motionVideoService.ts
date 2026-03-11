import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import RecordRTC from 'recordrtc';
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

  // Parse SVG to get dimensions and sanitize
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgCode, 'image/svg+xml');
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
  let v;
  try {
    v = await Canvg.from(ctx, sanitizedSvgCode);
  } catch (e) {
    console.error('Canvg initialization failed:', e);
    document.body.removeChild(canvas);
    throw new Error(`SVG Rendering failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  // 3. Setup RecordRTC with fallback mime types
  let stream: MediaStream;
  try {
    stream = (canvas as any).captureStream(30);
  } catch (e) {
    document.body.removeChild(canvas);
    throw new Error('Canvas captureStream is not supported in this browser.');
  }

  const supportedMimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4'
  ];
  
  let selectedMimeType = (supportedMimeTypes.find(mime => (RecordRTC as any).isTypeSupported(mime)) || 'video/webm') as any;
  console.log('Using mimeType:', selectedMimeType);

  const recorder = new RecordRTC(stream, {
    type: 'video',
    mimeType: selectedMimeType,
    bitsPerSecond: 12800000,
  });

  // 4. Start recording
  console.log('Starting recording...');
  recorder.startRecording();
  v.start();
  
  // Give it a moment to start drawing
  await new Promise(resolve => setTimeout(resolve, 500));

  // Progress reporting during recording (0% to 50%)
  const startTime = Date.now();
  const totalMs = duration * 1000;
  
  while (Date.now() - startTime < totalMs) {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(0.5, (elapsed / totalMs) * 0.5);
    if (onProgress) onProgress(progress);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 5. Stop recording
  console.log('Stopping recording...');
  v.stop();
  await new Promise<void>(resolve => {
    recorder.stopRecording(() => resolve());
  });

  const webmBlob = recorder.getBlob();
  console.log('WebM recording complete, size:', webmBlob.size);
  
  if (webmBlob.size < 1000) {
    document.body.removeChild(canvas);
    throw new Error('Recording failed: The generated video file is empty. This might be due to browser restrictions on canvas capture.');
  }
  
  // Cleanup canvas
  document.body.removeChild(canvas);
  
  if (onProgress) onProgress(0.6);

  // 6. Convert WebM to MP4 using FFmpeg.wasm
  try {
    console.log('Loading FFmpeg...');
    const ffmpegInstance = await loadFFmpeg();
    
    const inputName = 'input.webm';
    const outputName = 'output.mp4';
    
    await ffmpegInstance.writeFile(inputName, await fetchFile(webmBlob));
    
    if (onProgress) onProgress(0.7);

    console.log('Running FFmpeg conversion...');
    // Re-encode to ensure compatibility, ensuring even dimensions for libx264
    await ffmpegInstance.exec([
      '-i', inputName, 
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libx264', 
      '-preset', 'ultrafast', 
      '-crf', '28', 
      '-pix_fmt', 'yuv420p', 
      '-movflags', '+faststart',
      outputName
    ]);
    
    if (onProgress) onProgress(0.9);

    const data = await ffmpegInstance.readFile(outputName);
    const mp4Blob = new Blob([data as any], { type: 'video/mp4' });
    
    console.log('MP4 conversion complete, size:', mp4Blob.size);

    // Cleanup
    await ffmpegInstance.deleteFile(inputName);
    await ffmpegInstance.deleteFile(outputName);
    
    if (onProgress) onProgress(1.0);
    return mp4Blob;
  } catch (error) {
    console.error('FFmpeg MP4 conversion failed:', error);
    // If FFmpeg fails, return the WebM blob as a fallback so the user gets SOMETHING
    if (onProgress) onProgress(1.0);
    // We notify the caller that it's a fallback through the blob type
    return webmBlob;
  }
}
