import { describe, expect, test } from 'vitest';
import { activeFilterCount, applyViolationQuery, hasActiveFilters, type ViolationRowBase } from './violationQuery';

const row = (over: Partial<ViolationRowBase>): ViolationRowBase => ({
  id: 'v',
  platform: 'tiktok',
  channelHandle: 'khanhvy',
  channelUrl: 'tiktok.com/@khanhvy',
  contentTitle: 'Tiêu đề',
  category: 'Nội dung phản cảm',
  severity: 'low',
  source: 'REPORT',
  detectedAt: 0,
  status: 'CONFIRMED',
  ...over,
});

const list = [
  row({ id: 'a', detectedAt: 3, platform: 'youtube', severity: 'high', contentTitle: 'Kem trị mụn', kolName: 'Khánh Vy', kolId: 'KOL-2026-0001' }),
  row({ id: 'b', detectedAt: 1, status: 'RESOLVED', category: 'Vi phạm bản quyền' }),
  row({ id: 'c', detectedAt: 2, status: 'PENDING_REVIEW', channelHandle: 'minhthu.bepnha' }),
];

describe('applyViolationQuery', () => {
  test('mặc định: mới nhất trước; oldest đảo ngược', () => {
    expect(applyViolationQuery(list, {}).map((v) => v.id)).toEqual(['a', 'c', 'b']);
    expect(applyViolationQuery(list, { sort: 'oldest' }).map((v) => v.id)).toEqual(['b', 'c', 'a']);
  });
  test('từ khoá không dấu, @handle, KOL ID', () => {
    expect(applyViolationQuery(list, { keyword: 'khanh vy' }).map((v) => v.id)).toEqual(['a']);
    expect(applyViolationQuery(list, { keyword: '@minhthu' }).map((v) => v.id)).toEqual(['c']);
    expect(applyViolationQuery(list, { keyword: 'kol-2026-0001' }).map((v) => v.id)).toEqual(['a']);
  });
  test('nền tảng, mức độ, loại, trạng thái', () => {
    expect(applyViolationQuery(list, { platforms: ['youtube'] }).map((v) => v.id)).toEqual(['a']);
    expect(applyViolationQuery(list, { severity: 'low' }).map((v) => v.id)).toEqual(['c', 'b']);
    expect(applyViolationQuery(list, { category: 'Vi phạm bản quyền' }).map((v) => v.id)).toEqual(['b']);
    expect(applyViolationQuery(list, { status: 'PENDING_REVIEW' }).map((v) => v.id)).toEqual(['c']);
  });
  test('đếm bộ lọc', () => {
    expect(activeFilterCount({ keyword: 'x', severity: 'high', platforms: ['tiktok', 'youtube'] })).toBe(2);
    expect(hasActiveFilters({ keyword: ' ' })).toBe(false);
    expect(hasActiveFilters({ keyword: 'a' })).toBe(true);
  });
});
