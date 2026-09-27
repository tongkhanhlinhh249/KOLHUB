import { beforeEach, describe, expect, test } from 'vitest';
import {
  computeHealth,
  createSafetyService,
  healthLabel,
  issueSummary,
  MAX_VIDEO_BYTES,
  parseChannelInput,
  scanVideoFile,
  verdictOf,
} from './safety';
import { SAFETY_KOL_ACCOUNT_ID, SAFETY_MCN_ACCOUNT_ID } from './safetySeed';
import { IMAGE_POOL } from './socialListening';
import { seedState } from './seed';
import { makeHarness, type Harness } from './testHarness';
import type { SafetyVerdict, ScanResult } from '../safety-types';

let h: Harness;
let svc: ReturnType<typeof createSafetyService>;

beforeEach(() => {
  h = makeHarness();
  svc = createSafetyService({ db: h.db, now: h.now, delay: false });
});

const input = (fileName: string, over: Partial<{ sizeBytes: number; durationSec: number }> = {}) => ({
  fileName,
  sizeBytes: 20_000_000,
  durationSec: 60,
  ...over,
});

function inRange(r: ScanResult) {
  if (r.verdict === 'VIOLATION') return r.score >= 0 && r.score <= 30;
  if (r.verdict === 'GRAY') return r.score >= 50 && r.score <= 79;
  return r.score >= 80 && r.score <= 100;
}

describe('quy tắc quét', () => {
  test('verdictOf theo ngưỡng điểm', () => {
    expect(verdictOf(0)).toBe('VIOLATION');
    expect(verdictOf(30)).toBe('VIOLATION');
    expect(verdictOf(50)).toBe('GRAY');
    expect(verdictOf(79)).toBe('GRAY');
    expect(verdictOf(80)).toBe('SAFE');
    expect(verdictOf(100)).toBe('SAFE');
  });

  test('kết quả xác định theo tên file; điểm đúng khoảng; có đủ 3 loại kết luận', () => {
    const seen = new Set<SafetyVerdict>();
    for (let i = 0; i < 60; i++) {
      const name = `clip-${i}.mp4`;
      const r = scanVideoFile(name, 60);
      expect(scanVideoFile(name, 60)).toEqual(r);
      expect(inRange(r)).toBe(true);
      expect(verdictOf(r.score)).toBe(r.verdict);
      for (const issue of r.issues) {
        expect(issue.atSec).toBeGreaterThanOrEqual(0);
        expect(issue.atSec).toBeLessThan(60);
      }
      if (r.verdict === 'VIOLATION') expect(r.issues.some((x) => x.severity === 'violation')).toBe(true);
      if (r.verdict === 'GRAY') expect(r.issues.some((x) => x.severity === 'warning')).toBe(true);
      if (r.verdict === 'SAFE') expect(r.issues.every((x) => x.severity === 'note')).toBe(true);
      seen.add(r.verdict);
    }
    expect(seen).toEqual(new Set(['VIOLATION', 'GRAY', 'SAFE']));
  });

  test('tên file gợi ý kết luận (demo)', () => {
    expect(scanVideoFile('video-vi-pham.mp4', 30).verdict).toBe('VIOLATION');
    expect(scanVideoFile('ban-xam.mov', 30).verdict).toBe('GRAY');
    expect(scanVideoFile('an-toan.webm', 30).verdict).toBe('SAFE');
  });

  test('issueSummary', () => {
    expect(issueSummary([])).toBeNull();
    expect(issueSummary([{ severity: 'note', title: 'a', detail: '' }])).toBe('1 lưu ý');
    expect(
      issueSummary([
        { severity: 'violation', title: 'a', detail: '' },
        { severity: 'warning', title: 'b', detail: '' },
        { severity: 'note', title: 'c', detail: '' },
      ]),
    ).toBe('3 vấn đề');
  });

  test('healthLabel / computeHealth', () => {
    expect(healthLabel(80)).toBe('Tốt');
    expect(healthLabel(79)).toBe('Cần chú ý');
    expect(healthLabel(50)).toBe('Cần chú ý');
    expect(healthLabel(49)).toBe('Rủi ro');
    const hl = computeHealth([
      { verdict: 'SAFE', score: 100, issues: [] },
      { verdict: 'GRAY', score: 60, issues: [] },
      { verdict: 'VIOLATION', score: 20, issues: [] },
    ]);
    expect(hl).toEqual({ score: 50, label: 'Cần chú ý', counts: { violation: 1, gray: 1, safe: 1 } });
  });
});

describe('kiểm tra video trước khi đăng', () => {
  test('tài khoản mới chưa có video; tải lên → PROCESSING, rồi runScan → DONE', async () => {
    expect(await svc.listVideos(h.kolId)).toEqual([]);
    const v = await svc.uploadVideo(h.kolId, input('Clip Moi.MOV'));
    expect(v).toMatchObject({ status: 'PROCESSING', accountId: h.kolId, fileName: 'Clip Moi.MOV', uploadedAt: h.clock.t });
    expect(IMAGE_POOL).toContain(v.thumbnail);
    expect(await svc.stats(h.kolId)).toEqual({ checked: 0, needsAction: 0, processing: 1 });

    h.clock.t += 2000;
    const done = await svc.runScan(v.id);
    expect(done).toMatchObject({ status: 'DONE', checkedAt: h.clock.t, result: scanVideoFile('Clip Moi.MOV', 60) });
    // Idempotent.
    expect(await svc.runScan(v.id)).toEqual(done);
    expect((await svc.stats(h.kolId)).processing).toBe(0);
  });

  test('ảnh đại diện do trình duyệt gửi lên được giữ', async () => {
    const v = await svc.uploadVideo(h.kolId, { ...input('a.mp4'), thumbnail: 'data:image/jpeg;base64,xyz' });
    expect(v.thumbnail).toBe('data:image/jpeg;base64,xyz');
  });

  test('chỉ nhận MP4/MOV/WebM, ≤ 500 MB, ≤ 10 phút', async () => {
    await expect(svc.uploadVideo(h.kolId, input('clip.avi'))).rejects.toMatchObject({
      code: 'KOLHUB-4501',
      message: 'Chỉ nhận video MP4, MOV hoặc WebM.',
    });
    await expect(svc.uploadVideo(h.kolId, input('clip'))).rejects.toMatchObject({ code: 'KOLHUB-4501' });
    await expect(svc.uploadVideo(h.kolId, input('clip.mp4', { sizeBytes: MAX_VIDEO_BYTES + 1 }))).rejects.toMatchObject({
      code: 'KOLHUB-4502',
      message: 'Video tối đa 500 MB.',
    });
    await expect(svc.uploadVideo(h.kolId, input('clip.webm', { durationSec: 601 }))).rejects.toMatchObject({
      code: 'KOLHUB-4503',
      message: 'Video tối đa 10 phút.',
    });
    await expect(svc.uploadVideo(h.kolId, input('clip.webm', { durationSec: 600, sizeBytes: MAX_VIDEO_BYTES }))).resolves.toBeTruthy();
    expect(await svc.listVideos(h.kolId)).toHaveLength(1);
  });

  test('Đăng ngay: chỉ SAFE/GRAY; VIOLATION và đang xử lý bị chặn', async () => {
    const bad = await svc.uploadVideo(h.kolId, input('vi-pham.mp4'));
    await expect(svc.markPublished(bad.id)).rejects.toMatchObject({ code: 'KOLHUB-4509' });
    await svc.runScan(bad.id);
    await expect(svc.markPublished(bad.id)).rejects.toMatchObject({ code: 'KOLHUB-4504' });

    const gray = await svc.uploadVideo(h.kolId, input('ban-xam.mp4'));
    await svc.runScan(gray.id);
    const ok = await svc.uploadVideo(h.kolId, input('an-toan.mp4'));
    await svc.runScan(ok.id);
    expect(await svc.stats(h.kolId)).toEqual({ checked: 3, needsAction: 2, processing: 0 });

    h.clock.t += 5000;
    expect((await svc.markPublished(gray.id)).publishedAt).toBe(h.clock.t);
    expect((await svc.markPublished(ok.id)).publishedAt).toBe(h.clock.t);
    // GRAY đã đăng không còn cần xử lý.
    expect(await svc.stats(h.kolId)).toEqual({ checked: 3, needsAction: 1, processing: 0 });
  });

  test('danh sách mới nhất trước; xoá video; id lạ → 4508', async () => {
    const a = await svc.uploadVideo(h.kolId, input('a.mp4'));
    h.clock.t += 1000;
    const b = await svc.uploadVideo(h.kolId, input('b.mp4'));
    expect((await svc.listVideos(h.kolId)).map((v) => v.id)).toEqual([b.id, a.id]);
    expect(await svc.listVideos(h.mcnId)).toEqual([]);
    await svc.deleteVideo(a.id);
    expect((await svc.listVideos(h.kolId)).map((v) => v.id)).toEqual([b.id]);
    await expect(svc.deleteVideo(a.id)).rejects.toMatchObject({ code: 'KOLHUB-4508' });
    await expect(svc.runScan('nope')).rejects.toMatchObject({ code: 'KOLHUB-4508' });
  });
});

describe('parseChannelInput', () => {
  test.each([
    ['@tenkenh', 'tenkenh'],
    ['tenkenh', 'tenkenh'],
    ['  minhthu.bepnha ', 'minhthu.bepnha'],
    ['https://www.tiktok.com/@tenkenh?lang=vi', 'tenkenh'],
    ['tiktok.com/@ten_kenh/video/123', 'ten_kenh'],
    ['m.tiktok.com/@abc', 'abc'],
  ])('TikTok %s → %s', (raw, handle) => expect(parseChannelInput('tiktok', raw)).toBe(handle));

  test('link Facebook / YouTube', () => {
    expect(parseChannelInput('facebook', 'https://facebook.com/trang.cua.toi/')).toBe('trang.cua.toi');
    expect(parseChannelInput('youtube', 'youtube.com/@KenhCuaToi')).toBe('KenhCuaToi');
    expect(parseChannelInput('youtube', 'https://www.youtube.com/channel/UC123abc')).toBe('UC123abc');
  });

  test('trống / không hợp lệ → 4505; link nền tảng khác → 4506', () => {
    expect(() => parseChannelInput('tiktok', '   ')).toThrow(
      expect.objectContaining({ code: 'KOLHUB-4505', message: 'Vui lòng nhập @username hoặc link kênh TikTok hợp lệ.' }),
    );
    expect(() => parseChannelInput('tiktok', '@')).toThrow(expect.objectContaining({ code: 'KOLHUB-4505' }));
    expect(() => parseChannelInput('tiktok', 'tiktok.com')).toThrow(expect.objectContaining({ code: 'KOLHUB-4505' }));
    expect(() => parseChannelInput('tiktok', 'ten kenh')).toThrow(expect.objectContaining({ code: 'KOLHUB-4505' }));
    expect(() => parseChannelInput('tiktok', 'https://facebook.com/tenkenh')).toThrow(
      expect.objectContaining({ code: 'KOLHUB-4506', message: 'Link này không phải kênh TikTok.' }),
    );
    expect(() => parseChannelInput('youtube', 'tiktok.com/@abc')).toThrow(
      expect.objectContaining({ code: 'KOLHUB-4506', message: 'Link này không phải kênh YouTube.' }),
    );
    expect(() => parseChannelInput('facebook', 'example.com/abc')).toThrow(expect.objectContaining({ code: 'KOLHUB-4506' }));
  });
});

describe('kiểm duyệt kênh', () => {
  test('kết nối → hồ sơ kênh mô phỏng xác định theo handle, chưa quét', async () => {
    const m = await svc.connect(h.kolId, 'tiktok', '@tenkenh');
    expect(m).toMatchObject({
      accountId: h.kolId,
      platform: 'tiktok',
      handle: 'tenkenh',
      url: 'tiktok.com/@tenkenh',
      displayName: 'Tenkenh',
      lastScanAt: null,
      scannedVideos: [],
      health: null,
      verified: false,
      connectedAt: h.clock.t,
    });
    expect(IMAGE_POOL).toContain(m.avatar);
    expect(m.followers).toBeGreaterThan(0);
    expect(m.likes).toBeGreaterThanOrEqual(m.followers);
    expect(m.videoCount).toBeGreaterThan(0);

    const other = makeHarness();
    const m2 = await createSafetyService({ db: other.db, now: other.now, delay: false }).connect(other.mcnId, 'tiktok', 'tiktok.com/@tenkenh');
    expect([m2.followers, m2.likes, m2.videoCount, m2.avatar]).toEqual([m.followers, m.likes, m.videoCount, m.avatar]);
  });

  test('trùng kênh trong cùng tài khoản + nền tảng → 4507; nền tảng khác / tài khoản khác thì được', async () => {
    await svc.connect(h.kolId, 'tiktok', '@TenKenh');
    await expect(svc.connect(h.kolId, 'tiktok', 'https://tiktok.com/@tenkenh')).rejects.toMatchObject({
      code: 'KOLHUB-4507',
      message: 'Kênh này đã được kết nối.',
    });
    await expect(svc.connect(h.kolId, 'youtube', '@tenkenh')).resolves.toBeTruthy();
    await expect(svc.connect(h.mcnId, 'tiktok', '@tenkenh')).resolves.toBeTruthy();
    await expect(svc.connect(h.kolId, 'tiktok', '')).rejects.toMatchObject({ code: 'KOLHUB-4505' });
    expect(await svc.listMonitors(h.kolId, 'tiktok')).toHaveLength(1);
    expect(await svc.listMonitors(h.kolId, 'facebook')).toEqual([]);
  });

  test('quét → lastScanAt, 6–12 video, điểm sức khoẻ 0–100 và số lượng theo kết luận', async () => {
    const m = await svc.connect(h.kolId, 'youtube', '@kenhthu');
    h.clock.t += 60_000;
    const s = await svc.scan(m.id);
    expect(s.lastScanAt).toBe(h.clock.t);
    expect(s.scannedVideos.length).toBeGreaterThanOrEqual(6);
    expect(s.scannedVideos.length).toBeLessThanOrEqual(12);
    for (const v of s.scannedVideos) {
      expect(inRange(v)).toBe(true);
      expect(IMAGE_POOL).toContain(v.thumbnail);
      expect(v.publishedAt).toBeLessThan(h.clock.t);
    }
    const c = s.health!.counts;
    expect(c.violation + c.gray + c.safe).toBe(s.scannedVideos.length);
    expect(s.health!.score).toBeGreaterThanOrEqual(0);
    expect(s.health!.score).toBeLessThanOrEqual(100);
    expect(s.health!.label).toBe(healthLabel(s.health!.score));
    expect(await svc.getMonitor(m.id)).toEqual(s);
  });

  test('xoá kênh; id lạ → 4508', async () => {
    const m = await svc.connect(h.kolId, 'facebook', 'facebook.com/trangthu');
    await svc.remove(m.id);
    expect(await svc.listMonitors(h.kolId, 'facebook')).toEqual([]);
    await expect(svc.getMonitor(m.id)).rejects.toMatchObject({ code: 'KOLHUB-4508' });
    await expect(svc.scan(m.id)).rejects.toMatchObject({ code: 'KOLHUB-4508' });
    await expect(svc.remove(m.id)).rejects.toMatchObject({ code: 'KOLHUB-4508' });
  });

  test('kênh trùng kênh đã xác thực trong hồ sơ → verified, giữ số follower của kênh', async () => {
    h.db.update((s) => {
      s.safetyMonitors = s.safetyMonitors.filter((m) => m.accountId !== SAFETY_MCN_ACCOUNT_ID);
    });
    const m = await svc.connect(SAFETY_MCN_ACCOUNT_ID, 'tiktok', 'https://www.tiktok.com/@minhthu.bepnha');
    const ch = h.db.read().channels.find((c) => c.url === 'tiktok.com/@minhthu.bepnha')!;
    expect(m.verified).toBe(true);
    expect(m.followers).toBe(ch.stats!.followers);
    // Kênh đang chờ duyệt không được coi là đã xác thực.
    expect((await svc.connect(SAFETY_MCN_ACCOUNT_ID, 'youtube', '@DangKhoaChoiGame')).verified).toBe(false);
  });
});

describe('dữ liệu mẫu KOL Safety', () => {
  const s = seedState();

  test.each([SAFETY_KOL_ACCOUNT_ID, SAFETY_MCN_ACCOUNT_ID])('%s có 4 video đã kiểm tra: 1 vi phạm, 2 an toàn, 1 vùng xám', (id) => {
    const vids = s.safetyVideos.filter((v) => v.accountId === id);
    expect(vids).toHaveLength(4);
    expect(vids.every((v) => v.status === 'DONE' && inRange(v.result!))).toBe(true);
    const by = (k: SafetyVerdict) => vids.filter((v) => v.result!.verdict === k);
    expect(by('VIOLATION')).toHaveLength(1);
    expect(by('GRAY')).toHaveLength(1);
    expect(by('SAFE')).toHaveLength(2);
    expect(by('SAFE').some((v) => v.result!.issues.length === 1 && v.result!.issues[0].severity === 'note')).toBe(true);
    expect(vids.every((v) => IMAGE_POOL.includes(v.thumbnail))).toBe(true);
  });

  test('Khánh Vy: mọi kênh đã xác thực được kết nối sẵn và đánh dấu xác thực', async () => {
    const svc2 = createSafetyService({ db: h.db, now: h.now, delay: false });
    const verified = s.channels.filter((c) => c.ownerId === SAFETY_KOL_ACCOUNT_ID && c.status === 'VERIFIED');
    expect(verified.length).toBeGreaterThan(0);
    for (const c of verified) {
      const list = await svc2.listMonitors(SAFETY_KOL_ACCOUNT_ID, c.platform);
      expect(list.some((m) => m.verified)).toBe(true);
    }
  });

  test('Sao Việt: kênh TikTok xác thực + 3–4 kênh TikTok khác, ngày quét khác nhau (có kênh chưa quét)', async () => {
    const svc2 = createSafetyService({ db: h.db, now: h.now, delay: false });
    const tiktok = await svc2.listMonitors(SAFETY_MCN_ACCOUNT_ID, 'tiktok');
    const verifiedTiktok = s.channels.filter(
      (c) => c.ownerId === SAFETY_MCN_ACCOUNT_ID && c.status === 'VERIFIED' && c.platform === 'tiktok',
    );
    expect(tiktok.filter((m) => m.verified)).toHaveLength(verifiedTiktok.length);
    const extra = tiktok.filter((m) => !m.verified);
    expect(extra.length).toBeGreaterThanOrEqual(3);
    expect(extra.length).toBeLessThanOrEqual(4);
    expect(extra.some((m) => m.lastScanAt === null)).toBe(true);
    const days = new Set(tiktok.filter((m) => m.lastScanAt).map((m) => new Date(m.lastScanAt!).toDateString()));
    expect(days.size).toBeGreaterThanOrEqual(3);
    for (const p of ['facebook', 'youtube'] as const) expect((await svc2.listMonitors(SAFETY_MCN_ACCOUNT_ID, p)).length).toBeGreaterThan(0);
  });

  test('chỉ 2 tài khoản đã xác thực có dữ liệu mẫu; không có tên nền tảng nội bộ', () => {
    const owners = new Set([...s.safetyVideos, ...s.safetyMonitors].map((x) => x.accountId));
    expect(owners).toEqual(new Set([SAFETY_KOL_ACCOUNT_ID, SAFETY_MCN_ACCOUNT_ID]));
    expect(JSON.stringify([s.safetyVideos, s.safetyMonitors]).toLowerCase()).not.toContain('netspace');
  });
});
