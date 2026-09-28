import { beforeEach, describe, expect, test } from 'vitest';
import { createMcnKolService } from './mcnKol';
import { VERIFIED_MCN_ACCOUNT_ID as SAOVIET } from './mcnSeed';
import { makeHarness, type Harness } from './testHarness';

let h: Harness;
let svc: ReturnType<typeof createMcnKolService>;

const KHANHVY = 'acc-kol-2026-0001';
const kolAcc = (n: number) => `acc-kol-2026-${String(n).padStart(4, '0')}`;
const kolId = (n: number) => `KOL-2026-${String(n).padStart(4, '0')}`;
const HOUR = 3_600_000;

const mcnChannels = (mcn = SAOVIET) => h.db.read().channels.filter((c) => c.ownerId === mcn);
const own = () => mcnChannels().filter((c) => !c.assignedKolAccountId);

/** Approve the empty demo MCN and give it one channel. */
function approveOtherMcn(): string {
  h.db.update((s) => {
    const p = s.mcnProfiles.find((x) => x.accountId === h.mcnId)!;
    p.status = 'APPROVED';
    p.mcnId = 'MCN-TEST-0002';
    const src = s.channels.find((c) => c.ownerId === SAOVIET)!;
    s.channels.push({ ...structuredClone(src), id: 'other-ch-1', ownerId: h.mcnId, url: 'tiktok.com/@kenhkhac', assignedKolAccountId: undefined });
  });
  return 'other-ch-1';
}

beforeEach(() => {
  h = makeHarness();
  svc = createMcnKolService({ db: h.db, now: h.now, delay: false });
});

describe('seed Sao Việt Media', () => {
  test('6 kênh gán cho KOL 0011–0015 (0011 có 2 kênh), 6 kênh riêng MCN; Khánh Vy không có gì', async () => {
    expect(mcnChannels()).toHaveLength(12);
    expect(own()).toHaveLength(6);
    const rows = await svc.listKols(SAOVIET);
    expect(rows.map((r) => r.kolId).sort()).toEqual([11, 12, 13, 14, 15].map(kolId));
    expect(rows.find((r) => r.kolId === kolId(11))!.assignedChannelCount).toBe(2);
    expect(h.db.read().channels.some((c) => c.assignedKolAccountId === KHANHVY)).toBe(false);
    expect(h.db.read()).not.toHaveProperty('mcnKolLinks');
  });

  test('dòng KOL: thông tin công khai, lĩnh vực, kênh được gán', async () => {
    const r = (await svc.listKols(SAOVIET)).find((x) => x.kolId === kolId(11))!;
    expect(r).toMatchObject({ displayName: 'An Nhiên Review', category: 'Lifestyle', region: 'Hà Nội' });
    expect(r.totalFollowers).toBeGreaterThan(0);
    expect(r.fields?.[0]).toEqual({ name: 'Lifestyle', medal: expect.any(String) });
    expect(r.fields!.length).toBeLessThanOrEqual(3);
    expect(r.channels.map((c) => c.id).sort()).toEqual(['MCN-2026-0001-ch-01', 'MCN-2026-0001-ch-06']);
    expect(r.lastAssignedAt).toBeTypeOf('number');
  });

  test('MCN khác / MCN chưa có kênh gán → danh sách rỗng', async () => {
    expect(await svc.listKols(h.mcnId)).toEqual([]);
  });
});

describe('searchKols', () => {
  test('theo tên không dấu, KOL ID, email đăng nhập; không trả email', async () => {
    expect((await svc.searchKols('an nhien')).map((k) => k.kolId)).toContain(kolId(11));
    expect((await svc.searchKols(' kol-2026-0020 ')).map((k) => k.kolId)).toEqual([kolId(20)]);
    const email = h.db.read().accounts.find((a) => a.id === kolAcc(21))!.email;
    const [hit] = await svc.searchKols(email.toUpperCase());
    expect(hit.kolId).toBe(kolId(21));
    expect(JSON.stringify(hit)).not.toContain('@');
  });

  test('chỉ KOL đã duyệt; tối đa 20; rỗng → 20 KOL đầu theo tên', async () => {
    expect(await svc.searchKols('kol@demo.kolhub.vn')).toEqual([]);
    const all = await svc.searchKols('');
    expect(all).toHaveLength(20);
    expect(all.map((k) => k.displayName)).toEqual([...all.map((k) => k.displayName)].sort((a, b) => a.localeCompare(b, 'vi')));
  });
});

describe('assignChannels', () => {
  test('gán nhiều kênh riêng cho một KOL bất kỳ đã duyệt (kể cả Khánh Vy), không cần xác nhận', async () => {
    const ids = own().slice(0, 3).map((c) => c.id);
    h.clock.t += HOUR;
    expect(await svc.assignChannels(SAOVIET, ids, KHANHVY)).toEqual({ assigned: 3 });
    const row = (await svc.listKols(SAOVIET)).find((r) => r.kolAccountId === KHANHVY)!;
    expect(row).toMatchObject({ assignedChannelCount: 3, lastAssignedAt: h.clock.t });
    for (const c of mcnChannels().filter((x) => ids.includes(x.id))) expect(c).toMatchObject({ assignedKolAccountId: KHANHVY, assignedAt: h.clock.t });
  });

  test('kênh đang gán KOL khác được chuyển sang KOL mới; KOL cũ hết kênh thì rời danh sách', async () => {
    const ch = mcnChannels().find((c) => c.assignedKolAccountId === kolAcc(12))!;
    await svc.assignChannels(SAOVIET, [ch.id], kolAcc(20));
    const rows = await svc.listKols(SAOVIET);
    expect(rows.some((r) => r.kolAccountId === kolAcc(12))).toBe(false);
    expect(rows.find((r) => r.kolAccountId === kolAcc(20))!.assignedChannelCount).toBe(1);
  });

  test('gán lại cho chính KOL đó không tính và giữ assignedAt', async () => {
    const ch = mcnChannels().find((c) => c.assignedKolAccountId === kolAcc(12))!;
    h.clock.t += HOUR;
    expect(await svc.assignChannels(SAOVIET, [ch.id], kolAcc(12))).toEqual({ assigned: 0 });
    expect(mcnChannels().find((c) => c.id === ch.id)!.assignedAt).toBe(ch.assignedAt);
  });

  test('KOL có thể nhận kênh của nhiều MCN', async () => {
    const other = approveOtherMcn();
    await svc.assignChannels(h.mcnId, [other], kolAcc(11));
    expect((await svc.listKols(h.mcnId)).map((r) => r.kolId)).toEqual([kolId(11)]);
    expect((await svc.listKols(SAOVIET)).some((r) => r.kolId === kolId(11))).toBe(true);
  });

  test('MCN đang soạn hồ sơ (DRAFT) / cần bổ sung vẫn gán được — điều kiện để gửi hồ sơ', async () => {
    h.db.update((s) => {
      s.channels.push({ ...structuredClone(s.channels.find((c) => c.ownerId === SAOVIET)!), id: 'draft-ch', ownerId: h.mcnId, assignedKolAccountId: undefined });
    });
    await expect(svc.assignChannels(h.mcnId, ['draft-ch'], kolAcc(11))).resolves.toEqual({ assigned: 1 });
    h.db.update((s) => {
      s.mcnProfiles.find((p) => p.accountId === h.mcnId)!.status = 'NEEDS_FIX';
    });
    await expect(svc.assignChannels(h.mcnId, ['draft-ch'], kolAcc(12))).resolves.toEqual({ assigned: 1 });
  });

  test.each(['SUBMITTED', 'REJECTED'] as const)('hồ sơ MCN %s → 4701, không kênh nào bị đổi', async (status) => {
    h.db.update((s) => {
      s.mcnProfiles.find((p) => p.accountId === SAOVIET)!.status = status;
    });
    const id = own()[0].id;
    await expect(svc.assignChannels(SAOVIET, [id], kolAcc(20))).rejects.toMatchObject({ code: 'KOLHUB-4701' });
    expect(mcnChannels().find((c) => c.id === id)!.assignedKolAccountId).toBeUndefined();
  });

  test('KOL chưa duyệt / không tồn tại → 4702', async () => {
    const id = own()[0].id;
    await expect(svc.assignChannels(SAOVIET, [id], h.kolId)).rejects.toMatchObject({ code: 'KOLHUB-4702' });
    await expect(svc.assignChannels(SAOVIET, [id], 'khong-co')).rejects.toMatchObject({ code: 'KOLHUB-4702' });
  });

  test('kênh không thuộc MCN / không tồn tại → 4703, không kênh nào bị đổi', async () => {
    const other = approveOtherMcn();
    const id = own()[0].id;
    await expect(svc.assignChannels(SAOVIET, [id, other], kolAcc(20))).rejects.toMatchObject({ code: 'KOLHUB-4703' });
    await expect(svc.assignChannels(SAOVIET, ['khong-co'], kolAcc(20))).rejects.toMatchObject({ code: 'KOLHUB-4703' });
    const kolChannel = h.db.read().channels.find((c) => c.ownerId === kolAcc(11))!;
    await expect(svc.assignChannels(SAOVIET, [kolChannel.id], kolAcc(20))).rejects.toMatchObject({ code: 'KOLHUB-4703' });
    expect(mcnChannels().find((c) => c.id === id)!.assignedKolAccountId).toBeUndefined();
  });

  test('không chọn kênh → 4704', async () => {
    await expect(svc.assignChannels(SAOVIET, [], kolAcc(11))).rejects.toMatchObject({ code: 'KOLHUB-4704' });
  });
});

describe('unassignChannels', () => {
  test('trả về Kênh riêng MCN và trả lại chủ cũ để hoàn tác', async () => {
    const ids = mcnChannels().filter((c) => c.assignedKolAccountId === kolAcc(11)).map((c) => c.id);
    const prev = await svc.unassignChannels(SAOVIET, [...ids, own()[0].id]);
    expect(prev).toEqual(ids.map((channelId) => ({ channelId, kolAccountId: kolAcc(11) })));
    expect(mcnChannels().filter((c) => ids.includes(c.id)).every((c) => !('assignedKolAccountId' in c) && !('assignedAt' in c))).toBe(true);
    expect((await svc.listKols(SAOVIET)).some((r) => r.kolAccountId === kolAcc(11))).toBe(false);
  });

  test.each(['SUBMITTED', 'REJECTED'] as const)('hồ sơ MCN %s → 4701, kênh vẫn giữ KOL', async (status) => {
    const ch = mcnChannels().find((c) => c.assignedKolAccountId === kolAcc(12))!;
    h.db.update((s) => {
      s.mcnProfiles.find((p) => p.accountId === SAOVIET)!.status = status;
    });
    await expect(svc.unassignChannels(SAOVIET, [ch.id])).rejects.toMatchObject({ code: 'KOLHUB-4701' });
    expect(mcnChannels().find((c) => c.id === ch.id)!.assignedKolAccountId).toBe(kolAcc(12));
  });

  test('kênh không thuộc MCN → 4703; không chọn kênh → 4704', async () => {
    await expect(svc.unassignChannels(SAOVIET, ['khong-co'])).rejects.toMatchObject({ code: 'KOLHUB-4703' });
    await expect(svc.unassignChannels(SAOVIET, [])).rejects.toMatchObject({ code: 'KOLHUB-4704' });
  });
});
