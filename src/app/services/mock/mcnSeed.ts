// Approved sample MCN "Sao Việt Media" (quick-login "Tổ chức/MCN (đã xác thực)") with the channels it manages.
import { addMonths } from 'date-fns';
import type { Channel, McnProfile, Platform, StoredFile } from '../profile-types';
import type { StoredAccount } from './db';
import { channelHandle } from './channelRules';
import { syncChannelStats } from './socialListening';

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

/** Login of the approved sample MCN. */
export const VERIFIED_MCN_EMAIL = 'saoviet@demo.kolhub.vn';
/** Seed-style id (like KOL-2026-xxxx), so review.ts keeps issuing MCN900001… for newly approved MCNs. */
export const VERIFIED_MCN_ID = 'MCN-2026-0001';
export const VERIFIED_MCN_ACCOUNT_ID = 'acc-mcn-saoviet';
const ACCOUNT_ID = VERIFIED_MCN_ACCOUNT_ID;
const PHONE = '0912000003';

const PROOF: StoredFile = { name: 'anh-quan-ly-kenh.png', type: 'image/png', size: 145_000 };
const GCN: StoredFile = { name: 'giay-chung-nhan-dkdn-sao-viet.pdf', type: 'application/pdf', size: 820_000 };

type Spec = {
  platform: Platform;
  url: string;
  /** Days before now the channel was declared. */
  addedDaysAgo: number;
} & (
  | { kind: 'verified'; verifiedDaysAgo: number; active?: false }
  | { kind: 'expired'; verifiedDaysAgo: number }
  | { kind: 'pending' }
  | { kind: 'needs_fix'; note: string; reviewedDaysAgo: number }
);

/**
 * 12 channels (FB / YouTube / TikTok only): 6 VERIFIED (one expiring within 30 days, one turned off),
 * 2 EXPIRED, 2 PENDING_REVIEW added after approval, 2 NEEDS_FIX with a reason.
 * Handles are distinct from the 40 sample KOLs' links (BR-22).
 */
const SPECS: Spec[] = [
  { platform: 'tiktok', url: 'tiktok.com/@minhthu.bepnha', addedDaysAgo: 33, kind: 'verified', verifiedDaysAgo: 30 },
  { platform: 'youtube', url: 'youtube.com/@TuanKietVlog', addedDaysAgo: 64, kind: 'verified', verifiedDaysAgo: 60 },
  { platform: 'facebook', url: 'facebook.com/linhdan.trangdiem', addedDaysAgo: 95, kind: 'verified', verifiedDaysAgo: 90, active: false },
  { platform: 'tiktok', url: 'tiktok.com/@baochau.phoido', addedDaysAgo: 154, kind: 'verified', verifiedDaysAgo: 150 },
  { platform: 'youtube', url: 'youtube.com/@PhucLamDanhGia', addedDaysAgo: 204, kind: 'verified', verifiedDaysAgo: 200 },
  // Badge expires in ~20 days.
  { platform: 'tiktok', url: 'tiktok.com/@huonggiang.didau', addedDaysAgo: 349, kind: 'verified', verifiedDaysAgo: 345 },
  { platform: 'facebook', url: 'facebook.com/quocbao.vlogsaigon', addedDaysAgo: 410, kind: 'expired', verifiedDaysAgo: 405 },
  { platform: 'tiktok', url: 'tiktok.com/@ngochan.nhayvui', addedDaysAgo: 390, kind: 'expired', verifiedDaysAgo: 385 },
  { platform: 'youtube', url: 'youtube.com/@DangKhoaChoiGame', addedDaysAgo: 2, kind: 'pending' },
  { platform: 'tiktok', url: 'tiktok.com/@thaovy.chamda', addedDaysAgo: 1, kind: 'pending' },
  {
    platform: 'facebook',
    url: 'facebook.com/anhthu.meovatnhabep',
    addedDaysAgo: 7,
    kind: 'needs_fix',
    note: 'Ảnh chụp không thấy tên kênh ở trang quản trị',
    reviewedDaysAgo: 5,
  },
  {
    platform: 'youtube',
    url: 'youtube.com/@HuuTaiCongNghe',
    addedDaysAgo: 12,
    kind: 'needs_fix',
    note: 'Ảnh quản lý kênh đã quá cũ, vui lòng chụp lại',
    reviewedDaysAgo: 9,
  },
];

export interface SeededMcn {
  account: StoredAccount;
  profile: McnProfile;
  channels: Channel[];
}

/** The approved MCN account (approved ~14 months ago), its full profile and 12 managed channels. */
export function seedVerifiedMcn(now: number, password: string): SeededMcn {
  const createdMs = now - 430 * DAY;
  const submittedMs = now - 425 * DAY;
  const approvedMs = now - 423 * DAY;

  const channels: Channel[] = SPECS.map((s, i) => {
    const createdAt = now - s.addedDaysAgo * DAY;
    const base: Channel = {
      id: `${VERIFIED_MCN_ID}-ch-${String(i + 1).padStart(2, '0')}`,
      ownerType: 'MCN',
      ownerId: ACCOUNT_ID,
      platform: s.platform,
      url: s.url,
      handle: channelHandle(s.url),
      proofImage: PROOF,
      status: 'PENDING_REVIEW',
      active: true,
      createdAt,
      updatedAt: createdAt,
    };
    if (s.kind === 'verified' || s.kind === 'expired') {
      const verifiedAt = now - s.verifiedDaysAgo * DAY;
      base.status = s.kind === 'verified' ? 'VERIFIED' : 'EXPIRED';
      base.verifiedAt = verifiedAt;
      const expiresAt = addMonths(verifiedAt, 12).getTime();
      base.badgeExpiresAt = expiresAt;
      // Expired channels keep the stats of their last sync (when the badge ran out).
      base.stats = syncChannelStats(base, s.kind === 'verified' ? now : expiresAt);
      base.updatedAt = verifiedAt;
      if (s.kind === 'verified' && s.active === false) {
        base.active = false;
        base.updatedAt = now - 10 * DAY;
      }
    } else if (s.kind === 'needs_fix') {
      base.status = 'NEEDS_FIX';
      base.note = s.note;
      base.updatedAt = now - s.reviewedDaysAgo * DAY;
    }
    return base;
  });

  const account: StoredAccount = {
    id: ACCOUNT_ID,
    type: 'MCN',
    email: VERIFIED_MCN_EMAIL,
    phone: PHONE,
    createdAt: iso(createdMs),
    password,
  };

  const profile: McnProfile = {
    accountId: ACCOUNT_ID,
    ownerType: 'MCN',
    mcnId: VERIFIED_MCN_ID,
    status: 'APPROVED',
    org: {
      orgName: 'Công ty TNHH Truyền thông Sao Việt Media',
      regNo: '0316789452',
      regDate: '2019-03-15',
      regBy: 'Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh',
      legalRep: 'Lê Hoàng Phúc',
    },
    gcnFile: GCN,
    contact: {
      displayName: 'Sao Việt Media',
      phone: PHONE,
      email: 'hoptac@saovietmedia-demo.vn',
      zalo: PHONE,
      country: 'Việt Nam',
      province: 'TP. Hồ Chí Minh',
      address: '152 Điện Biên Phủ, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh',
      category: 'Giải trí',
      bio: 'Mạng lưới nhà sáng tạo nội dung giải trí, ẩm thực và làm đẹp tại TP. Hồ Chí Minh. Đồng hành cùng nhãn hàng từ lên ý tưởng đến báo cáo hiệu quả.',
      fields: [
        { name: 'Giải trí', medal: 'none' },
        { name: 'Ẩm thực', medal: 'none' },
        { name: 'Làm đẹp', medal: 'none' },
      ],
    },
    staff: {
      staffName: 'Nguyễn Thảo Nguyên',
      staffPhone: '0908123456',
      staffEmail: 'thaonguyen@saovietmedia-demo.vn',
    },
    submittedAt: submittedMs,
    decidedAt: approvedMs,
    approvedAt: approvedMs,
    createdAt: createdMs,
    updatedAt: approvedMs,
  };

  return { account, profile, channels };
}
