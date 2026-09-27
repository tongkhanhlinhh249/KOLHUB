import { describe, expect, test } from 'vitest';
import type { Channel } from '../../services';
import {
  applyChannelPatch,
  CHANNEL_KEYS,
  channelFilterCount,
  channelStatusOf,
  clearChannelFilters,
  countByStatus,
  filterChannels,
  hasChannelFilters,
  mergeChannelParams,
  parseChannelParams,
  sortChannels,
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
    badgeExpiresAt: NOW + 10,
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
  test('mặc định', () => expect(parseChannelParams(new URLSearchParams(''))).toEqual({ sort: 'updated', view: 'grid' }));

  test('đọc đủ khoá', () =>
    expect(
      parseChannelParams(new URLSearchParams('q=vy&trangThai=pending&nenTang=youtube,tiktok&hoatDong=off&sapXep=expiry&view=list')),
    ).toEqual({ keyword: 'vy', status: 'pending', platforms: ['youtube', 'tiktok'], active: 'off', sort: 'expiry', view: 'list' }));

  test('giá trị lạ → mặc định / bị bỏ', () =>
    expect(
      parseChannelParams(new URLSearchParams('q=%20&trangThai=VERIFIED&nenTang=instagram,tiktok,tiktok&hoatDong=yes&sapXep=x&view=table')),
    ).toEqual({ platforms: ['tiktok'], sort: 'updated', view: 'grid' }));

  test('toChannelParams bỏ mặc định; round-trip', () => {
    expect(toChannelParams({ sort: 'updated', view: 'grid', platforms: [] }).toString()).toBe('');
    const q = { keyword: 'vy', status: 'expired', platforms: ['facebook'], active: 'on', sort: 'followers', view: 'list' } as const;
    expect(parseChannelParams(toChannelParams(q))).toEqual(q);
  });

  test('merge giữ tham số khác (them=1), thay khoá của trang', () => {
    const prev = new URLSearchParams('them=1&trangThai=pending&view=list');
    const next = mergeChannelParams(prev, { status: 'verified', view: 'grid' });
    expect(next.get('them')).toBe('1');
    expect(next.get('trangThai')).toBe('verified');
    expect(next.has('view')).toBe(false);
    expect(CHANNEL_KEYS).toContain('view');
  });

  test('xoá bộ lọc giữ sắp xếp và kiểu xem', () => {
    const q = applyChannelPatch({ keyword: 'a', status: 'pending', sort: 'expiry', view: 'list' }, { active: 'off' });
    expect(clearChannelFilters(q)).toEqual({ sort: 'expiry', view: 'list' });
  });

  test('hasChannelFilters / channelFilterCount', () => {
    expect(hasChannelFilters({ sort: 'followers', view: 'list' })).toBe(false);
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
    expect(countByStatus(channels, NOW)).toEqual({ verified: 1, pending: 1, needs_fix: 1, expired: 2 }));
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
