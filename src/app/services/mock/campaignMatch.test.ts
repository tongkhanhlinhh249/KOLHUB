import { describe, expect, test } from 'vitest';
import type { Campaign, SupplierMatchContext } from '../campaign-types';
import { matchCampaign, supplierMatchContext } from './campaignMatch';
import { SEED_KHANHVY_ID } from './campaignSeed';
import { VERIFIED_MCN_ACCOUNT_ID as SAOVIET } from './mcnSeed';
import { seedState } from './seed';

type C = Pick<Campaign, 'platforms' | 'categories' | 'deliverables' | 'budget'>;

const campaign = (extra: Partial<C> = {}): C => ({
  platforms: ['tiktok', 'youtube'],
  categories: ['Ẩm thực', 'Lifestyle'],
  deliverables: [
    { type: 'VIDEO', platform: 'tiktok', quantity: 4 },
    { type: 'VIDEO', platform: 'youtube', quantity: 1 },
  ],
  budget: 150_000_000,
  ...extra,
});

const ch = (id: string, platform: 'tiktok' | 'youtube' | 'facebook', followers: number, categories: string[], kol = `kol-${id}`) => ({
  id,
  platform,
  followers,
  kolAccountId: kol,
  categories,
});

const mcn = (channels: SupplierMatchContext['channels'], unassignedPlatforms?: SupplierMatchContext['unassignedPlatforms']): SupplierMatchContext => ({
  type: 'MCN',
  channels,
  ...(unassignedPlatforms ? { unassignedPlatforms } : {}),
});

describe('matchCampaign', () => {
  test('khớp đủ nền tảng, lĩnh vực, số lượng, quy mô → 100 kèm lý do', () => {
    const ctx = mcn([
      ch('a', 'tiktok', 800_000, ['Ẩm thực']),
      ch('b', 'tiktok', 600_000, ['Lifestyle']),
      ch('c', 'youtube', 500_000, ['Ẩm thực', 'Gia đình']),
    ]);
    const m = matchCampaign(campaign(), ctx);
    expect(m.score).toBe(100);
    expect(m.reasons).toEqual([
      'Khớp lĩnh vực Ẩm thực, Lifestyle',
      'Có 2 kênh TikTok đã xác thực',
      'Có 1 kênh YouTube đã xác thực',
      'Đáp ứng đủ số lượng hạng mục',
      'Quy mô kênh phù hợp với ngân sách',
    ]);
    expect(m.missing).toEqual([]);
  });

  test('thiếu nền tảng: mất điểm nền tảng + số lượng, ghi rõ thiếu kênh', () => {
    const m = matchCampaign(campaign(), mcn([ch('a', 'tiktok', 1_000_000, ['Ẩm thực', 'Lifestyle'])]));
    // nền tảng 20/40, lĩnh vực 30, số lượng 3/5 × 15 = 9 (1 kênh TikTok nhận tối đa 3), quy mô 15
    expect(m.score).toBe(74);
    expect(m.missing).toEqual(['Chưa có kênh YouTube đã xác thực', 'Cần 4 Video TikTok, bạn có 1 kênh']);
    expect(m.reasons).toContain('Có 1 kênh TikTok đã xác thực');
  });

  test('kênh MCN chưa giao cho KOL: nhắc giao kênh thay vì chỉ báo thiếu', () => {
    const m = matchCampaign(campaign(), mcn([ch('a', 'tiktok', 1_000_000, ['Ẩm thực'])], ['youtube']));
    expect(m.missing).toContain('Kênh YouTube của bạn chưa được giao cho KOL nào');
  });

  test('lĩnh vực: chỉ tính KOL có kênh trên nền tảng của chiến dịch; không khớp → thiếu', () => {
    const ctx = mcn([ch('a', 'tiktok', 1_000_000, ['Công nghệ']), ch('b', 'facebook', 1_000_000, ['Ẩm thực'])]);
    const m = matchCampaign(campaign({ platforms: ['tiktok'], deliverables: [{ type: 'VIDEO', platform: 'tiktok', quantity: 1 }] }), ctx);
    expect(m.reasons.some((r) => r.startsWith('Khớp lĩnh vực'))).toBe(false);
    expect(m.missing).toContain('Chưa có KOL thuộc lĩnh vực Ẩm thực, Lifestyle');
    expect(m.score).toBe(70);
  });

  test('một lĩnh vực khớp trên hai → nửa điểm lĩnh vực; không phân biệt dấu/hoa thường', () => {
    const m = matchCampaign(campaign(), mcn([ch('a', 'tiktok', 1_000_000, ['ẨM THỰC']), ch('b', 'youtube', 500_000, [])]));
    expect(m.reasons[0]).toBe('Khớp lĩnh vực Ẩm thực');
    // 40 + 15 + số lượng 4/5 × 15 = 12 + 15
    expect(m.score).toBe(82);
  });

  test('chiến dịch không giới hạn lĩnh vực → đủ điểm lĩnh vực', () => {
    const m = matchCampaign(campaign({ categories: [] }), mcn([ch('a', 'tiktok', 1_000_000, []), ch('a2', 'tiktok', 1_000_000, []), ch('b', 'youtube', 1_000_000, [])]));
    expect(m.reasons[0]).toBe('Không giới hạn lĩnh vực');
    expect(m.score).toBe(100);
  });

  test('số lượng: mỗi kênh nhận tối đa 3 hạng mục cùng loại', () => {
    const c = campaign({ categories: [], platforms: ['tiktok'], deliverables: [{ type: 'VIDEO', platform: 'tiktok', quantity: 6 }] });
    const m = matchCampaign(c, mcn([ch('a', 'tiktok', 3_000_000, [])]));
    expect(m.missing).toContain('Cần 6 Video TikTok, bạn có 1 kênh');
    // nền tảng 40, lĩnh vực 30, số lượng 3/6 × 15 = 7.5, quy mô 15 → 92.5 → 93
    expect(m.score).toBe(93);
  });

  test('quy mô: ngân sách quá thấp / kênh quá nhỏ so với ngân sách', () => {
    const c = campaign({ categories: [], platforms: ['tiktok'], deliverables: [{ type: 'VIDEO', platform: 'tiktok', quantity: 1 }] });
    const low = matchCampaign({ ...c, budget: 5_000_000 }, mcn([ch('a', 'tiktok', 2_000_000, [])]));
    expect(low.missing).toContain('Ngân sách thấp so với quy mô kênh của bạn');
    expect(low.score).toBe(40 + 30 + 15 + 5);
    const small = matchCampaign({ ...c, budget: 500_000_000 }, mcn([ch('a', 'tiktok', 10_000, [])]));
    expect(small.missing).toContain('Quy mô kênh nhỏ so với ngân sách chiến dịch');
    expect(small.score).toBe(40 + 30 + 15 + 8);
  });

  test('không có kênh nào → 0 điểm (trừ lĩnh vực tự do), liệt kê nền tảng thiếu', () => {
    const m = matchCampaign(campaign(), { type: 'KOL', channels: [] });
    expect(m.score).toBe(0);
    expect(m.reasons).toEqual([]);
    expect(m.missing).toEqual(['Lĩnh vực của bạn chưa thuộc Ẩm thực, Lifestyle', 'Chưa có kênh TikTok đã xác thực', 'Chưa có kênh YouTube đã xác thực']);
  });

  test('điểm luôn là số nguyên 0–100', () => {
    const m = matchCampaign(campaign({ categories: ['Ẩm thực', 'Lifestyle', 'Gia đình'] }), mcn([ch('a', 'youtube', 100, ['Gia đình'])]));
    expect(Number.isInteger(m.score)).toBe(true);
    expect(m.score).toBeGreaterThanOrEqual(0);
    expect(m.score).toBeLessThanOrEqual(100);
  });
});

describe('supplierMatchContext (seed)', () => {
  const s = seedState();
  const now = Date.now();

  test('MCN Sao Việt: chỉ kênh đã xác thực, đang hoạt động, đã giao cho KOL; lĩnh vực của KOL', () => {
    const ctx = supplierMatchContext(s, SAOVIET, now);
    expect(ctx.type).toBe('MCN');
    expect(ctx.channels.map((c) => c.id).sort()).toEqual(
      ['MCN-2026-0001-ch-01', 'MCN-2026-0001-ch-02', 'MCN-2026-0001-ch-04', 'MCN-2026-0001-ch-05', 'MCN-2026-0001-ch-06'].sort(),
    );
    expect(ctx.channels.find((c) => c.id === 'MCN-2026-0001-ch-04')!.categories).toEqual(['Du lịch', 'Phượt', 'Ẩm thực']);
    expect(ctx.channels.every((c) => c.followers > 0)).toBe(true);
  });

  test('KOL Khánh Vy: 3 kênh của mình, lĩnh vực Giáo dục', () => {
    const ctx = supplierMatchContext(s, SEED_KHANHVY_ID, now);
    expect(ctx).toMatchObject({ type: 'KOL' });
    expect(ctx.channels.map((c) => c.platform).sort()).toEqual(['facebook', 'tiktok', 'youtube']);
    expect(ctx.channels[0].categories).toContain('Giáo dục');
  });

  test('tài khoản không phải KOL/MCN → ngữ cảnh rỗng', () => {
    expect(supplierMatchContext(s, 'acc-biz-demo', now).channels).toEqual([]);
  });
});
