import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import RecordRTC from 'recordrtc';
import { Canvg } from 'canvg';

let ffmpeg: FFmpeg | null = null;

// Initialize FFmpeg.wasm
async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;
  ffmpeg = new FFmpeg();
  
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });
  
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

  // 2. Parse and Sanitize SVG for Strict XML (Required by Canvg)
  // Clean AI code completely by removing all unescaped & characters 
  // (except well-formed entities like &amp; &lt; &gt; &apos; &quot; &#123;)
  let cleanSvgCode = svgCode.replace(/&(?!([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);)/g, '&amp;');

  // First, parse as forgiving HTML to auto-repair missing closing tags and structure
  const tempHtmlParser = new DOMParser();
  const htmlDoc = tempHtmlParser.parseFromString(cleanSvgCode, 'text/html');
  const rescuedSvg = htmlDoc.querySelector('svg');
  
  if (!rescuedSvg) {
      throw new Error('No valid SVG element could be rescued from the generated code.');
  }

  // CRITICAL: Sanitize SVG for Canvg to prevent CSS selector crashes
  const allElements = rescuedSvg.querySelectorAll('*');
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

  // Re-serialize the corrected SVG
  let sanitizedSvgCode = rescuedSvg.outerHTML;

  // Final strict XML check to prevent Canvg from crashing with "parsererror"
  const strictParser = new DOMParser();
  const strictDoc = strictParser.parseFromString(sanitizedSvgCode, 'image/svg+xml');
  const parserErrorNode = strictDoc.querySelector('parsererror');
  
  if (parserErrorNode) {
      console.error('Catastrophic XML Error Details:', parserErrorNode.textContent);
      throw new Error(`\n\n${parserErrorNode.textContent}\n\n`);
  }

  // Set Dimensions (Default to 1080p)
  canvas.width = 1920;
  canvas.height = 1080;

  // 3. Setup Canvg & RecordRTC
  const v = await Canvg.from(ctx, sanitizedSvgCode);
  const stream = (canvas as any).captureStream(30); // 30 FPS
  
  const recorder = new RecordRTC(stream, {
    type: 'video',
    mimeType: 'video/webm', // Record in WebM first
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
  const webmBlob = recorder.getBlob();
  document.body.removeChild(canvas);

  // 6. Convert WebM to MP4 using FFmpeg
  try {
    const ffmpegInstance = await loadFFmpeg();
    const inputName = 'input.webm';
    const outputName = 'output.mp4';
    
    await ffmpegInstance.writeFile(inputName, await fetchFile(webmBlob));
    
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
  } catch (error: any) {
    console.error('FFmpeg Conversion failed:', error);
    // Do NOT silently fallback to WebM anymore, throw so the UI can alert
    throw new Error('MP4 Conversion failed: ' + error?.message);
  }
}

export async function compileClipsWithAudio(
  videoBlobs: Blob[],
  audioBlob: Blob | null,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  try {
    const ffmpegInstance = await loadFFmpeg();
    if (onProgress) onProgress(0.1);

    // Write all video blobs
    const concatList = [];
    for (let i = 0; i < videoBlobs.length; i++) {
      const fileName = `input_${i}.mp4`;
      await ffmpegInstance.writeFile(fileName, await fetchFile(videoBlobs[i]));
      concatList.push(`file '${fileName}'`);
    }

    // Write concat list
    await ffmpegInstance.writeFile('concat.txt', concatList.join('\n'));

    // Prepare FFmpeg args
    let args = ['-f', 'concat', '-safe', '0', '-i', 'concat.txt'];

    // Write audio blob if provided
    if (audioBlob) {
      await ffmpegInstance.writeFile('audio.mp3', await fetchFile(audioBlob));
      args.push('-i', 'audio.mp3');
    }

    // Add output encodings: copy video to not re-encode, re-encode audio to AAC
    if (audioBlob) {
      // With audio: copy video stream, encode audio to aac, truncate to shortest
      args.push('-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', '-shortest', 'final_output.mp4');
    } else {
      // Without audio: simply copy video stream
      args.push('-c', 'copy', 'final_output.mp4');
    }

    if (onProgress) onProgress(0.3);

    await ffmpegInstance.exec(args);
    if (onProgress) onProgress(0.9);

    const data = await ffmpegInstance.readFile('final_output.mp4');
    const finalBlob = new Blob([new Uint8Array(data as any)], { type: 'video/mp4' });

    // Cleanup
    for (let i = 0; i < videoBlobs.length; i++) {
      await ffmpegInstance.deleteFile(`input_${i}.mp4`);
    }
    await ffmpegInstance.deleteFile('concat.txt');
    if (audioBlob) {
      await ffmpegInstance.deleteFile('audio.mp3');
    }
    await ffmpegInstance.deleteFile('final_output.mp4');

    if (onProgress) onProgress(1.0);
    return finalBlob;

  } catch (error: any) {
    console.error('FFmpeg Compilation failed:', error);
    throw new Error('Video compilation failed: ' + error?.message);
  }
}

