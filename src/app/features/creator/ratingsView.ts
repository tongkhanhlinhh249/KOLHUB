// Pure helpers of "Đánh giá" (/danh-gia, KOL/MCN): tabs (URL state), the received / given lists, bookings still
// waiting for this side's rating, and the summary (average, count, 5→1 distribution, share of 5★).
import type { BookingRating, SupplierRatingRow } from '../../services';

export type RatingsTab = 'nhan-hang' | 'cua-ban';
export const RATINGS_TABS: { key: RatingsTab; label: string }[] = [
  { key: 'nhan-hang', label: 'Nhãn hàng đánh giá bạn' },
  { key: 'cua-ban', label: 'Bạn đánh giá' },
];
export const RATINGS_TAB_PARAM = 'tab';

/** ?tab=cua-ban → "Bạn đánh giá"; anything else → "Nhãn hàng đánh giá bạn" (default, no param). */
export function parseRatingsTab(params: URLSearchParams): RatingsTab {
  return params.get(RATINGS_TAB_PARAM) === 'cua-ban' ? 'cua-ban' : 'nhan-hang';
}

/** One rating of a tab with its booking row. */
export interface RatingEntry {
  row: SupplierRatingRow;
  rating: BookingRating;
}

/** Ratings of a tab (received from brands / given to brands), newest rating first. */
export function ratingsOf(rows: SupplierRatingRow[], tab: RatingsTab): RatingEntry[] {
  const out: RatingEntry[] = [];
  for (const row of rows) {
    const rating = tab === 'nhan-hang' ? row.received : row.given;
    if (rating) out.push({ row, rating });
  }
  return out.sort((a, b) => b.rating.at - a.rating.at);
}

/** "Chờ bạn đánh giá": completed bookings this account has not rated yet, most recently completed first. */
export function pendingRatings(rows: SupplierRatingRow[]): SupplierRatingRow[] {
  return rows.filter((r) => !r.given).sort((a, b) => b.completedAt - a.completedAt);
}

export interface RatingSummary {
  count: number;
  /** Mean stars rounded to 1 decimal; 0 when there is no rating. */
  average: number;
  /** 5 → 1 stars: count and share (0–100, rounded) of each. */
  distribution: { stars: number; count: number; percent: number }[];
  /** Share of 5★ ratings (0–100, rounded). */
  fiveStarPercent: number;
}

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

export function ratingSummary(ratings: Pick<BookingRating, 'stars'>[]): RatingSummary {
  const valid = ratings.map((r) => Math.round(r.stars)).filter((s) => s >= 1 && s <= 5);
  const count = valid.length;
  const sum = valid.reduce((n, s) => n + s, 0);
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const n = valid.filter((s) => s === stars).length;
    return { stars, count: n, percent: pct(n, count) };
  });
  return {
    count,
    average: count ? Math.round((sum / count) * 10) / 10 : 0,
    distribution,
    fiveStarPercent: distribution[0].percent,
  };
}

/** 4.5 → "4,5"; 0 ratings → "–". */
export function formatAverage(s: Pick<RatingSummary, 'average' | 'count'>): string {
  return s.count ? s.average.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '–';
}
