import { beforeEach, describe, expect, test } from 'vitest';
import type { StoredFile } from '../profile-types';
import { createChannelService } from './channel';
import { findProfile } from './profileRules';
import { makeHarness, passSafety, type Harness } from './testHarness';

const png: StoredFile = { name: 'proof.png', type: 'image/png', size: 2000 };
const png2: StoredFile = { name: 'proof2.png', type: 'image/png', size: 3000 };

let h: Harness;
let ch: ReturnType<typeof createChannelService>;

beforeEach(() => {
  h = makeHarness();
  ch = createChannelService({ db: h.db, now: h.now, delay: false });
});

async function verifiedChannel() {
  const c = await ch.add(h.kolId, { url: 'https://www.facebook.com/khanhvy', proofImage: png });
  h.db.update((s) => {
    const x = s.channels.find((y) => y.id === c.id)!;
    x.status = 'VERIFIED';
    x.verifiedAt = h.clock.t;
    x.badgeExpiresAt = h.clock.t + 1_000_000;
  });
  return h.db.read().channels.find((y) => y.id === c.id)!;
}

describe('channel service', () => {
  test('thêm kênh → SAFETY_PENDING (chờ xác thực KOL Safety), active, handle, platform', async () => {
    expect(await ch.add(h.kolId, { url: 'tiktok.com/@vytest', proofImage: png })).toMatchObject({
      status: 'SAFETY_PENDING',
      active: true,
      platform: 'tiktok',
      handle: '@vytest',
      ownerType: 'KOL',
    });
    expect(h.db.read().funnel).toEqual([expect.objectContaining({ step: 'channel_added', subject: 'kol@demo.kolhub.vn' })]);
  });

  test('link Instagram được nhận (QĐ-09)', async () => {
    expect((await ch.add(h.kolId, { url: 'instagram.com/khanhvy', proofImage: png })).platform).toBe('instagram');
  });

  test('link X/Twitter → 4202, không tạo kênh', async () => {
    await expect(ch.add(h.kolId, { url: 'x.com/khanhvy', proofImage: png })).rejects.toMatchObject({
      code: 'KOLHUB-4202',
    });
    expect(await ch.list(h.kolId)).toEqual([]);
  });

  test('ảnh GIF → 4203', async () => {
    await expect(
      ch.add(h.kolId, { url: 'tiktok.com/@a', proofImage: { name: 'a.gif', type: 'image/gif', size: 1 } }),
    ).rejects.toMatchObject({ code: 'KOLHUB-4203' });
  });

  test('link trùng trong cùng tài khoản → 4201', async () => {
    await ch.add(h.kolId, { url: 'https://www.facebook.com/abc/', proofImage: png });
    const err = await ch.add(h.kolId, { url: 'facebook.com/abc?ref=x', proofImage: png }).catch((e) => e);
    expect(err).toMatchObject({ code: 'KOLHUB-4201' });
    expect(err.meta?.ownedByOther).toBeFalsy();
  });

  test('link đã thuộc tài khoản khác → 4201 kèm ownedByOther', async () => {
    await ch.add(h.kolId, { url: 'youtube.com/@abc', proofImage: png });
    await expect(ch.add(h.mcnId, { url: 'https://www.youtube.com/@abc/', proofImage: png })).rejects.toMatchObject({
      code: 'KOLHUB-4201',
      meta: { ownedByOther: true },
    });
  });

  test('list: mới nhất trước', async () => {
    await ch.add(h.kolId, { url: 'tiktok.com/@a', proofImage: png });
    h.clock.t += 1000;
    await ch.add(h.kolId, { url: 'tiktok.com/@b', proofImage: png });
    expect((await ch.list(h.kolId)).map((c) => c.handle)).toEqual(['@b', '@a']);
  });

  test('sửa kênh VERIFIED không đổi gì → giữ nguyên VERIFIED và hạn dấu', async () => {
    const c = await verifiedChannel();
    const u = await ch.update(h.kolId, c.id, { url: c.url, proofImage: c.proofImage });
    expect(u).toMatchObject({ status: 'VERIFIED', badgeExpiresAt: c.badgeExpiresAt });
  });

  test('đổi ảnh kênh VERIFIED → PENDING_REVIEW, dấu tạm ngừng', async () => {
    const c = await verifiedChannel();
    const u = await ch.update(h.kolId, c.id, { url: c.url, proofImage: png2 });
    expect(u).toMatchObject({ status: 'PENDING_REVIEW', badgeSuspended: true, badgeExpiresAt: undefined });
  });

  test('sửa ảnh kênh NEEDS_FIX → PENDING_REVIEW, xoá lý do, không quét KOL Safety lại (BR-24)', async () => {
    const c = await ch.add(h.kolId, { url: 'tiktok.com/@a', proofImage: png });
    passSafety(h, c.id);
    h.db.update((s) => {
      Object.assign(s.channels[0], { status: 'NEEDS_FIX', note: 'Ảnh mờ' });
    });
    const u = await ch.update(h.kolId, c.id, { url: c.url, proofImage: png2 });
    expect(u.status).toBe('PENDING_REVIEW');
    expect(u.note).toBeUndefined();
  });

  test('sửa link kênh → SAFETY_PENDING, bỏ kết quả KOL Safety cũ (BR-24)', async () => {
    const c = await verifiedChannel();
    const u = await ch.update(h.kolId, c.id, { url: 'https://www.facebook.com/khanhvy.moi', proofImage: c.proofImage });
    expect(u).toMatchObject({ status: 'SAFETY_PENDING', badgeExpiresAt: undefined, safetyPassedAt: undefined, safety: undefined });
  });

  test('sửa ảnh kênh chưa đạt KOL Safety → vẫn SAFETY_PENDING', async () => {
    const c = await ch.add(h.kolId, { url: 'tiktok.com/@a', proofImage: png });
    expect((await ch.update(h.kolId, c.id, { url: c.url, proofImage: png2 })).status).toBe('SAFETY_PENDING');
  });

  test('sửa link sang link đã có → 4201', async () => {
    await ch.add(h.kolId, { url: 'tiktok.com/@a', proofImage: png });
    const b = await ch.add(h.kolId, { url: 'tiktok.com/@b', proofImage: png });
    await expect(ch.update(h.kolId, b.id, { url: 'https://www.tiktok.com/@a', proofImage: png })).rejects.toMatchObject({
      code: 'KOLHUB-4201',
    });
  });

  test('hồ sơ SUBMITTED: sửa kênh đang chờ duyệt bị chặn, bật/tắt vẫn được', async () => {
    const c = await ch.add(h.kolId, { url: 'tiktok.com/@a', proofImage: png });
    passSafety(h, c.id);
    h.db.update((s) => {
      findProfile(s, h.kolId)!.status = 'SUBMITTED';
    });
    await expect(ch.update(h.kolId, c.id, { url: c.url, proofImage: png2 })).rejects.toThrow('LOCKED_IN_REVIEW');
    expect((await ch.setActive(h.kolId, c.id, false)).active).toBe(false);
  });

  test('bật/tắt không đổi status và dấu', async () => {
    const c = await verifiedChannel();
    expect(await ch.setActive(h.kolId, c.id, false)).toMatchObject({
      status: 'VERIFIED',
      active: false,
      badgeExpiresAt: c.badgeExpiresAt,
    });
  });

  test('kênh của người khác → Error NOT_OWNER', async () => {
    const c = await ch.add(h.kolId, { url: 'tiktok.com/@a', proofImage: png });
    await expect(ch.setActive(h.mcnId, c.id, false)).rejects.toThrow('NOT_OWNER');
  });

  test('list chuyển kênh hết hạn sang EXPIRED', async () => {
    const c = await verifiedChannel();
    h.clock.t = c.badgeExpiresAt!;
    expect((await ch.list(h.kolId))[0].status).toBe('EXPIRED');
  });
});
