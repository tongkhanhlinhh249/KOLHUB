import { describe, expect, test } from 'vitest';
import type { Channel, KolProfile } from '../profile-types';
import { channelTotals } from './socialListening';
import {
  channelBadge,
  findPublicKol,
  isLinkKeyword,
  isSearchableChannel,
  listingStatus,
  listPublicKols,
  normalizeText,
  normalizeUrl,
  publicKolOf,
  scaleOf,
  toPublicKol,
} from './directory';
import { emptyKolProfile } from './profileRules';
import { seedState } from './seed';

const NOW = Date.UTC(2026, 8, 27, 3);
const DAY = 86_400_000;

function ch(over: Partial<Channel> = {}): Channel {
  return {
    id: 'c',
    ownerType: 'KOL',
    ownerId: 'acc-1',
    platform: 'tiktok',
    url: 'https://www.tiktok.com/@x/',
    handle: '@x',
    proofImage: { name: 'p.png', type: 'image/png', size: 1 },
    status: 'VERIFIED',
    active: true,
    badgeExpiresAt: NOW + DAY,
    verifiedAt: NOW - DAY,
    stats: { followers: 1000, latestVideos: [], syncedAt: NOW - DAY },
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

function profile(over: Partial<KolProfile> = {}): KolProfile {
  const p = emptyKolProfile({ id: 'acc-1', type: 'KOL', email: 'login@x.vn', phone: '0912345678', createdAt: '' }, 0);
  Object.assign(p.contact, {
    displayName: 'Mai Anh',
    email: 'hoptac@x.vn',
    zalo: '0912345678',
    province: 'Hà Nội',
    address: '1 Tràng Tiền',
    category: 'Giáo dục',
    bio: 'Giới thiệu',
    fields: [
      { name: 'Giáo dục', medal: 'gold' },
      { name: 'MC', medal: 'none' },
    ],
  });
  return { ...p, status: 'APPROVED', kolId: 'KOL-2026-0041', ekycStatus: 'PASSED', approvedAt: NOW - 2 * DAY, ...over };
}

const video = (platform: Channel['platform'], n: number) => ({
  platform,
  thumbnail: `https://img/${n}.jpg`,
  title: `V${n}`,
  publishedAt: new Date(NOW - n * DAY).toISOString(),
});

test('normalizeText bỏ dấu, đ, hoa thường, khoảng trắng', () =>
  expect(normalizeText('  CHÂU   Bùi Đạt ')).toBe('chau bui dat'));

test('normalizeUrl bỏ giao thức, www, query, / cuối', () =>
  expect(normalizeUrl('https://www.TikTok.com/@chaubui/?lang=vi#x')).toBe('tiktok.com/@chaubui'));

test('isLinkKeyword', () => {
  expect(isLinkKeyword('tiktok.com/@a')).toBe(true);
  expect(isLinkKeyword('chau bui')).toBe(false);
});

test('channelBadge: hết hạn đúng thời điểm now là EXPIRED', () => {
  expect(channelBadge(ch({ badgeExpiresAt: NOW }), NOW)).toBe('EXPIRED');
  expect(channelBadge(ch({ badgeExpiresAt: NOW + 1 }), NOW)).toBe('VERIFIED');
  expect(channelBadge(ch({ status: 'PENDING_REVIEW' }), NOW)).toBeNull();
  expect(channelBadge(ch({ status: 'EXPIRED' }), NOW)).toBe('EXPIRED');
});

test('isSearchableChannel: VERIFIED + còn hạn + ACTIVE', () => {
  expect(isSearchableChannel(ch(), NOW)).toBe(true);
  expect(isSearchableChannel(ch({ active: false }), NOW)).toBe(false);
  expect(isSearchableChannel(ch({ badgeExpiresAt: NOW - 1 }), NOW)).toBe(false);
});

test('scaleOf: biên dưới thuộc bậc trên', () => {
  expect(scaleOf(9_999)).toBe('nano');
  expect(scaleOf(10_000)).toBe('micro');
  expect(scaleOf(1_000_000)).toBe('mega');
});

test('listingStatus: VISIBLE / INACTIVE / BADGE_EXPIRED', () => {
  expect(listingStatus([ch(), ch({ active: false })], NOW)).toBe('VISIBLE');
  expect(listingStatus([ch({ active: false })], NOW)).toBe('INACTIVE');
  expect(listingStatus([ch({ badgeExpiresAt: NOW - 1 }), ch({ status: 'EXPIRED' })], NOW)).toBe('BADGE_EXPIRED');
});

describe('toPublicKol / publicKolOf', () => {
  test('chiếu hồ sơ + kênh: bio, fields, followers & video từ Channel.stats; không lộ dữ liệu riêng (BR-58)', () => {
    const channels = [
      ch({ id: 'a', stats: { followers: 3000, latestVideos: [video('tiktok', 3), video('tiktok', 1)], syncedAt: 0 } }),
      ch({ id: 'b', platform: 'youtube', url: 'youtube.com/@x', stats: { followers: 7000, latestVideos: [video('youtube', 2)], syncedAt: 0 } }),
      ch({ id: 'other', ownerId: 'acc-2', stats: { followers: 9_999_999, latestVideos: [], syncedAt: 0 } }),
    ];
    const k = toPublicKol(profile(), channels, NOW)!;
    expect(k).toMatchObject({
      kolId: 'KOL-2026-0041',
      displayName: 'Mai Anh',
      nickname: 'x',
      bio: 'Giới thiệu',
      category: 'Giáo dục',
      region: 'Hà Nội',
      collabEmail: 'hoptac@x.vn',
      verifiedAt: new Date(NOW - 2 * DAY).toISOString(),
      listingStatus: 'VISIBLE',
      totalFollowers: 10_000,
      scale: 'micro',
      platforms: ['tiktok', 'youtube'],
      fields: [
        { name: 'Giáo dục', medal: 'gold' },
        { name: 'MC', medal: 'none' },
      ],
    });
    expect(k.channels[0]).toEqual({
      platform: 'tiktok',
      url: 'tiktok.com/@x',
      handle: '@x',
      followers: 3000,
      ...channelTotals('tiktok.com/@x', 3000),
      latestVideos: [expect.objectContaining({ title: 'V1' }), expect.objectContaining({ title: 'V3' })],
      badge: 'VERIFIED',
      badgeExpiresAt: new Date(NOW + DAY).toISOString(),
    });
    expect(k.latestVideos.map((v) => v.title)).toEqual(['V1', 'V2', 'V3']);
    const json = JSON.stringify(k);
    for (const v of ['0912345678', '1 Tràng Tiền', 'login@x.vn', 'proof', 'p.png']) expect(json).not.toContain(v);
  });

  test('BR-54: null khi không có kênh tìm được; publicKolOf vẫn trả để mở hồ sơ', () => {
    const expired = [ch({ badgeExpiresAt: NOW - 1 })];
    expect(toPublicKol(profile(), expired, NOW)).toBeNull();
    expect(publicKolOf(profile(), expired, NOW)).toMatchObject({ listingStatus: 'BADGE_EXPIRED', totalFollowers: 0, platforms: [] });
    const off = [ch({ active: false })];
    expect(toPublicKol(profile(), off, NOW)).toBeNull();
    expect(publicKolOf(profile(), off, NOW)).toMatchObject({ listingStatus: 'INACTIVE', channels: [] });
  });

  test('null khi hồ sơ chưa APPROVED / chưa có KOL ID / chưa từng có kênh được duyệt', () => {
    expect(publicKolOf(profile({ status: 'NEEDS_FIX' }), [ch()], NOW)).toBeNull();
    expect(publicKolOf(profile({ kolId: undefined }), [ch()], NOW)).toBeNull();
    expect(publicKolOf(profile(), [ch({ status: 'PENDING_REVIEW' })], NOW)).toBeNull();
    expect(publicKolOf(profile(), [], NOW)).toBeNull();
  });

  test('không có fields → dùng category; category ngoài danh mục → bỏ; email rỗng → null', () => {
    const p = profile();
    p.contact.fields = undefined;
    expect(toPublicKol(p, [ch()], NOW)!.fields).toEqual([{ name: 'Giáo dục', medal: 'none' }]);
    Object.assign(p.contact, { category: 'Không rõ', province: 'Huế', email: ' ' });
    const k = toPublicKol(p, [ch()], NOW)!;
    expect(k.fields).toEqual([]);
    expect(k).not.toHaveProperty('category');
    expect(k).not.toHaveProperty('region');
    expect(k.collabEmail).toBeNull();
  });

  test('seed: 40 KOL công khai, 35 tìm được, Khánh Vy là KOL-2026-0001', () => {
    const s = seedState();
    const t = Date.now();
    expect(listPublicKols(s, t)).toHaveLength(40);
    expect(s.kolProfiles.filter((p) => toPublicKol(p, s.channels, t))).toHaveLength(35);
    expect(findPublicKol(s, 'KOL-2026-0001', t)).toMatchObject({ displayName: 'Khánh Vy', nickname: 'khanhvy' });
    expect(findPublicKol(s, 'KOL-2026-9999', t)).toBeNull();
  });
});
