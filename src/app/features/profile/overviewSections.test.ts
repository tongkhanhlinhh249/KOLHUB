import { describe, expect, test } from 'vitest';
import type { Channel, KolProfile, McnKolRow, McnProfile } from '../../services';
import type { DemoState } from '../../services/mock/db';
import { buildProfileView } from '../../services/mock/profile';
import { findProfile } from '../../services/mock/profileRules';
import { makeHarness } from '../../services/mock/testHarness';
import { channelStats, kolStats, overviewProgress, overviewSections } from './overviewSections';

const png = { name: 'a.png', type: 'image/png', size: 1000 };
const NOW = new Date(2026, 8, 27).getTime();

function channel(ownerId: string, patch: Partial<Channel> = {}): Channel {
  return {
    id: `ch-${Math.random()}`,
    ownerType: 'KOL',
    ownerId,
    platform: 'facebook',
    url: 'https://facebook.com/abc',
    handle: 'abc',
    proofImage: png,
    status: 'PENDING_REVIEW',
    active: true,
    createdAt: 0,
    updatedAt: 0,
    ...patch,
  };
}

const kolRow = (n: number, assignedChannelCount: number): McnKolRow => ({
  kolAccountId: `acc-${n}`,
  kolId: `KOL-${n}`,
  displayName: `KOL ${n}`,
  totalFollowers: 0,
  assignedChannelCount,
  channels: [],
});

function fillContact(s: DemoState, id: string) {
  const p = findProfile(s, id)!;
  Object.assign(p.contact, { displayName: 'Tên', province: 'Hà Nội', address: '1 Tràng Tiền', category: 'Giáo dục' });
  p.staff = { staffName: 'Lan', staffPhone: '0987654321', staffEmail: '' };
}

const input = (s: DemoState, id: string, extra: { kols?: McnKolRow[] } = {}) => ({
  view: buildProfileView(s, id),
  channels: s.channels.filter((c) => c.ownerId === id),
  ...extra,
});

describe('overviewSections', () => {
  test('KOL rỗng: 2 thẻ, thiếu eKYC/liên hệ/nhân sự và kênh, nêu tên trường còn thiếu', () => {
    const h = makeHarness();
    const s = h.db.read();
    const sections = overviewSections(input(s, h.kolId));
    expect(sections.map((x) => [x.key, x.missing, x.complete])).toEqual([
      ['thong-tin', 3, false],
      ['kenh', 1, false],
    ]);
    const info = sections[0];
    expect(info.items.map((i) => [i.key, i.to])).toEqual([
      ['ekyc', '/ho-so-kol/thong-tin#dinh-danh'],
      ['contact', '/ho-so-kol/thong-tin#lien-he'],
      ['staff', '/ho-so-kol/thong-tin#nhan-su'],
    ]);
    expect(info.items[1].detail).toMatch(/^Thiếu 4 trường bắt buộc: Họ tên KOL\/KOC, Tỉnh\/Thành phố, Địa chỉ, Lĩnh vực chính$/);
    expect(info.items[2].detail).toBe('Chưa có nhân sự');
    expect(sections[1].items[0]).toMatchObject({ key: 'channel', ok: false, detail: 'Chưa có kênh nào', to: '/ho-so-kol/kenh' });
    expect(overviewProgress(sections)).toMatchObject({ missing: 4, firstIncomplete: { key: 'thong-tin' } });
  });

  test('KOL đủ: mọi thẻ Đã đủ, eKYC hiện họ tên và số giấy tờ đã che', () => {
    const h = makeHarness();
    const s = h.db.read();
    fillContact(s, h.kolId);
    (findProfile(s, h.kolId) as KolProfile).ekycStatus = 'PASSED';
    s.channels.push(channel(h.kolId));
    const ekyc = { status: 'PASSED' as const, attemptsLeft: 5, identity: { fullName: 'KHÁNH VY', dob: '', idNoMasked: '079*******45', issueDate: '', verifiedAt: 0 } };
    const sections = overviewSections({ ...input(s, h.kolId), ekyc });
    expect(sections.every((x) => x.complete)).toBe(true);
    expect(sections[0].items.map((i) => i.detail)).toEqual([
      'KHÁNH VY · Số giấy tờ 079*******45',
      'Đủ thông tin bắt buộc',
      'Lan · 0987654321',
    ]);
    expect(overviewProgress(sections)).toEqual({ missing: 0, firstIncomplete: undefined });
  });

  test('MCN: 3 thẻ; ok của từng mục lấy đúng từ checklist gửi hồ sơ', () => {
    const h = makeHarness();
    const s = h.db.read();
    fillContact(s, h.mcnId);
    const p = findProfile(s, h.mcnId) as McnProfile;
    p.org = { orgName: 'Công ty Sao', regNo: '0312345678', regDate: '', regBy: 'Sở KH&ĐT', legalRep: '' };
    s.channels.push(channel(h.mcnId, { ownerType: 'MCN' }));
    const i = input(s, h.mcnId);
    const sections = overviewSections(i);
    expect(sections.map((x) => x.key)).toEqual(['thong-tin', 'kenh', 'kol']);
    const flat = sections.flatMap((x) => x.items.map((it) => [it.key, it.ok]));
    expect(flat).toEqual(i.view.checklist.map((c) => [c.key, c.ok]));
    expect(sections[0].items.find((x) => x.key === 'org')!.detail).toBe('Thiếu 2 trường bắt buộc: Ngày cấp, Người đại diện');
    expect(sections[0].items.find((x) => x.key === 'gcn')!.detail).toBe('Chưa tải lên');
    expect(sections[2]).toMatchObject({ to: '/ho-so-mcn/kol', missing: 1, items: [{ key: 'kols', detail: 'Chưa gán kênh cho KOL nào' }] });
  });

  test('MCN có kênh gán cho KOL → thẻ Quản lý KOL Đã đủ', () => {
    const h = makeHarness();
    const s = h.db.read();
    s.channels.push(channel(h.mcnId, { ownerType: 'MCN', assignedKolAccountId: 'acc-kol-2026-0011' }));
    const kol = overviewSections(input(s, h.mcnId, { kols: [kolRow(11, 1)] }))[2];
    expect(kol).toMatchObject({ complete: true, items: [{ ok: true, detail: '1 KOL · 1 kênh đã gán' }] });
  });
});

describe('stats', () => {
  test('channelStats: đếm theo trạng thái, đang tắt, nền tảng', () => {
    const chs = [
      channel('a', { status: 'VERIFIED', badgeExpiresAt: NOW + 1000 }),
      channel('a', { status: 'VERIFIED', badgeExpiresAt: NOW - 1, platform: 'tiktok' }),
      channel('a', { status: 'NEEDS_FIX', active: false, platform: 'tiktok' }),
      channel('a', { platform: 'youtube' }),
    ];
    expect(channelStats(chs, NOW)).toEqual({
      total: 4,
      byStatus: { verified: 1, pending: 1, needs_fix: 1, expired: 1 },
      off: 1,
      activeWithProof: 3,
      platforms: ['facebook', 'tiktok', 'youtube'],
    });
  });

  test('kolStats: kênh đã gán / Kênh riêng MCN, tối đa 4 KOL xem trước', () => {
    const kols = [1, 2, 3, 4, 5].map((n) => kolRow(n, n === 1 ? 2 : 1));
    const chs = Array.from({ length: 9 }, () => channel('m', { ownerType: 'MCN' }));
    const st = kolStats(chs, kols);
    expect([st.kolCount, st.assigned, st.own, st.preview.length]).toEqual([5, 6, 3, 4]);
  });
});
