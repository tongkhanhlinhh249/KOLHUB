import { describe, expect, test } from 'vitest';
import type { SupplierRatingRow } from '../../services';
import { formatAverage, parseRatingsTab, pendingRatings, ratingsOf, ratingSummary } from './ratingsView';

const row = (id: string, completedAt: number, received?: [number, number], given?: [number, number]): SupplierRatingRow => ({
  bookingId: id,
  campaignId: `cmp-${id}`,
  campaignName: `Chiến dịch ${id}`,
  brandCompany: 'Công ty Demo Sữa',
  kolNames: ['Khánh Vy'],
  completedAt,
  ...(received ? { received: { stars: received[0], comment: '', at: received[1] } } : {}),
  ...(given ? { given: { stars: given[0], comment: 'ok', at: given[1] } } : {}),
});

const ROWS = [row('a', 10, [5, 11], [4, 12]), row('b', 30, [4, 31]), row('c', 20, [5, 25]), row('d', 40)];

describe('Đánh giá — tab, danh sách, chờ đánh giá', () => {
  test('tab từ URL: mặc định "Nhãn hàng đánh giá bạn", ?tab=cua-ban → "Bạn đánh giá"', () => {
    expect(parseRatingsTab(new URLSearchParams(''))).toBe('nhan-hang');
    expect(parseRatingsTab(new URLSearchParams('tab=cua-ban'))).toBe('cua-ban');
    expect(parseRatingsTab(new URLSearchParams('tab=khac'))).toBe('nhan-hang');
  });
  test('đánh giá nhận được / đã gửi, mới nhất trước', () => {
    expect(ratingsOf(ROWS, 'nhan-hang').map((e) => e.row.bookingId)).toEqual(['b', 'c', 'a']);
    expect(ratingsOf(ROWS, 'cua-ban').map((e) => [e.row.bookingId, e.rating.stars])).toEqual([['a', 4]]);
    expect(ratingsOf([], 'nhan-hang')).toEqual([]);
  });
  test('"Chờ bạn đánh giá": booking hoàn tất chưa có đánh giá của bạn, hoàn tất gần nhất trước', () => {
    expect(pendingRatings(ROWS).map((r) => r.bookingId)).toEqual(['d', 'b', 'c']);
    expect(pendingRatings([row('x', 1, undefined, [5, 2])])).toEqual([]);
  });
});

describe('Đánh giá — tóm tắt', () => {
  test('trung bình 1 chữ số thập phân, số lượng, phân bố 5→1 và tỉ lệ 5★', () => {
    const s = ratingSummary([{ stars: 5 }, { stars: 5 }, { stars: 4 }, { stars: 2 }]);
    expect(s).toEqual({
      count: 4,
      average: 4,
      distribution: [
        { stars: 5, count: 2, percent: 50 },
        { stars: 4, count: 1, percent: 25 },
        { stars: 3, count: 0, percent: 0 },
        { stars: 2, count: 1, percent: 25 },
        { stars: 1, count: 0, percent: 0 },
      ],
      fiveStarPercent: 50,
    });
    expect(ratingSummary([{ stars: 5 }, { stars: 4 }, { stars: 4 }]).average).toBe(4.3);
    expect(formatAverage(ratingSummary([{ stars: 5 }, { stars: 4 }]))).toBe('4,5');
  });
  test('chưa có đánh giá: 0, phân bố rỗng, hiển thị "–"; bỏ qua số sao ngoài 1–5', () => {
    const s = ratingSummary([]);
    expect(s).toMatchObject({ count: 0, average: 0, fiveStarPercent: 0 });
    expect(s.distribution.every((d) => d.count === 0 && d.percent === 0)).toBe(true);
    expect(formatAverage(s)).toBe('–');
    expect(ratingSummary([{ stars: 0 }, { stars: 7 }, { stars: 3 }]).count).toBe(1);
  });
});
