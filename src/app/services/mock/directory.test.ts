import { describe, expect, test } from 'vitest';
import type { DirectoryChannel, DirectoryKol } from '../bizTypes';
import type { ApprovedKolSummary } from '../profile-types';
import { createSearchService } from './search';
import { bizState, fixtureDirectory } from './testing/bizFixtures';
import {
  approvedDirectoryKols,
  channelBadge,
  fromApprovedSummary,
  isLinkKeyword,
  isSearchableChannel,
  listingStatus,
  normalizeText,
  normalizeUrl,
  readDirectory,
  scaleOf,
  totalFollowers,
} from './directory';
import { seedState } from './seed';

const NOW = Date.UTC(2026, 8, 27, 3);
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

function ch(over: Partial<DirectoryChannel> = {}): DirectoryChannel {
  return {
    id: 'c',
    platform: 'tiktok',
    url: 'tiktok.com/@x',
    handle: '@x',
    followers: 1000,
    status: 'VERIFIED',
    active: true,
    badgeExpiresAt: iso(NOW + DAY),
    verifiedAt: iso(NOW - DAY),
    ...over,
  };
}

function kol(kolId: string, channels: DirectoryChannel[]): DirectoryKol {
  return { kolId, displayName: kolId, nickname: '', bio: '', collabEmail: null, verifiedAt: iso(NOW), channels };
}

test('normalizeText bỏ dấu, đ, hoa thường, khoảng trắng', () =>
  expect(normalizeText('  CHÂU   Bùi Đạt ')).toBe('chau bui dat'));

test('normalizeUrl bỏ giao thức, www, query, / cuối', () =>
  expect(normalizeUrl('https://www.TikTok.com/@chaubui/?lang=vi#x')).toBe('tiktok.com/@chaubui'));

test('isLinkKeyword', () => {
  expect(isLinkKeyword('tiktok.com/@a')).toBe(true);
  expect(isLinkKeyword('chau bui')).toBe(false);
});

test('channelBadge: hết hạn đúng thời điểm now là EXPIRED', () => {
  expect(channelBadge(ch({ status: 'VERIFIED', badgeExpiresAt: iso(NOW) }), NOW)).toBe('EXPIRED');
  expect(channelBadge(ch({ status: 'VERIFIED', badgeExpiresAt: iso(NOW + 1) }), NOW)).toBe('VERIFIED');
  expect(channelBadge(ch({ status: 'PENDING_REVIEW' }), NOW)).toBeNull();
  expect(channelBadge(ch({ status: 'EXPIRED' }), NOW)).toBe('EXPIRED');
});

test('kênh VERIFIED nhưng INACTIVE không tìm được', () =>
  expect(isSearchableChannel(ch({ status: 'VERIFIED', active: false, badgeExpiresAt: iso(NOW + DAY) }), NOW)).toBe(false));

test.each([
  [9_999, 'nano'],
  [10_000, 'micro'],
  [99_999, 'micro'],
  [100_000, 'mid'],
  [500_000, 'macro'],
  [1_000_000, 'mega'],
])('scaleOf(%i) = %s', (n, s) => expect(scaleOf(n)).toBe(s));

test('totalFollowers chỉ tính kênh tìm được', () =>
  expect(totalFollowers(kol('K', [ch({ followers: 5 }), ch({ followers: 7, active: false })]), NOW)).toBe(5));

test('listingStatus: VISIBLE / INACTIVE / BADGE_EXPIRED', () => {
  expect(listingStatus(kol('A', [ch(), ch({ active: false })]), NOW)).toBe('VISIBLE');
  expect(listingStatus(kol('B', [ch({ active: false })]), NOW)).toBe('INACTIVE');
  expect(listingStatus(kol('C', [ch({ badgeExpiresAt: iso(NOW - 1) }), ch({ status: 'EXPIRED' })]), NOW)).toBe(
    'BADGE_EXPIRED',
  );
});

describe('readDirectory + fromApprovedSummary (phase 2 hook)', () => {
  const summary: ApprovedKolSummary = {
    kolId: 'KOL-P2-0001',
    displayName: 'KOL Đợt Hai',
    category: 'Ẩm thực',
    region: 'Miền Tây',
    collabEmail: 'doihai@example.vn',
    channels: [
      { platform: 'youtube', url: 'https://www.youtube.com/@doihai', followers: 12_000, badgeExpiresAt: iso(NOW + 300 * DAY) },
      { platform: 'tiktok', url: 'tiktok.com/@doihai2/', badgeExpiresAt: iso(NOW - DAY) },
    ],
    verifiedAt: iso(NOW - DAY),
  };

  test('fromApprovedSummary ánh xạ đúng; khu vực ngoài danh mục bị bỏ; có email hợp tác, không private', () => {
    const k = fromApprovedSummary(summary);
    expect(k).toMatchObject({
      kolId: 'KOL-P2-0001',
      displayName: 'KOL Đợt Hai',
      nickname: 'doihai',
      bio: '',
      category: 'Ẩm thực',
      collabEmail: 'doihai@example.vn',
      verifiedAt: iso(NOW - DAY),
    });
    expect(k).not.toHaveProperty('region');
    expect(k).not.toHaveProperty('private');
    expect(k.channels[0]).toEqual({
      id: 'KOL-P2-0001-youtube-0',
      platform: 'youtube',
      url: 'youtube.com/@doihai',
      handle: '@doihai',
      followers: 12_000,
      status: 'VERIFIED',
      active: true,
      badgeExpiresAt: iso(NOW + 300 * DAY),
      verifiedAt: iso(NOW - DAY),
    });
    expect(k.channels[1]).toMatchObject({ url: 'tiktok.com/@doihai2', followers: 0 });
  });

  test('kênh hết hạn theo badgeExpiresAt → không tìm được; KOL vẫn VISIBLE nhờ kênh còn hạn', () => {
    const k = fromApprovedSummary(summary);
    expect(isSearchableChannel(k.channels[1], NOW)).toBe(false);
    expect(listingStatus(k, NOW)).toBe('VISIBLE');
    expect(scaleOf(totalFollowers(k, NOW))).toBe('micro');
  });

  test('không có email hợp tác → collabEmail null', () => {
    const { collabEmail: _omit, ...noEmail } = summary;
    expect(fromApprovedSummary(noEmail).collabEmail).toBeNull();
  });

  test('hook Đợt 2 chưa nối → không thêm KOL', () => expect(approvedDirectoryKols(seedState())).toEqual([]));

  test('KOL Đợt 2 xuất hiện trong tìm kiếm và mở được hồ sơ', async () => {
    const db = bizState({ directory: [...fixtureDirectory(), fromApprovedSummary(summary)] });
    const search = createSearchService({ db, now: () => NOW, delay: false });
    expect((await search.search({ keyword: 'KOL-P2-0001' })).items).toMatchObject([
      { kolId: 'KOL-P2-0001', platforms: ['youtube'], scale: 'micro' },
    ]);
    const p = await search.getKolPublicProfile('KOL-P2-0001');
    expect(p).toMatchObject({ collabEmail: 'doihai@example.vn', category: 'Ẩm thực' });
    expect(p.region).toBeUndefined();
    expect((await search.search({ keyword: 'tiktok.com/@doihai2' })).total).toBe(0);
  });

  test('readDirectory nối thêm extra; trùng kolId với danh bạ mẫu → giữ bản mẫu', () => {
    const state = seedState();
    expect(readDirectory(state)).toHaveLength(40);
    const dup = fromApprovedSummary({ ...summary, kolId: 'KOL-2026-0001', displayName: 'Khác' });
    const out = readDirectory(state, [fromApprovedSummary(summary), dup]);
    expect(out).toHaveLength(41);
    expect(out.filter((k) => k.kolId === 'KOL-2026-0001').map((k) => k.displayName)).toEqual(['Khánh Vy']);
  });
});
