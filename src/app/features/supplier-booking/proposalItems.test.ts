import { describe, expect, test } from 'vitest';
import type { Channel } from '../../services';
import { eligibleChannels, fitType, initialRows, rowsFromItems, rowsValid, toProposalItems, validateRows } from './proposalItems';

const NOW = Date.UTC(2026, 8, 29);
const ch = (id: string, extra: Partial<Channel> = {}): Channel =>
  ({
    id,
    ownerType: 'MCN',
    ownerId: 'mcn',
    platform: 'tiktok',
    url: `https://tiktok.com/@${id}`,
    handle: id,
    proofImage: { name: 'p.png', type: 'image/png', size: 1 },
    status: 'VERIFIED',
    active: true,
    badgeExpiresAt: NOW + 86_400_000,
    verifiedAt: NOW - 1,
    createdAt: 0,
    updatedAt: 0,
    ...extra,
  }) as Channel;

describe('eligibleChannels', () => {
  const list = [
    ch('a', { assignedKolAccountId: 'k1' }),
    ch('b', { assignedKolAccountId: 'k2' }),
    ch('c', { assignedKolAccountId: 'k1', platform: 'facebook' }),
    ch('d', { assignedKolAccountId: 'k1', active: false }),
    ch('e', { assignedKolAccountId: 'k1', badgeExpiresAt: NOW - 1 }),
    ch('f', { assignedKolAccountId: 'k1', status: 'PENDING_REVIEW' }),
    ch('g'),
  ];
  test('MCN: kênh đã gán cho KOL, xác thực, đang hoạt động, đúng nền tảng', () => {
    expect(eligibleChannels(list, ['tiktok'], NOW, 'MCN', 'k1').map((c) => c.id)).toEqual(['a']);
    expect(eligibleChannels(list, ['tiktok', 'facebook'], NOW, 'MCN', 'k1').map((c) => c.id)).toEqual(['a', 'c']);
    expect(eligibleChannels(list, ['tiktok'], NOW, 'MCN')).toEqual([]);
  });
  test('KOL: mọi kênh hợp lệ của mình', () => {
    expect(eligibleChannels(list, ['tiktok'], NOW, 'KOL').map((c) => c.id)).toEqual(['a', 'b', 'g']);
  });
});

describe('dòng hạng mục', () => {
  test('KOL: mỗi hạng mục chiến dịch có kênh cùng nền tảng → một dòng', () => {
    const rows = initialRows(
      'KOL',
      [
        { type: 'VIDEO', platform: 'tiktok', quantity: 2 },
        { type: 'POST', platform: 'facebook', quantity: 1 },
      ],
      [ch('t1')],
    );
    expect(rows.map(({ channelId, deliverableType, quantity }) => ({ channelId, deliverableType, quantity }))).toEqual([
      { channelId: 't1', deliverableType: 'VIDEO', quantity: '2' },
    ]);
  });
  test('KOL không có kênh phù hợp / MCN: một dòng trống', () => {
    expect(initialRows('KOL', [{ type: 'POST', platform: 'facebook', quantity: 1 }], [])[0]).toMatchObject({ channelId: '', deliverableType: 'POST' });
    const [r] = initialRows('MCN', [{ type: 'LIVESTREAM', platform: 'tiktok', quantity: 3 }], [ch('x')]);
    expect(r).toMatchObject({ channelId: '', deliverableType: 'LIVESTREAM', quantity: '3' });
    expect(r.kolAccountId).toBeUndefined();
  });
  test('kiểm tra và chuyển thành ProposalItemInput', () => {
    const rows = [
      { key: '1', kolAccountId: 'k1', channelId: 'a', deliverableType: 'VIDEO' as const, quantity: '2' },
      { key: '2', channelId: '', deliverableType: 'POST' as const, quantity: '0' },
    ];
    const errs = validateRows(rows, 'MCN');
    expect(errs[0]).toEqual({});
    expect(errs[1]).toEqual({ kol: 'Chọn KOL', channel: 'Chọn kênh đăng', quantity: 'Từ 1 đến 100' });
    expect(rowsValid(errs)).toBe(false);
    expect(validateRows([rows[1]], 'KOL')[0].kol).toBeUndefined();
    expect(validateRows([{ ...rows[0], quantity: '1.5' }], 'MCN')[0].quantity).toBeDefined();
    expect(toProposalItems([rows[0]], 'MCN')).toEqual([{ kolAccountId: 'k1', channelId: 'a', deliverableType: 'VIDEO', quantity: 2 }]);
    expect(toProposalItems([rows[0]], 'KOL')).toEqual([{ channelId: 'a', deliverableType: 'VIDEO', quantity: 2 }]);
  });
  test('rowsFromItems giữ KOL/kênh/loại/số lượng', () => {
    expect(rowsFromItems([{ kolAccountId: 'k', deliverableType: 'VIDEO', quantity: 1 }])[0]).toMatchObject({
      kolAccountId: 'k',
      channelId: '',
      quantity: '1',
    });
  });
});

test('fitType: loại nội dung theo nền tảng của kênh', () => {
  expect(fitType('VIDEO', 'tiktok')).toBe('VIDEO');
  expect(fitType('SHORTS', 'tiktok')).toBe('VIDEO');
  expect(fitType('POST', 'youtube')).toBe('VIDEO');
  expect(fitType('VIDEO', 'instagram')).toBe('POST');
  expect(fitType('STORY', undefined)).toBe('STORY');
});
