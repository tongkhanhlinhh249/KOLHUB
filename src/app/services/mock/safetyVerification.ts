// Mock xác thực kênh qua KOL Safety (docs/nghiep-vu/xac-thuc-kenh-kol-safety.md).
// KOL Hub chỉ chốt danh sách N nội dung, mở KOL Safety và phản chiếu kết quả; tiêu chí đạt và token
// thuộc KOL Safety (BR-07, BR-18). Ở prototype, phần "KOL Safety quét" được giả lập ở đây.
import { format } from 'date-fns';
import { KolhubError } from '../types';
import type { Platform } from '../bizTypes';
import type { Channel, ChannelSafety, NoticeMessage, SafetyContentType, SafetyItem } from '../profile-types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { BADGE_VALID_DAYS, normalizeChannelUrl } from './channelRules';
import { findProfile } from './profileRules';
import { channelBadge } from './directory';

const DAY = 86_400_000;

/** N nội dung gần nhất phải đạt, theo nền tảng (QĐ-03, QĐ-04, QĐ-05). */
export const SAFETY_REQUIRED: Record<Platform, number> = { tiktok: 20, facebook: 20, instagram: 20, youtube: 5 };
/** Mỗi video chỉ quét 3 phút đầu (QĐ-06). */
export const SAFETY_SCAN_SECONDS = 180;
/** Danh sách đã chốt giữ 7 ngày (BR-16, đề xuất). */
export const SAFETY_SNAPSHOT_DAYS = 7;
export { BADGE_VALID_DAYS };
/** Gia hạn mở khi còn ≤ 14 ngày; nhắc ở 14 · 7 · 1 ngày (BR-29, đề xuất). */
export const RENEW_WINDOW_DAYS = 14;

/** Nội dung được tính, theo nền tảng (bảng mục 2). */
export const SAFETY_CONTENT_LABEL: Record<Platform, string> = {
  tiktok: 'video',
  facebook: 'nội dung (ảnh, bài viết, story, ghi chú)',
  instagram: 'nội dung (ảnh, bài viết, story, ghi chú)',
  youtube: 'video (video thường và Shorts)',
};

export const SAFETY_TYPE_LABEL: Record<SafetyContentType, string> = {
  VIDEO: 'Video',
  SHORT: 'Shorts',
  PHOTO: 'Ảnh',
  POST: 'Bài viết',
  STORY: 'Story',
  NOTE: 'Ghi chú',
};

const TYPES_BY_PLATFORM: Record<Platform, SafetyContentType[]> = {
  tiktok: ['VIDEO'],
  youtube: ['VIDEO', 'SHORT'],
  facebook: ['VIDEO', 'PHOTO', 'POST', 'STORY', 'NOTE'],
  instagram: ['VIDEO', 'PHOTO', 'POST', 'STORY', 'NOTE'],
};

const TITLES = [
  'Hậu trường buổi quay',
  'Review sản phẩm mới',
  'Một ngày của mình',
  'Hỏi đáp cùng mọi người',
  'Chia sẻ kinh nghiệm',
  'Thử thách tuần này',
  'Góc nhìn cá nhân',
  'Vlog cuối tuần',
];

/** Lý do không đạt mẫu, "nguyên văn KOL Safety" (BR-19). */
const FAIL_REASONS = [
  'Có hình ảnh sản phẩm thuốc lá điện tử (giây 0:42).',
  'Ngôn từ thô tục trong lời thoại (giây 1:15).',
  'Quảng cáo thực phẩm chức năng có công dụng chữa bệnh.',
  'Nhạc nền vi phạm bản quyền theo thông báo của nền tảng.',
  'Hình ảnh gây sốc, chưa làm mờ (giây 2:03).',
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

export type SafetyPhase =
  /** Kênh chưa bắt đầu hoặc danh sách cũ đã hết hạn. */
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PASSED';

export interface SafetyProgress {
  phase: SafetyPhase;
  purpose: 'VERIFY' | 'RENEW';
  required: number;
  scanned: number;
  passed: number;
  failed: number;
  /** Hạn của danh sách đã chốt. */
  snapshotExpiresAt?: number;
}

const isSnapshotExpired = (s: ChannelSafety, now: number) => !s.passedAt && s.snapshotAt + SAFETY_SNAPSHOT_DAYS * DAY <= now;

/** Kênh đang trong cửa sổ gia hạn (còn ≤ 14 ngày) hoặc đã hết hạn. */
export function canRenew(ch: Pick<Channel, 'status' | 'badgeExpiresAt'>, now: number): boolean {
  const badge = channelBadge(ch, now);
  if (badge === 'EXPIRED') return true;
  return badge === 'VERIFIED' && ch.badgeExpiresAt !== undefined && ch.badgeExpiresAt - now <= RENEW_WINDOW_DAYS * DAY;
}

/** Số ngày hiệu lực còn lại (làm tròn lên), undefined khi kênh không có dấu còn hạn. */
export function daysLeft(ch: Pick<Channel, 'status' | 'badgeExpiresAt'>, now: number): number | undefined {
  if (channelBadge(ch, now) !== 'VERIFIED' || ch.badgeExpiresAt === undefined) return undefined;
  return Math.max(0, Math.ceil((ch.badgeExpiresAt - now) / DAY));
}

/** Tiến độ x/N của lần xác thực hiện tại (lần đầu: kênh SAFETY_PENDING; gia hạn: kênh trong cửa sổ gia hạn). */
export function safetyProgress(ch: Channel, now: number): SafetyProgress {
  const required = SAFETY_REQUIRED[ch.platform];
  const purpose: 'VERIFY' | 'RENEW' = ch.status === 'SAFETY_PENDING' ? 'VERIFY' : 'RENEW';
  const s = ch.safety;
  if (!s || s.purpose !== purpose || s.passedAt || isSnapshotExpired(s, now)) {
    const justRenewed = purpose === 'RENEW' && !!s?.passedAt && s.purpose === 'RENEW' && !canRenew(ch, now);
    return { phase: justRenewed ? 'PASSED' : 'NOT_STARTED', purpose, required, scanned: 0, passed: 0, failed: 0 };
  }
  const scanned = s.items.filter((i) => i.verdict).length;
  const passed = s.items.filter((i) => i.verdict === 'PASS').length;
  return {
    phase: 'IN_PROGRESS',
    purpose,
    required: s.required,
    scanned,
    passed,
    failed: scanned - passed,
    snapshotExpiresAt: s.snapshotAt + SAFETY_SNAPSHOT_DAYS * DAY,
  };
}

/** Số nội dung kênh đang có (giả lập: luôn đủ, trừ khi Demo Panel đặt `demoContentCount`). */
export function contentCountOf(ch: Channel): number {
  return ch.demoContentCount ?? SAFETY_REQUIRED[ch.platform] + 4 + (hash(normalizeChannelUrl(ch.url)) % 40);
}

/** N nội dung mới nhất của kênh tại thời điểm `now` (danh sách chốt, BR-08, BR-16). */
export function snapshotItems(ch: Channel, now: number): SafetyItem[] {
  const n = SAFETY_REQUIRED[ch.platform];
  const base = normalizeChannelUrl(ch.url).replace(/^https:\/\//, '');
  const types = TYPES_BY_PLATFORM[ch.platform];
  const seed = hash(base + now);
  return Array.from({ length: n }, (_, i) => {
    const h = hash(`${seed}-${i}`);
    const type = types[h % types.length];
    const isVideo = type === 'VIDEO' || type === 'SHORT' || type === 'STORY';
    const durationSec = !isVideo ? undefined : type === 'SHORT' || type === 'STORY' ? 15 + (h % 45) : 40 + (h % 600);
    return {
      id: `si-${(seed % 100000).toString(36)}-${i + 1}`,
      url: `https://${base}/${type === 'STORY' ? 'stories' : type === 'SHORT' ? 'shorts' : 'p'}/${(h % 1e8).toString(36)}`,
      type,
      title: `${TITLES[h % TITLES.length]} #${n - i}`,
      postedAt: now - (i * 2 + 1 + (h % 2)) * DAY,
      ...(durationSec !== undefined ? { durationSec } : {}),
      scans: 0,
    };
  });
}

export interface SafetyVerificationDeps {
  db: Db;
  now: () => number;
  notify: (m: NoticeMessage) => void;
  delay?: false;
}

export function createSafetyVerificationService(deps: SafetyVerificationDeps) {
  const { db, now, notify } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  function owned(state: DemoState, accountId: string, channelId: string): Channel {
    const c = state.channels.find((x) => x.id === channelId);
    if (!c) throw new Error('CHANNEL_NOT_FOUND');
    if (c.ownerId !== accountId) throw new Error('NOT_OWNER');
    return c;
  }

  function send(s: DemoState, ownerId: string, body: string) {
    const p = findProfile(s, ownerId);
    const email = p?.contact.email || s.accounts.find((a) => a.id === ownerId)?.email;
    if (email) notify({ channel: 'email', target: email, title: 'KOL Hub – Xác thực kênh', body });
  }

  /** Đủ N/N đạt: lần đầu → Chờ duyệt (Admin); gia hạn → thêm 3 tháng, không cần Admin (BR-17, BR-30). */
  function complete(s: DemoState, c: Channel, t: number) {
    const safety = c.safety!;
    safety.passedAt = t;
    c.safetyPassedAt = t;
    c.updatedAt = t;
    const name = c.handle || c.url;
    if (safety.purpose === 'VERIFY') {
      c.status = 'PENDING_REVIEW';
      c.note = undefined;
      send(s, c.ownerId, `Kênh ${name} đã đạt KOL Safety ${safety.required}/${safety.required} nội dung và đang chờ KOL Hub duyệt chủ sở hữu.`);
    } else {
      const from = Math.max(c.badgeExpiresAt ?? t, t);
      c.badgeExpiresAt = from + BADGE_VALID_DAYS * DAY;
      c.status = 'VERIFIED';
      c.badgeSuspended = undefined;
      const until = format(c.badgeExpiresAt, 'dd/MM/yyyy');
      send(s, c.ownerId, `Kênh ${name} đã gia hạn xác thực, hiệu lực đến ${until}.`);
    }
  }

  /**
   * Bấm "Xác thực trên KOL Safety" / "Gia hạn" và tick cam đoan: chốt N nội dung gần nhất (BR-16).
   * Danh sách còn hạn thì giữ nguyên (tiếp tục quét). Kênh chưa đủ N nội dung → KOLHUB-4210 (EC-04).
   */
  async function start(accountId: string, channelId: string, consent: boolean): Promise<Channel> {
    await wait();
    if (!consent) throw new Error('CONSENT_REQUIRED');
    const t = now();
    db.update((s) => {
      const c = owned(s, accountId, channelId);
      const purpose = c.status === 'SAFETY_PENDING' ? 'VERIFY' : canRenew(c, t) ? 'RENEW' : null;
      if (!purpose) throw new Error('NOT_VERIFIABLE');
      if (c.safety && c.safety.purpose === purpose && !c.safety.passedAt && !isSnapshotExpired(c.safety, t)) return;
      const required = SAFETY_REQUIRED[c.platform];
      const have = contentCountOf(c);
      if (have < required) throw new KolhubError('KOLHUB-4210', { required, have });
      c.safety = {
        purpose,
        required,
        snapshotAt: t,
        items: snapshotItems(c, t),
        reportUrl: `https://kolsafety.vn/bao-cao/${encodeURIComponent(normalizeChannelUrl(c.url).replace(/^https:\/\//, ''))}`,
      };
      c.updatedAt = t;
    });
    return owned(db.read(), accountId, channelId);
  }

  /**
   * KOL Safety quét một nội dung (hoặc mọi nội dung chưa quét / chưa đạt khi không truyền `itemId`).
   * Quét lại không giới hạn (BR-15). Giả lập: lần đầu vài nội dung không đạt; quét lại sau khi KOL
   * gỡ/chỉnh thì đạt. Demo Panel có thể ép kết quả lần quét tiếp theo.
   */
  async function scan(accountId: string, channelId: string, itemId?: string): Promise<Channel> {
    await wait();
    const t = now();
    // EC-09: a failed update is rolled back, so drop the stale list in its own update before throwing.
    const current = owned(db.read(), accountId, channelId).safety;
    if (current && !current.passedAt && isSnapshotExpired(current, t)) {
      db.update((s) => {
        owned(s, accountId, channelId).safety = undefined;
      });
      throw new KolhubError('KOLHUB-4211');
    }
    db.update((s) => {
      const c = owned(s, accountId, channelId);
      const safety = c.safety;
      if (!safety || safety.passedAt) throw new Error('NOT_STARTED');
      const forced = s.safetyDemo?.nextVerdict ?? 'AUTO';
      const targets = safety.items.filter((i) => (itemId ? i.id === itemId : i.verdict !== 'PASS'));
      if (!targets.length) throw new Error('ITEM_NOT_FOUND');
      for (const i of targets) {
        const h = hash(i.url);
        const verdict = forced !== 'AUTO' ? forced : i.scans === 0 && h % 6 === 0 ? 'FAIL' : 'PASS';
        i.scans += 1;
        i.verdict = verdict;
        i.reason = verdict === 'FAIL' ? FAIL_REASONS[h % FAIL_REASONS.length] : undefined;
        i.scannedSec = i.durationSec === undefined ? undefined : Math.min(i.durationSec, SAFETY_SCAN_SECONDS);
        i.checkedAt = t;
      }
      safety.checkedAt = t;
      c.updatedAt = t;
      if (safety.items.every((i) => i.verdict === 'PASS')) complete(s, c, t);
    });
    return owned(db.read(), accountId, channelId);
  }

  // --- Demo Panel ---

  function demoChannel(s: DemoState, channelId: string): Channel {
    const c = s.channels.find((x) => x.id === channelId);
    if (!c) throw new Error('CHANNEL_NOT_FOUND');
    return c;
  }

  /** "Quét đủ ngay": chốt danh sách nếu chưa có và cho mọi nội dung đạt. */
  async function demoPassAll(channelId: string): Promise<void> {
    await wait();
    const t = now();
    db.update((s) => {
      const c = demoChannel(s, channelId);
      const purpose = c.status === 'SAFETY_PENDING' ? 'VERIFY' : canRenew(c, t) ? 'RENEW' : null;
      if (!purpose) throw new Error('NOT_VERIFIABLE');
      if (!c.safety || c.safety.purpose !== purpose || c.safety.passedAt || isSnapshotExpired(c.safety, t)) {
        c.safety = { purpose, required: SAFETY_REQUIRED[c.platform], snapshotAt: t, items: snapshotItems(c, t), reportUrl: 'https://kolsafety.vn/bao-cao' };
      }
      for (const i of c.safety.items) {
        i.scans += 1;
        i.verdict = 'PASS';
        i.reason = undefined;
        i.scannedSec = i.durationSec === undefined ? undefined : Math.min(i.durationSec, SAFETY_SCAN_SECONDS);
        i.checkedAt = t;
      }
      complete(s, c, t);
    });
  }

  function demoNextVerdict(): 'AUTO' | 'PASS' | 'FAIL' {
    return db.read().safetyDemo?.nextVerdict ?? 'AUTO';
  }

  async function demoSetNextVerdict(nextVerdict: 'AUTO' | 'PASS' | 'FAIL'): Promise<void> {
    db.update((s) => {
      s.safetyDemo = { nextVerdict };
    });
  }

  /** Số nội dung trên kênh (undefined = đủ). */
  async function demoSetContentCount(channelId: string, count: number | undefined): Promise<void> {
    db.update((s) => {
      const c = demoChannel(s, channelId);
      c.demoContentCount = count;
    });
  }

  /** Đẩy kênh đã xác thực tới "còn N ngày" (N ≤ 0 = hết hạn). */
  async function demoSetDaysLeft(channelId: string, days: number): Promise<void> {
    const t = now();
    db.update((s) => {
      const c = demoChannel(s, channelId);
      if (c.status !== 'VERIFIED' && c.status !== 'EXPIRED') throw new Error('NOT_VERIFIED');
      if (days <= 0) {
        c.status = 'EXPIRED';
        c.badgeExpiresAt = t + days * DAY - 1;
      } else {
        c.status = 'VERIFIED';
        c.badgeExpiresAt = t + days * DAY - 60_000;
      }
      c.updatedAt = t;
    });
  }

  /** Đưa kênh về "Chưa xác thực KOL Safety" (SAFETY_PENDING, bỏ dấu và kết quả cũ) để demo lại từ đầu. */
  async function demoResetSafety(channelId: string): Promise<void> {
    const t = now();
    db.update((s) => {
      const c = demoChannel(s, channelId);
      c.status = 'SAFETY_PENDING';
      c.safety = undefined;
      c.safetyPassedAt = undefined;
      c.demoContentCount = undefined;
      c.badgeExpiresAt = undefined;
      c.verifiedAt = undefined;
      c.badgeSuspended = undefined;
      c.note = undefined;
      c.updatedAt = t;
    });
  }

  return { start, scan, demoPassAll, demoResetSafety, demoNextVerdict, demoSetNextVerdict, demoSetContentCount, demoSetDaysLeft };
}

export type SafetyVerificationService = ReturnType<typeof createSafetyVerificationService>;
