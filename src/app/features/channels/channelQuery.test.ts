import { describe, expect, test } from 'vitest';
import type { Channel } from '../../services';
import {
  applyChannelPatch,
  CHANNEL_KEYS,
  channelFilterCount,
  channelStatusOf,
  channelStatusTabs,
  clearChannelFilters,
  countByStatus,
  filterChannels,
  hasChannelFilters,
  mergeChannelParams,
  parseChannelParams,
  sortChannels,
  statusOnlyQuery,
  statusTabQuery,
  toChannelParams,
} from './channelQuery';

const NOW = 1_000_000;

function ch(p: Partial<Channel> & { id: string }): Channel {
  return {
    ownerType: 'KOL',
    ownerId: 'acc',
    platform: 'tiktok',
    url: `https://www.tiktok.com/@${p.id}`,
    handle: `@${p.id}`,
    proofImage: { name: 'a.png', type: 'image/png', size: 1 } as Channel['proofImage'],
    status: 'VERIFIED',
    active: true,
    badgeExpiresAt: NOW + 60 * 86_400_000,
    createdAt: 0,
    updatedAt: 0,
    ...p,
  };
}

const channels: Channel[] = [
  ch({ id: 'khanhvy', handle: '@Khánh Vy', updatedAt: 5, stats: { followers: 500, latestVideos: [], syncedAt: 0 } }),
  ch({ id: 'pending', status: 'PENDING_REVIEW', platform: 'youtube', url: 'https://youtube.com/@pending', badgeExpiresAt: undefined, updatedAt: 9 }),
  ch({ id: 'fix', status: 'NEEDS_FIX', platform: 'facebook', url: 'https://facebook.com/fix.page', active: false, badgeExpiresAt: undefined, updatedAt: 1 }),
  ch({ id: 'old', status: 'EXPIRED', badgeExpiresAt: undefined, updatedAt: 3 }),
  ch({ id: 'lapsed', badgeExpiresAt: NOW - 1, updatedAt: 2, stats: { followers: 9_000, latestVideos: [], syncedAt: 0 } }),
];
const ids = (list: Channel[]) => list.map((c) => c.id);

describe('parse / serialize', () => {
  test('mặc định', () => expect(parseChannelParams(new URLSearchParams(''))).toEqual({ sort: 'updated' }));

  test('đọc đủ khoá', () =>
    expect(
      parseChannelParams(new URLSearchParams('q=vy&trangThai=pending&nenTang=youtube,tiktok&hoatDong=off&sapXep=expiry&view=list')),
    ).toEqual({ keyword: 'vy', status: 'pending', platforms: ['youtube', 'tiktok'], active: 'off', sort: 'expiry' }));

  test('giá trị lạ → mặc định / bị bỏ', () =>
    expect(
      parseChannelParams(new URLSearchParams('q=%20&trangThai=VERIFIED&nenTang=twitter,tiktok,tiktok&hoatDong=yes&sapXep=x&view=table')),
    ).toEqual({ platforms: ['tiktok'], sort: 'updated' }));

  test('toChannelParams bỏ mặc định; round-trip', () => {
    expect(toChannelParams({ sort: 'updated', platforms: [] }).toString()).toBe('');
    const q = { keyword: 'vy', status: 'expired', platforms: ['facebook'], active: 'on', sort: 'followers' } as const;
    expect(parseChannelParams(toChannelParams(q))).toEqual(q);
  });

  test('merge giữ tham số khác (them=1), thay khoá của trang', () => {
    const prev = new URLSearchParams('them=1&trangThai=pending&view=list');
    const next = mergeChannelParams(prev, { status: 'verified' });
    expect(next.get('them')).toBe('1');
    expect(next.get('trangThai')).toBe('verified');
    expect(next.has('view')).toBe(false);
    expect(CHANNEL_KEYS).toContain('view');
  });

  test('xoá bộ lọc giữ sắp xếp và kiểu xem', () => {
    const q = applyChannelPatch({ keyword: 'a', status: 'pending', sort: 'expiry' }, { active: 'off' });
    expect(clearChannelFilters(q)).toEqual({ sort: 'expiry' });
  });

  test('hasChannelFilters / channelFilterCount', () => {
    expect(hasChannelFilters({ sort: 'followers' })).toBe(false);
    expect(hasChannelFilters({ keyword: '  ' })).toBe(false);
    expect(hasChannelFilters({ keyword: 'a' })).toBe(true);
    expect(channelFilterCount({ keyword: 'a', status: 'pending', platforms: ['tiktok', 'youtube'] })).toBe(2);
  });
});

describe('trạng thái', () => {
  test('VERIFIED quá hạn dấu tính là Hết hạn dấu', () => {
    expect(channelStatusOf(channels[4], NOW)).toBe('expired');
    expect(channelStatusOf(channels[0], NOW)).toBe('verified');
  });

  test('đếm theo trạng thái', () =>
    expect(countByStatus(channels, NOW)).toEqual({ safety: 0, verified: 1, expiring: 0, pending: 1, needs_fix: 1, expired: 2 }));

  test('SAFETY_PENDING → Chờ KOL Safety; còn ≤ 14 ngày → Sắp hết hạn', () => {
    expect(channelStatusOf(ch({ id: 's', status: 'SAFETY_PENDING', badgeExpiresAt: undefined }), NOW)).toBe('safety');
    expect(channelStatusOf(ch({ id: 'x', badgeExpiresAt: NOW + 14 * 86_400_000 }), NOW)).toBe('expiring');
    expect(channelStatusOf(ch({ id: 'y', badgeExpiresAt: NOW + 15 * 86_400_000 }), NOW)).toBe('verified');
  });
});

describe('filterChannels', () => {
  test('tìm không dấu, không phân biệt hoa thường, có hoặc không @', () => {
    expect(ids(filterChannels(channels, { keyword: 'khanh vy' }, NOW))).toEqual(['khanhvy']);
    expect(ids(filterChannels(channels, { keyword: '@KHÁNH' }, NOW))).toEqual(['khanhvy']);
  });

  test('tìm theo link (bỏ https, www)', () => {
    expect(ids(filterChannels(channels, { keyword: 'https://www.facebook.com/fix.page/' }, NOW))).toEqual(['fix']);
    expect(ids(filterChannels(channels, { keyword: 'youtube.com/@pend' }, NOW))).toEqual(['pending']);
  });

  test('lọc trạng thái, nền tảng, hoạt động', () => {
    expect(ids(filterChannels(channels, { status: 'expired' }, NOW))).toEqual(['old', 'lapsed']);
    expect(ids(filterChannels(channels, { platforms: ['youtube', 'facebook'] }, NOW))).toEqual(['pending', 'fix']);
    expect(ids(filterChannels(channels, { active: 'off' }, NOW))).toEqual(['fix']);
    expect(ids(filterChannels(channels, { active: 'on', platforms: ['tiktok'], status: 'verified' }, NOW))).toEqual(['khanhvy']);
  });

  test('không bộ lọc → giữ nguyên', () => expect(filterChannels(channels, {}, NOW)).toHaveLength(5));
});

describe('sortChannels', () => {
  test('Mới cập nhật', () => expect(ids(sortChannels(channels))).toEqual(['pending', 'khanhvy', 'old', 'lapsed', 'fix']));

  test('Người theo dõi cao nhất, kênh chưa có số liệu xếp cuối', () =>
    expect(ids(sortChannels(channels, 'followers'))).toEqual(['lapsed', 'khanhvy', 'pending', 'old', 'fix']));

  test('Hạn dấu gần nhất, kênh không có hạn xếp cuối', () =>
    expect(ids(sortChannels(channels, 'expiry'))).toEqual(['lapsed', 'khanhvy', 'pending', 'old', 'fix']));

  test('không đổi mảng gốc', () => {
    const copy = [...channels];
    sortChannels(channels, 'followers');
    expect(channels).toEqual(copy);
  });
});

describe('status mode (MCN)', () => {
  const list = [
    ch({ id: 'v' }),
    ch({ id: 'p', status: 'PENDING_REVIEW', badgeExpiresAt: undefined }),
    ch({ id: 'n', status: 'NEEDS_FIX', badgeExpiresAt: undefined }),
    ch({ id: 'e', status: 'EXPIRED', badgeExpiresAt: NOW - 1 }),
    ch({ id: 'd', badgeExpiresAt: NOW - 1 }),
  ];

  test('channelStatusTabs: Tất cả + 6 trạng thái, luôn đủ 7 tab kể cả khi 0', () => {
    expect(channelStatusTabs(list, NOW)).toEqual([
      { key: 'all', label: 'Tất cả', count: 5 },
      { key: 'safety', label: 'Chờ KOL Safety', count: 0 },
      { key: 'pending', label: 'Chờ duyệt', count: 1 },
      { key: 'needs_fix', label: 'Cần bổ sung', count: 1 },
      { key: 'verified', label: 'Đã xác thực', count: 1 },
      { key: 'expiring', label: 'Sắp hết hạn', count: 0 },
      { key: 'expired', label: 'Hết hạn dấu', count: 2 },
    ]);
    expect(channelStatusTabs([], NOW).map((t) => t.count)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  test('statusOnlyQuery bỏ qua từ khoá, nền tảng, hoạt động, sắp xếp', () => {
    const q = parseChannelParams(new URLSearchParams('q=abc&trangThai=pending&nenTang=youtube&hoatDong=off&sapXep=followers'));
    expect(statusOnlyQuery(q)).toEqual({ status: 'pending' });
    expect(statusOnlyQuery(parseChannelParams(new URLSearchParams('q=abc')))).toEqual({});
    expect(filterChannels(list, statusOnlyQuery(q), NOW).map((c) => c.id)).toEqual(['p']);
  });

  test('statusTabQuery: all/không hợp lệ → xoá trạng thái; ghi URL bằng trangThai, xoá tham số lọc khác, giữ them', () => {
    expect(statusTabQuery('all')).toEqual({});
    expect(statusTabQuery('xyz')).toEqual({});
    expect(statusTabQuery('needs_fix')).toEqual({ status: 'needs_fix' });
    const prev = new URLSearchParams('q=abc&nenTang=youtube&them=1&trangThai=verified');
    expect(mergeChannelParams(prev, statusTabQuery('expired')).toString()).toBe('them=1&trangThai=expired');
    expect(mergeChannelParams(prev, statusTabQuery('all')).toString()).toBe('them=1');
  });
});
