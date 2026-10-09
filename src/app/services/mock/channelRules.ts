// Pure channel/file rules (phase 2).
import { KolhubError } from '../types';
import { MAX_FILE_BYTES, type Channel, type Platform, type StoredFile } from '../profile-types';

/** Dấu xác thực kênh hiệu lực 3 tháng (QĐ-12), prototype tính 90 ngày. */
export const BADGE_VALID_DAYS = 90;

const IMAGE_TYPES = ['image/jpeg', 'image/png'];
const GCN_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/** Channel proof image / avatar / cover: JPG or PNG ≤ 10 MB (BR-21). */
export function validateProofImage(f: StoredFile): void {
  if (!IMAGE_TYPES.includes(f.type) || f.size > MAX_FILE_BYTES) throw new KolhubError('KOLHUB-4203');
}

/** GCN file: JPG/PNG/PDF (4301, checked first) and ≤ 10 MB (4302) (BR-26). */
export function validateGcnFile(f: StoredFile): void {
  if (!GCN_TYPES.includes(f.type)) throw new KolhubError('KOLHUB-4301');
  if (f.size > MAX_FILE_BYTES) throw new KolhubError('KOLHUB-4302');
}

const HOST_PREFIXES = ['www.', 'm.', 'web.', 'vm.', 'vt.'];
const PLATFORM_BY_HOST: Record<string, Platform> = {
  'facebook.com': 'facebook',
  'fb.com': 'facebook',
  'fb.watch': 'facebook',
  'instagram.com': 'instagram',
  'instagr.am': 'instagram',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'tiktok.com': 'tiktok',
};

function parse(url: string): { host: string; path: string } | null {
  const raw = (url ?? '').trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  let host = u.hostname.toLowerCase();
  for (const p of HOST_PREFIXES) if (host.startsWith(p)) host = host.slice(p.length);
  const path = u.pathname.replace(/\/+$/, '');
  return { host, path };
}

/** Facebook / Instagram / YouTube / TikTok channel link → platform; anything else → null (BR-20). */
export function detectPlatform(url: string): Platform | null {
  const p = parse(url);
  if (!p || !p.path) return null;
  return PLATFORM_BY_HOST[p.host] ?? null;
}

/** Canonical form for duplicate checks: https + host (no www/m) + lower-case path, no query/hash/trailing slash. */
export function normalizeChannelUrl(url: string): string {
  const p = parse(url);
  if (!p) return (url ?? '').trim().toLowerCase();
  return `https://${p.host}${p.path.toLowerCase()}`;
}

/** First path segment, e.g. "@khanhvy" or "khanhvy.official". */
export function channelHandle(url: string): string {
  const p = parse(url);
  if (!p) return '';
  const seg = p.path.split('/').filter(Boolean)[0] ?? '';
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

export type ChannelFilter = 'all' | 'verified' | 'pending' | 'needs_fix';

const STATUS_BY_FILTER: Record<Exclude<ChannelFilter, 'all'>, Channel['status']> = {
  verified: 'VERIFIED',
  pending: 'PENDING_REVIEW',
  needs_fix: 'NEEDS_FIX',
};

export function matchesFilter(ch: Channel, f: ChannelFilter): boolean {
  return f === 'all' || ch.status === STATUS_BY_FILTER[f];
}

/** Counts per filter tab; EXPIRED channels only count under "all". */
export function countByFilter(chs: Channel[]): Record<ChannelFilter, number> {
  return {
    all: chs.length,
    verified: chs.filter((c) => matchesFilter(c, 'verified')).length,
    pending: chs.filter((c) => matchesFilter(c, 'pending')).length,
    needs_fix: chs.filter((c) => matchesFilter(c, 'needs_fix')).length,
  };
}
