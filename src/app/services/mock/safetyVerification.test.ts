import { beforeEach, describe, expect, test } from 'vitest';
import type { StoredFile } from '../profile-types';
import { KolhubError } from '../types';
import { createChannelService } from './channel';
import {
  BADGE_VALID_DAYS,
  canRenew,
  createSafetyVerificationService,
  SAFETY_REQUIRED,
  safetyProgress,
} from './safetyVerification';
import { makeHarness, type Harness } from './testHarness';

const DAY = 86_400_000;
const png: StoredFile = { name: 'p.png', type: 'image/png', size: 100 };

let h: Harness;
let channels: ReturnType<typeof createChannelService>;
let safety: ReturnType<typeof createSafetyVerificationService>;

beforeEach(() => {
  h = makeHarness();
  channels = createChannelService({ db: h.db, now: h.now, delay: false });
  safety = createSafetyVerificationService({ db: h.db, now: h.now, notify: (m) => h.notices.push(m), delay: false });
});

const read = (id: string) => h.db.read().channels.find((c) => c.id === id)!;

describe('quy tắc theo nền tảng (mục 2)', () => {
  test('TikTok / Facebook / Instagram 20, YouTube 5', () => {
    expect(SAFETY_REQUIRED).toEqual({ tiktok: 20, facebook: 20, instagram: 20, youtube: 5 });
  });

  test('danh sách chốt đúng N nội dung, mới nhất trước; Facebook/Instagram có nhiều loại nội dung', async () => {
    const yt = await channels.add(h.kolId, { url: 'youtube.com/@vy', proofImage: png });
    const ig = await channels.add(h.kolId, { url: 'instagram.com/vy', proofImage: png });
    expect((await safety.start(h.kolId, yt.id, true)).safety!.items).toHaveLength(5);
    const items = (await safety.start(h.kolId, ig.id, true)).safety!.items;
    expect(items).toHaveLength(20);
    expect(items.map((i) => i.postedAt)).toEqual([...items.map((i) => i.postedAt)].sort((a, b) => b - a));
    expect(new Set(items.map((i) => i.type)).size).toBeGreaterThan(1);
  });

  test('nội dung có hình có thumbnail, bài viết / ghi chú thì không', async () => {
    const ig = await channels.add(h.kolId, { url: 'instagram.com/vy', proofImage: png });
    for (const i of (await safety.start(h.kolId, ig.id, true)).safety!.items) {
      if (i.type === 'POST' || i.type === 'NOTE') expect(i.thumbnail).toBeUndefined();
      else expect(i.thumbnail).toBeTruthy();
    }
  });
});

describe('xác thực lần đầu (mục 3)', () => {
  test('chưa tick cam đoan → không mở KOL Safety (EC-05)', async () => {
    const c = await channels.add(h.kolId, { url: 'tiktok.com/@vy', proofImage: png });
    await expect(safety.start(h.kolId, c.id, false)).rejects.toThrow('CONSENT_REQUIRED');
    expect(read(c.id).safety).toBeUndefined();
  });

  test('kênh chưa đủ N nội dung → KOLHUB-4210 (EC-04)', async () => {
    const c = await channels.add(h.kolId, { url: 'tiktok.com/@vy', proofImage: png });
    await safety.demoSetContentCount(c.id, 8);
    const err = await safety.start(h.kolId, c.id, true).catch((e) => e);
    expect(err).toBeInstanceOf(KolhubError);
    expect(err).toMatchObject({ code: 'KOLHUB-4210', meta: { required: 20, have: 8 } });
    expect(err.message).toBe('Kênh cần ít nhất 20 nội dung đủ điều kiện. Hiện tìm thấy 8/20.');
  });

  test('quét có nội dung không đạt → giữ SAFETY_PENDING kèm lý do; quét lại đạt đủ → PENDING_REVIEW + thông báo', async () => {
    const c = await channels.add(h.kolId, { url: 'tiktok.com/@vy', proofImage: png });
    await safety.start(h.kolId, c.id, true);
    await safety.demoSetNextVerdict('FAIL');
    const firstId = read(c.id).safety!.items[0].id;
    await safety.scan(h.kolId, c.id, firstId);
    let ch = read(c.id);
    expect(ch.status).toBe('SAFETY_PENDING');
    expect(ch.safety!.items[0]).toMatchObject({ verdict: 'FAIL', scans: 1 });
    expect(ch.safety!.items[0].reason).toBeTruthy();
    expect(safetyProgress(ch, h.clock.t)).toMatchObject({ phase: 'IN_PROGRESS', passed: 0, failed: 1, required: 20 });

    await safety.demoSetNextVerdict('PASS');
    await safety.scan(h.kolId, c.id);
    ch = read(c.id);
    expect(ch.status).toBe('PENDING_REVIEW');
    expect(ch.safetyPassedAt).toBe(h.clock.t);
    expect(ch.safety!.items[0].scans).toBe(2);
    expect(h.notices.at(-1)?.body).toContain('đã đạt KOL Safety 20/20');
  });

  test('video dài chỉ quét 3 phút đầu (BR-11)', async () => {
    const c = await channels.add(h.kolId, { url: 'tiktok.com/@vy', proofImage: png });
    await safety.start(h.kolId, c.id, true);
    await safety.scan(h.kolId, c.id);
    for (const i of read(c.id).safety!.items) {
      if (i.durationSec !== undefined) expect(i.scannedSec).toBe(Math.min(i.durationSec, 180));
    }
  });

  test('danh sách chốt quá 7 ngày → KOLHUB-4211, bỏ danh sách (EC-09)', async () => {
    const c = await channels.add(h.kolId, { url: 'tiktok.com/@vy', proofImage: png });
    await safety.start(h.kolId, c.id, true);
    h.clock.t += 7 * DAY;
    await expect(safety.scan(h.kolId, c.id)).rejects.toMatchObject({ code: 'KOLHUB-4211' });
    expect(read(c.id).safety).toBeUndefined();
  });

  test('bấm lại khi danh sách còn hạn → giữ nguyên danh sách (tiếp tục quét)', async () => {
    const c = await channels.add(h.kolId, { url: 'tiktok.com/@vy', proofImage: png });
    const a = (await safety.start(h.kolId, c.id, true)).safety!;
    h.clock.t += DAY;
    expect((await safety.start(h.kolId, c.id, true)).safety!.snapshotAt).toBe(a.snapshotAt);
  });

  test('kênh đã Chờ duyệt / còn hạn dài không xác thực được', async () => {
    const c = await channels.add(h.kolId, { url: 'tiktok.com/@vy', proofImage: png });
    await safety.demoPassAll(c.id);
    await expect(safety.start(h.kolId, c.id, true)).rejects.toThrow('NOT_VERIFIABLE');
  });
});

describe('gia hạn mỗi 3 tháng (mục 5)', () => {
  async function verified(daysLeft: number) {
    const c = await channels.add(h.kolId, { url: 'tiktok.com/@vy', proofImage: png });
    h.db.update((s) => {
      const x = s.channels.find((y) => y.id === c.id)!;
      x.status = 'VERIFIED';
      x.verifiedAt = h.clock.t - 80 * DAY;
      x.badgeExpiresAt = h.clock.t + daysLeft * DAY;
    });
    return c.id;
  }

  test('mở gia hạn khi còn ≤ 14 ngày hoặc đã hết hạn', async () => {
    const id = await verified(15);
    expect(canRenew(read(id), h.clock.t)).toBe(false);
    await expect(safety.start(h.kolId, id, true)).rejects.toThrow('NOT_VERIFIABLE');
    h.clock.t += DAY;
    expect(canRenew(read(id), h.clock.t)).toBe(true);
  });

  test('gia hạn sớm đạt → nối tiếp hạn cũ thêm 90 ngày, giữ VERIFIED, không cần Admin', async () => {
    const id = await verified(10);
    const old = read(id).badgeExpiresAt!;
    await safety.start(h.kolId, id, true);
    expect(safetyProgress(read(id), h.clock.t).purpose).toBe('RENEW');
    await safety.demoSetNextVerdict('PASS');
    await safety.scan(h.kolId, id);
    expect(read(id)).toMatchObject({ status: 'VERIFIED', badgeExpiresAt: old + BADGE_VALID_DAYS * DAY });
    expect(safetyProgress(read(id), h.clock.t).phase).toBe('PASSED');
  });

  test('kênh đã hết hạn gia hạn đạt → VERIFIED, hạn mới tính từ hôm nay', async () => {
    const id = await verified(10);
    await safety.demoSetDaysLeft(id, 0);
    expect(read(id).status).toBe('EXPIRED');
    await safety.demoPassAll(id);
    expect(read(id)).toMatchObject({ status: 'VERIFIED', badgeExpiresAt: h.clock.t + BADGE_VALID_DAYS * DAY });
  });
});

describe('Demo Panel', () => {
  test('đưa kênh đã xác thực về Chưa xác thực KOL Safety', async () => {
    const c = await channels.add(h.kolId, { url: 'tiktok.com/@vy', proofImage: png });
    await safety.demoPassAll(c.id);
    await safety.demoResetSafety(c.id);
    expect(read(c.id)).toMatchObject({ status: 'SAFETY_PENDING', safety: undefined, safetyPassedAt: undefined, badgeExpiresAt: undefined });
  });
});

describe('Làm mới (EC-08)', () => {
  test('refresh trả về kết quả KOL Safety đã gửi, không tự quét', async () => {
    const c = await channels.add(h.kolId, { url: 'tiktok.com/@vy', proofImage: png });
    await safety.start(h.kolId, c.id, true);
    const r = await safety.refresh(h.kolId, c.id);
    expect(r.safety!.items.every((i) => i.verdict === undefined)).toBe(true);
    await expect(safety.refresh(h.mcnId, c.id)).rejects.toThrow('NOT_OWNER');
  });
});

describe('bài gỡ / sửa và dùng lại kết quả (EP-01 §6.3)', () => {
  async function scannedWithFails(failIdx: number[]) {
    const c = await channels.add(h.kolId, { url: 'tiktok.com/@vy', proofImage: png });
    await safety.start(h.kolId, c.id, true);
    await safety.demoSetNextVerdict('PASS');
    await safety.scan(h.kolId, c.id);
    h.db.update((s) => {
      const items = s.channels.find((x) => x.id === c.id)!.safety!.items;
      for (const i of failIdx) Object.assign(items[i], { verdict: 'FAIL', reason: 'x' });
      s.channels.find((x) => x.id === c.id)!.safety!.passedAt = undefined;
      s.channels.find((x) => x.id === c.id)!.status = 'SAFETY_PENDING';
      s.channels.find((x) => x.id === c.id)!.safetyPassedAt = undefined;
    });
    return c.id;
  }

  test('quét lại bài không đạt mà chưa gỡ / sửa → vẫn không đạt', async () => {
    const id = await scannedWithFails([0]);
    await safety.demoSetNextVerdict('AUTO');
    await safety.scan(h.kolId, id);
    expect(read(id).safety!.items[0]).toMatchObject({ verdict: 'FAIL', scans: 2 });
    expect(read(id).status).toBe('SAFETY_PENDING');
  });

  test('sửa bài không đạt → bỏ kết quả cũ, quét lại thì đạt, đủ N/N → Chờ duyệt', async () => {
    const id = await scannedWithFails([0]);
    await safety.demoSetNextVerdict('AUTO');
    await safety.demoEditFailed(id);
    expect(read(id).safety!.items[0]).toMatchObject({ edited: true, verdict: undefined });
    await safety.scan(h.kolId, id);
    expect(read(id).safety!.items[0]).toMatchObject({ verdict: 'PASS' });
    expect(read(id).safety!.items[0].edited).toBeUndefined();
    expect(read(id).status).toBe('PENDING_REVIEW');
  });

  test('gỡ 2 bài không đạt → lưu lịch sử, 18 bài cũ giữ kết quả, 2 bài thay thế phải quét', async () => {
    const id = await scannedWithFails([3, 7]);
    const kept = read(id).safety!.items.filter((i) => i.verdict === 'PASS').map((i) => i.id);
    expect(await safety.demoRemoveFailed(id)).toBe(2);
    const s = read(id).safety!;
    expect(s.history!.map((x) => x.verdict)).toEqual(['FAIL', 'FAIL']);
    expect(s.items).toHaveLength(20);
    expect(s.items.filter((i) => i.verdict === 'PASS').map((i) => i.id)).toEqual(kept);
    expect(s.items.filter((i) => !i.verdict)).toHaveLength(2);
    expect(read(id).status).toBe('SAFETY_PENDING');
  });

  test('gỡ bài khi kênh không còn đủ N nội dung → danh sách thiếu, chưa cấp dấu', async () => {
    const id = await scannedWithFails([0, 1]);
    await safety.demoSetContentCount(id, 20);
    await safety.demoRemoveFailed(id);
    expect(read(id).safety!.items).toHaveLength(18);
    expect(safetyProgress(read(id), h.clock.t)).toMatchObject({ missing: 2, passed: 18 });
    await safety.scan(h.kolId, id).catch(() => undefined);
    expect(read(id).status).toBe('SAFETY_PENDING');
  });

  test('chưa kiểm tra được: không tính Đạt, không phải vi phạm', async () => {
    const c = await channels.add(h.kolId, { url: 'tiktok.com/@vy', proofImage: png });
    await safety.start(h.kolId, c.id, true);
    await safety.demoSetNextVerdict('ERROR');
    await safety.scan(h.kolId, c.id);
    expect(safetyProgress(read(c.id), h.clock.t)).toMatchObject({ passed: 0, failed: 0, errored: 20 });
    expect(read(c.id).status).toBe('SAFETY_PENDING');
  });
});

describe('tạm ngừng và khôi phục (EP-01 §6.5)', () => {
  async function verifiedChannel(daysLeft: number) {
    const c = await channels.add(h.kolId, { url: 'tiktok.com/@vy', proofImage: png });
    h.db.update((s) => {
      Object.assign(s.channels.find((x) => x.id === c.id)!, { status: 'VERIFIED', verifiedAt: h.clock.t, badgeExpiresAt: h.clock.t + daysLeft * DAY });
    });
    return c.id;
  }

  test('tạm ngừng → không còn dấu, không gia hạn được; khôi phục khi còn hạn → Đã xác thực', async () => {
    const id = await verifiedChannel(10);
    await safety.suspend(id, 'Vi phạm');
    expect(read(id)).toMatchObject({ status: 'SUSPENDED', suspendReason: 'Vi phạm' });
    expect(canRenew(read(id), h.clock.t)).toBe(false);
    await expect(safety.start(h.kolId, id, true)).rejects.toThrow('NOT_VERIFIABLE');
    await safety.restore(id);
    expect(read(id).status).toBe('VERIFIED');
  });

  test('khôi phục khi đã qua hạn → Hết hạn, không tự thành Đã xác thực', async () => {
    const id = await verifiedChannel(5);
    await safety.suspend(id, 'Vi phạm');
    h.clock.t += 6 * DAY;
    await safety.restore(id);
    expect(read(id).status).toBe('EXPIRED');
  });

  test('quét đạt không ghi đè tạm ngừng', async () => {
    const id = await verifiedChannel(10);
    await safety.start(h.kolId, id, true);
    await safety.suspend(id, 'Vi phạm');
    await safety.demoSetNextVerdict('PASS');
    await safety.scan(h.kolId, id);
    expect(read(id).status).toBe('SUSPENDED');
  });
});
