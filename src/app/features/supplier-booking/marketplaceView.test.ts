import { describe, expect, test } from 'vitest';
import type { Channel, MarketplaceCampaign } from '../../services';
import { channelReadiness, deadlineInfo, kolTargetText, marketplaceStatus, readinessPath, rewardSummary, safeCampaignReturn } from './marketplaceView';

const HOUR = 3_600_000;
const base = { type: 'BOOKING', groups: [], kolTarget: 1 } as unknown as MarketplaceCampaign;
const group = (platform: 'tiktok' | 'youtube', cash: number, product?: { name: string; value: number }) => ({ platform, slots: 1, reward: { cash, ...(product ? { product } : {}) } });

describe('Sàn — thẻ công khai (Công bố lên sàn §6.2, §10)', () => {
  test('trạng thái theo chiến dịch, không theo hạn: đóng tay trước hạn vẫn là Đã đóng tuyển; Hoàn tất; tạm ngừng; sắp mở', () => {
    expect(marketplaceStatus({ ...base, accepting: true })).toBe('OPEN');
    expect(marketplaceStatus({ ...base, accepting: false, recruitmentClosed: true })).toBe('CLOSED');
    expect(marketplaceStatus({ ...base, accepting: false, recruitmentClosed: true, completed: true })).toBe('COMPLETED');
    expect(marketplaceStatus({ ...base, accepting: false, paused: true })).toBe('PAUSED');
    expect(marketplaceStatus({ ...base, type: 'OPEN_RECRUITMENT', phase: 'UPCOMING', accepting: false })).toBe('UPCOMING');
  });

  test('hạn ứng tuyển giờ Việt Nam; "Sắp hết hạn" khi còn ≤ 24 giờ', () => {
    const at = Date.UTC(2026, 9, 22, 16, 59); // 23:59 22/10 giờ VN
    const c = { ...base, applyDeadlineAt: at };
    expect(deadlineInfo(c, at - 25 * HOUR)).toMatchObject({ text: '23:59 · 22/10', soon: false, passed: false });
    expect(deadlineInfo(c, at - 24 * HOUR)).toMatchObject({ soon: true, passed: false });
    expect(deadlineInfo(c, at)).toMatchObject({ soon: false, passed: true });
    expect(deadlineInfo(c, at - HOUR, true)?.text).toBe('23:59 · 22/10/2026');
    // Booking nhiều KOL: hết ngày cuối của giai đoạn Ứng tuyển.
    const recruit = { ...base, type: 'OPEN_RECRUITMENT', recruitment: { timeline: { applyEnd: '2026-10-22' } } } as unknown as MarketplaceCampaign;
    expect(deadlineInfo(recruit, at - HOUR)?.at).toBe(at);
    expect(deadlineInfo({ ...base }, at)).toBeNull();
  });

  test('quyền lợi: tách tiền /booking và quà; nhóm khác nhau → "Quyền lợi theo hạng mục", không cộng thành thu nhập', () => {
    expect(rewardSummary({ ...base, groups: [group('tiktok', 3_000_000), group('youtube', 3_000_000)] })).toEqual({ kind: 'CASH', byGroup: false, cash: '3 triệu ₫/booking' });
    expect(rewardSummary({ ...base, groups: [group('tiktok', 0, { name: 'Tai nghe', value: 5_000_000 })] })).toEqual({ kind: 'PRODUCT', byGroup: false, product: 'Tai nghe' });
    expect(rewardSummary({ ...base, groups: [group('tiktok', 3_000_000), group('youtube', 8_000_000)] })).toEqual({ kind: 'CASH', byGroup: true });
    const both = rewardSummary({ ...base, groups: [group('tiktok', 2_000_000, { name: 'Máy pha', value: 1_500_000 })] }, false);
    expect(both).toEqual({ kind: 'BOTH', byGroup: false, cash: '2.000.000 ₫/booking', product: 'Máy pha' });
    expect(kolTargetText({ kolTarget: 6 })).toBe('Cần 6 KOL');
  });
});

describe('Sàn — CTA theo kênh của người xem (Công bố lên sàn §8)', () => {
  const NOW = Date.UTC(2026, 9, 15);
  const ch = (p: Partial<Channel>): Channel =>
    ({ id: 'c', platform: 'tiktok', status: 'VERIFIED', active: true, badgeExpiresAt: NOW + 30 * 24 * HOUR, ...p }) as Channel;

  test('đủ điều kiện / chưa có kênh / chưa xác thực / hết hạn / đang tắt; MCN cần gán kênh cho KOL', () => {
    expect(channelReadiness([ch({})], ['tiktok'], NOW, 'KOL')).toBe('READY');
    expect(channelReadiness([ch({ platform: 'youtube' })], ['tiktok'], NOW, 'KOL')).toBe('NO_CHANNEL');
    expect(channelReadiness([], ['tiktok'], NOW, 'KOL')).toBe('NO_CHANNEL');
    expect(channelReadiness([ch({ status: 'PENDING_SAFETY' as Channel['status'] })], ['tiktok'], NOW, 'KOL')).toBe('UNVERIFIED');
    expect(channelReadiness([ch({ status: 'EXPIRED' })], ['tiktok'], NOW, 'KOL')).toBe('EXPIRED');
    expect(channelReadiness([ch({ badgeExpiresAt: NOW - 1 })], ['tiktok'], NOW, 'KOL')).toBe('EXPIRED');
    expect(channelReadiness([ch({ active: false })], ['tiktok'], NOW, 'KOL')).toBe('INACTIVE');
    expect(channelReadiness([ch({})], ['tiktok'], NOW, 'MCN')).toBe('UNASSIGNED');
    expect(channelReadiness([ch({ assignedKolAccountId: 'k1' })], ['tiktok'], NOW, 'MCN')).toBe('READY');
    // Một kênh hợp lệ là đủ; kênh hết hạn khác không chặn.
    expect(channelReadiness([ch({ status: 'EXPIRED' }), ch({ id: 'd' })], ['tiktok'], NOW, 'KOL')).toBe('READY');
  });

  test('đường tới Quản lý kênh giữ đường quay lại đúng chiến dịch; chỉ chấp nhận /san/<id>', () => {
    expect(readinessPath('NO_CHANNEL', 'KOL', '/san/cmp-1')).toBe('/ho-so-kol/kenh?quay-lai=%2Fsan%2Fcmp-1&them=1');
    expect(readinessPath('EXPIRED', 'MCN', '/san/cmp-1')).toBe('/ho-so-mcn/kenh?quay-lai=%2Fsan%2Fcmp-1');
    expect(readinessPath('UNASSIGNED', 'MCN', '/san/cmp-1')).toBe('/ho-so-mcn/kol?quay-lai=%2Fsan%2Fcmp-1');
    expect(safeCampaignReturn('/san/cmp-seed-tai-nghe')).toBe('/san/cmp-seed-tai-nghe');
    expect(safeCampaignReturn('https://evil.example/san/x')).toBeNull();
    expect(safeCampaignReturn('//evil.example')).toBeNull();
    expect(safeCampaignReturn(null)).toBeNull();
  });
});
