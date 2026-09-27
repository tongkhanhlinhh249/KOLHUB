import { beforeEach, describe, expect, test } from 'vitest';
import { createMcnKolService } from './mcnKol';
import { VERIFIED_MCN_ACCOUNT_ID as SAOVIET } from './mcnSeed';
import { makeHarness, type Harness } from './testHarness';

let h: Harness;
let svc: ReturnType<typeof createMcnKolService>;
let seq: number;

const KHANHVY = 'acc-kol-2026-0001';
const kolAcc = (n: number) => `acc-kol-2026-${String(n).padStart(4, '0')}`;
const kolId = (n: number) => `KOL-2026-${String(n).padStart(4, '0')}`;
const HOUR = 3_600_000;

/** Approve the empty demo MCN so tests have a second MCN that may invite. */
function approveOtherMcn() {
  h.db.update((s) => {
    const p = s.mcnProfiles.find((x) => x.accountId === h.mcnId)!;
    p.status = 'APPROVED';
    p.mcnId = 'MCN-TEST-0002';
    p.contact.displayName = 'MCN Thử Nghiệm';
  });
}

const mcnChannels = (mcn = SAOVIET) => h.db.read().channels.filter((c) => c.ownerId === mcn);

beforeEach(() => {
  h = makeHarness();
  seq = 0;
  svc = createMcnKolService({ db: h.db, now: h.now, delay: false, genId: () => `link-${++seq}` });
});

describe('seed Sao Việt Media', () => {
  test('6 KOL đang quản lý (0011–0016) + 1 lời mời chờ Khánh Vy', async () => {
    const rows = await svc.listKols(SAOVIET);
    expect(rows.filter((r) => r.status === 'ACTIVE').map((r) => r.kolId).sort()).toEqual(
      [11, 12, 13, 14, 15, 16].map(kolId),
    );
    expect(rows.filter((r) => r.status === 'PENDING').map((r) => r.kolId)).toEqual(['KOL-2026-0001']);
  });

  test('khoảng một nửa kênh MCN được gán cho KOL đang quản lý, phần còn lại là kênh riêng MCN', async () => {
    const chans = mcnChannels();
    const assigned = chans.filter((c) => c.assignedKolAccountId);
    expect(chans).toHaveLength(12);
    expect(assigned.length).toBeGreaterThanOrEqual(5);
    expect(assigned.length).toBeLessThanOrEqual(7);
    const active = new Set((await svc.listKols(SAOVIET)).filter((r) => r.status === 'ACTIVE').map((r) => r.kolAccountId));
    for (const c of assigned) expect(active.has(c.assignedKolAccountId!)).toBe(true);
  });

  test('dòng KOL có thông tin công khai và số kênh MCN được gán', async () => {
    const rows = await svc.listKols(SAOVIET);
    const total = rows.filter((r) => r.status === 'ACTIVE').reduce((n, r) => n + r.assignedChannelCount, 0);
    expect(total).toBe(mcnChannels().filter((c) => c.assignedKolAccountId).length);
    const r = rows.find((x) => x.kolId === kolId(11))!;
    expect(r).toMatchObject({ displayName: 'An Nhiên Review', category: 'Lifestyle', region: 'Hà Nội' });
    expect(r.totalFollowers).toBeGreaterThan(0);
    // Public "Lĩnh vực hoạt động" (medal-free copy), first = category — shown on the MCN channels it owns.
    expect(r.fields?.[0]).toEqual({ name: 'Lifestyle', medal: expect.any(String) });
    expect(r.fields!.length).toBeLessThanOrEqual(3);
  });

  test('Khánh Vy thấy lời mời của Sao Việt Media, chưa có MCN quản lý', async () => {
    const invites = await svc.listInvites(KHANHVY);
    expect(invites).toHaveLength(1);
    expect(invites[0]).toMatchObject({ name: 'Sao Việt Media', mcnId: 'MCN-2026-0001', mcnAccountId: SAOVIET });
    expect(await svc.currentMcn(KHANHVY)).toBeNull();
  });
});

describe('mời KOL', () => {
  test('mời bằng KOL ID (không phân biệt hoa thường, khoảng trắng) → PENDING', async () => {
    const row = await svc.invite(SAOVIET, '  kol-2026-0020 ');
    expect(row).toMatchObject({ linkId: 'link-1', kolId: kolId(20), status: 'PENDING', invitedAt: h.clock.t, assignedChannelCount: 0 });
    expect((await svc.listInvites(kolAcc(20))).map((i) => i.linkId)).toEqual(['link-1']);
  });

  test('mời bằng email đăng nhập của KOL', async () => {
    const email = h.db.read().accounts.find((a) => a.id === kolAcc(21))!.email;
    await expect(svc.invite(SAOVIET, ` ${email.toUpperCase()} `)).resolves.toMatchObject({ kolId: kolId(21) });
  });

  test('ô trống → 4702', async () => {
    await expect(svc.invite(SAOVIET, '   ')).rejects.toMatchObject({ code: 'KOLHUB-4702' });
  });

  test('MCN chưa được duyệt → 4701', async () => {
    await expect(svc.invite(h.mcnId, kolId(20))).rejects.toMatchObject({ code: 'KOLHUB-4701' });
  });

  test('KOL chưa được duyệt (chưa có KOL ID) hoặc không tồn tại → 4703', async () => {
    await expect(svc.invite(SAOVIET, 'kol@demo.kolhub.vn')).rejects.toMatchObject({ code: 'KOLHUB-4703' });
    await expect(svc.invite(SAOVIET, 'KOL-2026-9999')).rejects.toMatchObject({ code: 'KOLHUB-4703' });
    await expect(svc.invite(SAOVIET, 'saoviet@demo.kolhub.vn')).rejects.toMatchObject({ code: 'KOLHUB-4703' });
  });

  test('trùng lời mời đang chờ → 4704; KOL đang quản lý → 4705', async () => {
    await expect(svc.invite(SAOVIET, kolId(1))).rejects.toMatchObject({ code: 'KOLHUB-4704' });
    await expect(svc.invite(SAOVIET, kolId(11))).rejects.toMatchObject({ code: 'KOLHUB-4705' });
  });

  test('KOL đang thuộc MCN khác → 4706', async () => {
    approveOtherMcn();
    await expect(svc.invite(h.mcnId, kolId(11))).rejects.toMatchObject({ code: 'KOLHUB-4706' });
  });

  test('mời lại sau khi KOL từ chối: bản ghi mới, danh sách chỉ hiện lần gần nhất', async () => {
    const r = await svc.invite(SAOVIET, kolId(20));
    await svc.decline(kolAcc(20), r.linkId);
    h.clock.t += HOUR;
    const again = await svc.invite(SAOVIET, kolId(20));
    const rows = (await svc.listKols(SAOVIET)).filter((x) => x.kolId === kolId(20));
    expect(rows).toEqual([expect.objectContaining({ linkId: again.linkId, status: 'PENDING' })]);
  });
});

describe('MCN huỷ lời mời / kết thúc quản lý', () => {
  test('huỷ lời mời đang chờ → xoá khỏi danh sách và khỏi lời mời của KOL', async () => {
    const r = await svc.invite(SAOVIET, kolId(20));
    await svc.cancelInvite(SAOVIET, r.linkId);
    expect((await svc.listKols(SAOVIET)).some((x) => x.linkId === r.linkId)).toBe(false);
    expect(await svc.listInvites(kolAcc(20))).toEqual([]);
  });

  test('huỷ lời mời đã được chấp nhận / của MCN khác → 4707', async () => {
    const r = await svc.invite(SAOVIET, kolId(20));
    await svc.accept(kolAcc(20), r.linkId);
    await expect(svc.cancelInvite(SAOVIET, r.linkId)).rejects.toMatchObject({ code: 'KOLHUB-4707' });
    approveOtherMcn();
    const pending = (await svc.listKols(SAOVIET)).find((x) => x.status === 'PENDING')!;
    await expect(svc.cancelInvite(h.mcnId, pending.linkId)).rejects.toMatchObject({ code: 'KOLHUB-4707' });
  });

  test('kết thúc quản lý → ENDED (bởi MCN), bỏ gán các kênh của KOL đó', async () => {
    const row = (await svc.listKols(SAOVIET)).find((x) => x.kolId === kolId(11))!;
    expect(row.assignedChannelCount).toBeGreaterThan(0);
    h.clock.t += HOUR;
    await svc.endLink(SAOVIET, row.linkId);
    const after = (await svc.listKols(SAOVIET)).find((x) => x.kolId === kolId(11))!;
    expect(after).toMatchObject({ status: 'ENDED', endedAt: h.clock.t, endedBy: 'MCN', assignedChannelCount: 0 });
    expect(mcnChannels().some((c) => c.assignedKolAccountId === kolAcc(11))).toBe(false);
    expect(await svc.currentMcn(kolAcc(11))).toBeNull();
  });

  test('kết thúc liên kết không còn ACTIVE → 4707', async () => {
    const pending = (await svc.listKols(SAOVIET)).find((x) => x.status === 'PENDING')!;
    await expect(svc.endLink(SAOVIET, pending.linkId)).rejects.toMatchObject({ code: 'KOLHUB-4707' });
    await expect(svc.endLink(SAOVIET, 'khong-co')).rejects.toMatchObject({ code: 'KOLHUB-4707' });
  });
});

describe('phía KOL', () => {
  test('chấp nhận → ACTIVE, currentMcn; lời mời chờ của MCN khác tự chuyển Đã từ chối', async () => {
    approveOtherMcn();
    const other = await svc.invite(h.mcnId, kolId(1));
    const [sv] = (await svc.listInvites(KHANHVY)).filter((i) => i.mcnAccountId === SAOVIET);
    h.clock.t += HOUR;
    const cur = await svc.accept(KHANHVY, sv.linkId);
    expect(cur).toMatchObject({ name: 'Sao Việt Media', since: h.clock.t, assignedChannelCount: 0 });
    expect(await svc.currentMcn(KHANHVY)).toMatchObject({ linkId: sv.linkId });
    expect(await svc.listInvites(KHANHVY)).toEqual([]);
    const otherRow = (await svc.listKols(h.mcnId)).find((r) => r.linkId === other.linkId)!;
    expect(otherRow.status).toBe('DECLINED');
  });

  test('từ chối → DECLINED, MCN thấy ở "Đã kết thúc"', async () => {
    const [inv] = await svc.listInvites(KHANHVY);
    await svc.decline(KHANHVY, inv.linkId);
    const row = (await svc.listKols(SAOVIET)).find((r) => r.linkId === inv.linkId)!;
    expect(row).toMatchObject({ status: 'DECLINED', respondedAt: h.clock.t });
  });

  test('không được chấp nhận / từ chối lời mời của người khác hoặc đã xử lý → 4707', async () => {
    const [inv] = await svc.listInvites(KHANHVY);
    await expect(svc.accept(kolAcc(20), inv.linkId)).rejects.toMatchObject({ code: 'KOLHUB-4707' });
    await svc.decline(KHANHVY, inv.linkId);
    await expect(svc.accept(KHANHVY, inv.linkId)).rejects.toMatchObject({ code: 'KOLHUB-4707' });
    await expect(svc.decline(KHANHVY, inv.linkId)).rejects.toMatchObject({ code: 'KOLHUB-4707' });
  });

  test('đang có MCN mà chấp nhận lời mời khác → 4708', async () => {
    approveOtherMcn();
    // The invite is created before the KOL joins Sao Việt (otherwise 4706 on invite).
    const other = await svc.invite(h.mcnId, kolId(20));
    const sv = await svc.invite(SAOVIET, kolId(20));
    await svc.accept(kolAcc(20), sv.linkId);
    // Accepting Sao Việt auto-declined the other invite, so re-create it directly to test the guard.
    h.db.update((s) => {
      s.mcnKolLinks.find((l) => l.id === other.linkId)!.status = 'PENDING';
    });
    await expect(svc.accept(kolAcc(20), other.linkId)).rejects.toMatchObject({ code: 'KOLHUB-4708' });
  });

  test('KOL rời MCN → ENDED (bởi KOL), bỏ gán kênh', async () => {
    const cur = (await svc.currentMcn(kolAcc(12)))!;
    expect(cur.assignedChannelCount).toBeGreaterThan(0);
    await svc.leave(kolAcc(12), cur.linkId);
    expect(await svc.currentMcn(kolAcc(12))).toBeNull();
    const row = (await svc.listKols(SAOVIET)).find((r) => r.kolAccountId === kolAcc(12))!;
    expect(row).toMatchObject({ status: 'ENDED', endedBy: 'KOL' });
    expect(mcnChannels().some((c) => c.assignedKolAccountId === kolAcc(12))).toBe(false);
  });

  test('rời liên kết không phải của mình → 4707', async () => {
    const cur = (await svc.currentMcn(kolAcc(12)))!;
    await expect(svc.leave(kolAcc(13), cur.linkId)).rejects.toMatchObject({ code: 'KOLHUB-4707' });
  });
});

describe('gán kênh MCN', () => {
  const unassigned = () => mcnChannels().find((c) => !c.assignedKolAccountId)!;

  test('gán kênh riêng MCN cho KOL đang quản lý, rồi bỏ gán', async () => {
    const ch = unassigned();
    const out = await svc.assignChannel(SAOVIET, ch.id, kolAcc(16));
    expect(out.assignedKolAccountId).toBe(kolAcc(16));
    expect((await svc.listKols(SAOVIET)).find((r) => r.kolAccountId === kolAcc(16))!.assignedChannelCount).toBeGreaterThan(0);
    const back = await svc.assignChannel(SAOVIET, ch.id, null);
    expect(back.assignedKolAccountId).toBeUndefined();
    expect(mcnChannels().find((c) => c.id === ch.id)).not.toHaveProperty('assignedKolAccountId');
  });

  test('chỉ gán cho KOL ACTIVE của chính MCN → 4709', async () => {
    const ch = unassigned();
    await expect(svc.assignChannel(SAOVIET, ch.id, KHANHVY)).rejects.toMatchObject({ code: 'KOLHUB-4709' });
    await expect(svc.assignChannel(SAOVIET, ch.id, kolAcc(30))).rejects.toMatchObject({ code: 'KOLHUB-4709' });
  });

  test('kênh không thuộc MCN / không tồn tại → 4710', async () => {
    const kolChannel = h.db.read().channels.find((c) => c.ownerId === kolAcc(11))!;
    await expect(svc.assignChannel(SAOVIET, kolChannel.id, kolAcc(11))).rejects.toMatchObject({ code: 'KOLHUB-4710' });
    await expect(svc.assignChannel(SAOVIET, 'khong-co', null)).rejects.toMatchObject({ code: 'KOLHUB-4710' });
    approveOtherMcn();
    await expect(svc.assignChannel(h.mcnId, unassigned().id, null)).rejects.toMatchObject({ code: 'KOLHUB-4710' });
  });

  test('currentMcn của KOL đếm số kênh MCN được gán', async () => {
    const n = mcnChannels().filter((c) => c.assignedKolAccountId === kolAcc(11)).length;
    expect((await svc.currentMcn(kolAcc(11)))!.assignedChannelCount).toBe(n);
  });
});
