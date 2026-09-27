// KOL Safety demo data for the two verified demo accounts (Khánh Vy KOL, Sao Việt Media MCN).
import type { Channel } from '../profile-types';
import type { SafetyMonitor, SafetyVideo, ScanResult } from '../safety-types';
import { applyScan, isMonitorPlatform, newMonitor } from './safety';
import { IMAGE_POOL } from './socialListening';

const DAY = 86_400_000;
const HOUR = 3_600_000;

export const SAFETY_KOL_ACCOUNT_ID = 'acc-kol-2026-0001';
export const SAFETY_MCN_ACCOUNT_ID = 'acc-mcn-saoviet';

type VideoSpec = Pick<SafetyVideo, 'fileName' | 'sizeBytes' | 'durationSec'> & {
  result: ScanResult;
  hoursAgo: number;
  published?: boolean;
};

/** 1 VIOLATION, 2 SAFE (one with a single note, one published), 1 GRAY. */
const VIDEO_SPECS: VideoSpec[] = [
  {
    fileName: 'review-kem-chong-nang-ban-nhap.mp4',
    sizeBytes: 86_000_000,
    durationSec: 58,
    hoursAgo: 3,
    result: {
      verdict: 'VIOLATION',
      score: 0,
      issues: [
        {
          severity: 'violation',
          title: 'Quảng cáo chưa gắn nhãn #QuangCao theo Luật Quảng cáo',
          detail: 'Video giới thiệu sản phẩm có trả phí nhưng chưa có nhãn #QuangCao hoặc lời thông báo hợp tác ở đầu video.',
          atSec: 2,
        },
        {
          severity: 'violation',
          title: 'Tuyên bố công dụng chưa được kiểm chứng',
          detail: 'Có câu khẳng định sản phẩm "trị dứt điểm" mà không có giấy tờ chứng minh.',
          atSec: 31,
        },
        {
          severity: 'warning',
          title: 'Âm thanh có bản quyền',
          detail: 'Nhạc nền trùng với bản thu có bản quyền; video có thể bị tắt tiếng hoặc hạn chế hiển thị.',
          atSec: 0,
        },
      ],
    },
  },
  {
    fileName: 'thu-thach-cuoi-tuan.mp4',
    sizeBytes: 64_000_000,
    durationSec: 45,
    hoursAgo: 20,
    result: {
      verdict: 'GRAY',
      score: 70,
      issues: [
        {
          severity: 'warning',
          title: 'Thử thách dễ bị bắt chước gây nguy hiểm',
          detail: 'Nên thêm lời cảnh báo an toàn hoặc cắt đoạn thực hiện động tác nguy hiểm.',
          atSec: 18,
        },
      ],
    },
  },
  {
    fileName: 'hau-truong-buoi-quay.mov',
    sizeBytes: 142_000_000,
    durationSec: 94,
    hoursAgo: 30,
    result: {
      verdict: 'SAFE',
      score: 92,
      issues: [{ severity: 'note', title: 'Nên thêm phụ đề', detail: 'Phụ đề giúp người xem hiểu nội dung khi tắt tiếng.' }],
    },
  },
  {
    fileName: 'mot-ngay-cua-minh.mp4',
    sizeBytes: 120_000_000,
    durationSec: 72,
    hoursAgo: 52,
    published: true,
    result: { verdict: 'SAFE', score: 100, issues: [] },
  },
];

function seedVideos(accountId: string, now: number, imageOffset: number): SafetyVideo[] {
  return VIDEO_SPECS.map((v, i) => {
    const uploadedAt = now - v.hoursAgo * HOUR;
    return {
      id: `${accountId}-sv-${i + 1}`,
      accountId,
      fileName: v.fileName,
      sizeBytes: v.sizeBytes,
      durationSec: v.durationSec,
      thumbnail: IMAGE_POOL[(imageOffset + i * 3) % IMAGE_POOL.length],
      status: 'DONE',
      result: v.result,
      uploadedAt,
      checkedAt: uploadedAt + 2 * 60_000,
      ...(v.published ? { publishedAt: uploadedAt + HOUR } : {}),
    };
  });
}

/** Handle (without "@") of a profile channel link, e.g. tiktok.com/@minhthu.bepnha → minhthu.bepnha. */
function handleOf(url: string): string {
  const seg = url.replace(/^https?:\/\//, '').split('/')[1] ?? '';
  return seg.replace(/^@/, '');
}

/** Extra TikTok channels Sao Việt watches (not its verified channels); `scannedDaysAgo` null = never scanned. */
const MCN_EXTRA_TIKTOK: { handle: string; connectedDaysAgo: number; scannedDaysAgo: number | null }[] = [
  { handle: 'ngochan.nhayvui', connectedDaysAgo: 40, scannedDaysAgo: 1 },
  { handle: 'thaovy.chamda', connectedDaysAgo: 20, scannedDaysAgo: 9 },
  { handle: 'bepnha.lamnhanh', connectedDaysAgo: 12, scannedDaysAgo: 26 },
  { handle: 'meovat.moingay', connectedDaysAgo: 2, scannedDaysAgo: null },
];

/** Every verified profile channel of the account, pre-connected and scanned (dates spread out). */
function seedVerifiedMonitors(accountId: string, channels: Channel[], now: number): SafetyMonitor[] {
  const own = channels.filter((c) => c.ownerId === accountId && c.status === 'VERIFIED' && isMonitorPlatform(c.platform));
  return own.map((c, i) => {
    const m = newMonitor(accountId, c.platform, handleOf(c.url), now - (30 + i * 5) * DAY, `${accountId}-mon-${i + 1}`, c.stats?.followers);
    applyScan(m, now - (i % 4) * 3 * DAY - 2 * HOUR);
    return m;
  });
}

export function seedSafety(channels: Channel[], now: number): { safetyVideos: SafetyVideo[]; safetyMonitors: SafetyMonitor[] } {
  const kolMonitors = seedVerifiedMonitors(SAFETY_KOL_ACCOUNT_ID, channels, now);
  const mcnMonitors = seedVerifiedMonitors(SAFETY_MCN_ACCOUNT_ID, channels, now);
  MCN_EXTRA_TIKTOK.forEach((x, i) => {
    const m = newMonitor(SAFETY_MCN_ACCOUNT_ID, 'tiktok', x.handle, now - x.connectedDaysAgo * DAY, `${SAFETY_MCN_ACCOUNT_ID}-mon-x${i + 1}`);
    if (x.scannedDaysAgo !== null) applyScan(m, now - x.scannedDaysAgo * DAY - 5 * HOUR);
    mcnMonitors.push(m);
  });
  return {
    safetyVideos: [...seedVideos(SAFETY_KOL_ACCOUNT_ID, now, 0), ...seedVideos(SAFETY_MCN_ACCOUNT_ID, now, 5)],
    safetyMonitors: [...kolMonitors, ...mcnMonitors],
  };
}
