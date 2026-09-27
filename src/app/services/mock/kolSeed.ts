// Sample KOLs as fully registered, approved KOL accounts (profile + identity + verified channels with stats).
import { creators } from '../../data/creators';
import type { ActivityField, FieldMedal, KolCategory, KolRegion, LatestVideo, Platform, SavedList } from '../bizTypes';
import type { Channel, IdentityRecord, KolProfile, StoredFile } from '../profile-types';
import type { StoredAccount } from './db';
import { channelBadge, normalizeText } from './directory';
import { maskIdNo, normalizeName } from './profileRules';
import { IMAGE_POOL, VIDEO_TITLES, videoUrl } from './socialListening';

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const pad = (n: number, w: number) => String(n).padStart(w, '0');

export const SEED_KOL_COUNT = 40;
/** Login of the approved sample KOL "Khánh Vy" (KOL-2026-0001). */
export const VERIFIED_KOL_EMAIL = 'khanhvy@demo.kolhub.vn';

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

/** Secondary "Lĩnh vực hoạt động" of generated KOLs, by primary category. */
const SECONDARY_FIELDS: Partial<Record<KolCategory, [string, string]>> = {
  Lifestyle: ['Vlog', 'Review'],
  'Làm đẹp': ['Skincare', 'Makeup'],
  'Du lịch': ['Phượt', 'Ẩm thực'],
  'Ẩm thực': ['Nấu ăn', 'Food Review'],
  'Công nghệ': ['Review', 'Điện thoại'],
  Gaming: ['Esports', 'Livestream'],
  'Thể thao': ['Fitness', 'Sức khỏe'],
  'Giải trí': ['Hài hước', 'Âm nhạc'],
  'Giáo dục': ['Tiếng Anh', 'Kỹ năng'],
  'Thời trang': ['Phối đồ', 'Lifestyle'],
};

function toMedal(m: string | undefined): FieldMedal {
  return m === 'gold' || m === 'silver' ? m : 'none';
}

/** 1–3 fields; the first is always the primary category (used by filters). */
function buildFields(category: KolCategory, rest: { name: string; medal?: string }[], primaryMedal: FieldMedal): ActivityField[] {
  const out: ActivityField[] = [{ name: category, medal: primaryMedal }];
  const seen = new Set([normalizeText(category)]);
  for (const f of rest) {
    if (out.length >= 3) break;
    const key = normalizeText(f.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: f.name, medal: toMedal(f.medal) });
  }
  return out;
}

function channelUrl(platform: Platform, nick: string): string {
  if (platform === 'facebook') return `facebook.com/${nick}`;
  if (platform === 'youtube') return `youtube.com/@${nick}`;
  return `tiktok.com/@${nick}`;
}

/** Newest-first videos, rotated over the KOL's verified + active channels only (never Instagram, BR-20). */
function assignVideos(images: string[], channels: Channel[], now: number, seed: number): void {
  const ok = channels.filter((c) => c.active && channelBadge(c, now) === 'VERIFIED');
  if (ok.length === 0) return;
  images.forEach((thumbnail, n) => {
    const ch = ok[n % ok.length];
    const video: LatestVideo = {
      platform: ch.platform,
      thumbnail,
      url: videoUrl(ch.platform, ch.url, n + 1),
      title: VIDEO_TITLES[(seed + n) % VIDEO_TITLES.length],
      publishedAt: iso(now - (n * 3 + 1 + (seed % 3)) * DAY),
    };
    ch.stats!.latestVideos.push(video);
  });
}

const PROOF: StoredFile = { name: 'anh-kenh.png', type: 'image/png', size: 120_000 };

export interface SeededKols {
  accounts: StoredAccount[];
  kolProfiles: KolProfile[];
  identities: IdentityRecord[];
  channels: Channel[];
}

/**
 * 40 approved sample KOLs (KOL-2026-0001…0040), 35 searchable: 0036–0037 have every channel
 * turned off (INACTIVE), 0038–0039 have EXPIRED channels, 0040's badges expired by date.
 * 0002 has an EXPIRED Facebook channel and 0003 an inactive TikTok channel.
 */
export function seedKols(now: number, password: string): SeededKols {
  const out: SeededKols = { accounts: [], kolProfiles: [], identities: [], channels: [] };

  for (let i = 1; i <= SEED_KOL_COUNT; i++) {
    const kolId = 'KOL-2026-' + pad(i, 4);
    const accountId = 'acc-kol-2026-' + pad(i, 4);
    let verifiedMs = now - (((i * 7) % 40) + 1) * DAY;
    let displayName: string;
    let nickname: string;
    let bio: string;
    let avatar: string | undefined;
    let category: KolCategory;
    let region: KolRegion;
    let fields: ActivityField[];
    let images: string[];
    let specs: { platform: Platform; url: string; followers: number }[];

    if (i <= 10) {
      const c = creators[i - 1];
      displayName = c.name;
      nickname = c.nickname;
      bio = c.bio;
      avatar = c.profileImage;
      category = CREATOR_CATEGORIES[i - 1];
      region = c.location as KolRegion;
      const cats = c.categories as { name: string; medal: string }[];
      fields = buildFields(category, cats.slice(1), toMedal(cats[0]?.medal));
      // Own content images first, then two from the shared pool for a fuller "Video mới nhất" grid.
      const own = c.contentImages as string[];
      images = [...own, ...IMAGE_POOL.filter((u) => !own.includes(u)).slice(i % 5, (i % 5) + 2)];
      const links = c.socialLinks as Record<string, string>;
      specs = c.stats
        .filter((s) => s.platform !== 'instagram')
        .map((s) => ({ platform: s.platform as Platform, url: links[s.platform], followers: parseFollowers(s.followers) }));
    } else {
      const j = i - 11;
      const [name, cat, reg] = GENERATED[j];
      displayName = name;
      nickname = normalizeText(name).replace(/\s+/g, '');
      bio = `${cat} · ${reg}`;
      category = cat;
      region = reg;
      const base = BASES[j % 6];
      const extra = (SECONDARY_FIELDS[cat] ?? []).slice(0, j % 3).map((n, k) => ({ name: n, medal: k === 0 ? 'silver' : 'none' }));
      fields = buildFields(cat, extra, j % 6 >= 4 ? 'gold' : j % 6 >= 2 ? 'silver' : 'none');
      const count = [3, 2, 0, 4, 6][j % 5];
      images = Array.from({ length: count }, (_, n) => IMAGE_POOL[(j * 3 + n) % IMAGE_POOL.length]);
      specs = PLATFORM_SETS[j % 4].map((platform, k) => ({
        platform,
        url: channelUrl(platform, nickname),
        followers: Math.round(base * SHARES[k]),
      }));
    }

    if (i === 38 || i === 39) verifiedMs = now - 400 * DAY;
    if (i === 40) verifiedMs = now - 366 * DAY;

    const channels: Channel[] = specs.map((s) => ({
      id: `${kolId}-${s.platform}`,
      ownerType: 'KOL',
      ownerId: accountId,
      platform: s.platform,
      url: s.url,
      handle: '@' + nickname,
      proofImage: PROOF,
      status: 'VERIFIED',
      active: true,
      verifiedAt: verifiedMs,
      badgeExpiresAt: verifiedMs + 365 * DAY,
      stats: { followers: s.followers, latestVideos: [], syncedAt: verifiedMs },
      createdAt: verifiedMs - 3 * DAY,
      updatedAt: verifiedMs,
    }));

    // Exceptions that exercise BR-54 / BR-62.
    if (i === 2) {
      for (const ch of channels.filter((c) => c.platform === 'facebook')) {
        ch.status = 'EXPIRED';
        ch.badgeExpiresAt = now - 20 * DAY;
      }
    }
    if (i === 3) for (const ch of channels.filter((c) => c.platform === 'tiktok')) ch.active = false;
    if (i === 36 || i === 37) for (const ch of channels) ch.active = false;
    if (i === 38 || i === 39) {
      for (const ch of channels) {
        ch.status = 'EXPIRED';
        ch.badgeExpiresAt = now - 35 * DAY;
      }
    }
    if (i === 40) for (const ch of channels) ch.badgeExpiresAt = now - DAY; // still VERIFIED, expired by date
    assignVideos(images, channels, now, i);

    const phone = '0909' + pad(i, 6);
    const createdMs = verifiedMs - 7 * DAY;
    out.accounts.push({
      id: accountId,
      type: 'KOL',
      email: i === 1 ? VERIFIED_KOL_EMAIL : `${nickname}@kol.demo.kolhub.vn`,
      phone,
      createdAt: iso(createdMs),
      password,
    });
    out.kolProfiles.push({
      accountId,
      ownerType: 'KOL',
      kolId,
      ekycStatus: 'PASSED',
      status: 'APPROVED',
      contact: {
        displayName,
        phone,
        email: `hoptac.${nickname}@kolhub-demo.vn`,
        zalo: phone,
        country: 'Việt Nam',
        province: region,
        address: `Số ${i} Đường Demo, ${region}`,
        category,
        bio,
        fields,
      },
      staff: {
        staffName: `Quản lý ${displayName}`,
        staffPhone: '0908' + pad(i, 6),
        staffEmail: `quanly.${nickname}@kolhub-demo.vn`,
      },
      ...(avatar ? { avatar: { name: `${nickname}.jpg`, type: 'image/jpeg', size: 0, thumbnail: avatar } } : {}),
      submittedAt: verifiedMs - 2 * DAY,
      decidedAt: verifiedMs,
      approvedAt: verifiedMs,
      createdAt: createdMs,
      updatedAt: verifiedMs,
    });
    out.identities.push({
      accountId,
      fullName: normalizeName(displayName),
      dob: `${pad((i % 28) + 1, 2)}/0${(i % 9) + 1}/199${i % 10}`,
      idNoMasked: maskIdNo('0010960000' + pad(i, 2)),
      issueDate: '10/08/2021',
      ekycSessionId: `ekyc-seed-${pad(i, 4)}`,
      verifiedAt: createdMs + DAY,
    });
    out.channels.push(...channels);
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
      items: [item('KOL-2026-0001', 4, 'Ưu tiên liên hệ tháng 11'), item('KOL-2026-0005', 3), item('KOL-2026-0038', 2)],
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
