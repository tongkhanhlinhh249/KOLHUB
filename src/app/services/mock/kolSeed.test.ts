import { expect, test } from 'vitest';
import { KOL_CATEGORIES, KOL_REGIONS } from '../bizTypes';
import { isSearchableChannel, normalizeText, publicKolOf } from './directory';
import { parseFollowers, seedKols, seedSavedLists, VERIFIED_KOL_EMAIL } from './kolSeed';
import { seedState } from './seed';

const NOW = Date.UTC(2026, 8, 27, 3);
const seeded = seedKols(NOW, 'demo1234');
const dir = seeded.kolProfiles.map((p) => publicKolOf(p, seeded.channels, NOW)!);
const byId = (id: string) => dir.find((k) => k.kolId === id)!;
const profileOf = (id: string) => seeded.kolProfiles.find((p) => p.kolId === id)!;
const channelsOf = (id: string) => seeded.channels.filter((c) => c.ownerId === profileOf(id).accountId);

test('40 KOL đã đăng ký đầy đủ: tài khoản KOL, hồ sơ APPROVED, eKYC PASSED, identity che số, kênh', () => {
  expect(seeded.accounts).toHaveLength(40);
  expect(seeded.kolProfiles).toHaveLength(40);
  expect(seeded.identities).toHaveLength(40);
  expect(dir.every(Boolean)).toBe(true);
  expect(new Set(dir.map((k) => k.kolId)).size).toBe(40);
  expect(dir[0].kolId).toBe('KOL-2026-0001');
  expect(dir[39].kolId).toBe('KOL-2026-0040');
  for (const [i, p] of seeded.kolProfiles.entries()) {
    const acc = seeded.accounts[i];
    expect(acc).toMatchObject({ id: p.accountId, type: 'KOL', password: 'demo1234' });
    expect(p).toMatchObject({ status: 'APPROVED', ekycStatus: 'PASSED', ownerType: 'KOL' });
    expect(p.staff.staffName).not.toBe('');
    expect(p.contact.phone).toBe(acc.phone);
    expect(seeded.identities[i]).toMatchObject({ accountId: p.accountId, idNoMasked: expect.stringMatching(/^\d{3}\*+\d{2}$/) });
  }
  expect(new Set(seeded.accounts.map((a) => a.email)).size).toBe(40);
  expect(new Set(seeded.accounts.map((a) => a.phone)).size).toBe(40);
  expect(seeded.accounts[0].email).toBe(VERIFIED_KOL_EMAIL);
  expect(seeded.accounts[1].email).toBe('giangoi@kol.demo.kolhub.vn');
});

test('35 KOL tìm được; 0036–0037 INACTIVE; 0038–0040 BADGE_EXPIRED', () => {
  expect(dir.filter((k) => k.listingStatus === 'VISIBLE')).toHaveLength(35);
  expect(['KOL-2026-0036', 'KOL-2026-0037'].map((id) => byId(id).listingStatus)).toEqual(['INACTIVE', 'INACTIVE']);
  expect(['KOL-2026-0038', 'KOL-2026-0039', 'KOL-2026-0040'].map((id) => byId(id).listingStatus)).toEqual([
    'BADGE_EXPIRED',
    'BADGE_EXPIRED',
    'BADGE_EXPIRED',
  ]);
});

test('0040 hết hạn theo ngày dù status vẫn VERIFIED', () =>
  expect(channelsOf('KOL-2026-0040').every((c) => c.status === 'VERIFIED')).toBe(true));

test('0002 kênh Facebook EXPIRED; 0003 kênh TikTok ngừng hoạt động', () => {
  expect(channelsOf('KOL-2026-0002').find((c) => c.platform === 'facebook')?.status).toBe('EXPIRED');
  expect(channelsOf('KOL-2026-0003').find((c) => c.platform === 'tiktok')?.active).toBe(false);
});

test('ngày xác thực của 35 KOL tìm được khác nhau', () =>
  expect(new Set(dir.slice(0, 35).map((k) => k.verifiedAt)).size).toBe(35));

test('không có Instagram; mọi KOL có email hợp tác, lĩnh vực, khu vực, số liệu kênh', () => {
  expect(seeded.channels.every((c) => ['facebook', 'youtube', 'tiktok'].includes(c.platform))).toBe(true);
  expect(seeded.channels.every((c) => c.stats && c.stats.followers > 0)).toBe(true);
  expect(dir.every((k) => k.channels.length > 0 || k.listingStatus === 'INACTIVE')).toBe(true);
  expect(dir.every((k) => !!k.collabEmail && k.collabEmail.endsWith('@kolhub-demo.vn'))).toBe(true);
  expect(dir.every((k) => (KOL_CATEGORIES as readonly string[]).includes(k.category!))).toBe(true);
  expect(dir.every((k) => (KOL_REGIONS as readonly string[]).includes(k.region!))).toBe(true);
});

test('KOL-2026-0001 là Khánh Vy lấy từ creators.ts, followers YouTube = 1 200 000', () => {
  const k = byId('KOL-2026-0001');
  expect(k).toMatchObject({ displayName: 'Khánh Vy', nickname: 'khanhvy', avatar: expect.any(String) });
  expect(k.bio).toContain('MC VTV');
  expect(k.channels.find((c) => c.platform === 'youtube')?.followers).toBe(1_200_000);
});

test('KOL tự tạo: nickname không dấu, bio, không avatar', () => {
  const k = byId('KOL-2026-0011');
  expect(k).toMatchObject({ displayName: 'An Nhiên Review', nickname: 'annhienreview', bio: 'Lifestyle · Hà Nội' });
  expect(k.avatar).toBeUndefined();
  expect(k.channels).toMatchObject([{ platform: 'tiktok', url: 'tiktok.com/@annhienreview', followers: 4_500 }]);
  expect(seeded.accounts[10].email).toBe('annhienreview@kol.demo.kolhub.vn');
});

test('parseFollowers', () => {
  expect(parseFollowers('1.2M')).toBe(1_200_000);
  expect(parseFollowers('890K')).toBe(890_000);
});

test('seedSavedLists: 2 danh sách của brand@vinamilk-demo.vn, trỏ tới KOL ID có thật', () => {
  const s = seedState();
  const lists = seedSavedLists(s.accounts, NOW);
  expect(lists.map((l) => [l.name, l.items.map((i) => i.kolId)])).toEqual([
    ['Chiến dịch Tết 2027', ['KOL-2026-0001', 'KOL-2026-0005', 'KOL-2026-0038']],
    ['KOL ẩm thực', ['KOL-2026-0005', 'KOL-2026-0036']],
  ]);
  expect(lists.every((l) => l.accountId === 'acc-biz-demo')).toBe(true);
  expect(lists[0].items[0].note).toBe('Ưu tiên liên hệ tháng 11');
  const ids = new Set(s.kolProfiles.map((p) => p.kolId));
  expect(lists.every((l) => l.items.every((i) => ids.has(i.kolId)))).toBe(true);
});

test('lĩnh vực hoạt động: 1–3 mục, mục đầu = category, medal gold/silver/none, không trùng', () => {
  for (const p of seeded.kolProfiles) {
    const fields = p.contact.fields!;
    expect(fields.length).toBeGreaterThanOrEqual(1);
    expect(fields.length).toBeLessThanOrEqual(3);
    expect(fields[0].name).toBe(p.contact.category);
    for (const f of fields) expect(['gold', 'silver', 'none']).toContain(f.medal);
    expect(new Set(fields.map((f) => normalizeText(f.name))).size).toBe(fields.length);
  }
  // creators.ts: "Du Lịch"/gold, "Văn Hóa"/silver, "Phượt"/bronze → none
  expect(byId('KOL-2026-0003').fields).toEqual([
    { name: 'Du lịch', medal: 'gold' },
    { name: 'Văn Hóa', medal: 'silver' },
    { name: 'Phượt', medal: 'none' },
  ]);
  expect(new Set(dir.map((k) => k.fields.length))).toEqual(new Set([1, 2, 3]));
});

test('video mới nhất nằm trong Channel.stats: chỉ kênh đã xác thực + đang hoạt động; mới nhất trước', () => {
  for (const c of seeded.channels) {
    for (const v of c.stats!.latestVideos) {
      expect(v.platform).toBe(c.platform);
      expect(isSearchableChannel(c, NOW)).toBe(true);
      expect(v.thumbnail).toMatch(/^https:\/\//);
    }
  }
  for (const k of dir) {
    const dates = k.latestVideos.map((v) => Date.parse(v.publishedAt!));
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
    expect(k.latestVideos.length).toBeLessThanOrEqual(6);
  }
  expect(JSON.stringify(dir.map((k) => k.latestVideos))).not.toMatch(/instagram/i);
  expect(byId('KOL-2026-0001').latestVideos[0].thumbnail).toContain('photo-1758521540376');
  expect(byId('KOL-2026-0003').latestVideos.some((v) => v.platform === 'tiktok')).toBe(false);
  expect(dir.slice(0, 35).some((k) => k.latestVideos.length === 0)).toBe(true);
  expect(byId('KOL-2026-0038').latestVideos).toEqual([]);
  expect(dir.some((k) => k.latestVideos.length >= 4)).toBe(true);
});
