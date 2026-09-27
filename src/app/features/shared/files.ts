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

async function thumbnailOf(file: File): Promise<string | undefined> {
  try {
    const img = await loadImage(file);
    const scale = Math.min(1, THUMB_MAX / Math.max(img.naturalWidth, img.naturalHeight, 1));
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

/** File metadata plus a small JPEG thumbnail for JPG/PNG images. The original bytes are not kept. */
export async function toStoredFile(file: File): Promise<StoredFile> {
  const base: StoredFile = { name: file.name, type: file.type, size: file.size };
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') return base;
  const thumbnail = await thumbnailOf(file);
  return thumbnail ? { ...base, thumbnail } : base;
}

/** 2 097 152 → "2,0 MB" */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
