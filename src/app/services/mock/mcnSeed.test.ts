import { expect, test } from 'vitest';
import type { McnProfile } from '../profile-types';
import { normalizeChannelUrl } from './channelRules';
import { createDb } from './db';
import { contactComplete, hasStaff, orgComplete } from './profileRules';
import { seedVerifiedMcn, VERIFIED_MCN_ACCOUNT_ID, VERIFIED_MCN_EMAIL } from './mcnSeed';
import { createSearchService } from './search';
import { seedState } from './seed';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 27, 3);
const seeded = seedVerifiedMcn(NOW, 'demo1234');

test('Sao Việt Media: tài khoản MCN, hồ sơ APPROVED đầy đủ, có GCN, mã MCN', () => {
  expect(seeded.account).toMatchObject({ id: VERIFIED_MCN_ACCOUNT_ID, type: 'MCN', email: VERIFIED_MCN_EMAIL, password: 'demo1234' });
  const p: McnProfile = seeded.profile;
  expect(p).toMatchObject({ ownerType: 'MCN', status: 'APPROVED', mcnId: 'MCN-2026-0001' });
  expect(p.org).toMatchObject({
    orgName: 'Công ty TNHH Truyền thông Sao Việt Media',
    regNo: expect.stringMatching(/^\d{10}$/),
    regDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    regBy: 'Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh',
  });
  expect(orgComplete(p.org)).toBe(true);
  expect(contactComplete(p.contact)).toBe(true);
  expect(hasStaff(p.staff)).toBe(true);
  expect(p.contact).toMatchObject({ displayName: 'Sao Việt Media', province: 'TP. Hồ Chí Minh' });
  expect(p.contact.bio).toBeTruthy();
  expect(p.gcnFile).toBeDefined();
  expect(p.approvedAt).toBeLessThan(NOW);
});

test('12 kênh MCN (FB/YT/TikTok): 6 xác thực, 2 hết hạn dấu, 2 chờ duyệt, 2 cần bổ sung; 1 kênh tắt', () => {
  const chs = seeded.channels;
  expect(chs).toHaveLength(12);
  expect(chs.every((c) => c.ownerType === 'MCN' && c.ownerId === VERIFIED_MCN_ACCOUNT_ID)).toBe(true);
  expect(new Set(chs.map((c) => c.platform))).toEqual(new Set(['facebook', 'youtube', 'tiktok']));
  const count: Record<string, number> = {};
  for (const c of chs) count[c.status] = (count[c.status] ?? 0) + 1;
  expect(count).toEqual({ VERIFIED: 6, EXPIRED: 2, PENDING_REVIEW: 2, NEEDS_FIX: 2 });
  expect(chs.filter((c) => !c.active)).toHaveLength(1);
  expect(chs.find((c) => !c.active)!.status).toBe('VERIFIED');
  expect(new Set(chs.map((c) => c.id)).size).toBe(12);
  expect(chs.every((c) => c.handle.trim() !== '')).toBe(true);
});

test('kênh xác thực: có số liệu, dấu hết hạn sau 12 tháng, 1 kênh sắp hết hạn trong 30 ngày', () => {
  const verified = seeded.channels.filter((c) => c.status === 'VERIFIED' || c.status === 'EXPIRED');
  for (const c of verified) {
    expect(c.stats?.followers).toBeGreaterThan(0);
    expect(c.stats!.latestVideos.length).toBeGreaterThan(0);
    const d = new Date(c.verifiedAt!);
    d.setMonth(d.getMonth() + 12);
    expect(c.badgeExpiresAt).toBe(d.getTime());
  }
  const live = seeded.channels.filter((c) => c.status === 'VERIFIED');
  expect(live.every((c) => c.badgeExpiresAt! > NOW)).toBe(true);
  expect(live.filter((c) => c.badgeExpiresAt! - NOW <= 30 * DAY)).toHaveLength(1);
  expect(seeded.channels.filter((c) => c.status === 'EXPIRED').every((c) => c.badgeExpiresAt! < NOW)).toBe(true);
});

test('kênh chờ duyệt thêm sau khi duyệt hồ sơ; kênh cần bổ sung có lý do tiếng Việt', () => {
  const pending = seeded.channels.filter((c) => c.status === 'PENDING_REVIEW');
  expect(pending.every((c) => c.createdAt > seeded.profile.approvedAt! && !c.stats && c.verifiedAt === undefined)).toBe(true);
  expect(seeded.channels.filter((c) => c.status === 'NEEDS_FIX').map((c) => c.note)).toEqual([
    'Ảnh chụp không thấy tên kênh ở trang quản trị',
    'Ảnh quản lý kênh đã quá cũ, vui lòng chụp lại',
  ]);
});

test('seed: không có link kênh trùng nhau trên toàn bộ dữ liệu (BR-22)', () => {
  const s = seedState();
  const keys = s.channels.map((c) => normalizeChannelUrl(c.url));
  expect(new Set(keys).size).toBe(keys.length);
  expect(s.channels.filter((c) => c.ownerType === 'MCN')).toHaveLength(12);
  expect(s.mcnProfiles.map((p) => [p.accountId, p.status])).toEqual([
    ['acc-mcn-demo', 'DRAFT'],
    [VERIFIED_MCN_ACCOUNT_ID, 'APPROVED'],
  ]);
});

test('tìm kiếm của Nhãn hàng không liệt kê kênh do MCN quản lý', async () => {
  const db = createDb(null, seedState);
  db.update((s) => {
    s.sessionAccountId = 'acc-biz-demo';
  });
  const search = createSearchService({ db, now: Date.now, delay: false });
  const all = await search.search({});
  expect(all.total).toBe(35);
  for (const kw of ['Sao Việt', 'minhthu.bepnha', 'tiktok.com/@minhthu.bepnha', 'TuanKietVlog']) {
    expect((await search.search({ keyword: kw })).total).toBe(0);
  }
  const mcnUrls = new Set(seedVerifiedMcn(Date.now(), '').channels.map((c) => normalizeChannelUrl(c.url)));
  for (const k of all.items) {
    const profile = await search.getKolPublicProfile(k.kolId);
    for (const c of profile.channels) expect(mcnUrls.has(normalizeChannelUrl(c.url))).toBe(false);
  }
});
