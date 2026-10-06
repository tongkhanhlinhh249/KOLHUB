// Mock "KOL Safety – Tổng hợp kênh": the 30 most recently scanned contents of one of the signed-in
// KOL/MCN's channels, simulating the AI Video Analysis tool. Every content is deterministic from
// (channel id, position in the channel's history), so reloading shows the same report; "Quét lại"
// adds one new content on top (the oldest drops out) and the "Chia sẻ cho Nhãn hàng" flag is a demo stub.
import { KolhubError } from '../types';
import type { Channel } from '../profile-types';
import type { SafetyVerdict, IssueSeverity } from '../safety-types';
import type {
  ChannelReport,
  ContentCategory,
  ContentFilter,
  ContentFinding,
  KolSafetyChannel,
  KolSafetyReportState,
  ReportSummary,
  ScannedContent,
} from '../kol-safety-report-types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { normalizeText } from './directory';
import { profileDisplayName } from './identity';
import { mockChannelProfile, safetyHash } from './safety';
import { IMAGE_POOL, videoUrl } from './socialListening';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Number of contents in a report. */
export const REPORT_SIZE = 30;

export const CONTENT_CATEGORIES: ContentCategory[] = [
  'undisclosed_ad',
  'music_copyright',
  'profanity',
  'restricted_product',
  'misinformation',
  'violence',
  'adult',
  'child_safety',
];

export const CATEGORY_LABEL: Record<ContentCategory, string> = {
  profanity: 'Ngôn từ thô tục',
  violence: 'Bạo lực',
  adult: 'Nội dung người lớn',
  restricted_product: 'Sản phẩm cấm/hạn chế',
  misinformation: 'Thông tin sai lệch',
  music_copyright: 'Vi phạm bản quyền âm nhạc',
  undisclosed_ad: 'Quảng cáo không gắn nhãn',
  child_safety: 'An toàn trẻ em',
};

/** Verdict wording of this report ("Cần xem lại" for GRAY). */
export const REPORT_VERDICT_LABEL: Record<SafetyVerdict, string> = {
  SAFE: 'An toàn',
  GRAY: 'Cần xem lại',
  VIOLATION: 'Vi phạm',
};

export const SEVERITY_LABEL: Record<IssueSeverity, string> = {
  violation: 'Nghiêm trọng',
  warning: 'Trung bình',
  note: 'Nhẹ',
};

interface CategoryTemplate {
  /** Relative frequency when picking a category for a finding. */
  weight: number;
  reasons: Record<IssueSeverity, string>;
  /** Snippet per severity: [violation, warning, note]. */
  excerpts: [string, string, string];
  recommendation: string;
  /** Channel-level advice when this category leads the report. */
  advice: string;
}

const TEMPLATES: Record<ContentCategory, CategoryTemplate> = {
  undisclosed_ad: {
    weight: 5,
    reasons: {
      violation: 'Giới thiệu sản phẩm có trả phí nhưng không gắn nhãn #QuangCao',
      warning: 'Nhắc tên sản phẩm nhiều lần, chưa rõ là hợp tác hay không',
      note: 'Nhãn hợp tác đặt ở cuối mô tả, khó thấy',
    },
    excerpts: [
      '“Mã giảm giá của mình ở link dưới nha, mua liền kẻo hết!”',
      '“Bên nhãn hàng gửi tặng mình bộ này để dùng thử…” (không nói rõ có hợp tác).',
      'Nhãn #QuangCao chỉ nằm ở dòng cuối phần mô tả.',
    ],
    recommendation: 'Thêm nhãn #QuangCao hoặc câu “Video có hợp tác với nhãn hàng” trong 3 giây đầu và ở mô tả.',
    advice: 'Gắn nhãn #QuangCao cho mọi video có hợp tác, ngay trong 3 giây đầu và phần mô tả.',
  },
  music_copyright: {
    weight: 5,
    reasons: {
      violation: 'Dùng nguyên bản thu có bản quyền làm nhạc nền suốt video',
      warning: 'Đoạn nhạc nền trùng bản thu có bản quyền',
      note: 'Nhạc nền phổ biến, nên kiểm tra quyền sử dụng',
    },
    excerpts: [
      'Nhạc nền trùng khớp 92% với một bản thu đã đăng ký bản quyền, phát suốt video.',
      'Đoạn điệp khúc của một bài hát thương mại phát lại khoảng 15 giây.',
      'Bản phối lại (remix) phổ biến, chưa rõ nguồn cấp phép.',
    ],
    recommendation: 'Thay bằng nhạc trong thư viện miễn phí bản quyền của nền tảng hoặc tắt tiếng đoạn này.',
    advice: 'Ưu tiên nhạc trong thư viện bản quyền của nền tảng để tránh bị tắt tiếng hoặc giới hạn hiển thị.',
  },
  profanity: {
    weight: 4,
    reasons: {
      violation: 'Lời thoại có từ ngữ thô tục lặp lại nhiều lần',
      warning: 'Có từ ngữ thiếu chuẩn mực trong lời thoại',
      note: 'Phụ đề có từ lóng dễ gây hiểu nhầm',
    },
    excerpts: [
      'Lời thoại: “… [từ ngữ thô tục đã được che] …” lặp lại 4 lần.',
      'Phụ đề hiển thị một từ chửi thề ở giữa câu.',
      'Phụ đề dùng một từ lóng [đã được che] dễ gây hiểu nhầm.',
    ],
    recommendation: 'Cắt hoặc chèn tiếng bíp vào đoạn này và sửa phụ đề.',
    advice: 'Rà lại lời thoại và phụ đề, chèn tiếng bíp cho từ ngữ thiếu chuẩn mực trước khi đăng.',
  },
  restricted_product: {
    weight: 2,
    reasons: {
      violation: 'Quảng bá sản phẩm thuộc nhóm hạn chế quảng cáo khi chưa có giấy phép',
      warning: 'Xuất hiện đồ uống có cồn trong khung hình',
      note: 'Sản phẩm hạn chế xuất hiện thoáng qua',
    },
    excerpts: [
      '“Viên uống này giúp giảm 5 cân trong 1 tuần” (thực phẩm bảo vệ sức khoẻ, chưa có giấy xác nhận quảng cáo).',
      'Cận cảnh chai đồ uống có cồn kèm lời mời “cuối tuần làm vài ly”.',
      'Thiết bị thuốc lá điện tử xuất hiện thoáng qua trên bàn quay.',
    ],
    recommendation: 'Bỏ cảnh sản phẩm hạn chế hoặc bổ sung giấy xác nhận nội dung quảng cáo trước khi đăng.',
    advice: 'Tránh quảng bá sản phẩm hạn chế (đồ uống có cồn, thực phẩm chức năng…) khi chưa có giấy phép quảng cáo.',
  },
  misinformation: {
    weight: 2,
    reasons: {
      violation: 'Khẳng định công dụng sức khoẻ chưa được kiểm chứng',
      warning: 'Đưa số liệu không có nguồn',
      note: 'Nên ghi nguồn cho thông tin trích dẫn',
    },
    excerpts: [
      '“Uống nước này mỗi sáng là khỏi hẳn đau dạ dày.”',
      '“90% người dùng đã thấy hiệu quả sau 3 ngày” — không có nguồn.',
      'Ảnh chụp màn hình bài báo không ghi nguồn.',
    ],
    recommendation: 'Bỏ câu khẳng định hoặc dẫn nguồn đáng tin cậy ngay trong video.',
    advice: 'Dẫn nguồn cho số liệu và tránh khẳng định công dụng sức khoẻ chưa được kiểm chứng.',
  },
  violence: {
    weight: 1,
    reasons: {
      violation: 'Có cảnh đánh nhau mô phỏng chân thực',
      warning: 'Trò đùa có động tác dễ gây chấn thương',
      note: 'Âm thanh va chạm mạnh có thể gây khó chịu',
    },
    excerpts: [
      'Cảnh hai người xô đẩy, một người ngã mạnh xuống sàn.',
      'Trò chơi khăm giật ghế khi người khác đang ngồi xuống.',
      'Hiệu ứng âm thanh cú đấm lặp lại liên tục.',
    ],
    recommendation: 'Cắt cảnh này hoặc thêm cảnh báo “Không thực hiện theo” ở đầu video.',
    advice: 'Thêm cảnh báo an toàn cho các trò đùa, thử thách có động tác nguy hiểm.',
  },
  adult: {
    weight: 1,
    reasons: {
      violation: 'Trang phục và góc quay gợi cảm vượt chuẩn cộng đồng',
      warning: 'Có câu đùa mang hàm ý người lớn',
      note: 'Ảnh bìa dễ bị hiểu là gợi cảm',
    },
    excerpts: [
      'Góc quay cận kéo dài vào trang phục hở trong phần thử đồ.',
      'Câu đùa hai nghĩa trong phần hỏi đáp với người xem.',
      'Ảnh bìa cắt khung hình dễ gây hiểu nhầm.',
    ],
    recommendation: 'Đổi góc quay hoặc làm mờ đoạn này; chọn ảnh bìa trung tính hơn.',
    advice: 'Chọn ảnh bìa và góc quay trung tính để không bị giới hạn độ tuổi người xem.',
  },
  child_safety: {
    weight: 1,
    reasons: {
      violation: 'Trẻ nhỏ thực hiện thử thách nguy hiểm',
      warning: 'Trẻ nhỏ xuất hiện khi không có người lớn giám sát rõ ràng',
      note: 'Có trẻ nhỏ trong khung hình, nên hạn chế cận mặt',
    },
    excerpts: [
      'Trẻ nhỏ làm theo thử thách nhảy từ ghế cao xuống nệm.',
      'Một em nhỏ leo lên ghế cao để với đồ, không thấy người lớn trong khung hình.',
      'Khung hình cận mặt trẻ nhỏ trong vài giây.',
    ],
    recommendation: 'Cắt cảnh có trẻ nhỏ gặp nguy hiểm và làm mờ mọi thông tin có thể nhận diện trẻ.',
    advice: 'Hạn chế để trẻ nhỏ xuất hiện; luôn làm mờ thông tin nhận diện và tránh cảnh nguy hiểm.',
  },
};

const GENERIC_ADVICE = [
  'Duy trì kiểm tra video trước khi đăng để giữ điểm an toàn ổn định.',
  'Thêm phụ đề và ghi nguồn tư liệu trong phần mô tả để nội dung rõ ràng hơn.',
  'Bật “Chia sẻ cho Nhãn hàng” để nhãn hàng thấy kênh đang giữ chuẩn nội dung tốt.',
];

const CONTENT_TITLES = [
  'Mở hộp bộ dưỡng da mới',
  'Một ngày đi làm của mình',
  'Thử thách nấu ăn 15 phút',
  'Review quán cà phê góc phố',
  'Hậu trường buổi chụp hình',
  'Mẹo dọn nhà cuối tuần',
  'Hỏi đáp cùng người theo dõi',
  'Thử đồ mùa thu cùng mình',
  'Chuyến đi biển 2 ngày 1 đêm',
  'Công thức sinh tố buổi sáng',
  'Góc làm việc tại nhà',
  'Bí quyết trang điểm nhanh',
  'Thử thách 7 ngày tập luyện',
  'Livestream cắt ngắn: săn ưu đãi',
  'So sánh 3 mẫu tai nghe',
  'Món ngon đường phố buổi tối',
  'Dọn tủ quần áo cùng mình',
  'Chia sẻ kinh nghiệm học tiếng Anh',
  'Phản ứng khi thử món cay cấp độ 5',
  'Trải nghiệm khu vui chơi mới',
  'Mở hộp điện thoại cũ giá mềm',
  'Thói quen buổi tối thư giãn',
  'Bữa trưa văn phòng tiết kiệm',
  'Đi chợ cuối tuần cùng mẹ',
];

function weightedCategory(h: number, exclude: ContentCategory[]): ContentCategory {
  const pool = CONTENT_CATEGORIES.filter((c) => !exclude.includes(c));
  const total = pool.reduce((s, c) => s + TEMPLATES[c].weight, 0);
  let r = h % total;
  for (const c of pool) {
    r -= TEMPLATES[c].weight;
    if (r < 0) return c;
  }
  return pool[0];
}

const SEVERITY_INDEX: Record<IssueSeverity, number> = { violation: 0, warning: 1, note: 2 };

function finding(category: ContentCategory, severity: IssueSeverity, h: number, durationSec: number): ContentFinding {
  const t = TEMPLATES[category];
  return {
    atSec: h % Math.max(1, durationSec),
    category,
    severity,
    reason: t.reasons[severity],
    excerpt: t.excerpts[SEVERITY_INDEX[severity]],
    recommendation: t.recommendation,
  };
}

/** Verdict of the content at `seq`: a fixed share per 30 (≥ 2 Vi phạm, ≥ 5 Cần xem lại) plus some random ones. */
function verdictAt(channelId: string, seq: number, h: number): SafetyVerdict {
  const off = safetyHash(channelId) % 30;
  const k = seq + off;
  if (k % 15 === 0) return 'VIOLATION';
  if (k % 6 === 2) return 'GRAY';
  const bucket = h % 20;
  if (bucket === 0) return 'VIOLATION';
  if (bucket <= 3) return 'GRAY';
  return 'SAFE';
}

type ChannelRef = Pick<KolSafetyChannel, 'id' | 'platform' | 'url' | 'followers'>;

/** The content at position `seq` of a channel's history (deterministic; `publishedAt` is given). */
export function contentAt(channel: ChannelRef, seq: number, publishedAt: number): ScannedContent {
  const h = safetyHash(`${channel.id}:${seq}`);
  const verdict = verdictAt(channel.id, seq, h);
  const durationSec =
    channel.platform === 'youtube' ? 120 + (h % 900) : channel.platform === 'facebook' ? 20 + (h % 280) : 12 + (h % 170);
  const views = Math.max(120, Math.round(channel.followers * (0.04 + ((h >>> 9) % 140) / 100)));
  const findings: ContentFinding[] = [];
  const add = (severity: IssueSeverity, salt: number) => {
    const fh = safetyHash(`${h}:${salt}`);
    const cat = weightedCategory(fh, findings.map((f) => f.category));
    findings.push(finding(cat, severity, fh >>> 3, durationSec));
  };
  let score: number;
  if (verdict === 'VIOLATION') {
    score = 12 + (h % 34);
    add('violation', 1);
    if ((h >>> 4) % 2) add('warning', 2);
  } else if (verdict === 'GRAY') {
    score = 50 + (h % 30);
    add('warning', 1);
    if ((h >>> 4) % 3 === 0) add('warning', 2);
  } else {
    score = 80 + (h % 21);
    if ((h >>> 4) % 4 === 0) add('note', 1);
  }
  findings.sort((a, b) => a.atSec - b.atSec);
  const handle = channel.url.replace(/^https?:\/\//i, '');
  return {
    id: `${channel.id}-c${seq + 1}`,
    seq,
    title: CONTENT_TITLES[(h >>> 11) % CONTENT_TITLES.length],
    thumbnail: IMAGE_POOL[(h >>> 2) % IMAGE_POOL.length],
    url: videoUrl(channel.platform, handle, seq + 1),
    publishedAt,
    durationSec,
    views,
    verdict,
    score,
    findings,
  };
}

/** 06:00 of `now`'s day, or of the previous day when it is earlier than 06:00 (the daily auto-scan). */
export function defaultFirstScanAt(now: number): number {
  const d = new Date(now);
  d.setHours(6, 0, 0, 0);
  const t = d.getTime();
  return t > now ? t - DAY : t;
}

function publishTime(channelId: string, seq: number, state: Pick<KolSafetyReportState, 'firstScanAt' | 'rescans'>): number {
  const jitter = (safetyHash(`${channelId}:t${seq}`) % 10) * HOUR;
  if (seq < REPORT_SIZE) return state.firstScanAt - DAY - (REPORT_SIZE - 1 - seq) * 2 * DAY - jitter;
  // Appended by the n-th "Quét lại": posted shortly before that re-scan.
  const at = state.rescans[seq - REPORT_SIZE];
  return at - HOUR - (jitter % (3 * HOUR));
}

/** The 30 newest contents (newest first) given the persisted state (or the default first scan). */
export function buildChannelReport(channel: ChannelRef, state: KolSafetyReportState | undefined, now: number): ChannelReport {
  const st = state ?? { firstScanAt: defaultFirstScanAt(now), rescans: [], shared: false };
  const latest = REPORT_SIZE - 1 + st.rescans.length;
  const items: ScannedContent[] = [];
  for (let seq = latest; seq > latest - REPORT_SIZE; seq--) {
    items.push(contentAt(channel, seq, publishTime(channel.id, seq, st)));
  }
  return {
    channelId: channel.id,
    scanNo: st.rescans.length + 1,
    scannedAt: st.rescans.at(-1) ?? st.firstScanAt,
    items,
    shared: st.shared,
    ...(st.sharedAt !== undefined ? { sharedAt: st.sharedAt } : {}),
  };
}

function emptyTotals(): Record<ContentCategory, number> {
  return Object.fromEntries(CONTENT_CATEGORIES.map((c) => [c, 0])) as Record<ContentCategory, number>;
}

/**
 * Overall score = average content score − 2 per Vi phạm (0–100); counts per verdict; findings per
 * category; date range; scores in time order; top 3 recommendations (leading categories first,
 * then general advice).
 */
export function summarizeReport(items: ScannedContent[]): ReportSummary {
  const counts = { safe: 0, gray: 0, violation: 0 };
  const categoryTotals = emptyTotals();
  for (const it of items) {
    if (it.verdict === 'VIOLATION') counts.violation++;
    else if (it.verdict === 'GRAY') counts.gray++;
    else counts.safe++;
    for (const f of it.findings) categoryTotals[f.category]++;
  }
  const avg = items.length ? items.reduce((s, it) => s + it.score, 0) / items.length : 100;
  const score = Math.max(0, Math.min(100, Math.round(avg - 2 * counts.violation)));
  const ordered = [...items].sort((a, b) => a.publishedAt - b.publishedAt);
  // Weight problems by how serious they are: a "Vi phạm" finding counts 3, a warning 2, a note 1.
  const weight = emptyTotals();
  for (const it of items) for (const f of it.findings) weight[f.category] += f.severity === 'violation' ? 3 : f.severity === 'warning' ? 2 : 1;
  const leading = CONTENT_CATEGORIES.filter((c) => weight[c] > 0).sort((a, b) => weight[b] - weight[a]);
  const recommendations = [...leading.map((c) => TEMPLATES[c].advice), ...GENERIC_ADVICE].slice(0, 3);
  return {
    score,
    counts,
    categoryTotals,
    from: ordered[0]?.publishedAt ?? null,
    to: ordered.at(-1)?.publishedAt ?? null,
    trend: ordered.map((it) => ({ id: it.id, publishedAt: it.publishedAt, score: it.score })),
    recommendations,
  };
}

/** Verdict / category / title search (accent- and case-insensitive), then sort (default newest first). */
export function filterContents(items: ScannedContent[], f: ContentFilter = {}): ScannedContent[] {
  const q = normalizeText(f.query ?? '');
  const out = items.filter(
    (it) =>
      (!f.verdict || f.verdict === 'ALL' || it.verdict === f.verdict) &&
      (!f.category || f.category === 'ALL' || it.findings.some((x) => x.category === f.category)) &&
      (!q || normalizeText(it.title).includes(q) || it.findings.some((x) => normalizeText(x.reason).includes(q))),
  );
  const sort = f.sort ?? 'date_desc';
  const by: Record<typeof sort, (a: ScannedContent, b: ScannedContent) => number> = {
    date_desc: (a, b) => b.publishedAt - a.publishedAt,
    date_asc: (a, b) => a.publishedAt - b.publishedAt,
    score_asc: (a, b) => a.score - b.score || b.publishedAt - a.publishedAt,
    score_desc: (a, b) => b.score - a.score || b.publishedAt - a.publishedAt,
  };
  return out.sort(by[sort]);
}

/** 42 → "00:42", 754 → "12:34". */
export function formatTimestamp(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function ddmmyyyy(t: number): string {
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Quote a CSV cell when it has a comma, quote or line break (quotes doubled). */
export function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADER = [
  'STT',
  'Tiêu đề',
  'Ngày đăng',
  'Lượt xem',
  'Kết luận',
  'Điểm',
  'Danh mục',
  'Mốc thời gian',
  'Lý do',
  'Đường dẫn',
];

/** CSV of the contents (UTF-8 with BOM so Excel reads Vietnamese; CRLF line endings). */
export function reportCsv(items: ScannedContent[]): string {
  const rows = items.map((it, i) => [
    i + 1,
    it.title,
    ddmmyyyy(it.publishedAt),
    it.views,
    REPORT_VERDICT_LABEL[it.verdict],
    it.score,
    [...new Set(it.findings.map((f) => CATEGORY_LABEL[f.category]))].join('; '),
    it.findings.map((f) => formatTimestamp(f.atSec)).join('; '),
    it.findings.map((f) => f.reason).join('; '),
    it.url,
  ]);
  return '﻿' + [CSV_HEADER, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface KolSafetyReportDeps {
  db: Db;
  now: () => number;
  delay?: false;
}

function handleOf(c: Channel): string {
  const h = (c.handle ?? '').replace(/^@/, '').trim();
  if (h) return h;
  return c.url.replace(/^https?:\/\//i, '').split('/').filter(Boolean).at(-1)?.replace(/^@/, '') ?? c.id;
}

const MCN_OWN_GROUP = 'Kênh riêng MCN';

function toChannel(s: DemoState, c: Channel): KolSafetyChannel {
  const handle = handleOf(c);
  const out: KolSafetyChannel = {
    id: c.id,
    platform: c.platform,
    handle,
    url: c.url,
    followers: c.stats?.followers ?? mockChannelProfile(c.platform, handle).followers,
    verified: c.status === 'VERIFIED',
  };
  if (c.ownerType === 'MCN') {
    const kol = c.assignedKolAccountId ? s.kolProfiles.find((p) => p.accountId === c.assignedKolAccountId) : undefined;
    out.group = kol ? profileDisplayName(kol) || 'KOL đã gán' : MCN_OWN_GROUP;
  }
  return out;
}

/** Channels of the account: KOL newest first; MCN grouped by KOL (A → Z, "Kênh riêng MCN" last), followers desc. */
export function channelsOf(s: DemoState, accountId: string): KolSafetyChannel[] {
  const own = s.channels.filter((c) => c.ownerId === accountId).sort((a, b) => b.createdAt - a.createdAt);
  const list = own.map((c) => toChannel(s, c));
  if (!list.some((c) => c.group)) return list;
  const rank = (g?: string) => (g === MCN_OWN_GROUP ? 1 : 0);
  return list.sort(
    (a, b) => rank(a.group) - rank(b.group) || (a.group ?? '').localeCompare(b.group ?? '', 'vi') || b.followers - a.followers,
  );
}

export function createKolSafetyReportService(deps: KolSafetyReportDeps) {
  const { db, now } = deps;
  const wait = (ms?: number) => (deps.delay === false ? Promise.resolve() : fakeDelay(ms));

  function ownChannel(s: DemoState, accountId: string, channelId: string): KolSafetyChannel {
    const c = s.channels.find((x) => x.id === channelId && x.ownerId === accountId);
    if (!c) throw new KolhubError('KOLHUB-4508');
    return toChannel(s, c);
  }
  const stateOf = (s: DemoState, accountId: string, channelId: string) =>
    s.kolSafetyReports?.find((r) => r.accountId === accountId && r.channelId === channelId);

  /** Persisted state for (account, channel), created from the default first scan when missing. */
  function ensureState(s: DemoState, accountId: string, channelId: string, t: number): KolSafetyReportState {
    s.kolSafetyReports ??= [];
    let r = s.kolSafetyReports.find((x) => x.accountId === accountId && x.channelId === channelId);
    if (!r) {
      r = { accountId, channelId, firstScanAt: defaultFirstScanAt(t), rescans: [], shared: false };
      s.kolSafetyReports.push(r);
    }
    return r;
  }

  async function listChannels(accountId: string): Promise<KolSafetyChannel[]> {
    await wait();
    return channelsOf(db.read(), accountId);
  }

  async function getReport(accountId: string, channelId: string): Promise<ChannelReport> {
    await wait();
    const s = db.read();
    return buildChannelReport(ownChannel(s, accountId, channelId), stateOf(s, accountId, channelId), now());
  }

  /** "Quét lại": one new content is analysed and added on top (simulated 1.2–1.8 s). */
  async function rescan(accountId: string, channelId: string): Promise<ChannelReport> {
    ownChannel(db.read(), accountId, channelId);
    await wait(1200 + Math.random() * 600);
    const t = now();
    let out!: ChannelReport;
    db.update((s) => {
      const ch = ownChannel(s, accountId, channelId);
      const r = ensureState(s, accountId, channelId, t);
      // Keep times strictly increasing so contents stay in order even on rapid clicks.
      const last = r.rescans.at(-1) ?? r.firstScanAt;
      r.rescans.push(Math.max(t, last + 1));
      out = buildChannelReport(ch, r, t);
    });
    return out;
  }

  /** "Chia sẻ cho Nhãn hàng" (demo): only records the flag. */
  async function setShared(accountId: string, channelId: string, shared: boolean): Promise<ChannelReport> {
    await wait();
    const t = now();
    let out!: ChannelReport;
    db.update((s) => {
      const ch = ownChannel(s, accountId, channelId);
      const r = ensureState(s, accountId, channelId, t);
      r.shared = shared;
      if (shared) r.sharedAt = t;
      else delete r.sharedAt;
      out = buildChannelReport(ch, r, t);
    });
    return out;
  }

  return { listChannels, getReport, rescan, setShared };
}

export type KolSafetyReportService = ReturnType<typeof createKolSafetyReportService>;
