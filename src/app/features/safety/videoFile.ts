// Reads a local video file in the browser: duration + one frame as a small JPEG thumbnail.

const THUMB_W = 270;
const THUMB_H = 390;
const TIMEOUT_MS = 6000;

export interface VideoFileInfo {
  /** null when the browser cannot decode the file. */
  durationSec: number | null;
  thumbnail?: string;
}

/** Cover-crop the frame into a 9:13 canvas. */
function capture(video: HTMLVideoElement): string | undefined {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = THUMB_W;
  canvas.height = THUMB_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;
  const scale = Math.max(THUMB_W / vw, THUMB_H / vh);
  const w = vw * scale;
  const h = vh * scale;
  ctx.drawImage(video, (THUMB_W - w) / 2, (THUMB_H - h) / 2, w, h);
  try {
    return canvas.toDataURL('image/jpeg', 0.72);
  } catch {
    return undefined;
  }
}

export function readVideoFile(file: File): Promise<VideoFileInfo> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let duration: number | null = null;
    let settled = false;
    const done = (thumbnail?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
      resolve({ durationSec: duration, thumbnail });
    };
    const timer = setTimeout(() => done(), TIMEOUT_MS);
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      duration = Number.isFinite(video.duration) ? video.duration : null;
      video.currentTime = Math.min(1, Math.max(0.05, (duration ?? 0) / 3));
    };
    video.onseeked = () => done(capture(video));
    video.onerror = () => done();
    video.src = url;
  });
}
