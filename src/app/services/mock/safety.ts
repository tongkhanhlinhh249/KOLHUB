// Mock KOL Safety: video pre-check before posting and channel monitoring (TikTok / Facebook / YouTube).
// Results are deterministic from the file name / channel handle so the demo is repeatable.
import { KolhubError } from '../types';
import type { Channel } from '../profile-types';
import type { DemoState, Db } from './db';
import type {
  ChannelHealth,
  HealthLabel,
  MonitorPlatform,
  MonitorView,
  SafetyIssue,
  SafetyMonitor,
  SafetyStats,
  SafetyVerdict,
  SafetyVideo,
  ScanResult,
  ScannedVideo,
  UploadVideoInput,
} from '../safety-types';
import { delay as fakeDelay } from './delay';
import { detectPlatform } from './channelRules';
import { findProfile } from './profileRules';
import { IMAGE_POOL, VIDEO_TITLES } from './socialListening';
// --- violations ---
import { syncViolationsFromMonitor } from './violations';

const DAY = 86_400_000;

export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
export const MAX_VIDEO_SEC = 10 * 60;
export const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'];

export const MONITOR_PLATFORMS: MonitorPlatform[] = ['tiktok', 'facebook', 'youtube'];
export const MONITOR_PLATFORM_LABEL: Record<MonitorPlatform, string> = {
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
};

export function isMonitorPlatform(v: string | undefined): v is MonitorPlatform {
  return !!v && (MONITOR_PLATFORMS as string[]).includes(v);
}

export function safetyHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

// ---------------------------------------------------------------------------
// Scan rules
// ---------------------------------------------------------------------------

type IssueTemplate = Omit<SafetyIssue, 'atSec'>;

export const VIOLATION_ISSUES: IssueTemplate[] = [
  {
    severity: 'violation',
    title: 'Quảng cáo chưa gắn nhãn #QuangCao theo Luật Quảng cáo',
    detail: 'Video giới thiệu sản phẩm có trả phí nhưng chưa có nhãn #QuangCao hoặc lời thông báo hợp tác ở đầu video.',
  },
  {
    severity: 'violation',
    title: 'Tuyên bố công dụng chưa được kiểm chứng',
    detail: 'Có câu khẳng định sản phẩm "trị dứt điểm", "giảm cân cấp tốc" mà không có giấy tờ chứng minh.',
  },
  {
    severity: 'violation',
    title: 'Lộ thông tin cá nhân',
    detail: 'Khung hình hiển thị rõ số điện thoại và địa chỉ nhà. Hãy làm mờ trước khi đăng.',
  },
];

export const WARNING_ISSUES: IssueTemplate[] = [
  {
    severity: 'warning',
    title: 'Âm thanh có bản quyền',
    detail: 'Nhạc nền trùng với bản thu có bản quyền; video có thể bị tắt tiếng hoặc hạn chế hiển thị.',
  },
  {
    severity: 'warning',
    title: 'Hình ảnh dễ gây phản cảm',
    detail: 'Có cảnh cận dễ khiến người xem khó chịu; nên làm mờ hoặc cắt bớt.',
  },
  {
    severity: 'warning',
    title: 'Ngôn từ chưa phù hợp',
    detail: 'Phụ đề có từ ngữ thiếu chuẩn mực, nên thay bằng cách nói khác.',
  },
  {
    severity: 'warning',
    title: 'Thử thách dễ bị bắt chước gây nguy hiểm',
    detail: 'Nên thêm lời cảnh báo an toàn hoặc cắt đoạn thực hiện động tác nguy hiểm.',
  },
];

export const NOTE_ISSUES: IssueTemplate[] = [
  { severity: 'note', title: 'Nên thêm phụ đề', detail: 'Phụ đề giúp người xem hiểu nội dung khi tắt tiếng.' },
  { severity: 'note', title: 'Nên ghi nguồn tư liệu', detail: 'Đoạn trích tư liệu nên được ghi nguồn trong phần mô tả.' },
  { severity: 'note', title: 'Âm lượng chưa đều', detail: 'Âm lượng lời nói và nhạc nền chênh lệch ở một vài đoạn.' },
];

/** VIOLATION ≤ 30 · GRAY 50–79 · SAFE ≥ 80. */
export function verdictOf(score: number): SafetyVerdict {
  if (score >= 80) return 'SAFE';
  if (score >= 50) return 'GRAY';
  return 'VIOLATION';
}

function pick<T>(list: T[], h: number, n: number): T[] {
  const out: T[] = [];
  for (let i = 0; out.length < Math.min(n, list.length); i++) {
    const item = list[(h + i * 7) % list.length];
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

/** Score + issues for a verdict, deterministic from `h`; issue times fall inside the video. */
export function buildResult(verdict: SafetyVerdict, h: number, durationSec: number): ScanResult {
  let score: number;
  let templates: IssueTemplate[];
  if (verdict === 'VIOLATION') {
    score = h % 31;
    templates = [...pick(VIOLATION_ISSUES, h, 1 + ((h >>> 3) % 2)), ...pick(WARNING_ISSUES, h >>> 5, 1)];
  } else if (verdict === 'GRAY') {
    score = 50 + (h % 30);
    templates = [...pick(WARNING_ISSUES, h, 1 + ((h >>> 3) % 2)), ...pick(NOTE_ISSUES, h >>> 5, (h >>> 7) % 2)];
  } else {
    score = 80 + (h % 21);
    templates = pick(NOTE_ISSUES, h, (h >>> 3) % 2);
  }
  const span = Math.max(1, Math.floor(durationSec));
  const issues = templates.map((t, i) => ({ ...t, atSec: (h >>> (i * 4)) % span }));
  return { verdict, score, issues };
}

/** Demo hints: names containing "vi-pham" / "xam" / "an-toan" force that verdict. */
function hintedVerdict(fileName: string): SafetyVerdict | null {
  const n = fileName.toLowerCase();
  if (/vi[-_ ]?pham|violation/.test(n)) return 'VIOLATION';
  if (/(^|[-_ ])xam([-_ .]|$)|gray|grey/.test(n)) return 'GRAY';
  if (/an[-_ ]?toan|safe/.test(n)) return 'SAFE';
  return null;
}

/** Pre-check result of an uploaded video: 30% VIOLATION, 30% GRAY, 40% SAFE by file-name hash. */
export function scanVideoFile(fileName: string, durationSec: number): ScanResult {
  const h = safetyHash(fileName.trim().toLowerCase());
  const bucket = h % 10;
  const verdict = hintedVerdict(fileName) ?? (bucket < 3 ? 'VIOLATION' : bucket < 6 ? 'GRAY' : 'SAFE');
  return buildResult(verdict, h >>> 4, durationSec);
}

/** "3 vấn đề" when anything needs fixing, "1 lưu ý" when only notes, null when clean. */
export function issueSummary(issues: SafetyIssue[]): string | null {
  if (issues.length === 0) return null;
  const problems = issues.filter((i) => i.severity !== 'note').length;
  return problems > 0 ? `${issues.length} vấn đề` : `${issues.length} lưu ý`;
}

export function healthLabel(score: number): HealthLabel {
  if (score >= 80) return 'Tốt';
  if (score >= 50) return 'Cần chú ý';
  return 'Rủi ro';
}

/** Average video score, minus 10 per violating video; 0–100. */
export function computeHealth(videos: ScanResult[]): ChannelHealth {
  const counts = { violation: 0, gray: 0, safe: 0 };
  for (const v of videos) {
    if (v.verdict === 'VIOLATION') counts.violation++;
    else if (v.verdict === 'GRAY') counts.gray++;
    else counts.safe++;
  }
  const avg = videos.length ? videos.reduce((s, v) => s + v.score, 0) / videos.length : 100;
  const score = Math.max(0, Math.min(100, Math.round(avg - 10 * counts.violation)));
  return { score, label: healthLabel(score), counts };
}

const SCAN_TITLES = [
  ...VIDEO_TITLES,
  'Mở hộp sản phẩm mới',
  'Mẹo nhỏ mỗi ngày',
  'Góc chia sẻ cuối tuần',
  'Livestream cắt ngắn',
  'Công thức nấu nhanh',
  'Thử đồ cùng mình',
];

/** 6–12 newest-first channel videos: ~10% VIOLATION, ~20% GRAY, the rest SAFE. */
export function scanChannelVideos(monitor: Pick<SafetyMonitor, 'id' | 'platform' | 'handle'>, scanNo: number, now: number): ScannedVideo[] {
  const h = safetyHash(`${monitor.platform}:${monitor.handle.toLowerCase()}:${scanNo}`);
  const count = 6 + (h % 7);
  return Array.from({ length: count }, (_, n) => {
    const vh = safetyHash(`${h}:${n}`);
    const bucket = vh % 10;
    const verdict: SafetyVerdict = bucket === 0 ? 'VIOLATION' : bucket <= 2 ? 'GRAY' : 'SAFE';
    const durationSec = monitor.platform === 'youtube' ? 120 + (vh % 900) : 12 + (vh % 170);
    return {
      id: `${monitor.id}-v${scanNo}-${n + 1}`,
      title: SCAN_TITLES[(h + n) % SCAN_TITLES.length],
      thumbnail: IMAGE_POOL[(vh >>> 2) % IMAGE_POOL.length],
      durationSec,
      publishedAt: now - (n * 2 + 1 + (vh % 2)) * DAY,
      ...buildResult(verdict, vh >>> 4, durationSec),
    };
  });
}

// ---------------------------------------------------------------------------
// Channel input
// ---------------------------------------------------------------------------

const HANDLE_RE = /^[\p{L}\p{N}._-]{2,60}$/u;

/** Canonical link (no protocol) of a handle on a platform. */
export function monitorUrl(platform: MonitorPlatform, handle: string): string {
  if (platform === 'facebook') return `facebook.com/${handle}`;
  if (platform === 'youtube') return `youtube.com/@${handle}`;
  return `tiktok.com/@${handle}`;
}

/** Has a scheme, a path or a domain-like ending (e.g. "tiktok.com"); bare handles like "minhthu.bepnha" are not links. */
function looksLikeLink(raw: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || raw.includes('/') || /\.(com|vn|net|org|be|watch|io|me|tv)$/i.test(raw);
}

/** Platform of a link's host (ignores whether it has a path). */
function linkPlatform(raw: string): MonitorPlatform | null {
  const base = raw.replace(/[?#].*$/, '').replace(/\/+$/, '');
  return detectPlatform(`${base}/x`);
}

/** Handle from a platform link: first path segment, or the second for youtube.com/channel|c|user/… */
function handleFromLink(raw: string): string {
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let segs: string[];
  try {
    segs = new URL(withScheme).pathname.split('/').filter(Boolean);
  } catch {
    return '';
  }
  let seg = segs[0] ?? '';
  if (['channel', 'c', 'user'].includes(seg.toLowerCase())) seg = segs[1] ?? '';
  if (seg === 'profile.php') return '';
  try {
    seg = decodeURIComponent(seg);
  } catch {
    // keep raw segment
  }
  return seg.replace(/^@/, '');
}

/**
 * "@tenkenh", "tenkenh" or a channel link of `platform` → handle (without "@").
 * Empty/invalid → KOLHUB-4505; a link of another site → KOLHUB-4506.
 */
export function parseChannelInput(platform: MonitorPlatform, input: string): string {
  const platformLabel = MONITOR_PLATFORM_LABEL[platform];
  const raw = (input ?? '').trim();
  if (!raw) throw new KolhubError('KOLHUB-4505', { field: 'channel', platformLabel });
  let handle: string;
  if (looksLikeLink(raw)) {
    if (linkPlatform(raw) !== platform) throw new KolhubError('KOLHUB-4506', { field: 'channel', platformLabel });
    handle = handleFromLink(raw);
  } else {
    handle = raw.replace(/^@/, '');
  }
  if (!HANDLE_RE.test(handle)) throw new KolhubError('KOLHUB-4505', { field: 'channel', platformLabel });
  return handle;
}

/** "minhthu.bepnha" → "Minhthu Bepnha". */
export function displayNameOf(handle: string): string {
  return handle
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Mock public profile of a channel, deterministic from platform + handle. */
export function mockChannelProfile(platform: MonitorPlatform, handle: string, followers?: number) {
  const h = safetyHash(`${platform}:${handle.toLowerCase()}`);
  const f = followers ?? 5_000 + (h % 1_995_001);
  return {
    displayName: displayNameOf(handle),
    avatar: IMAGE_POOL[h % IMAGE_POOL.length],
    followers: f,
    likes: f * (5 + ((h >>> 5) % 56)),
    videoCount: 20 + ((h >>> 11) % 581),
  };
}

/** Handle (lower-case, no "@") of a profile channel link, e.g. tiktok.com/@Minhthu.Bepnha → minhthu.bepnha. */
export function channelHandle(url: string): string {
  return handleFromLink(url).toLowerCase();
}

/** The account's own profile channel on `platform` with this handle (any status; handle case-insensitive). */
export function profileChannelFor(
  channels: Channel[],
  accountId: string,
  platform: MonitorPlatform,
  handle: string,
): Channel | undefined {
  const key = handle.toLowerCase();
  return channels.find((c) => c.ownerId === accountId && c.platform === platform && channelHandle(c.url) === key);
}

/** Handles (lower-case, no "@") of the account's VERIFIED profile channels on `platform`. */
export function verifiedHandles(state: DemoState, accountId: string, platform: MonitorPlatform): Set<string> {
  return new Set(
    state.channels
      .filter((c) => c.ownerId === accountId && c.platform === platform && c.status === 'VERIFIED')
      .map((c) => channelHandle(c.url))
      .filter(Boolean),
  );
}

/**
 * Name / avatar / followers a monitor shows, derived on read so later profile edits stay in sync.
 * When the handle is one of the owner's profile channels: its follower count (any status); for a KOL
 * owner also the profile's display name and avatar (the channel is the KOL's own). An MCN watches its
 * creators' channels, so it keeps the channel-based name. Anything missing falls back to the mock.
 */
export function monitorDisplay(state: DemoState, m: SafetyMonitor): Pick<SafetyMonitor, 'displayName' | 'avatar' | 'followers' | 'likes'> {
  const out = { displayName: m.displayName, avatar: m.avatar, followers: m.followers, likes: m.likes };
  const ch = profileChannelFor(state.channels, m.accountId, m.platform, m.handle);
  if (!ch) return out;
  const followers = ch.stats?.followers;
  if (followers !== undefined && followers !== m.followers) {
    // Keep the mock likes-per-follower ratio.
    out.likes = m.followers > 0 ? Math.round((m.likes / m.followers) * followers) : m.likes;
    out.followers = followers;
  }
  const p = findProfile(state, m.accountId);
  if (p?.ownerType === 'KOL') {
    const name = p.contact.displayName.trim().replace(/\s+/g, ' ');
    if (name) out.displayName = name;
    if (p.avatar?.thumbnail) out.avatar = p.avatar.thumbnail;
  }
  return out;
}

export function newMonitor(
  accountId: string,
  platform: MonitorPlatform,
  handle: string,
  t: number,
  id: string,
  followers?: number,
): SafetyMonitor {
  return {
    id,
    accountId,
    platform,
    handle,
    url: monitorUrl(platform, handle),
    ...mockChannelProfile(platform, handle, followers),
    connectedAt: t,
    lastScanAt: null,
    scanCount: 0,
    scannedVideos: [],
    health: null,
  };
}

/** Runs one scan on a monitor in place. */
export function applyScan(m: SafetyMonitor, t: number): void {
  m.scanCount += 1;
  m.scannedVideos = scanChannelVideos(m, m.scanCount, t);
  m.health = computeHealth(m.scannedVideos);
  m.lastScanAt = t;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface SafetyServiceDeps {
  db: Db;
  now: () => number;
  delay?: false;
}

function fileExt(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : '';
}

/** MP4/MOV/WebM (4501), ≤ 500 MB (4502), ≤ 10 minutes (4503). */
export function validateVideo(input: Pick<UploadVideoInput, 'fileName' | 'sizeBytes' | 'durationSec'>): void {
  if (!VIDEO_EXTENSIONS.includes(fileExt(input.fileName))) throw new KolhubError('KOLHUB-4501', { field: 'file' });
  if (!(input.sizeBytes > 0) || input.sizeBytes > MAX_VIDEO_BYTES) throw new KolhubError('KOLHUB-4502', { field: 'file' });
  if (!(input.durationSec >= 0) || input.durationSec > MAX_VIDEO_SEC) throw new KolhubError('KOLHUB-4503', { field: 'file' });
}

export function createSafetyService(deps: SafetyServiceDeps) {
  const { db, now } = deps;
  const wait = (ms?: number) => (deps.delay === false ? Promise.resolve() : fakeDelay(ms));
  let seq = 0;
  const newId = (prefix: string) => `${prefix}-${now().toString(36)}-${(++seq).toString(36)}`;

  function video(s: DemoState, id: string): SafetyVideo {
    const v = s.safetyVideos.find((x) => x.id === id);
    if (!v) throw new KolhubError('KOLHUB-4508');
    return v;
  }
  function monitor(s: DemoState, id: string): SafetyMonitor {
    const m = s.safetyMonitors.find((x) => x.id === id);
    if (!m) throw new KolhubError('KOLHUB-4508');
    return m;
  }
  function view(s: DemoState, m: SafetyMonitor): MonitorView {
    return { ...m, ...monitorDisplay(s, m), verified: verifiedHandles(s, m.accountId, m.platform).has(m.handle.toLowerCase()) };
  }

  // --- video pre-check ---

  async function listVideos(accountId: string): Promise<SafetyVideo[]> {
    await wait();
    return db
      .read()
      .safetyVideos.filter((v) => v.accountId === accountId)
      .sort((a, b) => b.uploadedAt - a.uploadedAt);
  }

  async function uploadVideo(accountId: string, input: UploadVideoInput): Promise<SafetyVideo> {
    validateVideo(input);
    await wait();
    const t = now();
    const fileName = input.fileName.trim();
    const v: SafetyVideo = {
      id: newId('sv'),
      accountId,
      fileName,
      sizeBytes: input.sizeBytes,
      durationSec: Math.round(input.durationSec),
      thumbnail: input.thumbnail || IMAGE_POOL[safetyHash(fileName) % IMAGE_POOL.length],
      status: 'PROCESSING',
      uploadedAt: t,
    };
    db.update((s) => {
      s.safetyVideos.push(v);
    });
    return v;
  }

  /** Finish the scan of a PROCESSING video (no-op if already done). */
  async function runScan(videoId: string): Promise<SafetyVideo> {
    await wait();
    const t = now();
    let out!: SafetyVideo;
    db.update((s) => {
      const v = video(s, videoId);
      if (v.status === 'PROCESSING') {
        v.result = scanVideoFile(v.fileName, v.durationSec);
        v.status = 'DONE';
        v.checkedAt = t;
      }
      out = structuredClone(v);
    });
    return out;
  }

  /** Only SAFE / GRAY videos can be posted (VIOLATION → 4504, still processing → 4509). */
  async function markPublished(videoId: string): Promise<SafetyVideo> {
    await wait();
    const t = now();
    let out!: SafetyVideo;
    db.update((s) => {
      const v = video(s, videoId);
      if (v.status !== 'DONE' || !v.result) throw new KolhubError('KOLHUB-4509');
      if (v.result.verdict === 'VIOLATION') throw new KolhubError('KOLHUB-4504');
      v.publishedAt ??= t;
      out = structuredClone(v);
    });
    return out;
  }

  async function deleteVideo(videoId: string): Promise<void> {
    await wait();
    db.update((s) => {
      video(s, videoId);
      s.safetyVideos = s.safetyVideos.filter((v) => v.id !== videoId);
    });
  }

  async function stats(accountId: string): Promise<SafetyStats> {
    await wait();
    const mine = db.read().safetyVideos.filter((v) => v.accountId === accountId);
    return {
      checked: mine.filter((v) => v.status === 'DONE').length,
      needsAction: mine.filter(
        (v) => v.status === 'DONE' && (v.result?.verdict === 'VIOLATION' || (v.result?.verdict === 'GRAY' && !v.publishedAt)),
      ).length,
      processing: mine.filter((v) => v.status === 'PROCESSING').length,
    };
  }

  // --- channel monitoring ---

  async function listMonitors(accountId: string, platform: MonitorPlatform): Promise<MonitorView[]> {
    await wait();
    const s = db.read();
    return s.safetyMonitors
      .filter((m) => m.accountId === accountId && m.platform === platform)
      .sort((a, b) => b.connectedAt - a.connectedAt)
      .map((m) => view(s, m));
  }

  async function connect(accountId: string, platform: MonitorPlatform, input: string): Promise<MonitorView> {
    const handle = parseChannelInput(platform, input);
    await wait();
    const t = now();
    let out!: MonitorView;
    db.update((s) => {
      const key = handle.toLowerCase();
      if (s.safetyMonitors.some((m) => m.accountId === accountId && m.platform === platform && m.handle.toLowerCase() === key)) {
        throw new KolhubError('KOLHUB-4507', { field: 'channel' });
      }
      // A profile channel (any status) keeps the follower count the platform already reported.
      const own = profileChannelFor(s.channels, accountId, platform, handle);
      const m = newMonitor(accountId, platform, handle, t, newId('mon'), own?.stats?.followers);
      s.safetyMonitors.push(m);
      out = view(s, m);
    });
    return out;
  }

  async function getMonitor(monitorId: string): Promise<MonitorView> {
    await wait();
    const s = db.read();
    return view(s, monitor(s, monitorId));
  }

  async function scan(monitorId: string): Promise<MonitorView> {
    await wait(1200 + Math.random() * 600);
    const t = now();
    let out!: MonitorView;
    db.update((s) => {
      const m = monitor(s, monitorId);
      applyScan(m, t);
      // VIOLATION videos become violations awaiting Admin review (deduped by video).
      syncViolationsFromMonitor(s, m, t);
      out = view(s, m);
    });
    return out;
  }

  async function remove(monitorId: string): Promise<void> {
    await wait();
    db.update((s) => {
      monitor(s, monitorId);
      s.safetyMonitors = s.safetyMonitors.filter((m) => m.id !== monitorId);
    });
  }

  return {
    listVideos,
    uploadVideo,
    runScan,
    markPublished,
    deleteVideo,
    stats,
    listMonitors,
    connect,
    getMonitor,
    scan,
    remove,
  };
}

export type SafetyService = ReturnType<typeof createSafetyService>;
