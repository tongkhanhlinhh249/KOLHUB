import { creators } from '../../data/creators';
import type {
  DirectoryChannel,
  DirectoryKol,
  KolCategory,
  KolRegion,
  Platform,
  SavedList,
} from '../bizTypes';
import type { StoredAccount } from './db';
import { normalizeText } from './directory';

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const pad = (n: number, w: number) => String(n).padStart(w, '0');

/** "1.2M" → 1 200 000, "890K" → 890 000, "4500" → 4 500. */
export function parseFollowers(s: string): number {
  const m = /^\s*([\d.,]+)\s*([KkMm]?)\s*$/.exec(s ?? '');
  if (!m) return 0;
  const n = parseFloat(m[1].replace(',', '.'));
  const mult = m[2].toUpperCase() === 'M' ? 1_000_000 : m[2].toUpperCase() === 'K' ? 1_000 : 1;
  return Math.round(n * mult);
}

const CREATOR_CATEGORIES: KolCategory[] = [
  'Giáo dục',
  'Lifestyle',
  'Du lịch',
  'Du lịch',
  'Ẩm thực',
  'Thời trang',
  'Thời trang',
  'Làm đẹp',
  'Lifestyle',
  'Làm đẹp',
];

const GENERATED: [string, KolCategory, KolRegion][] = [
  ['An Nhiên Review', 'Lifestyle', 'Hà Nội'],
  ['Bảo Ngọc Beauty', 'Làm đẹp', 'TP. Hồ Chí Minh'],
  ['Cường Đi Phượt', 'Du lịch', 'Đà Nẵng'],
  ['Diệu Linh Cooking', 'Ẩm thực', 'Hà Nội'],
  ['Đức Anh Tech', 'Công nghệ', 'Hà Nội'],
  ['Gia Huy Gaming', 'Gaming', 'TP. Hồ Chí Minh'],
  ['Hải Yến Fitness', 'Thể thao', 'Đà Nẵng'],
  ['Hoàng Nam Comedy', 'Giải trí', 'Hải Phòng'],
  ['Khánh Linh Study', 'Giáo dục', 'Cần Thơ'],
  ['Lan Chi Lifestyle', 'Lifestyle', 'TP. Hồ Chí Minh'],
  ['Mai Anh Fashion', 'Thời trang', 'Hà Nội'],
  ['Minh Khôi Tech', 'Công nghệ', 'TP. Hồ Chí Minh'],
  ['Ngọc Trâm Makeup', 'Làm đẹp', 'Hải Phòng'],
  ['Nhật Minh Travel', 'Du lịch', 'Cần Thơ'],
  ['Phương Thảo Bếp Nhà', 'Ẩm thực', 'TP. Hồ Chí Minh'],
  ['Quang Huy Esports', 'Gaming', 'Hà Nội'],
  ['Quỳnh Như Yoga', 'Thể thao', 'TP. Hồ Chí Minh'],
  ['Sơn Lâm Hài', 'Giải trí', 'Hà Nội'],
  ['Thanh Hằng Mẹ Bỉm', 'Lifestyle', 'Hải Phòng'],
  ['Thành Đạt English', 'Giáo dục', 'Hà Nội'],
  ['Thu Trang Style', 'Thời trang', 'Đà Nẵng'],
  ['Tiến Dũng Review', 'Công nghệ', 'Cần Thơ'],
  ['Trà My Skincare', 'Làm đẹp', 'Hà Nội'],
  ['Trung Kiên Food', 'Ẩm thực', 'Đà Nẵng'],
  ['Tú Anh Dance', 'Giải trí', 'TP. Hồ Chí Minh'],
  ['Vân Anh Books', 'Giáo dục', 'TP. Hồ Chí Minh'],
  ['Việt Hoàng Camping', 'Du lịch', 'Hà Nội'],
  ['Xuân Mai Kids', 'Giải trí', 'Đà Nẵng'],
  ['Yến Nhi Vlog', 'Lifestyle', 'Cần Thơ'],
  ['Hữu Phước Chạy Bộ', 'Thể thao', 'Hải Phòng'],
];

const BASES = [4_500, 38_000, 72_000, 260_000, 640_000, 1_900_000];
const PLATFORM_SETS: Platform[][] = [['tiktok'], ['facebook', 'tiktok'], ['youtube'], ['facebook', 'youtube', 'tiktok']];
const SHARES = [1, 0.6, 0.3];

function channelUrl(platform: Platform, nick: string): string {
  if (platform === 'facebook') return `facebook.com/${nick}`;
  if (platform === 'youtube') return `youtube.com/@${nick}`;
  return `tiktok.com/@${nick}`;
}

/** Sample KOL directory: 40 KOLs, 35 searchable (see plan Task 1 Step 4). */
export function seedDirectory(now: number): DirectoryKol[] {
  const out: DirectoryKol[] = [];

  for (let i = 1; i <= 40; i++) {
    const kolId = 'KOL-2026-' + pad(i, 4);
    const verifiedMs = now - (((i * 7) % 40) + 1) * DAY;
    let displayName: string;
    let nickname: string;
    let bio: string;
    let avatar: string | undefined;
    let category: KolCategory;
    let region: KolRegion;
    let bookingPrice: string | undefined;
    let specs: { platform: Platform; url: string; followers: number }[];

    if (i <= 10) {
      const c = creators[i - 1];
      displayName = c.name;
      nickname = c.nickname;
      bio = c.bio;
      avatar = c.profileImage;
      category = CREATOR_CATEGORIES[i - 1];
      region = c.location as KolRegion;
      bookingPrice = c.averageBookingPrice;
      const links = c.socialLinks as Record<string, string>;
      specs = c.stats
        .filter((s) => s.platform !== 'instagram')
        .map((s) => ({
          platform: s.platform as Platform,
          url: links[s.platform],
          followers: parseFollowers(s.followers),
        }));
    } else {
      const j = i - 11;
      const [name, cat, reg] = GENERATED[j];
      displayName = name;
      nickname = normalizeText(name).replace(/\s+/g, '');
      bio = `${cat} · ${reg}`;
      category = cat;
      region = reg;
      const base = BASES[j % 6];
      specs = PLATFORM_SETS[j % 4].map((platform, k) => ({
        platform,
        url: channelUrl(platform, nickname),
        followers: Math.round(base * SHARES[k]),
      }));
    }

    let kolVerifiedAt = iso(verifiedMs);
    const channels: DirectoryChannel[] = specs.map((s) => ({
      id: `${kolId}-${s.platform}`,
      platform: s.platform,
      url: s.url,
      handle: '@' + nickname,
      followers: s.followers,
      status: 'VERIFIED',
      active: true,
      badgeExpiresAt: iso(verifiedMs + 365 * DAY),
      verifiedAt: kolVerifiedAt,
    }));

    // Exceptions that exercise BR-54 / BR-62.
    if (i === 2) {
      for (const ch of channels.filter((c) => c.platform === 'facebook')) {
        ch.status = 'EXPIRED';
        ch.badgeExpiresAt = iso(now - 20 * DAY);
      }
    }
    if (i === 3) {
      for (const ch of channels.filter((c) => c.platform === 'tiktok')) ch.active = false;
    }
    if (i === 36 || i === 37) {
      for (const ch of channels) ch.active = false;
    }
    if (i === 38 || i === 39) {
      kolVerifiedAt = iso(now - 400 * DAY);
      for (const ch of channels) {
        ch.status = 'EXPIRED';
        ch.verifiedAt = kolVerifiedAt;
        ch.badgeExpiresAt = iso(now - 35 * DAY);
      }
    }
    if (i === 40) {
      kolVerifiedAt = iso(now - 366 * DAY);
      for (const ch of channels) {
        ch.status = 'VERIFIED';
        ch.verifiedAt = kolVerifiedAt;
        ch.badgeExpiresAt = iso(now - DAY);
      }
    }

    const phone = '0909' + pad(i, 6);
    out.push({
      kolId,
      displayName,
      nickname,
      ...(avatar ? { avatar } : {}),
      bio,
      category,
      region,
      collabEmail: `hoptac.${nickname}@kolhub-demo.vn`,
      verifiedAt: kolVerifiedAt,
      channels,
      private: {
        phone,
        address: `Số ${i} Đường Demo, ${region}`,
        zalo: phone,
        idNoMasked: '0010******' + pad(i, 2),
        violations: 0,
        bookingPrice: bookingPrice ?? '50,000,000 VNĐ',
      },
    });
  }
  return out;
}

/** Two sample lists owned by brand@vinamilk-demo.vn. */
export function seedSavedLists(accounts: StoredAccount[], now: number): SavedList[] {
  const brand = accounts.find((a) => a.email === 'brand@vinamilk-demo.vn');
  if (!brand) return [];
  const item = (kolId: string, daysAgo: number, note = '') => ({ kolId, note, addedAt: iso(now - daysAgo * DAY) });
  return [
    {
      id: 'list-seed-1',
      accountId: brand.id,
      name: 'Chiến dịch Tết 2027',
      createdAt: iso(now - 10 * DAY),
      updatedAt: iso(now - 2 * DAY),
      items: [
        item('KOL-2026-0001', 4, 'Ưu tiên liên hệ tháng 11'),
        item('KOL-2026-0005', 3),
        item('KOL-2026-0038', 2),
      ],
    },
    {
      id: 'list-seed-2',
      accountId: brand.id,
      name: 'KOL ẩm thực',
      createdAt: iso(now - 8 * DAY),
      updatedAt: iso(now - 1 * DAY),
      items: [item('KOL-2026-0005', 5), item('KOL-2026-0036', 1)],
    },
  ];
}
