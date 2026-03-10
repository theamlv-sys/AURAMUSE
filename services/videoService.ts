import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import RecordRTC from 'recordrtc';
import { Canvg } from 'canvg';

let ffmpeg: FFmpeg | null = null;

// Initialize FFmpeg.wasm
async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;
  ffmpeg = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  return ffmpeg;
}

export async function convertSVGToMP4(svgCode: string, duration: number, onProgress?: (progress: number) => void): Promise<Blob> {
  // 1. Create a hidden canvas and attach to DOM (required by some browsers for captureStream)
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.left = '-9999px';
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not get canvas context');

  // 2. Parse and Sanitize SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgCode, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  
  // CRITICAL: Sanitize SVG for Canvg to prevent CSS selector crashes
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    if (el.hasAttribute('class')) {
      const cls = el.getAttribute('class');
      if (cls && (cls.includes('%') || /^\\d/.test(cls))) el.removeAttribute('class');
    }
    if (el.hasAttribute('id')) {
      const id = el.getAttribute('id');
      if (id && (id.includes('%') || /^\\d/.test(id))) el.removeAttribute('id');
    }
    if (el.tagName.toLowerCase() === 'style') {
      let css = el.textContent || '';
      css = css.replace(/(?:^|\\})\\s*[\\d%][^\\{]*\\{[^\\}]*\\}/g, ''); // Remove invalid AI CSS rules
      el.textContent = css;
    }
  });

  const sanitizedSvgCode = new XMLSerializer().serializeToString(doc);

  // Set Dimensions (Default to 1080p)
  canvas.width = 1920;
  canvas.height = 1080;

  // 3. Setup Canvg & RecordRTC
  const v = await Canvg.from(ctx, sanitizedSvgCode);
  
  // Safely get captureStream for different browsers
  const stream = typeof (canvas as any).captureStream === 'function' 
      ? (canvas as any).captureStream(30) 
      : typeof (canvas as any).mozCaptureStream === 'function' 
        ? (canvas as any).mozCaptureStream(30)
        : null;

  if (!stream) {
      document.body.removeChild(canvas);
      throw new Error('Your browser does not support capturing video from a canvas. Please use Chrome, Edge, or Firefox.');
  }

  // Determine optimal recording format (Safari supports video/mp4 natively)
  let mimeType = 'video/webm';
  let isNativeMp4 = false;

  // Check if MediaRecorder is available and supports mp4 (usually Safari)
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
      isNativeMp4 = true;
  }

  const recorder = new RecordRTC(stream, {
    type: 'video',
    mimeType: mimeType as 'video/mp4' | 'video/webm', // Use native MP4 if possible, otherwise WebM
    bitsPerSecond: 12800000, // 12.8 Mbps high quality
  });

  // 4. Start Recording
  recorder.startRecording();
  v.start(); // Start SVG animation
  
  // Wait for the duration of the video (e.g., 15 seconds)
  const startTime = Date.now();
  const totalMs = duration * 1000;
  while (Date.now() - startTime < totalMs) {
    if (onProgress) onProgress(Math.min(0.5, ((Date.now() - startTime) / totalMs) * 0.5));
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 5. Stop Recording
  v.stop();
  await new Promise<void>(resolve => recorder.stopRecording(() => resolve()));
  const recordedBlob = recorder.getBlob();
  document.body.removeChild(canvas);

  // If we natively recorded in MP4, we can skip FFmpeg!
  if (isNativeMp4) {
      if (onProgress) onProgress(1.0);
      return new Blob([recordedBlob], { type: 'video/mp4' });
  }

  // 6. Convert WebM to MP4 using FFmpeg
  try {
    const ffmpegInstance = await loadFFmpeg();
    const inputName = 'input.webm';
    const outputName = 'output.mp4';
    
    await ffmpegInstance.writeFile(inputName, await fetchFile(recordedBlob));
    
    // CRITICAL: scale=trunc(iw/2)*2:trunc(ih/2)*2 ensures dimensions are even numbers (required by libx264)
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
    
    const data = await ffmpegInstance.readFile(outputName);
    const mp4Blob = new Blob([new Uint8Array(data as any)], { type: 'video/mp4' });
    
    await ffmpegInstance.deleteFile(inputName);
    await ffmpegInstance.deleteFile(outputName);
    
    if (onProgress) onProgress(1.0);
    return mp4Blob;
  } catch (error) {
    console.error('Video conversion failed:', error);
    // Explicit throw helps the user realize WebM fallback was bypassed and MP4 export is truly failing.
    throw new Error('Failed to transcode video to MP4 format using FFmpeg.');
  }
}
