// Demo violations: Khánh Vy (5), Sao Việt Media (6) and a few other sample KOLs (9), last 90 days.
import type { Channel, KolProfile, Platform } from '../profile-types';
import type {
  Violation,
  ViolationCategory,
  ViolationEvent,
  ViolationSeverity,
  ViolationSource,
  ViolationStatus,
} from '../violation-types';
import { IMAGE_POOL, videoUrl } from './socialListening';

const DAY = 86_400_000;
const HOUR = 3_600_000;

export const VIOLATION_KOL_ACCOUNT_ID = 'acc-kol-2026-0001';
export const VIOLATION_MCN_ACCOUNT_ID = 'acc-mcn-saoviet';

interface Spec {
  owner: string;
  /** Preferred platform; the owner's first channel is used when it has none on this platform. */
  platform: Platform;
  /** MCN only: pick the managed channel by its link. */
  channelUrl?: string;
  daysAgo: number;
  title: string;
  category: ViolationCategory;
  severity: ViolationSeverity;
  source: ViolationSource;
  status: ViolationStatus;
  reporterNote?: string;
  ownerNote?: string;
  appealReason?: string;
  adminReason?: string;
  /** CONFIRMED after a rejected appeal. */
  appealRejected?: boolean;
}

const KV = VIOLATION_KOL_ACCOUNT_ID;
const SV = VIOLATION_MCN_ACCOUNT_ID;
const kol = (n: number) => `acc-kol-2026-${String(n).padStart(4, '0')}`;

const SPECS: Spec[] = [
  // --- Khánh Vy: 1 PENDING, 2 CONFIRMED, 1 APPEALED, 1 RESOLVED ---
  {
    owner: KV,
    platform: 'tiktok',
    daysAgo: 2,
    title: 'Review khoá học tiếng Anh cấp tốc',
    category: 'Quảng cáo không gắn nhãn',
    severity: 'medium',
    source: 'KOL_SAFETY',
    status: 'PENDING_REVIEW',
  },
  {
    owner: KV,
    platform: 'youtube',
    daysAgo: 9,
    title: 'Mẹo học từ vựng 30 ngày nói trôi chảy',
    category: 'Thông tin sai sự thật',
    severity: 'medium',
    source: 'REPORT',
    status: 'CONFIRMED',
    reporterNote: 'Video khẳng định học 30 ngày chắc chắn nói trôi chảy, không có căn cứ.',
  },
  {
    owner: KV,
    platform: 'facebook',
    daysAgo: 16,
    title: 'Giới thiệu viên uống đẹp da cùng nhãn hàng',
    category: 'Quảng cáo không gắn nhãn',
    severity: 'high',
    source: 'KOL_SAFETY',
    status: 'CONFIRMED',
  },
  {
    owner: KV,
    platform: 'tiktok',
    daysAgo: 27,
    title: 'Hậu trường dẫn chương trình cuối tuần',
    category: 'Vi phạm bản quyền',
    severity: 'low',
    source: 'KOL_SAFETY',
    status: 'APPEALED',
    appealReason: 'Nhạc nền đã được mua bản quyền sử dụng trên thư viện âm thanh của nền tảng, có hoá đơn kèm theo.',
  },
  {
    owner: KV,
    platform: 'youtube',
    daysAgo: 48,
    title: 'Livestream giải đáp thắc mắc thi IELTS',
    category: 'Lộ thông tin cá nhân',
    severity: 'medium',
    source: 'REPORT',
    status: 'RESOLVED',
    reporterNote: 'Khung hình hiện số điện thoại của một bạn học viên.',
    ownerNote: 'Đã cắt đoạn có số điện thoại và đăng lại bản đã chỉnh.',
  },
  // --- Sao Việt Media: 6 over its channels ---
  {
    owner: SV,
    platform: 'tiktok',
    channelUrl: 'tiktok.com/@minhthu.bepnha',
    daysAgo: 1,
    title: 'Nồi chiên không dầu giảm béo thần kỳ',
    category: 'Thông tin sai sự thật',
    severity: 'high',
    source: 'KOL_SAFETY',
    status: 'PENDING_REVIEW',
  },
  {
    owner: SV,
    platform: 'youtube',
    channelUrl: 'youtube.com/@TuanKietVlog',
    daysAgo: 6,
    title: 'Thử thách ăn cay cấp độ 10',
    category: 'Nội dung phản cảm',
    severity: 'medium',
    source: 'REPORT',
    status: 'PENDING_REVIEW',
    reporterNote: 'Có cảnh nôn ói cận cảnh, không có cảnh báo trước.',
  },
  {
    owner: SV,
    platform: 'tiktok',
    channelUrl: 'tiktok.com/@baochau.phoido',
    daysAgo: 12,
    title: 'Phối đồ đi biển cùng thương hiệu áo tắm',
    category: 'Quảng cáo không gắn nhãn',
    severity: 'medium',
    source: 'KOL_SAFETY',
    status: 'CONFIRMED',
  },
  {
    owner: SV,
    platform: 'youtube',
    channelUrl: 'youtube.com/@PhucLamDanhGia',
    daysAgo: 21,
    title: 'Đánh giá thuốc lá điện tử vị trái cây',
    category: 'Sản phẩm cấm quảng cáo',
    severity: 'high',
    source: 'REPORT',
    status: 'APPEALED',
    reporterNote: 'Video giới thiệu và gắn link mua thuốc lá điện tử.',
    appealReason: 'Video là phóng sự cảnh báo tác hại, không có link mua hàng; link trong mô tả là bài báo sức khoẻ.',
  },
  {
    owner: SV,
    platform: 'tiktok',
    channelUrl: 'tiktok.com/@huonggiang.didau',
    daysAgo: 38,
    title: 'Check-in homestay mới mở ở Đà Lạt',
    category: 'Vi phạm bản quyền',
    severity: 'low',
    source: 'KOL_SAFETY',
    status: 'RESOLVED',
    ownerNote: 'Đã thay nhạc nền bằng bản nhạc miễn phí bản quyền.',
  },
  {
    owner: SV,
    platform: 'facebook',
    channelUrl: 'facebook.com/linhdan.trangdiem',
    daysAgo: 63,
    title: 'Trang điểm dự tiệc 5 phút',
    category: 'Nội dung phản cảm',
    severity: 'low',
    source: 'REPORT',
    status: 'DISMISSED',
    reporterNote: 'Trang phục phản cảm.',
    adminReason: 'Trang phục phù hợp bối cảnh, không vi phạm tiêu chuẩn cộng đồng.',
  },
  // --- Other sample KOLs (mostly confirmed / resolved, so Brands see a real table) ---
  {
    owner: kol(4),
    platform: 'youtube',
    daysAgo: 4,
    title: 'Săn vé máy bay 0 đồng chắc chắn thành công',
    category: 'Thông tin sai sự thật',
    severity: 'medium',
    source: 'REPORT',
    status: 'CONFIRMED',
    reporterNote: 'Tiêu đề gây hiểu nhầm về giá vé.',
  },
  {
    owner: kol(5),
    platform: 'tiktok',
    daysAgo: 11,
    title: 'Món ăn đường phố cùng quán mới khai trương',
    category: 'Quảng cáo không gắn nhãn',
    severity: 'medium',
    source: 'KOL_SAFETY',
    status: 'RESOLVED',
    ownerNote: 'Đã thêm nhãn #QuangCao và lời thông báo hợp tác ở đầu video.',
  },
  {
    owner: kol(7),
    platform: 'facebook',
    daysAgo: 19,
    title: 'Mặc thử bộ sưu tập thu đông',
    category: 'Vi phạm bản quyền',
    severity: 'low',
    source: 'KOL_SAFETY',
    status: 'CONFIRMED',
    appealRejected: true,
    appealReason: 'Hình ảnh bộ sưu tập do nhãn hàng cung cấp và cho phép sử dụng.',
    adminReason: 'Nhạc nền vẫn chưa có giấy phép sử dụng; hình ảnh không phải lý do vi phạm.',
  },
  {
    owner: kol(8),
    platform: 'youtube',
    daysAgo: 25,
    title: 'Kem trị mụn hết sau 3 ngày',
    category: 'Thông tin sai sự thật',
    severity: 'high',
    source: 'KOL_SAFETY',
    status: 'CONFIRMED',
  },
  {
    owner: kol(12),
    platform: 'tiktok',
    daysAgo: 33,
    title: 'Mở hộp serum dưỡng trắng',
    category: 'Quảng cáo không gắn nhãn',
    severity: 'medium',
    source: 'REPORT',
    status: 'RESOLVED',
    reporterNote: 'Có mã giảm giá nhưng không ghi là quảng cáo.',
    ownerNote: 'Đã cập nhật mô tả và nhãn quảng cáo.',
  },
  {
    owner: kol(15),
    platform: 'tiktok',
    daysAgo: 41,
    title: 'Đánh giá điện thoại gập mới',
    category: 'Vi phạm bản quyền',
    severity: 'low',
    source: 'REPORT',
    status: 'PENDING_REVIEW',
    reporterNote: 'Sử dụng đoạn phim quảng cáo gốc của hãng dài hơn 1 phút.',
  },
  {
    owner: kol(16),
    platform: 'youtube',
    daysAgo: 55,
    title: 'Chơi game kiếm tiền thật mỗi ngày',
    category: 'Sản phẩm cấm quảng cáo',
    severity: 'high',
    source: 'KOL_SAFETY',
    status: 'CONFIRMED',
  },
  {
    owner: kol(21),
    platform: 'tiktok',
    daysAgo: 70,
    title: 'Thử thách nhịn ăn 3 ngày',
    category: 'Nội dung phản cảm',
    severity: 'medium',
    source: 'REPORT',
    status: 'RESOLVED',
    reporterNote: 'Thử thách nguy hiểm, dễ bị bắt chước.',
    ownerNote: 'Đã gỡ video.',
  },
  {
    owner: kol(24),
    platform: 'facebook',
    daysAgo: 86,
    title: 'Bí quyết dưỡng da của mình',
    category: 'Lộ thông tin cá nhân',
    severity: 'low',
    source: 'KOL_SAFETY',
    status: 'DISMISSED',
    adminReason: 'Thông tin trong khung hình là địa chỉ cửa hàng công khai.',
  },
];

function handleOf(ch: Channel): string {
  const fromUrl = ch.url.replace(/^https?:\/\//, '').split('/')[1] ?? '';
  return (ch.handle || fromUrl).replace(/^@/, '');
}

function historyOf(spec: Spec, at: number, now: number): ViolationEvent[] {
  const t = (d: number) => Math.min(now, at + d * DAY);
  const ev: ViolationEvent[] = [
    spec.source === 'REPORT'
      ? { at, actor: 'system', action: 'REPORTED', ...(spec.reporterNote ? { note: spec.reporterNote } : {}) }
      : { at, actor: 'system', action: 'DETECTED', note: 'KOL Safety phát hiện khi quét kênh' },
  ];
  if (spec.status === 'DISMISSED') {
    ev.push({ at: t(1), actor: 'admin', action: 'DISMISSED', note: spec.adminReason });
    return ev;
  }
  if (spec.status === 'PENDING_REVIEW') return ev;
  ev.push({ at: t(1), actor: 'admin', action: 'CONFIRMED' });
  if (spec.status === 'APPEALED' || spec.appealRejected) {
    ev.push({ at: t(2), actor: 'owner', action: 'APPEALED', note: spec.appealReason });
  }
  if (spec.appealRejected) ev.push({ at: t(4), actor: 'admin', action: 'APPEAL_REJECTED', note: spec.adminReason });
  if (spec.status === 'RESOLVED') ev.push({ at: t(3), actor: 'owner', action: 'RESOLVED', note: spec.ownerNote });
  return ev;
}

export function seedViolations(kolProfiles: KolProfile[], channels: Channel[], now: number): Violation[] {
  const out: Violation[] = [];
  SPECS.forEach((spec, i) => {
    const own = channels.filter((c) => c.ownerId === spec.owner);
    const ch =
      (spec.channelUrl && own.find((c) => c.url === spec.channelUrl)) ||
      own.find((c) => c.platform === spec.platform && c.status === 'VERIFIED') ||
      own.find((c) => c.status === 'VERIFIED') ||
      own[0];
    if (!ch) return;
    const detectedAt = now - spec.daysAgo * DAY - ((i * 5) % 11) * HOUR;
    const history = historyOf(spec, detectedAt, now);
    const profile = kolProfiles.find((p) => p.accountId === spec.owner);
    const v: Violation = {
      id: `vio-seed-${String(i + 1).padStart(2, '0')}`,
      ownerType: ch.ownerType,
      ownerId: spec.owner,
      platform: ch.platform,
      channelHandle: handleOf(ch),
      channelUrl: ch.url.replace(/^https?:\/\//, ''),
      contentTitle: spec.title,
      contentUrl: videoUrl(ch.platform, ch.url, 100 + i),
      thumbnail: IMAGE_POOL[(i * 3) % IMAGE_POOL.length],
      category: spec.category,
      severity: spec.severity,
      source: spec.source,
      detectedAt,
      status: spec.status,
      history,
      updatedAt: history[history.length - 1].at,
    };
    if (profile?.kolId) v.kolId = profile.kolId;
    if (spec.reporterNote) v.reporterNote = spec.reporterNote;
    if (spec.ownerNote) v.ownerNote = spec.ownerNote;
    if (spec.appealReason) v.appealReason = spec.appealReason;
    if (spec.adminReason) v.adminReason = spec.adminReason;
    if (spec.status === 'APPEALED' || spec.appealRejected) v.appealed = true;
    out.push(v);
  });
  return out;
}
