import type { StoredFile } from '../../services';

const THUMB_MAX = 480;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('IMAGE_LOAD'));
    };
    img.src = url;
  });
}

async function thumbnailOf(file: File, maxSide: number): Promise<string | undefined> {
  try {
    const img = await loadImage(file);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight, 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return undefined;
  }
}

const THUMB_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * File metadata plus a small JPEG thumbnail for JPG/PNG/WebP images (longest side ≤ `maxSide`, default 480 px).
 * The original bytes are not kept.
 */
export async function toStoredFile(file: File, opts: { maxSide?: number } = {}): Promise<StoredFile> {
  const base: StoredFile = { name: file.name, type: file.type, size: file.size };
  if (!THUMB_TYPES.includes(file.type)) return base;
  const thumbnail = await thumbnailOf(file, opts.maxSide ?? THUMB_MAX);
  return thumbnail ? { ...base, thumbnail } : base;
}

/** 2 097 152 → "2,0 MB" */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
